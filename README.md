# autocut-skills

AI 驱动的口播视频自动剪辑工具，专为播客和口播视频设计。通过火山引擎 ASR 进行语音转录，AI 辅助识别需要删除的片段，并在浏览器中可视化确认后导出最终剪辑。

## 效果演示

!\[主界面预览]\(./assets/demo.png)

## 为什么选择 autocut-skills？

同类视频剪辑skills工具，功能单一，仅包含语音转文字，自动删除重复语句等基础功能，对进一步视频创造有较大局限性。本项目新增了字幕样式调节、倍速、音量调节、操作撤销、背景音乐和转场效果等常用功能，更加符合大众对于口播剪辑的需求。

## 功能展示

<table>
  <tr>
    <td><img src="./assets/功能区1.png" alt="功能区展示1"/></td>
    <td><img src="./assets/功能区2.png" alt="功能区展示2"/></td>
  </tr>
</table>

## 与同类项目对比

### 与 videocut-skills / videocut 对比

| 功能           | videocut-skills          | videocut                 | autocut-skills           |
| ------------ | :----------------------- | ------------------------ | :----------------------- |
| **Web 预览界面** | ✅ 基础审核页面                 | ✅ 基础审核页面                 | ✅ 完整的 React UI，支持实时预览    |
| **语义理解**     | ✅AI 逐句分析，识别重说/纠正/卡顿      | ✅AI 逐句分析，识别重说/纠正/卡顿      | ✅AI 逐句分析，识别重说/纠正/卡顿      |
| **静音检测**     | ✅>0.3s 自动标记，可调阈值         | ✅>0.3s 自动标记，可调阈值         | ✅>0.3s 自动标记，可调阈值         |
| **重复句检测**    | ✅相邻句开头≥5字相同 → 删前保后       | ✅相邻句开头≥5字相同 → 删前保后       | ✅相邻句开头≥5字相同 → 删前保后       |
| **句内重复**     | ✅"好我们接下来好我们接下来做" → 删重复部分 | ✅"好我们接下来好我们接下来做" → 删重复部分 | ✅"好我们接下来好我们接下来做" → 删重复部分 |
| **词典纠错**     | ✅自定义专业术语词典               | ✅自定义专业术语词典               | ✅自定义专业术语词典               |
| **自更新**      | ✅记住你的偏好，越用越准             | ✅记住你的偏好，越用越准             | ✅记住你的偏好，越用越准             |
| **音量调节预览**   | ❌ 仅导出时生效                 | ❌ 仅导出时生效                 | ✅ 实时音量调节效果               |
| **背景音乐预览**   | ❌ 无此功能                   | ❌ 无此功能                   | ✅ 实时背景音乐预览               |
| **倍速导出**     | ❌ 无此功能                   | ❌ 无此功能                   | ✅ 支持倍速并自动同步字幕            |
| **字幕样式**     | ❌ 固定样式                   | Json代码调节                 | ✅ 可视化调节字号/颜色/描边/宽度       |
| **字幕宽度控制**   | ❌ 无此功能                   | Json代码调节                 | ✅ 自动换行，可调节宽度百分比          |
| **音频效果**     | ❌ 无此功能                   | ❌ 无此功能                   | ✅ 降噪/人声增强/淡入淡出           |
| **转场效果**     | ❌ 无此功能                   | ❌ 无此功能                   | ✅ 淡入淡出/溶解/擦除             |
| **批量导出**     | ❌ 单项目处理                  | ❌ 单项目处理                  | ✅ 多项目合并导出                |
| 操作撤回         | ❌                        | ❌                        | ✅支持操作撤回和回滚               |

<br />

## 快速开始

### 1. 安装

```bash
# 全局安装
npm install -g @jasonypro/autocut

# 验证安装
autocut --help
```

### 2. 环境要求

- Node.js 18+
- FFmpeg
- 火山引擎 API Key

```bash
# macOS 安装 FFmpeg
brew install ffmpeg

# Ubuntu 安装 FFmpeg
sudo apt install ffmpeg

# 配置 API Key
export VOLCENGINE_API_KEY="your_api_key"
```

### 3. 完整使用流程

```
┌─────────────────────────────────────────────────────────┐
│  Step 1: 转录视频                                       │
│                                                         │
│  autocut transcribe video.mp4 -o output/demo            │
│                                                         │
│  • 提取音频                                             │
│  • 上传火山引擎 ASR                                     │
│  • 生成字级别时间戳                                     │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Step 2: 生成字幕结构                                   │
│                                                         │
│  autocut generate-subtitles output/demo/1_transcribe/   │
│                         volcengine_result.json          │
│                                                         │
│  • 转换为可编辑的字幕结构                               │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Step 3: 生成可读文本（可选，用于 AI 审核）             │
│                                                         │
│  autocut generate-readable output/demo/common/          │
│                         subtitles_words.json            │
│                                                         │
│  • 生成人类可读的文本格式                               │
│  • 可用于 AI 分析和建议删除片段                         │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Step 4: 应用 AI 编辑建议（可选）                       │
│                                                         │
│  autocut apply-edits subtitles.json edits.json          │
│                                                         │
│  • 合并 AI 建议的删除片段                               │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Step 5: 启动审核服务器                                 │
│                                                         │
│  autocut review-server 8899 --path output/demo          │
│                                                         │
│  • 打开浏览器访问 http://localhost:8899                 │
│  • 可视化审核删除片段                                   │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  【Web 审核界面】                                       │
│                                                         │
│  • 单击跳转播放                                         │
│  • 双击选中/取消                                        │
│  • Shift 拖动多选                                       │
│  • 调节音量/背景音乐（实时预览）                        │
│  • 调节字幕样式/宽度（实时预览）                        │
│  • 设置倍速/转场效果                                    │
│  • 点击「执行剪辑」导出                                 │
└─────────────────────────────────────────────────────────┘
                            ↓
┌─────────────────────────────────────────────────────────┐
│  Step 6: 导出视频                                       │
│                                                         │
│  • FFmpeg 精确剪辑                                      │
│  • 自动字幕同步（倍速时自动调整时间戳）                 │
│  • 烧录字幕（可选）                                     │
│  • 添加背景音乐（可选）                                 │
│  • 应用音频效果（可选）                                 │
└─────────────────────────────────────────────────────────┘
```

