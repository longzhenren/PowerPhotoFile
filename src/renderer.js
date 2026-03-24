const api = window.powerPhotoApi;

const LOCALE_STORAGE_KEY = 'ppf_locale';
const THEME_STORAGE_KEY = 'ppf_theme';

const DEFAULT_LOCALE =
  typeof navigator !== 'undefined' && String(navigator.language || '').toLowerCase().startsWith('zh')
    ? 'zh'
    : 'en';

let currentLocale = localStorage.getItem(LOCALE_STORAGE_KEY) || DEFAULT_LOCALE;
if (!['en', 'zh'].includes(currentLocale)) {
  currentLocale = 'en';
}

let currentTheme = localStorage.getItem(THEME_STORAGE_KEY) || 'light';
if (!['light', 'dark'].includes(currentTheme)) {
  currentTheme = 'light';
}

const I18N = {
  en: {
    run: 'Run',
    browse: 'Browse',
    running: 'Running...',
    ready: 'Ready.',
    themeDark: 'Dark',
    themeLight: 'Light',
    languageToggle: '中文',
    brandSubtitle: 'Photographer utility suite for macOS and Windows.',
    heroTitle: 'All original script capabilities in one desktop app',
    heroDesc: 'Each feature is isolated on its own page. Long-running tasks return structured summaries.',
    groupCore: 'Core Tools',
    groupWechat: 'WeChat Moments',
    groupCamera: 'Camera Time',
    groupStats: 'Photo Stats',
    groupHelp: 'Help',
    docsTitle: 'Feature Guide & Adobe Docs',
    docsDesc: 'Search capability explanations and jump to Adobe official references for related workflow concepts.',
    docsSearchLabel: 'Search Keywords',
    docsSearchPlaceholder: 'xmp / preset / capture time / focal length',
    docsNoResult: 'No matching guide found. Try another keyword.',
    jsonEmpty: 'JSON input is empty'
  },
  zh: {
    run: '开始',
    browse: '浏览',
    running: '执行中...',
    ready: '准备就绪。',
    themeDark: '深色',
    themeLight: '浅色',
    languageToggle: 'English',
    brandSubtitle: '面向摄影工作流的桌面工具集，支持 macOS 与 Windows。',
    heroTitle: '将原有脚本能力统一到一个桌面应用',
    heroDesc: '每个功能独立成页，任务完成后返回结构化结果，便于复核。',
    groupCore: '核心工具',
    groupWechat: '微信朋友圈',
    groupCamera: '相机时间',
    groupStats: '照片统计',
    groupHelp: '帮助说明',
    docsTitle: '功能说明与 Adobe 文档',
    docsDesc: '可按关键词检索功能说明，并跳转到 Adobe 官方文档查看对应概念。',
    docsSearchLabel: '检索关键词',
    docsSearchPlaceholder: 'xmp / 预设 / 拍摄时间 / 焦距',
    docsNoResult: '未找到匹配说明，请尝试其他关键词。',
    jsonEmpty: 'JSON 输入为空'
  }
};

const NAV_TEXT = {
  en: {
    'copy-xmp': 'Copy XMP Files',
    'extract-group': 'Extract XMP Group Names',
    'replace-group': 'Replace XMP Group Name',
    'remove-filename-text': 'Remove Text In File Names',
    'replace-file-text': 'Batch Replace Text In Files',
    'copy-matched-source': 'Copy Matched Source Files',
    'grid-merge': 'Grid Merge Collage',
    'move-by-time': 'Move Images By Create Time',
    'copy-arw': 'Copy ARW With Interval',
    'rename-seq': 'Rename Files Sequentially',
    'wechat-compress': 'Short Edge 1080 Compression',
    'camera-offset-scan': 'Scan Camera Model And Serial',
    'camera-offset-apply': 'Apply Camera Time Offsets',
    'photo-stats': 'Aperture And Focal Distribution',
    'feature-docs': 'Feature Guide & Adobe Docs'
  },
  zh: {
    'copy-xmp': '复制 XMP 文件',
    'extract-group': '提取 XMP 组名',
    'replace-group': '替换 XMP 组名',
    'remove-filename-text': '移除文件名文本',
    'replace-file-text': '批量替换文件文本',
    'copy-matched-source': '按同名拷贝原图',
    'grid-merge': '宫格拼图生成',
    'move-by-time': '按创建时间移动图片',
    'copy-arw': '延时摄影间隔复制 ARW',
    'rename-seq': '连续编号重命名',
    'wechat-compress': '短边压缩到 1080',
    'camera-offset-scan': '扫描相机型号与序列号',
    'camera-offset-apply': '应用相机时间偏移',
    'photo-stats': '光圈与焦距分布统计',
    'feature-docs': '功能说明与 Adobe 文档'
  }
};

