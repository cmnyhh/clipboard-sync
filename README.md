# ClipboardSync

跨平台剪贴板同步工具，支持 macOS、Linux 和 Windows。

## 功能特性

- 📋 实时同步剪贴板内容（文本、图片、文件）
- 🔄 自动发现局域网设备
- 🚀 基于 WebSocket 的高速传输
- 🎨 现代化 UI 界面
- 🔒 局域网直连，无需云端服务

## 技术栈

- **后端**: Rust + Tauri
- **前端**: React + TypeScript + Tailwind CSS
- **网络**: WebSocket (tokio-tungstenite)
- **剪贴板**: arboard

## 开发环境要求

### Rust
```bash
curl --proto '=https' --tlsv1.2 -sSf https://sh.rustup.rs | sh
```

### Node.js
推荐使用 Node.js 18+ 和 npm 9+

### Tauri 系统依赖

#### macOS
```bash
xcode-select --install
```

#### Linux (Ubuntu/Debian)
```bash
sudo apt update
sudo apt install libwebkit2gtk-4.0-dev \
    build-essential \
    curl \
    wget \
    file \
    libxdo-dev \
    libssl-dev \
    libayatana-appindicator3-dev \
    librsvg2-dev
```

#### Windows
需要安装 Visual Studio C++ Build Tools 和 WebView2。

## 快速开始

1. 安装依赖
```bash
npm install
```

2. 开发模式运行
```bash
npm run tauri dev
```

3. 构建生产版本
```bash
npm run tauri build
```

## 项目结构

```
clipboard-sync/
├── src/                    # 前端代码
│   ├── components/         # React 组件
│   ├── store/              # 状态管理
│   ├── lib/                # 工具函数
│   └── styles/             # 样式文件
├── src-tauri/              # Rust 后端
│   └── src/
│       ├── main.rs         # 入口文件
│       ├── clipboard.rs    # 剪贴板管理
│       └── network.rs      # 网络通信
├── package.json
└── tauri.conf.json
```

## 使用说明

1. 启动应用后，一台电脑点击「创建房间」
2. 其他电脑输入房间地址点击「连接」
3. 连接成功后，剪贴板内容会自动同步

## 许可证

MIT License
