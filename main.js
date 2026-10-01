// main.js
const { app, BrowserWindow, globalShortcut, ipcMain, Menu } = require('electron');
const path = require('path');
const { spawn } = require('child_process');
const fs = require('fs');

// ================= 1. 设置缓存路径 =================
const exeDir = path.dirname(process.execPath);
let cachePath;

if (app.isPackaged) {
    cachePath = path.join(exeDir, 'resources', 'app', 'cache');
} else {
    cachePath = path.join(__dirname, 'resources', 'app', 'cache');
}

if (!fs.existsSync(cachePath)) {
    fs.mkdirSync(cachePath, { recursive: true });
}
app.setPath('userData', cachePath);

let mainWindow;

function createWindow() {
    mainWindow = new BrowserWindow({
        width: 1200,
        height: 800,
        frame: true, // 保持 Windows 原生标题栏
        autoHideMenuBar: true, // 核心：自动隐藏顶部菜单栏
        webPreferences: {
            nodeIntegration: true,
            contextIsolation: false,
            webSecurity: false
        }
    });

    mainWindow.loadURL('https://chat.deepseek.com');

    // ================= 2. 拦截 F12 =================
    mainWindow.webContents.on('before-input-event', (event, input) => {
        if (input.key === 'F12') event.preventDefault();
        if (input.control && input.shift && input.key.toLowerCase() === 'i') event.preventDefault();
    });

    // ================= 3. 自定义中文右键菜单 (加入下载选项) =================
    mainWindow.webContents.on('context-menu', (e, params) => {
        e.preventDefault(); 
        const menu = Menu.buildFromTemplate([
            { label: '撤销', role: 'undo' },
            { label: '重做', role: 'redo' },
            { type: 'separator' },
            { label: '剪切', role: 'cut' },
            { label: '复制', role: 'copy' },
            { label: '粘贴', role: 'paste' },
            { label: '全选', role: 'selectAll' },
            { type: 'separator' },
            { 
                label: '下载 DeepSeek Harness', 
                click: () => {
                    // 触发下载逻辑
                    mainWindow.webContents.send('trigger-download'); 
                }
            },
            { type: 'separator' },
            { label: '刷新页面', role: 'reload' }
        ]);
        menu.popup();
    });

    // ================= 4. 处理下载按钮 (静默调用 EXE) =================
    ipcMain.on('start-download-harness', () => {
        let harnessExePath;
        if (app.isPackaged) {
            harnessExePath = path.join(process.resourcesPath, 'app', 'DownloadHarness.exe');
        } else {
            harnessExePath = path.join(__dirname, 'resources', 'app', 'DownloadHarness.exe');
        }

        if (fs.existsSync(harnessExePath)) {
            const child = spawn(harnessExePath, [], { detached: true, stdio: 'ignore' });
            child.unref(); 
        } else {
            console.error('找不到 DownloadHarness.exe，请检查路径！');
        }
    });

    // 将网页发来的信号转发给主进程处理
    mainWindow.webContents.on('did-finish-load', () => {
        mainWindow.webContents.executeJavaScript(`
            const { ipcRenderer } = require('electron');
            ipcRenderer.on('trigger-download', () => {
                ipcRenderer.send('start-download-harness');
            });
        `);
    });
}

// ================= 5. 启动应用 =================
app.whenReady().then(() => {
    createWindow();
    globalShortcut.register('CommandOrControl+Shift+I', () => false);
});

app.on('window-all-closed', () => {
    if (process.platform !== 'darwin') {
        app.quit();
    }
});