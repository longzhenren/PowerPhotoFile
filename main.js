const path = require('path');
const { app, BrowserWindow, dialog, ipcMain, shell } = require('electron');
const service = require('./lib/powerPhotoService');
const advancedService = require('./lib/advancedPhotoService');

function createMainWindow() {
  const mainWindow = new BrowserWindow({
    width: 1380,
    height: 920,
    minWidth: 1120,
    minHeight: 760,
    backgroundColor: '#f4f2ec',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: false
    }
  });

  mainWindow.loadFile(path.join(__dirname, 'src/index.html'));

  mainWindow.webContents.setWindowOpenHandler(({ url }) => {
    shell.openExternal(url);
    return { action: 'deny' };
  });

  mainWindow.webContents.on('will-navigate', (event, url) => {
    if (!url.startsWith('file://')) {
      event.preventDefault();
      shell.openExternal(url);
    }
  });
}

function registerHandler(channel, handler) {
  ipcMain.handle(channel, async (_event, payload) => {
    try {
      const data = await handler(payload || {});
      return { ok: true, data };
    } catch (error) {
      return {
        ok: false,
        error: error && error.message ? error.message : String(error)
      };
    }
  });
}

function registerIpcHandlers() {
  ipcMain.handle('dialog:select-directory', async () => {
    const result = await dialog.showOpenDialog({
      properties: ['openDirectory', 'createDirectory']
    });

    if (result.canceled || !result.filePaths[0]) {
      return { ok: true, data: null };
    }

    return { ok: true, data: result.filePaths[0] };
  });

  registerHandler('ppf:copy-xmp-files', service.copyXmpFiles);
  registerHandler('ppf:extract-xmp-group-names', service.extractXmpGroupNames);
  registerHandler('ppf:replace-xmp-group-name', service.replaceXmpGroupName);
  registerHandler('ppf:remove-text-from-filenames', service.removeTextFromFilenames);
  registerHandler('ppf:batch-replace-text-in-files', service.batchReplaceTextInFiles);
  registerHandler('ppf:copy-matched-source-files', service.copyMatchedSourceFiles);
  registerHandler('ppf:grid-merge-by-aspect', service.gridMergeByAspect);
  registerHandler('ppf:move-images-by-create-time', service.moveImagesByCreateTime);
  registerHandler('ppf:copy-arw-with-interval', service.copyArwWithInterval);
  registerHandler('ppf:rename-files-with-continuous-numbers', service.renameFilesWithContinuousNumbers);
  registerHandler('ppf:wechat-compress-short-edge-1080', advancedService.wechatCompressShortEdge1080);
  registerHandler('ppf:scan-camera-devices', advancedService.scanCameraDevices);
  registerHandler('ppf:apply-camera-time-offsets', advancedService.applyCameraTimeOffsets);
  registerHandler('ppf:analyze-aperture-focal-distribution', advancedService.analyzeApertureAndFocalDistribution);
}

app.whenReady().then(() => {
  registerIpcHandlers();
  createMainWindow();

  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) {
      createMainWindow();
    }
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') {
    app.quit();
  }
});
