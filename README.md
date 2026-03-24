# PowerPhotoFile (Electron Edition)

摄影工作流工具集，已将原仓库脚本能力整合为一个 Electron 桌面应用，支持 macOS 和 Windows。

## 界面支持
- 中英文切换（侧边栏顶部按钮）
- 深浅色模式切换（侧边栏顶部按钮）
- 功能说明检索页（`Feature Guide & Adobe Docs`）

## 设计文档
- 见 `docs/ELECTRON_INTEGRATION_DESIGN.md`

## 功能列表（每个功能一个子页面）
1. Copy XMP Files
2. Extract XMP Group Names
3. Replace XMP Group Name
4. Remove Text In File Names
5. Batch Replace Text In Files
6. Copy Matched Source Files
7. Grid Merge Collage
8. Move Images By Create Time
9. Copy ARW With Interval
10. Rename Files Sequentially
11. WeChat Moments: Short Edge 1080 Compression
12. Scan Camera Model And Serial
13. Apply Camera Time Offsets
14. Aperture And Focal Distribution
15. Feature Guide & Adobe Docs（可检索说明并跳转 Adobe 官方文档）

## Adobe 官方参考（已接入说明页）
- Lightroom Classic：创建 XMP/ACR 边车文件  
  https://helpx.adobe.com/lightroom-classic/help/create-xmp-acr-files.html
- Lightroom Classic：元数据基础与操作  
  https://helpx.adobe.com/lightroom-classic/help/metadata-basics-actions.html
- Lightroom Classic：预设的应用与管理  
  https://helpx.adobe.com/lightroom-classic/help/apply-presets.html
- Lightroom Classic：目录设置（含将日期/时间写入专有 RAW 的选项）  
  https://helpx.adobe.com/lightroom-classic/help/create-catalogs.html
- Adobe Developer：XMP 命名空间定义  
  https://developer.adobe.com/xmp/docs/XMPNamespaces/

## 技术实现
- Electron 主进程负责文件与图像处理。
- Preload 暴露白名单 API（`contextIsolation` 开启）。
- Renderer 提供多子页面表单操作界面。
- 图像处理使用 `sharp`（跨平台原生库）。

## 开发运行

```bash
npm install
npm run dev
```

## 打包

```bash
# macOS
npm run dist:mac

# Windows
npm run dist:win
```

输出目录：`release/`

## 说明
- 原始 Python 脚本仍保留在仓库中，便于对照。
- 文件操作属于批处理，建议先在小样本目录验证后再处理正式素材。

## 版权
- Amur（github.com/longzhenren amurzzb@gmail.com）
