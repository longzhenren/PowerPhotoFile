const { contextBridge, ipcRenderer } = require('electron');

function invoke(channel, payload) {
  return ipcRenderer.invoke(channel, payload);
}

contextBridge.exposeInMainWorld('powerPhotoApi', {
  selectDirectory: () => invoke('dialog:select-directory'),
  copyXmpFiles: (payload) => invoke('ppf:copy-xmp-files', payload),
  extractXmpGroupNames: (payload) => invoke('ppf:extract-xmp-group-names', payload),
  replaceXmpGroupName: (payload) => invoke('ppf:replace-xmp-group-name', payload),
  removeTextFromFilenames: (payload) => invoke('ppf:remove-text-from-filenames', payload),
  batchReplaceTextInFiles: (payload) => invoke('ppf:batch-replace-text-in-files', payload),
  copyMatchedSourceFiles: (payload) => invoke('ppf:copy-matched-source-files', payload),
  gridMergeByAspect: (payload) => invoke('ppf:grid-merge-by-aspect', payload),
  moveImagesByCreateTime: (payload) => invoke('ppf:move-images-by-create-time', payload),
  copyArwWithInterval: (payload) => invoke('ppf:copy-arw-with-interval', payload),
  renameFilesWithContinuousNumbers: (payload) => invoke('ppf:rename-files-with-continuous-numbers', payload),
  wechatCompressShortEdge1080: (payload) => invoke('ppf:wechat-compress-short-edge-1080', payload),
  scanCameraDevices: (payload) => invoke('ppf:scan-camera-devices', payload),
  applyCameraTimeOffsets: (payload) => invoke('ppf:apply-camera-time-offsets', payload),
  analyzeApertureFocalDistribution: (payload) => invoke('ppf:analyze-aperture-focal-distribution', payload)
});