const PAGE_TEXT = {
  en: {
    'copy-xmp': {
      title: 'Copy XMP Files',
      desc: 'Recursively copy all .xmp files from source directory to destination directory.'
    },
    'extract-group': {
      title: 'Extract XMP Group Names',
      desc: 'Recursively scan XMP files and return unique <crs:Group> names.'
    },
    'replace-group': {
      title: 'Replace XMP Group Name',
      desc: 'Recursively rewrite group block in XMP files with a new group name.'
    },
    'remove-filename-text': {
      title: 'Remove Text In File Names',
      desc: 'Recursively remove specified text from all file names under the directory.'
    },
    'replace-file-text': {
      title: 'Batch Replace Text In Files',
      desc: 'Recursively replace one or many text values inside files (one old value per line).'
    },
    'copy-matched-source': {
      title: 'Copy Matched Source Files',
      desc: 'Copy files from source folder when base names match files in edited folder.'
    },
    'grid-merge': {
      title: 'Grid Merge Collage',
      desc: 'Recursively process each directory and generate 3x3 / 2x2 / 1xM collages by aspect buckets.'
    },
    'move-by-time': {
      title: 'Move Images By Create Time',
      desc: 'Recursively move image files with create time later than the specified timestamp.'
    },
    'copy-arw': {
      title: 'Copy ARW With Interval',
      desc: 'Copy one ARW file every N files from source folder to destination folder.'
    },
    'rename-seq': {
      title: 'Rename Files Sequentially',
      desc: 'Rename all top-level files to continuous numbers while preserving original file names after underscore.'
    },
    'wechat-compress': {
      title: 'WeChat Moments: Short Edge 1080 Compression',
      desc: 'Compress image files so the short edge is 1080 pixels while preserving aspect ratio.'
    },
    'camera-offset-scan': {
      title: 'Scan Camera Model And Serial',
      desc: 'Scan directory and detect camera model/serial combinations from JPG and RAW metadata.'
    },
    'camera-offset-apply': {
      title: 'Apply Camera Time Offsets',
      desc: 'Set offset rules by camera key and update file modification time (and creation time when platform supports it).'
    },
    'photo-stats': {
      title: 'Aperture And Focal Distribution',
      desc: 'Scan RAW/JPG files, calculate common aperture and focal-length usage, and save SVG charts.'
    },
    'feature-docs': {
      title: 'Feature Guide & Adobe Docs',
      desc: 'Search capability explanations and jump to Adobe official references for related workflow concepts.'
    }
  },
  zh: {
    'copy-xmp': {
      title: '复制 XMP 文件',
      desc: '递归复制源目录中的全部 .xmp 文件到目标目录。'
    },
    'extract-group': {
      title: '提取 XMP 组名',
      desc: '递归扫描 XMP 文件，提取并去重 <crs:Group> 组名。'
    },
    'replace-group': {
      title: '替换 XMP 组名',
      desc: '递归重写 XMP 中的组名区块，统一替换为指定名称。'
    },
    'remove-filename-text': {
      title: '移除文件名文本',
      desc: '递归移除目录下所有文件名中的指定文本。'
    },
    'replace-file-text': {
      title: '批量替换文件文本',
      desc: '递归替换文件内容中的多个旧文本（每行一个）。'
    },
    'copy-matched-source': {
      title: '按同名拷贝原图',
      desc: '以已修图目录为基准，从原图目录拷贝同名文件。'
    },
    'grid-merge': {
      title: '宫格拼图生成',
      desc: '递归处理各级目录，按比例分组生成 3x3 / 2x2 / 1xM 拼图。'
    },
    'move-by-time': {
      title: '按创建时间移动图片',
      desc: '递归移动创建时间晚于指定时间点的图片文件。'
    },
    'copy-arw': {
      title: '延时摄影间隔复制 ARW',
      desc: '按固定间隔抽取 ARW 文件并复制到目标目录。'
    },
    'rename-seq': {
      title: '连续编号重命名',
      desc: '对目录顶层文件按顺序编号并保留原文件名后缀。'
    },
    'wechat-compress': {
      title: '微信朋友圈：短边压缩到 1080',
      desc: '保持宽高比压缩图片，短边限制为 1080 像素。'
    },
    'camera-offset-scan': {
      title: '扫描相机型号与序列号',
      desc: '扫描目录中的 JPG/RAW 元数据，汇总相机型号与序列号。'
    },
    'camera-offset-apply': {
      title: '应用相机时间偏移',
      desc: '按相机规则设置分钟偏移，批量更新文件时间字段（创建时间尽力支持）。'
    },
    'photo-stats': {
      title: '光圈与焦距分布统计',
      desc: '扫描 RAW/JPG 元数据，统计常用光圈和焦距并导出图表。'
    },
    'feature-docs': {
      title: '功能说明与 Adobe 文档',
      desc: '支持按关键词检索功能说明，并可跳转 Adobe 官方文档。'
    }
  }
};

