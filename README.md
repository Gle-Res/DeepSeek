# DeepSeek

> 一个轻量、纯粹的 DeepSeek 桌面客户端包装器。基于 Electron 构建，提供原生 Windows 体验，内置一键下载DeepSeek Harness功能。

![License](https://img.shields.io/badge/License-MIT-blue.svg)
![Platform](https://img.shields.io/badge/Platform-Windows-blue.svg)
![Electron](https://img.shields.io/badge/Electron-28.x-9feaf9.svg)

---

## 📖 项目简介

**DeepSeek** 是一个第三方桌面包装器，用于将 DeepSeek 官方网页版（chat.deepseek.com）封装成一个独立的 Windows 桌面应用。

它基于 Electron 框架开发，保留了 Windows 原生标题栏的稳定交互体验，同时去除了冗余的浏览器菜单和开发者调试功能，让用户能像使用原生软件一样使用 DeepSeek。

本软件**不是** DeepSeek 官方产品，与 DeepSeek 官方没有任何隶属、赞助或授权关系。所有网页内容版权归 DeepSeek 官方所有。

---

## ✨ 核心特性

### 🖥️ 原生 Windows 体验
- **保留 Windows 原生标题栏**：最小化、最大化、关闭按钮完全由系统接管，交互流畅稳定。
- **隐藏 Electron 默认菜单栏**：去除冗余菜单，界面更纯净。

### 🔒 隐私与安全
- **屏蔽 F12 开发者调试**：禁用 `F12` 和 `Ctrl+Shift+I`，防止误触开发者工具。
- **本地数据缓存**：网页缓存保存在程序目录下的 `resources/app/cache`，不污染系统用户目录。

### 📦 一键下载 Harness
- **右键菜单集成**：在网页任意位置右键，选择“下载 DeepSeek Harness”即可触发。
- **GUI 下载器**：弹出图形化下载窗口，选择保存路径，文件名锁定为原生安装包名称，显示实时下载速度和进度，下载完成后自动运行安装包。

### 🛠️ 专业安装与卸载
- **Inno Setup 安装包**：提供标准的 Windows 安装程序，支持自定义安装路径、桌面快捷方式、开始菜单快捷方式。
- **自带卸载程序**：安装后可通过控制面板或开始菜单卸载，卸载时自动清理缓存文件。
- **自定义图标**：安装向导、卸载程序图标均为自定义图标。

- ---

## 🚀 快速开始

### 系统要求
- Windows 10 / 11（64 位）
- 无需安装 Node.js、Python 或任何运行环境（安装包已内置所有依赖）

### 安装步骤
1. 从 Releases 页面下载最新版 `DeepSeek_Setup.exe`。
2. 双击运行安装程序。
3. 选择安装路径（默认 `D:\Program Files (x86)\DeepSeek`）。
4. 选择是否创建桌面快捷方式。
5. 点击“安装”，等待完成。
6. 安装完成后，程序会自动启动，桌面和开始菜单会出现 `DeepSeek` 图标。

### 卸载步骤
1. 打开 `控制面板` -> `程序和功能`。
2. 找到 `DeepSeek`，点击“卸载”。
3. 或者直接在开始菜单中点击 `卸载 DeepSeek`。
4. 卸载程序会自动清理程序文件和缓存目录。

---

## 🔧 技术栈

| 组件 | 用途 |
| :--- | :--- |
| **Electron 28.0** | 桌面应用框架 |
| **Node.js** | 主进程运行环境 |
| **Python 3.12** | 下载器脚本（打包为独立 EXE） |
| **PyInstaller** | 将 Python 脚本打包为无控制台单文件 EXE |
| **Inno Setup** | 制作 Windows 安装包与卸载程序 |

---

## ⚠️ 免责声明

1. 本软件为第三方非官方包装器，**与 DeepSeek 官方无关**。
2. 本软件仅用于个人学习、技术研究和非商业用途。
3. 本软件加载的所有内容均来自 `https://chat.deepseek.com`，其版权归 DeepSeek 官方所有。
4. 用户在使用本软件时产生的一切数据交互，均适用 DeepSeek 官方的《用户协议》和《隐私政策》。
5. 本软件按“原样”提供，不提供任何明示或暗示的担保。作者不对因使用本软件而产生的任何直接或间接损害负责。

---

## 📄 版权声明

`Copyright (c) 2026 Gle-Res. All Rights Reserved.`

本软件为开源项目，遵循 MIT 协议。你可以自由使用、修改和分发，但需保留原作者版权声明。

---

## 🙏 致谢

- Electron
- Inno Setup
- PyInstaller
- DeepSeek 官方提供的网页服务

---

## 📬 联系与反馈

- GitHub Issues: 提交问题
- 项目地址: https://github.com/Gle-Res/DeepSeek

---

**如果你觉得这个项目有用，欢迎给个 ⭐ Star 支持一下！**
