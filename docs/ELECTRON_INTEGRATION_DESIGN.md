# PowerPhotoFile Electron 集成设计

## 1. 目标
- 将现有 `PowerPhotoFile` 的全部能力整合为一个 Electron 桌面应用。
- 每个功能独立为一个子页面，统一入口，支持 macOS 和 Windows。
- 打包产物包含运行所需环境（Node/Electron + 原生依赖），避免依赖外部 Python 运行时。

## 2. 原脚本功能拆解与页面映射

| 子页面 | 对应原脚本/新增能力 | 功能说明 |
|---|---|---|
| 1. 复制 XMP 文件 | `BatchEditPSLRXMPTemplate.py` | 递归复制 `.xmp` 到目标目录 |
| 2. 提取 XMP 组名 | `BatchEditPSLRXMPTemplate.py` | 递归扫描并汇总 `<crs:Group>` 组名 |
| 3. 批量替换 XMP 组名 | `BatchEditPSLRXMPTemplate.py` | 将组名统一替换为目标值 |
| 4. 文件名移除文本 | `BatchEditPSLRXMPTemplate.py` | 递归移除文件名中的指定文本 |
| 5. 文件内容批量替换 | `BatchEditPSLRXMPTemplate.py` | 递归替换文件文本（支持多个旧文本） |
| 6. 按修图结果拷贝同名原图 | `CopyRawFiles.py` | 以已修图文件名为基准，从原图目录拷贝同名文件 |
| 7. 多比例宫格拼图 | `GridMerge94.py` | 按比例分组后生成 3x3/2x2/1xM 拼图 |
| 8. 按创建时间移动图片 | `MoveByCreateTime.py` | 递归移动晚于指定时间的图片 |
| 9. 延时摄影间隔复制 ARW | `TimeLapseIntervalModify.py` | 每隔 N 个 ARW 文件拷贝 1 个 |
| 10. 延时摄影连续编号重命名 | `TimeLapseIntervalModify.py` | 为文件添加连续序号前缀 |
| 11. 微信朋友圈短边压缩 1080 | 新增 | 按比例压缩图片，短边限制到 1080 像素 |
| 12. 微信朋友圈宫格长图生成 | 新增 | 将单图切分为 4/6/9 宫格并生成居中竖版长图序列 |
| 13. 相机机型/序列号扫描 | 新增 | 扫描目录并识别相机型号和机身序列号 |
| 14. 相机时间偏移批量应用 | 新增 | 按机型序列号偏移分钟数，更新文件时间属性 |
| 15. 光圈与焦距分布统计图 | 新增 | 扫描 RAW/JPG 元数据并输出统计图与 JSON |

## 3. 技术架构

### 3.1 进程分层
- Main Process (`main.js`)
  - 注册 `ipcMain.handle`。
  - 执行所有文件系统和图像处理逻辑。
- Preload (`preload.js`)
  - 通过 `contextBridge` 暴露白名单 API。
  - 禁止 Renderer 直接访问 Node。
- Renderer (`renderer.js` + `index.html`)
  - 多子页面导航与表单。
  - 展示任务结果与错误信息。

### 3.2 关键依赖
- `electron`：桌面应用框架。
- `sharp`：跨平台图像缩放与拼接（替代 PIL）。
- `electron-builder`：mac/win 打包。

## 4. 页面与交互
- 左侧导航 + 右侧内容区。
- 每个子页面包含：输入参数、执行按钮、结果面板。
- 路径以文本输入为主（跨平台稳定）；后续可扩展原生目录选择器。
- 顶部提供中英文切换按钮与深浅色模式切换按钮。
- 提供 `Feature Guide & Adobe Docs` 说明页，支持关键词检索和 Adobe 官方文档跳转。

## 5. 功能实现约束
- 文件处理默认递归遍历。
- 输出文件冲突采用自动重命名（保留原文件）。
- 文本文件读取优先 UTF-8，失败回退 Latin-1。
- 长任务返回统计摘要（处理数量、跳过数量、错误数量）。

## 6. 打包策略（macOS + Windows）
- 使用 `electron-builder`：
  - macOS：`dmg` + `zip`
  - Windows：`nsis` + `portable`
- 命令：
  - `npm run dist:mac`
  - `npm run dist:win`
- 不依赖 Python 解释器，直接随应用分发 Node/Electron 运行环境。

## 7. 交付物
- Electron 应用源码。
- 完整功能页面（15 个子页面）。
- 打包配置（mac/win）。
- README（开发、运行、打包说明）。