const LABEL_TEXT = {
  en: {
    copyXmpSourceDir: 'Source Directory',
    copyXmpDestinationDir: 'Destination Directory',
    extractGroupDirectoryPath: 'Directory Path',
    replaceGroupDirectoryPath: 'Directory Path',
    replaceGroupNewGroupName: 'New Group Name',
    removeTextDirectoryPath: 'Directory Path',
    removeTextValue: 'Text To Remove',
    replaceTextDirectoryPath: 'Directory Path',
    replaceTextOldTexts: 'Old Texts (line-separated)',
    replaceTextNewText: 'New Text',
    copyMatchedEditedDirectory: 'Edited Directory',
    copyMatchedSourceDirectory: 'Source Directory',
    copyMatchedDestinationDirectory: 'Destination Directory',
    copyMatchedSourceExtensions: 'Source Extensions (comma-separated)',
    gridMergeRootDirectory: 'Root Directory',
    moveByTimeSourceDirectory: 'Source Directory',
    moveByTimeDestinationDirectory: 'Destination Directory',
    moveByTimeSpecifiedTime: 'Specified Time (YYYY-MM-DD HH:mm:ss)',
    copyArwSourceFolder: 'Source Folder',
    copyArwDestinationFolder: 'Destination Folder',
    copyArwInterval: 'Interval',
    renameSeqFolderPath: 'Folder Path',
    renameSeqPrefix: 'Prefix',
    wechatCompressSourceDirectory: 'Source Directory',
    wechatCompressDestinationDirectory: 'Destination Directory',
    wechatCompressQuality: 'JPEG/WebP Quality (40-100)',
    cameraScanDirectoryPath: 'Directory Path',
    cameraApplyDirectoryPath: 'Directory Path',
    cameraOffsetsJson: 'Offset Rules (JSON)',
    photoStatsDirectoryPath: 'Photo Directory',
    photoStatsOutputDirectory: 'Output Directory',
    docsSearchInput: 'Search Keywords'
  },
  zh: {
    copyXmpSourceDir: '源目录',
    copyXmpDestinationDir: '目标目录',
    extractGroupDirectoryPath: '目录路径',
    replaceGroupDirectoryPath: '目录路径',
    replaceGroupNewGroupName: '新组名',
    removeTextDirectoryPath: '目录路径',
    removeTextValue: '待移除文本',
    replaceTextDirectoryPath: '目录路径',
    replaceTextOldTexts: '旧文本（每行一个）',
    replaceTextNewText: '新文本',
    copyMatchedEditedDirectory: '已修图目录',
    copyMatchedSourceDirectory: '原图目录',
    copyMatchedDestinationDirectory: '输出目录',
    copyMatchedSourceExtensions: '原图扩展名（逗号分隔）',
    gridMergeRootDirectory: '根目录',
    moveByTimeSourceDirectory: '源目录',
    moveByTimeDestinationDirectory: '目标目录',
    moveByTimeSpecifiedTime: '指定时间（YYYY-MM-DD HH:mm:ss）',
    copyArwSourceFolder: '源目录',
    copyArwDestinationFolder: '目标目录',
    copyArwInterval: '间隔值',
    renameSeqFolderPath: '目录路径',
    renameSeqPrefix: '前缀',
    wechatCompressSourceDirectory: '源目录',
    wechatCompressDestinationDirectory: '目标目录',
    wechatCompressQuality: 'JPEG/WebP 质量（40-100）',
    cameraScanDirectoryPath: '目录路径',
    cameraApplyDirectoryPath: '目录路径',
    cameraOffsetsJson: '偏移规则（JSON）',
    photoStatsDirectoryPath: '照片目录',
    photoStatsOutputDirectory: '输出目录',
    docsSearchInput: '检索关键词'
  }
};

