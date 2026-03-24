const fs = require('fs/promises');
const path = require('path');
const exifr = require('exifr');
const { execFile } = require('child_process');
const { promisify } = require('util');

const execFileAsync = promisify(execFile);

let sharpModule = null;

const WECHAT_IMAGE_EXTENSIONS = new Set(['.jpg', '.jpeg', '.png', '.webp', '.heic', '.heif', '.bmp', '.tif', '.tiff']);
const METADATA_EXTENSIONS = new Set([
  '.jpg',
  '.jpeg',
  '.arw',
  '.cr2',
  '.cr3',
  '.nef',
  '.dng',
  '.raf',
  '.orf',
  '.rw2'
]);

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

function assertNonEmpty(value, fieldName) {
  if (typeof value !== 'string' || value.trim() === '') {
    throw new Error(`${fieldName} is required`);
  }
}

function sanitizeBaseName(value) {
  const safe = value.replace(/[\\/:*?"<>|]/g, '').trim();
  return safe || 'output';
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

async function walkFiles(rootDir, recursive = true) {
  const files = [];
  const stack = [rootDir];

  while (stack.length > 0) {
    const current = stack.pop();
    let entries;

    try {
      entries = await fs.readdir(current, { withFileTypes: true });
    } catch {
      continue;
    }

    for (const entry of entries) {
      if (entry.name.startsWith('.')) {
        continue;
      }

      const fullPath = path.join(current, entry.name);
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

function formatCameraKey(model, serial) {
  const safeModel = model && String(model).trim() ? String(model).trim() : 'UnknownModel';
  const safeSerial = serial && String(serial).trim() ? String(serial).trim() : 'UnknownSerial';
  return `${safeModel}::${safeSerial}`;
}

function parseCaptureDate(metadata) {
  const value = metadata.DateTimeOriginal || metadata.CreateDate || metadata.ModifyDate || null;
  if (!value) {
    return null;
  }

  if (value instanceof Date) {
    return value;
  }

  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) {
    return null;
  }
  return parsed;
}

async function readPhotoMetadata(filePath) {
  try {
    const metadata = await exifr.parse(filePath, {
      tiff: true,
      exif: true,
      xmp: true,
      iptc: false,
      icc: false,
      jfif: false,
      pick: [
        'Model',
        'Make',
        'BodySerialNumber',
        'SerialNumber',
        'InternalSerialNumber',
        'DateTimeOriginal',
        'CreateDate',
        'ModifyDate',
        'FNumber',
        'FocalLength'
      ]
    });

    if (!metadata) {
      return null;
    }

    const make = metadata.Make ? String(metadata.Make).trim() : '';
    const modelRaw = metadata.Model ? String(metadata.Model).trim() : '';
    const model = modelRaw || make || 'UnknownModel';

    const serial =
      (metadata.BodySerialNumber && String(metadata.BodySerialNumber).trim()) ||
      (metadata.SerialNumber && String(metadata.SerialNumber).trim()) ||
      (metadata.InternalSerialNumber && String(metadata.InternalSerialNumber).trim()) ||
      'UnknownSerial';

    return {
      model,
      serial,
      cameraKey: formatCameraKey(model, serial),
      captureDate: parseCaptureDate(metadata),
      fNumber: Number.isFinite(Number(metadata.FNumber)) ? Number(metadata.FNumber) : null,
      focalLength: Number.isFinite(Number(metadata.FocalLength)) ? Number(metadata.FocalLength) : null
    };
  } catch {
    return null;
  }
}

function getWechatGridConfig(gridType) {
  const value = Number.parseInt(String(gridType), 10);
  if (value === 4) {
    return { total: 4, columns: 2, rows: 2 };
  }
  if (value === 6) {
    return { total: 6, columns: 3, rows: 2 };
  }
  if (value === 9) {
    return { total: 9, columns: 3, rows: 3 };
  }

  throw new Error('gridType must be one of 4, 6, 9');
}

function parseOffsets(offsets) {
  if (Array.isArray(offsets)) {
    const map = new Map();
    for (const item of offsets) {
      if (!item || typeof item !== 'object') {
        continue;
      }

      const cameraKey = item.cameraKey ? String(item.cameraKey).trim() : '';
      const offsetMinutes = Number(item.offsetMinutes);
      if (!cameraKey || !Number.isFinite(offsetMinutes)) {
        continue;
      }
      map.set(cameraKey, offsetMinutes);
    }
    return map;
  }

  if (offsets && typeof offsets === 'object') {
    const map = new Map();
    for (const [cameraKey, offset] of Object.entries(offsets)) {
      const value = Number(offset);
      if (cameraKey && Number.isFinite(value)) {
        map.set(cameraKey, value);
      }
    }
    return map;
  }

  return new Map();
}

function formatSetFileDate(date) {
  const mm = String(date.getMonth() + 1).padStart(2, '0');
  const dd = String(date.getDate()).padStart(2, '0');
  const yyyy = String(date.getFullYear());
  const hh = String(date.getHours()).padStart(2, '0');
  const mi = String(date.getMinutes()).padStart(2, '0');
  const ss = String(date.getSeconds()).padStart(2, '0');
  return `${mm}/${dd}/${yyyy} ${hh}:${mi}:${ss}`;
}

async function updateCreationTimeBestEffort(filePath, targetDate) {
  if (process.platform === 'darwin') {
    try {
      await execFileAsync('SetFile', ['-d', formatSetFileDate(targetDate), filePath]);
      await execFileAsync('SetFile', ['-m', formatSetFileDate(targetDate), filePath]);
      return true;
    } catch {
      return false;
    }
  }

  if (process.platform === 'win32') {
    try {
      const script = '$p = Get-Item -LiteralPath $args[0]; $d=[datetime]::Parse($args[1]); $p.CreationTime=$d; $p.LastWriteTime=$d;';
      await execFileAsync('powershell', ['-NoProfile', '-Command', script, '--', filePath, targetDate.toISOString()]);
      return true;
    } catch {
      return false;
    }
  }

  return false;
}

function normalizeAperture(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const rounded = Math.round(value * 10) / 10;
  const suffix = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `f/${suffix}`;
}

function normalizeFocalLength(value) {
  if (!Number.isFinite(value) || value <= 0) {
    return null;
  }

  const rounded = Math.round(value * 10) / 10;
  const suffix = Number.isInteger(rounded) ? String(rounded) : rounded.toFixed(1);
  return `${suffix}mm`;
}

function numericValueFromLabel(label) {
  const matched = String(label).match(/[\d.]+/);
  if (!matched) {
    return Number.POSITIVE_INFINITY;
  }
  return Number.parseFloat(matched[0]);
}

function createBarChartSvg(title, distributionMap) {
  const entries = Array.from(distributionMap.entries())
    .filter(([, count]) => count > 0)
    .sort((a, b) => numericValueFromLabel(a[0]) - numericValueFromLabel(b[0]));

  if (entries.length === 0) {
    return `<svg xmlns="http://www.w3.org/2000/svg" width="900" height="320"><rect width="100%" height="100%" fill="#f4efe7"/><text x="40" y="80" font-size="34" fill="#1f2b29">${title}</text><text x="40" y="140" font-size="24" fill="#6b786f">No data available.</text></svg>`;
  }

  const width = Math.max(900, entries.length * 72 + 180);
  const height = 560;
  const chartTop = 80;
  const chartBottom = 460;
  const chartHeight = chartBottom - chartTop;
  const chartLeft = 80;
  const chartRight = width - 40;
  const chartWidth = chartRight - chartLeft;

  const maxCount = Math.max(...entries.map(([, count]) => count));
  const barGap = 14;
  const barWidth = Math.max(12, (chartWidth - barGap * (entries.length - 1)) / entries.length);

  const bars = [];
  const labels = [];

  entries.forEach(([label, count], index) => {
    const ratio = count / maxCount;
    const barHeight = Math.max(2, Math.round(chartHeight * ratio));
    const x = chartLeft + index * (barWidth + barGap);
    const y = chartBottom - barHeight;

    bars.push(`<rect x="${x.toFixed(2)}" y="${y}" width="${barWidth.toFixed(2)}" height="${barHeight}" rx="6" fill="#1c6e91"/>`);
    labels.push(`<text x="${(x + barWidth / 2).toFixed(2)}" y="492" font-size="14" text-anchor="middle" fill="#243530">${label}</text>`);
    labels.push(`<text x="${(x + barWidth / 2).toFixed(2)}" y="${y - 10}" font-size="14" text-anchor="middle" fill="#1f2b29">${count}</text>`);
  });

  return [
    `<svg xmlns="http://www.w3.org/2000/svg" width="${width}" height="${height}">`,
    '<rect width="100%" height="100%" fill="#f4efe7"/>',
    `<text x="40" y="46" font-size="30" font-weight="600" fill="#1f2b29">${title}</text>`,
    `<line x1="${chartLeft}" y1="${chartBottom}" x2="${chartRight}" y2="${chartBottom}" stroke="#84918a" stroke-width="2"/>`,
    ...bars,
    ...labels,
    '</svg>'
  ].join('');
}

async function wechatCompressShortEdge1080({ sourceDirectory, destinationDirectory, quality }) {
  assertNonEmpty(sourceDirectory, 'sourceDirectory');
  assertNonEmpty(destinationDirectory, 'destinationDirectory');

  const sharp = getSharp();
  const parsedQuality = Number.parseInt(String(quality || 88), 10);
  const targetQuality = Number.isFinite(parsedQuality) ? Math.min(100, Math.max(40, parsedQuality)) : 88;

  const files = await walkFiles(sourceDirectory, true);
  const imageFiles = files.filter((filePath) => WECHAT_IMAGE_EXTENSIONS.has(path.extname(filePath).toLowerCase()));

  let processed = 0;
  let skipped = 0;

  for (const sourcePath of imageFiles) {
    let metadata;
    try {
      metadata = await sharp(sourcePath).metadata();
    } catch {
      skipped += 1;
      continue;
    }

    if (!metadata.width || !metadata.height) {
      skipped += 1;
      continue;
    }

    const shortEdge = Math.min(metadata.width, metadata.height);
    const scale = shortEdge > 1080 ? 1080 / shortEdge : 1;
    const targetWidth = Math.max(1, Math.round(metadata.width * scale));
    const targetHeight = Math.max(1, Math.round(metadata.height * scale));

    const relativePath = path.relative(sourceDirectory, sourcePath);
    const relativeDir = path.dirname(relativePath);
    const sourceExt = path.extname(sourcePath).toLowerCase();

    let outputExt = sourceExt;
    if (!['.jpg', '.jpeg', '.png', '.webp'].includes(outputExt)) {
      outputExt = '.jpg';
    }

    const outputBaseName = `${path.parse(relativePath).name}${outputExt}`;
    const outputDir = path.join(destinationDirectory, relativeDir);
    await ensureDirectory(outputDir);

    const destinationPath = await getUniquePath(path.join(outputDir, outputBaseName));

    let pipeline = sharp(sourcePath).rotate().resize(targetWidth, targetHeight, {
      fit: 'inside',
      withoutEnlargement: true
    });

    if (outputExt === '.png') {
      pipeline = pipeline.png({ compressionLevel: 9 });
    } else if (outputExt === '.webp') {
      pipeline = pipeline.webp({ quality: targetQuality });
    } else {
      pipeline = pipeline.jpeg({ quality: targetQuality });
    }

    await pipeline.toFile(destinationPath);
    processed += 1;
  }

  return {
    scannedFiles: files.length,
    candidateImageFiles: imageFiles.length,
    processed,
    skipped,
    destinationDirectory,
    shortEdge: 1080
  };
}

async function wechatSplitGridToCenteredLongImages({
  imagePath,
  destinationDirectory,
  gridType,
  tileSize,
  canvasWidth,
  canvasHeight
}) {
  assertNonEmpty(imagePath, 'imagePath');
  assertNonEmpty(destinationDirectory, 'destinationDirectory');

  const sharp = getSharp();
  const config = getWechatGridConfig(gridType);

  const safeTileSize = Number.isFinite(Number(tileSize)) && Number(tileSize) > 128 ? Number(tileSize) : 1080;
  const safeCanvasWidth = Number.isFinite(Number(canvasWidth)) && Number(canvasWidth) >= safeTileSize
    ? Number(canvasWidth)
    : 1080;
  const safeCanvasHeight = Number.isFinite(Number(canvasHeight)) && Number(canvasHeight) > safeTileSize
    ? Number(canvasHeight)
    : 1920;

  await ensureDirectory(destinationDirectory);

  const mosaicWidth = config.columns * safeTileSize;
  const mosaicHeight = config.rows * safeTileSize;

  const mosaicBuffer = await sharp(imagePath)
    .rotate()
    .resize(mosaicWidth, mosaicHeight, {
      fit: 'cover',
      position: 'centre'
    })
    .jpeg({ quality: 95 })
    .toBuffer();

  const centerLeft = Math.floor((safeCanvasWidth - safeTileSize) / 2);
  const centerTop = Math.floor((safeCanvasHeight - safeTileSize) / 2);

  const outputFiles = [];
  const baseName = sanitizeBaseName(path.parse(imagePath).name);

  for (let index = 0; index < config.total; index += 1) {
    const row = Math.floor(index / config.columns);
    const column = index % config.columns;

    const tileBuffer = await sharp(mosaicBuffer)
      .extract({
        left: column * safeTileSize,
        top: row * safeTileSize,
        width: safeTileSize,
        height: safeTileSize
      })
      .jpeg({ quality: 95 })
      .toBuffer();

    const outputName = `${baseName}_wechat_${config.total}_${String(index + 1).padStart(2, '0')}.jpg`;
    const outputPath = await getUniquePath(path.join(destinationDirectory, outputName));

    await sharp({
      create: {
        width: safeCanvasWidth,
        height: safeCanvasHeight,
        channels: 3,
        background: '#ffffff'
      }
    })
      .composite([
        {
          input: tileBuffer,
          left: centerLeft,
          top: centerTop
        }
      ])
      .jpeg({ quality: 95 })
      .toFile(outputPath);

    outputFiles.push(outputPath);
  }

  return {
    gridType: config.total,
    generatedFiles: outputFiles.length,
    destinationDirectory,
    outputFiles,
    tileSize: safeTileSize,
    canvasWidth: safeCanvasWidth,
    canvasHeight: safeCanvasHeight
  };
}

async function scanCameraDevices({ directoryPath }) {
  assertNonEmpty(directoryPath, 'directoryPath');

  const files = await walkFiles(directoryPath, true);
  const photoFiles = files.filter((filePath) => METADATA_EXTENSIONS.has(path.extname(filePath).toLowerCase()));

  const cameraMap = new Map();
  let parsedFiles = 0;

  for (const filePath of photoFiles) {
    const info = await readPhotoMetadata(filePath);
    if (!info) {
      continue;
    }

    parsedFiles += 1;
    const ext = path.extname(filePath).toLowerCase();
    const existing = cameraMap.get(info.cameraKey) || {
      cameraKey: info.cameraKey,
      model: info.model,
      serial: info.serial,
      fileCount: 0,
      extensions: new Set()
    };

    existing.fileCount += 1;
    existing.extensions.add(ext);
    cameraMap.set(info.cameraKey, existing);
  }

  const cameras = Array.from(cameraMap.values())
    .map((item) => ({
      cameraKey: item.cameraKey,
      model: item.model,
      serial: item.serial,
      fileCount: item.fileCount,
      extensions: Array.from(item.extensions).sort()
    }))
    .sort((a, b) => b.fileCount - a.fileCount);

  return {
    scannedFiles: files.length,
    candidatePhotoFiles: photoFiles.length,
    parsedFiles,
    cameras
  };
}

async function applyCameraTimeOffsets({ directoryPath, offsets }) {
  assertNonEmpty(directoryPath, 'directoryPath');

  const offsetMap = parseOffsets(offsets);
  if (offsetMap.size === 0) {
    throw new Error('offsets is empty');
  }

  const files = await walkFiles(directoryPath, true);
  const photoFiles = files.filter((filePath) => METADATA_EXTENSIONS.has(path.extname(filePath).toLowerCase()));

  let touchedFiles = 0;
  let skippedNoMetadata = 0;
  let skippedNoCaptureDate = 0;
  let skippedNoOffsetRule = 0;
  let creationUpdated = 0;

  for (const filePath of photoFiles) {
    const info = await readPhotoMetadata(filePath);
    if (!info) {
      skippedNoMetadata += 1;
      continue;
    }

    if (!offsetMap.has(info.cameraKey)) {
      skippedNoOffsetRule += 1;
      continue;
    }

    if (!info.captureDate) {
      skippedNoCaptureDate += 1;
      continue;
    }

    const offsetMinutes = offsetMap.get(info.cameraKey);
    const targetDate = new Date(info.captureDate.getTime() + offsetMinutes * 60 * 1000);

    await fs.utimes(filePath, targetDate, targetDate);
    touchedFiles += 1;

    if (await updateCreationTimeBestEffort(filePath, targetDate)) {
      creationUpdated += 1;
    }
  }

  return {
    scannedFiles: files.length,
    candidatePhotoFiles: photoFiles.length,
    appliedRules: offsetMap.size,
    touchedFiles,
    creationUpdated,
    skippedNoMetadata,
    skippedNoCaptureDate,
    skippedNoOffsetRule,
    note:
      creationUpdated < touchedFiles
        ? 'Some files updated only for modification/access time because creation-time updates depend on platform tools.'
        : 'Creation time and modification time were both updated for processed files.'
  };
}

async function analyzeApertureAndFocalDistribution({ directoryPath, outputDirectory }) {
  assertNonEmpty(directoryPath, 'directoryPath');
  assertNonEmpty(outputDirectory, 'outputDirectory');

  await ensureDirectory(outputDirectory);

  const files = await walkFiles(directoryPath, true);
  const photoFiles = files.filter((filePath) => METADATA_EXTENSIONS.has(path.extname(filePath).toLowerCase()));

  const apertureMap = new Map();
  const focalMap = new Map();

  let parsedFiles = 0;

  for (const filePath of photoFiles) {
    const info = await readPhotoMetadata(filePath);
    if (!info) {
      continue;
    }

    parsedFiles += 1;

    const apertureLabel = normalizeAperture(info.fNumber);
    if (apertureLabel) {
      apertureMap.set(apertureLabel, (apertureMap.get(apertureLabel) || 0) + 1);
    }

    const focalLabel = normalizeFocalLength(info.focalLength);
    if (focalLabel) {
      focalMap.set(focalLabel, (focalMap.get(focalLabel) || 0) + 1);
    }
  }

  const apertureSvgPath = path.join(outputDirectory, 'aperture_distribution.svg');
  const focalSvgPath = path.join(outputDirectory, 'focal_length_distribution.svg');
  const statsJsonPath = path.join(outputDirectory, 'photo_stats.json');

  await fs.writeFile(apertureSvgPath, createBarChartSvg('Aperture Distribution', apertureMap), 'utf8');
  await fs.writeFile(focalSvgPath, createBarChartSvg('Focal Length Distribution', focalMap), 'utf8');

  const summary = {
    scannedFiles: files.length,
    candidatePhotoFiles: photoFiles.length,
    parsedFiles,
    apertureDistribution: Object.fromEntries(apertureMap),
    focalLengthDistribution: Object.fromEntries(focalMap),
    outputFiles: {
      apertureSvgPath,
      focalSvgPath,
      statsJsonPath
    }
  };

  await fs.writeFile(statsJsonPath, JSON.stringify(summary, null, 2), 'utf8');

  return summary;
}

module.exports = {
  wechatCompressShortEdge1080,
  wechatSplitGridToCenteredLongImages,
  scanCameraDevices,
  applyCameraTimeOffsets,
  analyzeApertureAndFocalDistribution
};