## CLI 命令

| 命令                                        | 说明                         |
| ----------------------------------------- | -------------------------- |
| `autocut transcribe <video>`              | 通过火山引擎 ASR 转录视频，输出字级别 JSON |
| `autocut generate-subtitles <json>`       | 将原始转录转换为可编辑的字幕结构           |
| `autocut generate-readable <subtitles>`   | 生成人类可读的文本，用于 AI 分析         |
| `autocut apply-edits <subtitles> <edits>` | 合并 AI 编辑建议到字幕文件            |
| `autocut review-server [port]`            | 启动 Web 审核界面                |
| `autocut cut <video> <segments>`          | 使用 FFmpeg 执行最终剪辑           |

## 典型工作流

```bash
# 1. 转录视频（支持热词）
autocut transcribe input.mp4 -o output/demo --hotwords hotwords.txt

# 2. 生成字幕结构
autocut generate-subtitles output/demo/1_transcribe/volcengine_result.json

# 3. 生成可读文本（用于 AI 审核）
autocut generate-readable output/demo/common/subtitles_words.json -o output/demo/2_analysis/readable.txt

# 4. 应用 AI 编辑建议
autocut apply-edits output/demo/common/subtitles_words.json output/demo/2_analysis/edits.json

# 5. 启动审核服务器
autocut review-server 8899 --path output/demo
```

### 热词文件

创建一个纯文本文件，每行一个专业术语：

```txt
Claude Code
MCP
API
GitHub
TypeScript
FFmpeg
```

如果提供了 `--hotwords` 参数，热词列表会提交给火山引擎 ASR，并记录到 `1_transcribe/hotwords_used.json`。

## 功能详解

### 🎬 视频剪辑

- 精确 FFmpeg 剪辑，支持硬件加速（NVENC / VideoToolbox）
- 自动音频偏移补偿
- 多片段合并导出

### 📝 字幕处理

- 可视化字幕样式调节（字号、颜色、描边、位置）
- 字幕宽度控制，自动换行
- 倍速导出时自动同步字幕时间戳

### 🎵 音频效果

- 实时音量调节预览
- 背景音乐添加（支持示例音乐和自定义上传）
- 降噪、人声增强
- 淡入淡出效果

### 🎨 转场效果

- 淡入淡出
- 溶解
- 左擦除 / 右擦除

### 🌐 Web 界面

- 深色/浅色主题切换
- 中英文国际化
- 实时预览所有效果

## 开发

```bash
# 安装依赖
cd autocut-cli && npm install
cd ../autocut-ui && npm install

# 构建 UI（输出到 autocut-cli/static/）
cd autocut-ui && npm run build

# 构建 CLI
cd ../autocut-cli && npm run build

# 运行 UI 开发服务器（热重载）
cd autocut-ui && npm run dev

# 在另一个终端启动后端
node autocut-cli/bin/autocut.js review-server 8899 -p output/
```

## 项目结构

```
autocut/
├── assets/                    # 图片资源
├── autocut-cli/               # CLI 包 (TypeScript + Commander)
│   ├── bin/                   #   入口脚本
│   │   └── autocut.js         #   命令入口
│   ├── src/
│   │   ├── commands/          #   CLI 命令
│   │   │   ├── transcribe.ts
│   │   │   ├── generate-subtitles.ts
│   │   │   ├── generate-readable.ts
│   │   │   ├── apply-edits.ts
│   │   │   ├── review-server.ts
│   │   │   └── cut-video.ts
│   │   └── core/              #   核心功能
│   │       ├── video.ts       #   视频处理
│   │       ├── subtitle.ts    #   字幕处理
│   │       └── ...
│   └── static/                #   编译后的 UI 资源
├── autocut-ui/                # Web 审核界面 (React + Vite)
│   └── src/
│       ├── components/        #   React 组件
│       ├── hooks/             #   自定义 Hooks
│       ├── i18n.ts            #   国际化
│       ├── api.ts             #   API 客户端
│       └── style.css          #   全局样式
└── output/                    #   处理后的视频工作目录
```

## 环境变量

| 变量                   | 说明                              |
| -------------------- | ------------------------------- |
| `VOLCENGINE_API_KEY` | 火山引擎 ASR 服务的 API Key（录音文件识别大模型） |

## 致谢

本项目参考了以下项目：

- [videocut-skills](https://github.com/Ceeon/videocut-skills) - 用 Claude Code Skills 构建的视频剪辑 Agent
- [videocut](https://github.com/sunnyswag/videocut) - 口播视频剪辑 CLI 工具

## License

MIT