const PLACEHOLDER_TEXT = {
  en: {
    copyXmpSourceDir: '/path/to/source',
    copyXmpDestinationDir: '/path/to/destination',
    extractGroupDirectoryPath: '/path/to/xmp/folder',
    replaceGroupDirectoryPath: '/path/to/xmp/folder',
    replaceGroupNewGroupName: 'My Preset Group',
    removeTextDirectoryPath: '/path/to/folder',
    removeTextValue: '[brand]',
    replaceTextDirectoryPath: '/path/to/folder',
    replaceTextOldTexts: 'old value 1\nold value 2',
    replaceTextNewText: 'replacement',
    copyMatchedEditedDirectory: '/path/to/edited',
    copyMatchedSourceDirectory: '/path/to/source',
    copyMatchedDestinationDirectory: '/path/to/destination',
    gridMergeRootDirectory: '/path/to/root',
    moveByTimeSourceDirectory: '/path/to/source',
    moveByTimeDestinationDirectory: '/path/to/destination',
    moveByTimeSpecifiedTime: '2024-02-21 13:20:00',
    copyArwSourceFolder: '/path/to/source',
    copyArwDestinationFolder: '/path/to/destination',
    renameSeqFolderPath: '/path/to/folder',
    wechatCompressSourceDirectory: '/path/to/source',
    wechatCompressDestinationDirectory: '/path/to/destination',
    cameraScanDirectoryPath: '/path/to/photos',
    cameraApplyDirectoryPath: '/path/to/photos',
    cameraOffsetsJson: '[{"cameraKey":"SONY ILCE-7M4::1234567","offsetMinutes":-3}]',
    photoStatsDirectoryPath: '/path/to/photos',
    photoStatsOutputDirectory: '/path/to/output',
    docsSearchInput: 'xmp / preset / capture time / focal length'
  },
  zh: {
    copyXmpSourceDir: '/照片/源目录',
    copyXmpDestinationDir: '/照片/目标目录',
    extractGroupDirectoryPath: '/预设/xmp目录',
    replaceGroupDirectoryPath: '/预设/xmp目录',
    replaceGroupNewGroupName: '我的预设分组',
    removeTextDirectoryPath: '/待处理目录',
    removeTextValue: '[品牌名]',
    replaceTextDirectoryPath: '/待处理目录',
    replaceTextOldTexts: '旧文本1\n旧文本2',
    replaceTextNewText: '替换文本',
    copyMatchedEditedDirectory: '/已修图目录',
    copyMatchedSourceDirectory: '/原图目录',
    copyMatchedDestinationDirectory: '/输出目录',
    gridMergeRootDirectory: '/根目录',
    moveByTimeSourceDirectory: '/源目录',
    moveByTimeDestinationDirectory: '/目标目录',
    moveByTimeSpecifiedTime: '2024-02-21 13:20:00',
    copyArwSourceFolder: '/源目录',
    copyArwDestinationFolder: '/目标目录',
    renameSeqFolderPath: '/待重命名目录',
    wechatCompressSourceDirectory: '/输入目录',
    wechatCompressDestinationDirectory: '/输出目录',
    cameraScanDirectoryPath: '/照片目录',
    cameraApplyDirectoryPath: '/照片目录',
    cameraOffsetsJson: '[{"cameraKey":"SONY ILCE-7M4::1234567","offsetMinutes":-3}]',
    photoStatsDirectoryPath: '/照片目录',
    photoStatsOutputDirectory: '/统计输出目录',
    docsSearchInput: 'xmp / 预设 / 拍摄时间 / 焦距'
  }
};

