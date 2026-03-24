const fs = require('fs/promises');
const path = require('path');

let sharpModule = null;

function getSharp() {
  if (!sharpModule) {
    try {
      sharpModule = require('sharp');
    } catch (error) {
      throw new Error(`Failed to load sharp: ${error.message}`);
    }
  }
  return sharpModule;
}

const IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.gif', '.bmp']);
const GRID_IMAGE_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.bmp']);
const XMP_GROUP_BLOCK_REGEX =
  /<crs:Group>\s*<rdf:Alt>\s*<rdf:li xml:lang="x-default">[\s\S]*?<\/rdf:li>\s*<\/rdf:Alt>\s*<\/crs:Group>/g;
const XMP_GROUP_NAME_REGEX =
  /<crs:Group>\s*<rdf:Alt>\s*<rdf:li xml:lang="x-default">([^<]+)<\/rdf:li>\s*<\/rdf:Alt>\s*<\/crs:Group>/g;

function assertNonEmpty(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required`);
  }
}

function sanitizeBaseName(value) {
  const safe = value.replace(/[\\/:*?"<>|]/g, '').trim();
  return safe || 'output';
}

function normalizeExtension(value) {
  const trimmed = value.trim().toLowerCase();
  if (!trimmed) {
    return null;
  }
  return trimmed.startsWith('.') ? trimmed : `.${trimmed}`;
}

function parseExtensions(input, fallback) {
  const values = Array.isArray(input)
    ? input
    : typeof input === 'string'
      ? input.split(/[,\n\r\s]+/)
      : [];

  const normalized = values
    .map((item) => normalizeExtension(String(item)))
    .filter(Boolean);

  if (normalized.length > 0) {
    return new Set(normalized);
  }

  return new Set(fallback);
}

function parseDateTime(input) {
  assertNonEmpty(input, 'specifiedTime');
  const normalized = input.includes('T') ? input : input.replace(' ', 'T');
  const timestamp = new Date(normalized).getTime();
  if (Number.isNaN(timestamp)) {
    throw new Error('specifiedTime format is invalid, expected YYYY-MM-DD HH:mm:ss');
  }
  return timestamp;
}

async function pathExists(targetPath) {
  try {
    await fs.access(targetPath);
    return true;
  } catch {
    return false;
  }
}

async function ensureDirectory(directoryPath) {
  await fs.mkdir(directoryPath, { recursive: true });
}

async function getUniquePath(targetPath) {
  if (!(await pathExists(targetPath))) {
    return targetPath;
  }

  const parsed = path.parse(targetPath);
  let index = 1;

  while (true) {
    const candidate = path.join(parsed.dir, `${parsed.name}_${index}${parsed.ext}`);
    if (!(await pathExists(candidate))) {
      return candidate;
    }
    index += 1;
  }
}

async function getNextIndexedJpg(directoryPath, baseName) {
  let index = 1;
  while (true) {
    const candidate = path.join(directoryPath, `${baseName}_${index}.jpg`);
    if (!(await pathExists(candidate))) {
      return candidate;
    }
    index += 1;
  }
}

async function readTextWithFallback(filePath) {
  try {
    return await fs.readFile(filePath, 'utf8');
  } catch (error) {
    if (error && error.code === 'ERR_INVALID_ARG_VALUE') {
      throw error;
    }
    return fs.readFile(filePath, 'latin1');
  }
}

async function walkFiles(rootDir, recursive = true) {
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    let entries;

    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(currentDir, entry.name);
      if (entry.isDirectory()) {
        if (recursive) {
          stack.push(fullPath);
        }
      } else if (entry.isFile()) {
        files.push(fullPath);
      }
    }
  }

  return files;
}

async function walkDirectories(rootDir) {
  const directories = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const currentDir = stack.pop();
    directories.push(currentDir);

    let entries;
    try {
      entries = await fs.readdir(currentDir, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }

      if (entry.isDirectory()) {
        stack.push(path.join(currentDir, entry.name));
      }
    }
  }

  directories.sort((a, b) => a.localeCompare(b));
  return directories;
}

async function listTopLevelFiles(directoryPath) {
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  return entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => path.join(directoryPath, entry.name));
}

function chunk(array, size) {
  const chunks = [];
  for (let i = 0; i < array.length; i += size) {
    chunks.push(array.slice(i, i + size));
  }
  return chunks;
}

function toImageType(extensionSet, filePath) {
  return extensionSet.has(path.extname(filePath).toLowerCase());
}

async function safeCopyFile(sourcePath, destinationPath) {
  const targetPath = await getUniquePath(destinationPath);
  await fs.copyFile(sourcePath, targetPath);
  return targetPath;
}

async function safeMoveFile(sourcePath, destinationPath) {
  const targetPath = await getUniquePath(destinationPath);

  try {
    await fs.rename(sourcePath, targetPath);
  } catch (error) {
    if (error.code !== 'EXDEV') {
      throw error;
    }

    await fs.copyFile(sourcePath, targetPath);
    await fs.unlink(sourcePath);
  }

  return targetPath;
}

async function copyXmpFiles({ sourceDir, destinationDir }) {
  assertNonEmpty(sourceDir, 'sourceDir');
  assertNonEmpty(destinationDir, 'destinationDir');

  await ensureDirectory(destinationDir);
  const files = await walkFiles(sourceDir, true);
  const xmpFiles = files.filter((filePath) => path.extname(filePath).toLowerCase() === '.xmp');

  let copied = 0;
  for (const sourcePath of xmpFiles) {
    const destinationPath = path.join(destinationDir, path.basename(sourcePath));
    await safeCopyFile(sourcePath, destinationPath);
    copied += 1;
  }

  return {
    scannedFiles: files.length,
    matchedXmpFiles: xmpFiles.length,
    copied,
    destinationDir
  };
}

async function extractXmpGroupNames({ directoryPath }) {
  assertNonEmpty(directoryPath, 'directoryPath');

  const files = await walkFiles(directoryPath, true);
  const xmpFiles = files.filter((filePath) => path.extname(filePath).toLowerCase() === '.xmp');
  const groups = new Set();
  const errors = [];

  for (const filePath of xmpFiles) {
    try {
      const content = await readTextWithFallback(filePath);
      XMP_GROUP_NAME_REGEX.lastIndex = 0;

      let match;
      while ((match = XMP_GROUP_NAME_REGEX.exec(content)) !== null) {
        groups.add(match[1].trim());
      }
    } catch (error) {
      errors.push({ filePath, message: error.message });
    }
  }

  return {
    scannedFiles: files.length,
    scannedXmpFiles: xmpFiles.length,
    groupNames: Array.from(groups).sort(),
    errors
  };
}

async function replaceXmpGroupName({ directoryPath, newGroupName }) {
  assertNonEmpty(directoryPath, 'directoryPath');
  assertNonEmpty(newGroupName, 'newGroupName');

  const replacement = `<crs:Group>\n  <rdf:Alt>\n   <rdf:li xml:lang="x-default">${newGroupName}</rdf:li>\n  </rdf:Alt>\n</crs:Group>`;

  const files = await walkFiles(directoryPath, true);
  const xmpFiles = files.filter((filePath) => path.extname(filePath).toLowerCase() === '.xmp');
  const errors = [];
  let updatedFiles = 0;

  for (const filePath of xmpFiles) {
    try {
      const content = await readTextWithFallback(filePath);
      XMP_GROUP_BLOCK_REGEX.lastIndex = 0;
      const updatedContent = content.replace(XMP_GROUP_BLOCK_REGEX, replacement);

      if (updatedContent !== content) {
        await fs.writeFile(filePath, updatedContent, 'utf8');
        updatedFiles += 1;
      }
    } catch (error) {
      errors.push({ filePath, message: error.message });
    }
  }

  return {
    scannedFiles: files.length,
    scannedXmpFiles: xmpFiles.length,
    updatedFiles,
    errors
  };
}

async function removeTextFromFilenames({ directoryPath, removeText }) {
  assertNonEmpty(directoryPath, 'directoryPath');
  assertNonEmpty(removeText, 'removeText');

  const files = await walkFiles(directoryPath, true);
  let renamedFiles = 0;

  for (const filePath of files) {
    const directory = path.dirname(filePath);
    const fileName = path.basename(filePath);

    if (!fileName.includes(removeText)) {
      continue;
    }

    const nextFileName = fileName.split(removeText).join('');
    if (!nextFileName) {
      continue;
    }

    const targetPath = await getUniquePath(path.join(directory, nextFileName));
    if (targetPath === filePath) {
      continue;
    }

    await fs.rename(filePath, targetPath);
    renamedFiles += 1;
  }

  return {
    scannedFiles: files.length,
    renamedFiles
  };
}

async function batchReplaceTextInFiles({ directoryPath, oldTexts, newText }) {
  assertNonEmpty(directoryPath, 'directoryPath');

  const replaceTargets = Array.isArray(oldTexts)
    ? oldTexts.map((item) => String(item)).filter((item) => item.length > 0)
    : [];

  if (replaceTargets.length === 0) {
    throw new Error('oldTexts must contain at least one non-empty item');
  }

  const replacement = typeof newText === 'string' ? newText : '';
  const files = await walkFiles(directoryPath, true);

  let updatedFiles = 0;
  const errors = [];

  for (const filePath of files) {
    let content;
    try {
      content = await readTextWithFallback(filePath);
    } catch {
      continue;
    }

    let nextContent = content;
    for (const oldText of replaceTargets) {
      nextContent = nextContent.split(oldText).join(replacement);
    }

    if (nextContent !== content) {
      try {
        await fs.writeFile(filePath, nextContent, 'utf8');
        updatedFiles += 1;
      } catch (error) {
        errors.push({ filePath, message: error.message });
      }
    }
  }

  return {
    scannedFiles: files.length,
    updatedFiles,
    errors
  };
}

async function copyMatchedSourceFiles({
  editedDirectory,
  sourceDirectory,
  destinationDirectory,
  sourceExtensions
}) {
  assertNonEmpty(editedDirectory, 'editedDirectory');
  assertNonEmpty(sourceDirectory, 'sourceDirectory');
  assertNonEmpty(destinationDirectory, 'destinationDirectory');

  const extensionSet = parseExtensions(sourceExtensions, ['.jpg']);

  const editedFiles = await listTopLevelFiles(editedDirectory);
  const sourceFiles = await listTopLevelFiles(sourceDirectory);
  await ensureDirectory(destinationDirectory);

  const editedStemSet = new Set(editedFiles.map((filePath) => path.parse(filePath).name));

  let copiedFiles = 0;
  let matchedFiles = 0;

  for (const sourcePath of sourceFiles) {
    const parsed = path.parse(sourcePath);
    if (!editedStemSet.has(parsed.name)) {
      continue;
    }

    if (!extensionSet.has(parsed.ext.toLowerCase())) {
      continue;
    }

    matchedFiles += 1;
    const destinationPath = path.join(destinationDirectory, parsed.base);
    await safeCopyFile(sourcePath, destinationPath);
    copiedFiles += 1;
  }

  return {
    editedFiles: editedFiles.length,
    sourceFiles: sourceFiles.length,
    matchedFiles,
    copiedFiles,
    destinationDirectory
  };
}

function classifyGridTarget(width, height) {
  const ratio = width / height;
  const orientation = width >= height ? 'horizontal' : 'vertical';

  if (ratio > 1.7 && ratio < 1.81) {
    return { key: '16:9', target: [4800, 2700] };
  }
  if (ratio > 1.3 && ratio < 1.41) {
    return { key: '4:3', target: [4800, 3600] };
  }
  if (ratio > 0.7 && ratio < 0.81) {
    return { key: '3:4', target: [3600, 4800] };
  }
  if (ratio > 0.5 && ratio < 0.61) {
    return { key: '9:16', target: [2700, 4800] };
  }
  if (ratio > 0.65 && ratio < 0.67) {
    return { key: '2:3', target: [3200, 4800] };
  }
  if (ratio > 1.48 && ratio < 1.52) {
    return { key: '3:2', target: [4800, 3200] };
  }

  const targetWidth = Math.max(1, Math.round(4800 * (width / height)));
  return {
    key: orientation,
    target: [targetWidth, 4800]
  };
}

async function createCollage(images, outputDirectory, baseName, layout) {
  const sharp = getSharp();
  const resized = [];

  for (const image of images) {
    const [width, height] = image.target;
    const buffer = await sharp(image.path)
      .resize(width, height, {
        fit: 'fill'
      })
      .jpeg({ quality: 92 })
      .toBuffer();

    resized.push({
      buffer,
      width,
      height
    });
  }

  if (resized.length === 0) {
    return null;
  }

  let collageWidth = 0;
  let collageHeight = 0;
  const composites = [];

  if (layout === '3x3') {
    const tileWidth = resized[0].width;
    const tileHeight = resized[0].height;
    collageWidth = tileWidth * 3;
    collageHeight = tileHeight * 3;

    for (let row = 0; row < 3; row += 1) {
      for (let col = 0; col < 3; col += 1) {
        const index = row * 3 + col;
        if (!resized[index]) {
          continue;
        }
        composites.push({
          input: resized[index].buffer,
          left: col * tileWidth,
          top: row * tileHeight
        });
      }
    }
  } else if (layout === '2x2') {
    const tileWidth = resized[0].width;
    const tileHeight = resized[0].height;
    collageWidth = tileWidth * 2;
    collageHeight = tileHeight * 2;

    for (let row = 0; row < 2; row += 1) {
      for (let col = 0; col < 2; col += 1) {
        const index = row * 2 + col;
        if (!resized[index]) {
          continue;
        }
        composites.push({
          input: resized[index].buffer,
          left: col * tileWidth,
          top: row * tileHeight
        });
      }
    }
  } else {
    collageHeight = resized[0].height;
    let offsetX = 0;

    for (const image of resized) {
      composites.push({
        input: image.buffer,
        left: offsetX,
        top: 0
      });
      offsetX += image.width;
    }

    collageWidth = offsetX;
  }

  const safeBaseName = sanitizeBaseName(baseName);
  const outputPath = await getNextIndexedJpg(outputDirectory, safeBaseName);

  await sharp({
    create: {
      width: collageWidth,
      height: collageHeight,
      channels: 3,
      background: { r: 0, g: 0, b: 0 }
    }
  })
    .composite(composites)
    .jpeg({ quality: 92 })
    .toFile(outputPath);

  return outputPath;
}

async function processGridDirectory(directoryPath) {
  const sharp = getSharp();
  const entries = await fs.readdir(directoryPath, { withFileTypes: true });
  const imageFiles = entries
    .filter((entry) => entry.isFile() && !entry.name.startsWith('.'))
    .map((entry) => path.join(directoryPath, entry.name))
    .filter((filePath) => toImageType(GRID_IMAGE_EXTENSIONS, filePath))
    .sort((a, b) => a.localeCompare(b));

  if (imageFiles.length === 0) {
    return {
      inputImages: 0,
      collages: 0
    };
  }

  const grouped = {
    '16:9': [],
    '4:3': [],
    '3:4': [],
    '9:16': [],
    '2:3': [],
    '3:2': [],
    horizontal: [],
    vertical: []
  };

  for (const imagePath of imageFiles) {
    let metadata;
    try {
      metadata = await sharp(imagePath).metadata();
    } catch {
      continue;
    }

    if (!metadata.width || !metadata.height) {
      continue;
    }

    const classified = classifyGridTarget(metadata.width, metadata.height);
    grouped[classified.key].push({
      path: imagePath,
      target: classified.target
    });
  }

  let collageCount = 0;

  for (const [orientation, images] of Object.entries(grouped)) {
    if (images.length === 0) {
      continue;
    }

    const batches3x3Count = Math.floor(images.length / 9);
    const for3x3 = images.slice(0, batches3x3Count * 9);
    const batches3x3 = chunk(for3x3, 9);

    const remainingAfter3x3 = images.slice(batches3x3Count * 9);
    const batches2x2Count = Math.floor(remainingAfter3x3.length / 4);
    const for2x2 = remainingAfter3x3.slice(0, batches2x2Count * 4);
    const batches2x2 = chunk(for2x2, 4);

    const batch1xM = remainingAfter3x3.slice(batches2x2Count * 4);

    const normalizedOrientation = orientation.replace(':', 'x');
    const baseName = `${path.basename(directoryPath)}_${normalizedOrientation}`;

    for (const batch of batches3x3) {
      await createCollage(batch, directoryPath, baseName, '3x3');
      collageCount += 1;
    }

    for (const batch of batches2x2) {
      await createCollage(batch, directoryPath, baseName, '2x2');
      collageCount += 1;
    }

    if (batch1xM.length > 0) {
      await createCollage(batch1xM, directoryPath, baseName, '1xM');
      collageCount += 1;
    }
  }

  return {
    inputImages: imageFiles.length,
    collages: collageCount
  };
}

async function gridMergeByAspect({ rootDirectory }) {
  assertNonEmpty(rootDirectory, 'rootDirectory');

  const directories = await walkDirectories(rootDirectory);

  let totalInputImages = 0;
  let totalCollages = 0;
  let touchedDirectories = 0;

  for (const directoryPath of directories) {
    const result = await processGridDirectory(directoryPath);
    if (result.inputImages > 0) {
      touchedDirectories += 1;
    }
    totalInputImages += result.inputImages;
    totalCollages += result.collages;
  }

  return {
    scannedDirectories: directories.length,
    touchedDirectories,
    totalInputImages,
    totalCollages
  };
}

async function moveImagesByCreateTime({ sourceDirectory, destinationDirectory, specifiedTime }) {
  assertNonEmpty(sourceDirectory, 'sourceDirectory');
  assertNonEmpty(destinationDirectory, 'destinationDirectory');

  const threshold = parseDateTime(specifiedTime);
  await ensureDirectory(destinationDirectory);

  const files = await walkFiles(sourceDirectory, true);
  let movedFiles = 0;

  for (const filePath of files) {
    if (!toImageType(IMAGE_EXTENSIONS, filePath)) {
      continue;
    }

    let stats;
    try {
      stats = await fs.stat(filePath);
    } catch {
      continue;
    }

    const createTime = stats.birthtimeMs > 0 ? stats.birthtimeMs : stats.ctimeMs;
    if (createTime <= threshold) {
      continue;
    }

    const destinationPath = path.join(destinationDirectory, path.basename(filePath));
    await safeMoveFile(filePath, destinationPath);
    movedFiles += 1;
  }

  return {
    scannedFiles: files.length,
    movedFiles,
    destinationDirectory
  };
}

async function copyArwWithInterval({ sourceFolder, destinationFolder, interval }) {
  assertNonEmpty(sourceFolder, 'sourceFolder');
  assertNonEmpty(destinationFolder, 'destinationFolder');

  const parsedInterval = Number.parseInt(String(interval), 10);
  if (!Number.isInteger(parsedInterval) || parsedInterval <= 0) {
    throw new Error('interval must be a positive integer');
  }

  await ensureDirectory(destinationFolder);

  const sourceFiles = await listTopLevelFiles(sourceFolder);
  const arwFiles = sourceFiles
    .filter((filePath) => path.extname(filePath).toLowerCase() === '.arw')
    .sort((a, b) => a.localeCompare(b));

  let copiedFiles = 0;

  for (let i = 0; i < arwFiles.length; i += parsedInterval) {
    const sourcePath = arwFiles[i];
    const destinationPath = path.join(destinationFolder, path.basename(sourcePath));
    await safeCopyFile(sourcePath, destinationPath);
    copiedFiles += 1;
  }

  return {
    sourceArwFiles: arwFiles.length,
    copiedFiles,
    interval: parsedInterval,
    destinationFolder
  };
}

async function renameFilesWithContinuousNumbers({ folderPath, prefix }) {
  assertNonEmpty(folderPath, 'folderPath');

  const effectivePrefix = typeof prefix === 'string' ? prefix : 'LZR';
  const files = (await listTopLevelFiles(folderPath)).sort((a, b) => a.localeCompare(b));

  if (files.length === 0) {
    return {
      scannedFiles: 0,
      renamedFiles: 0,
      preview: []
    };
  }

  const digits = String(files.length).length;
  const tempRecords = [];

  for (let index = 0; index < files.length; index += 1) {
    const originalPath = files[index];
    const tempName = `.__ppf_tmp__${Date.now()}_${index}`;
    const tempPath = path.join(folderPath, tempName);

    await fs.rename(originalPath, tempPath);
    tempRecords.push({
      tempPath,
      originalName: path.basename(originalPath),
      index
    });
  }

  const preview = [];

  for (const record of tempRecords) {
    const number = String(record.index + 1).padStart(digits, '0');
    const targetName = `${effectivePrefix}${number}_${record.originalName}`;
    const targetPath = await getUniquePath(path.join(folderPath, targetName));

    await fs.rename(record.tempPath, targetPath);

    if (preview.length < 10) {
      preview.push({
        from: record.originalName,
        to: path.basename(targetPath)
      });
    }
  }

  return {
    scannedFiles: files.length,
    renamedFiles: files.length,
    preview
  };
}

module.exports = {
  copyXmpFiles,
  extractXmpGroupNames,
  replaceXmpGroupName,
  removeTextFromFilenames,
  batchReplaceTextInFiles,
  copyMatchedSourceFiles,
  gridMergeByAspect,
  moveImagesByCreateTime,
  copyArwWithInterval,
  renameFilesWithContinuousNumbers
};