const FEATURE_DOCS = [
  {
    id: 'xmp-sidecar',
    tags: ['xmp', 'metadata', 'lightroom', 'adobe', 'sidecar'],
    title: {
      en: 'XMP Sidecar and Metadata Synchronization',
      zh: 'XMP 边车文件与元数据同步'
    },
    description: {
      en: 'Use this app\'s XMP copy/extract/replace tools together with Lightroom metadata sync workflow.',
      zh: '本应用的 XMP 复制/提取/替换功能可配合 Lightroom 的元数据同步流程使用。'
    },
    links: [
      {
        label: {
          en: 'Adobe: Create XMP files from metadata',
          zh: 'Adobe：根据元数据创建 XMP 文件'
        },
        url: 'https://helpx.adobe.com/lightroom-classic/help/create-xmp-acr-files.html'
      },
      {
        label: {
          en: 'Adobe: Metadata basics and actions',
          zh: 'Adobe：元数据基础与操作'
        },
        url: 'https://helpx.adobe.com/lightroom-classic/help/metadata-basics-actions.html'
      }
    ]
  },
  {
    id: 'preset-reference',
    tags: ['preset', 'lightroom', 'develop', 'xmp'],
    title: {
      en: 'Preset Workflow Reference',
      zh: '预设工作流参考'
    },
    description: {
      en: 'Understand preset creation/import/export rules and map preset-group operations to your XMP batch edits.',
      zh: '了解预设的创建/导入/导出规则，并将预设分组管理与本应用的 XMP 批处理能力配合。'
    },
    links: [
      {
        label: {
          en: 'Adobe: Apply and manage presets',
          zh: 'Adobe：应用与管理预设'
        },
        url: 'https://helpx.adobe.com/lightroom-classic/help/apply-presets.html'
      }
    ]
  },
  {
    id: 'capture-time',
    tags: ['capture time', 'timezone', 'metadata', 'raw', 'camera'],
    title: {
      en: 'Capture Time Adjustment and RAW Write Behavior',
      zh: '拍摄时间校正与 RAW 写入行为'
    },
    description: {
      en: 'This app supports per-camera offset. Adobe docs explain capture-time edit behavior and catalog options affecting RAW writes.',
      zh: '本应用支持按相机设置偏移。Adobe 文档说明了拍摄时间编辑机制及 RAW 写入相关目录设置。'
    },
    links: [
      {
        label: {
          en: 'Adobe: Capture time operation in metadata workflow',
          zh: 'Adobe：元数据工作流中的拍摄时间操作'
        },
        url: 'https://helpx.adobe.com/lightroom-classic/help/metadata-basics-actions.html'
      },
      {
        label: {
          en: 'Adobe: Catalog setting for writing date/time into proprietary RAW',
          zh: 'Adobe：将日期/时间写入专有 RAW 的目录设置'
        },
        url: 'https://helpx.adobe.com/lightroom-classic/help/create-catalogs.html'
      }
    ]
  },
  {
    id: 'metadata-fields',
    tags: ['exif', 'aperture', 'focal length', 'statistics', 'metadata panel'],
    title: {
      en: 'Aperture/Focal Metadata for Statistics',
      zh: '用于统计的光圈/焦距元数据'
    },
    description: {
      en: 'The photo stats page reads EXIF fields (for example FNumber and FocalLength) and renders distribution charts.',
      zh: '照片统计页会读取 EXIF 字段（如 FNumber、FocalLength），并生成分布图。'
    },
    links: [
      {
        label: {
          en: 'Adobe: Metadata panel and EXIF workflow',
          zh: 'Adobe：元数据面板与 EXIF 工作流'
        },
        url: 'https://helpx.adobe.com/lightroom-classic/help/metadata-basics-actions.html'
      }
    ]
  },
  {
    id: 'xmp-namespace',
    tags: ['xmp namespace', 'camera raw namespace', 'specification', 'developer'],
    title: {
      en: 'Adobe XMP Namespace Reference',
      zh: 'Adobe XMP 命名空间参考'
    },
    description: {
      en: 'For advanced metadata engineering (for example custom XMP processing), use Adobe XMP namespace definitions.',
      zh: '若要进行高级元数据处理（如自定义 XMP 解析/写入），可参考 Adobe XMP 命名空间定义。'
    },
    links: [
      {
        label: {
          en: 'Adobe Developer: XMP namespace definitions',
          zh: 'Adobe 开发者：XMP 命名空间定义'
        },
        url: 'https://developer.adobe.com/xmp/docs/XMPNamespaces/'
      }
    ]
  }
];

function t(key) {
  const localized = I18N[currentLocale] && I18N[currentLocale][key];
  if (localized) {
    return localized;
  }
  return I18N.en[key] || key;
}

function byId(id) {
  return document.getElementById(id);
}

function readInput(id) {
  const element = byId(id);
  return element ? element.value.trim() : '';
}

function setText(selector, value) {
  const element = document.querySelector(selector);
  if (element) {
    element.textContent = value;
  }
}

function setLabel(forId, value) {
  const element = document.querySelector(`label[for="${forId}"]`);
  if (element) {
    element.textContent = value;
  }
}

function setPlaceholder(id, value) {
  const element = byId(id);
  if (element) {
    element.placeholder = value;
  }
}

function setPageHeader(pageKey, title, description) {
  const page = document.querySelector(`.page[data-page="${pageKey}"]`);
  if (!page) {
    return;
  }

  const titleElement = page.querySelector('h3');
  if (titleElement) {
    titleElement.textContent = title;
  }

  const introParagraph = Array.from(page.children).find((child) => child.tagName === 'P');
  if (introParagraph) {
    introParagraph.textContent = description;
  }
}

function localizeResultPanels() {
  const resultPanels = Array.from(document.querySelectorAll('.result'));
  const knownStates = new Set(['Ready.', '准备就绪。', 'Running...', '执行中...']);

  resultPanels.forEach((panel) => {
    if (knownStates.has(panel.textContent.trim())) {
      panel.textContent = t('ready');
    }
  });
}

function applyLocale() {
  document.documentElement.lang = currentLocale === 'zh' ? 'zh-CN' : 'en';

  setText('.brand-card h1', 'PowerPhotoFile');
  setText('.brand-card p', t('brandSubtitle'));
  setText('.hero h2', t('heroTitle'));
  setText('.hero p', t('heroDesc'));

  setText('[data-nav-group="core"]', t('groupCore'));
  setText('[data-nav-group="wechat"]', t('groupWechat'));
  setText('[data-nav-group="camera"]', t('groupCamera'));
  setText('[data-nav-group="stats"]', t('groupStats'));
  setText('[data-nav-group="help"]', t('groupHelp'));

  Object.entries(NAV_TEXT[currentLocale]).forEach(([pageKey, text]) => {
    setText(`.nav-item[data-page="${pageKey}"]`, text);
  });

  Object.entries(PAGE_TEXT[currentLocale]).forEach(([pageKey, config]) => {
    setPageHeader(pageKey, config.title, config.desc);
  });

  Object.entries(LABEL_TEXT[currentLocale]).forEach(([id, label]) => {
    setLabel(id, label);
  });

  Object.entries(PLACEHOLDER_TEXT[currentLocale]).forEach(([id, value]) => {
    setPlaceholder(id, value);
  });

  const browseButtons = Array.from(document.querySelectorAll('.browse-btn'));
  browseButtons.forEach((button) => {
    button.textContent = t('browse');
  });

  const runButtons = Array.from(document.querySelectorAll('.run-btn'));
  runButtons.forEach((button) => {
    button.textContent = button.disabled ? t('running') : t('run');
  });

  const languageToggleBtn = byId('languageToggleBtn');
  if (languageToggleBtn) {
    languageToggleBtn.textContent = t('languageToggle');
  }

  const themeToggleBtn = byId('themeToggleBtn');
  if (themeToggleBtn) {
    themeToggleBtn.textContent = currentTheme === 'dark' ? t('themeLight') : t('themeDark');
  }

  localizeResultPanels();
  renderFeatureDocs();
}

function applyTheme() {
  document.documentElement.setAttribute('data-theme', currentTheme);
}

function toggleTheme() {
  currentTheme = currentTheme === 'dark' ? 'light' : 'dark';
  localStorage.setItem(THEME_STORAGE_KEY, currentTheme);
  applyTheme();
  applyLocale();
}

function toggleLocale() {
  currentLocale = currentLocale === 'zh' ? 'en' : 'zh';
  localStorage.setItem(LOCALE_STORAGE_KEY, currentLocale);
  applyLocale();
}

function writeResult(action, payload) {
  const panel = byId(`result-${action}`);
  if (!panel) {
    return;
  }

  if (typeof payload === 'string') {
    panel.textContent = payload;
    return;
  }

  panel.textContent = JSON.stringify(payload, null, 2);
}

function setButtonBusy(action, busy) {
  const button = document.querySelector(`.run-btn[data-action="${action}"]`);
  if (!button) {
    return;
  }

  button.disabled = busy;
  button.textContent = busy ? t('running') : t('run');
}

function parseLineSeparatedValues(raw) {
  return raw
    .split(/\r?\n/)
    .map((item) => item.trim())
    .filter((item) => item.length > 0);
}

function parseJsonOrThrow(raw) {
  if (!raw || !raw.trim()) {
    throw new Error(t('jsonEmpty'));
  }
  return JSON.parse(raw);
}

function setupNavigation() {
  const navItems = Array.from(document.querySelectorAll('.nav-item'));
  const pages = Array.from(document.querySelectorAll('.page'));

  navItems.forEach((item) => {
    item.addEventListener('click', () => {
      const targetPage = item.dataset.page;

      navItems.forEach((nav) => nav.classList.remove('active'));
      pages.forEach((page) => page.classList.remove('active'));

      item.classList.add('active');
      const page = document.querySelector(`.page[data-page="${targetPage}"]`);
      if (page) {
        page.classList.add('active');
      }
    });
  });
}

function setupBrowseButtons() {
  const browseButtons = Array.from(document.querySelectorAll('.browse-btn'));

  browseButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const targetId = button.dataset.target;
      if (!targetId || !api || typeof api.selectDirectory !== 'function') {
        return;
      }

      const result = await api.selectDirectory();
      if (!result || !result.ok || !result.data) {
        return;
      }

      const targetInput = byId(targetId);
      if (targetInput) {
        targetInput.value = result.data;
      }
    });
  });
}

const actionMap = {
  copyXmpFiles: {
    invoke: (payload) => api.copyXmpFiles(payload),
    payload: () => ({
      sourceDir: readInput('copyXmpSourceDir'),
      destinationDir: readInput('copyXmpDestinationDir')
    })
  },
  extractXmpGroupNames: {
    invoke: (payload) => api.extractXmpGroupNames(payload),
    payload: () => ({
      directoryPath: readInput('extractGroupDirectoryPath')
    })
  },
  replaceXmpGroupName: {
    invoke: (payload) => api.replaceXmpGroupName(payload),
    payload: () => ({
      directoryPath: readInput('replaceGroupDirectoryPath'),
      newGroupName: readInput('replaceGroupNewGroupName')
    })
  },
  removeTextFromFilenames: {
    invoke: (payload) => api.removeTextFromFilenames(payload),
    payload: () => ({
      directoryPath: readInput('removeTextDirectoryPath'),
      removeText: readInput('removeTextValue')
    })
  },
  batchReplaceTextInFiles: {
    invoke: (payload) => api.batchReplaceTextInFiles(payload),
    payload: () => ({
      directoryPath: readInput('replaceTextDirectoryPath'),
      oldTexts: parseLineSeparatedValues(readInput('replaceTextOldTexts')),
      newText: readInput('replaceTextNewText')
    })
  },
  copyMatchedSourceFiles: {
    invoke: (payload) => api.copyMatchedSourceFiles(payload),
    payload: () => ({
      editedDirectory: readInput('copyMatchedEditedDirectory'),
      sourceDirectory: readInput('copyMatchedSourceDirectory'),
      destinationDirectory: readInput('copyMatchedDestinationDirectory'),
      sourceExtensions: readInput('copyMatchedSourceExtensions')
    })
  },
  gridMergeByAspect: {
    invoke: (payload) => api.gridMergeByAspect(payload),
    payload: () => ({
      rootDirectory: readInput('gridMergeRootDirectory')
    })
  },
  moveImagesByCreateTime: {
    invoke: (payload) => api.moveImagesByCreateTime(payload),
    payload: () => ({
      sourceDirectory: readInput('moveByTimeSourceDirectory'),
      destinationDirectory: readInput('moveByTimeDestinationDirectory'),
      specifiedTime: readInput('moveByTimeSpecifiedTime')
    })
  },
  copyArwWithInterval: {
    invoke: (payload) => api.copyArwWithInterval(payload),
    payload: () => ({
      sourceFolder: readInput('copyArwSourceFolder'),
      destinationFolder: readInput('copyArwDestinationFolder'),
      interval: readInput('copyArwInterval')
    })
  },
  renameFilesWithContinuousNumbers: {
    invoke: (payload) => api.renameFilesWithContinuousNumbers(payload),
    payload: () => ({
      folderPath: readInput('renameSeqFolderPath'),
      prefix: readInput('renameSeqPrefix') || 'LZR'
    })
  },
  wechatCompressShortEdge1080: {
    invoke: (payload) => api.wechatCompressShortEdge1080(payload),
    payload: () => ({
      sourceDirectory: readInput('wechatCompressSourceDirectory'),
      destinationDirectory: readInput('wechatCompressDestinationDirectory'),
      quality: readInput('wechatCompressQuality')
    })
  },
  scanCameraDevices: {
    invoke: (payload) => api.scanCameraDevices(payload),
    payload: () => ({
      directoryPath: readInput('cameraScanDirectoryPath')
    })
  },
  applyCameraTimeOffsets: {
    invoke: (payload) => api.applyCameraTimeOffsets(payload),
    payload: () => ({
      directoryPath: readInput('cameraApplyDirectoryPath'),
      offsets: parseJsonOrThrow(readInput('cameraOffsetsJson'))
    })
  },
  analyzeApertureFocalDistribution: {
    invoke: (payload) => api.analyzeApertureFocalDistribution(payload),
    payload: () => ({
      directoryPath: readInput('photoStatsDirectoryPath'),
      outputDirectory: readInput('photoStatsOutputDirectory')
    })
  }
};

function setupActionButtons() {
  const runButtons = Array.from(document.querySelectorAll('.run-btn'));

  runButtons.forEach((button) => {
    button.addEventListener('click', async () => {
      const action = button.dataset.action;
      const config = actionMap[action];

      if (!config) {
        return;
      }

      setButtonBusy(action, true);
      writeResult(action, t('running'));

      try {
        const payload = config.payload();
        const result = await config.invoke(payload);

        if (result && result.ok) {
          writeResult(action, result.data);
        } else {
          writeResult(action, {
            error: result && result.error ? result.error : 'Unknown error'
          });
        }
      } catch (error) {
        writeResult(action, {
          error: error && error.message ? error.message : String(error)
        });
      } finally {
        setButtonBusy(action, false);
      }
    });
  });
}

function renderFeatureDocs() {
  const docsList = byId('docsList');
  if (!docsList) {
    return;
  }

  const keyword = readInput('docsSearchInput').toLowerCase();

  const filtered = FEATURE_DOCS.filter((doc) => {
    if (!keyword) {
      return true;
    }

    const merged = [
      ...(doc.tags || []),
      doc.title.en,
      doc.title.zh,
      doc.description.en,
      doc.description.zh,
      ...doc.links.map((item) => item.label.en),
      ...doc.links.map((item) => item.label.zh)
    ]
      .join(' ')
      .toLowerCase();

    return merged.includes(keyword);
  });

  docsList.innerHTML = '';

  if (filtered.length === 0) {
    const empty = document.createElement('div');
    empty.className = 'doc-card';
    empty.textContent = t('docsNoResult');
    docsList.appendChild(empty);
    return;
  }

  filtered.forEach((doc) => {
    const card = document.createElement('article');
    card.className = 'doc-card';

    const title = document.createElement('h4');
    title.textContent = doc.title[currentLocale] || doc.title.en;
    card.appendChild(title);

    const description = document.createElement('p');
    description.textContent = doc.description[currentLocale] || doc.description.en;
    card.appendChild(description);

    const tags = document.createElement('div');
    tags.className = 'doc-tags';
    (doc.tags || []).forEach((tag) => {
      const span = document.createElement('span');
      span.className = 'doc-tag';
      span.textContent = tag;
      tags.appendChild(span);
    });
    card.appendChild(tags);

    const links = document.createElement('div');
    links.className = 'doc-links';
    doc.links.forEach((item) => {
      const anchor = document.createElement('a');
      anchor.href = item.url;
      anchor.target = '_blank';
      anchor.rel = 'noopener noreferrer';
      anchor.textContent = item.label[currentLocale] || item.label.en;
      links.appendChild(anchor);
    });

    card.appendChild(links);
    docsList.appendChild(card);
  });
}

function setupDocsSearch() {
  const input = byId('docsSearchInput');
  if (!input) {
    return;
  }

  input.addEventListener('input', () => {
    renderFeatureDocs();
  });
}

function setupGlobalToggles() {
  const languageButton = byId('languageToggleBtn');
  if (languageButton) {
    languageButton.addEventListener('click', () => {
      toggleLocale();
    });
  }

  const themeButton = byId('themeToggleBtn');
  if (themeButton) {
    themeButton.addEventListener('click', () => {
      toggleTheme();
    });
  }
}

function bootstrap() {
  if (!api) {
    return;
  }

  applyTheme();
  setupNavigation();
  setupBrowseButtons();
  setupActionButtons();
  setupDocsSearch();
  setupGlobalToggles();
  applyLocale();
}

bootstrap();
