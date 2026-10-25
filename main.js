const { app, BrowserWindow, Menu, Tray, globalShortcut, shell, dialog, net, nativeTheme, WebContentsView, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { execFile } = require('child_process');

let mainWindow = null;
let tray = null;
let isQuitting = false;
let webView = null; 
let currentTheme = 'windows';

const CURRENT_VERSION = "v2.1.0";
const VERSION_URL = "https://raw.githubusercontent.com/Gle-Res/DeepSeek/main/version.json";

// ================= 路径配置 =================
const appDataPath = path.join(app.getPath('appData'), 'DeepSeek');
const cachePath = path.join(appDataPath, 'Cache');
const settingsDir = path.join(appDataPath, 'Settings');
const settingsPath = path.join(settingsDir, 'Settings.json');

app.setPath('userData', cachePath);
app.commandLine.appendSwitch('enable-features', 'PersistentCookies');
app.commandLine.appendSwitch('disable-background-timer-throttling');

// 初始化设置文件
function initSettings() {
  if (!fs.existsSync(settingsDir)) fs.mkdirSync(settingsDir, { recursive: true });
  if (fs.existsSync(settingsPath)) {
    try {
      const data = JSON.parse(fs.readFileSync(settingsPath, 'utf-8'));
      currentTheme = data.theme || 'windows';
    } catch (e) {}
  } else {
    fs.writeFileSync(settingsPath, JSON.stringify({ theme: 'windows' }));
  }
}

function saveSettings(theme) {
  currentTheme = theme;
  fs.writeFileSync(settingsPath, JSON.stringify({ theme }));
  if (mainWindow && mainWindow.webContents) {
    mainWindow.webContents.send('apply-theme', theme);
  }
}

function getResourcePath(fileName) {
  return app.isPackaged 
    ? path.join(process.resourcesPath, 'app', fileName)
    : path.join(__dirname, 'app', fileName);
}

// ================= 核心：调起猫眼浏览器 =================
function launchExternalBrowser(url) {
  const browserPath = getResourcePath('Browser.exe');
  execFile(browserPath, [url], (err) => {
    if (err) shell.openExternal(url); 
  });
}

// ================= 更新逻辑 =================
function triggerUpdate() {
  const request = net.request(VERSION_URL);
  request.on('response', (response) => {
    let data = '';
    response.on('data', (chunk) => { data += chunk; });
    response.on('end', () => {
      try {
        const remoteInfo = JSON.parse(data);
        if (remoteInfo.version > CURRENT_VERSION) {
          dialog.showMessageBox(mainWindow, {
            type: 'info', title: '发现新版本',
            message: `发现新版本 ${remoteInfo.version}，当前版本 ${CURRENT_VERSION}。`,
            detail: `更新内容：\n${remoteInfo.intro || '无说明'}\n\n是否前往 GitHub 下载？`,
            buttons: ['立即前往', '稍后再说'], defaultId: 0, cancelId: 1
          }).then(({ response: btnIndex }) => {
            if (btnIndex === 0) shell.openExternal(`https://github.com/Gle-Res/DeepSeek/releases/tag/${remoteInfo.version}`);
          });
        } else {
          dialog.showMessageBox(mainWindow, {
            type: 'info', title: '检查更新', message: '当前已是最新版本',
            detail: `您的客户端 (${CURRENT_VERSION}) 已是最新状态。`, buttons: ['确定']
          });
        }
      } catch (e) {
        dialog.showErrorBox('检查更新失败', '解析版本信息失败。\n' + e.message);
      }
    });
  });
  request.on('error', (err) => {
    dialog.showErrorBox('网络错误', '无法连接到更新服务器。\n' + err.message);
  });
  request.end();
}

// ================= 创建窗口 =================
function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    title: 'DeepSeek',
    frame: false, // 纯无边框，所有控制权交给 HTML
    autoHideMenuBar: true,    
    icon: getResourcePath('icon/icon.ico'),
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      nodeIntegration: false,
      contextIsolation: true,
      devTools: false, 
    },
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile('renderer/index.html'); 

  webView = new WebContentsView({
    webPreferences: {
      partition: 'persist:deepseek_session',
      nodeIntegration: false,
      contextIsolation: true,
    }
  });
  webView.webContents.loadURL('https://chat.deepseek.com/');
  mainWindow.contentView.addChildView(webView);

  const resizeWebView = () => {
    const { width, height } = mainWindow.getContentBounds();
    webView.setBounds({ x: 0, y: 40, width: width, height: height - 40 });
  };
  mainWindow.on('resize', resizeWebView);
  setTimeout(resizeWebView, 100); 

  // 【核心修复】：监听窗口最大化/还原，通知前端切换图标
  mainWindow.on('maximize', () => {
    mainWindow.webContents.send('window-maximized');
  });
  mainWindow.on('unmaximize', () => {
    mainWindow.webContents.send('window-unmaximized');
  });

  webView.webContents.on('will-navigate', (event, url) => {
    if (!url.includes('deepseek.com')) {
      event.preventDefault(); 
      launchExternalBrowser(url);
    }
  });

  webView.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.includes('deepseek.com')) {
      launchExternalBrowser(url);
      return { action: 'deny' }; 
    }
    return { action: 'allow' }; 
  });

  webView.webContents.on('context-menu', (event) => {
    event.preventDefault(); 
    const template = [
      { label: '撤销', role: 'undo', accelerator: 'Ctrl+Z' },
      { label: '重做', role: 'redo', accelerator: 'Ctrl+Y' },
      { type: 'separator' },
      { label: '剪切', role: 'cut', accelerator: 'Ctrl+X' },
      { label: '复制', role: 'copy', accelerator: 'Ctrl+C' },
      { label: '粘贴', role: 'paste', accelerator: 'Ctrl+V' },
      { label: '全选', role: 'selectAll', accelerator: 'Ctrl+A' },
      { type: 'separator' },
      { label: '下载 DeepSeek Harness', click: () => { execFile(getResourcePath('DownloadHarness.exe'), (err) => { if (err) console.error(err); }); } },
      { type: 'separator' },
      { label: '检查更新', click: () => { triggerUpdate(); } },
      { type: 'separator' },
      { 
        label: currentTheme === 'windows' ? '切换 MacOS 主题' : '恢复 Windows 主题', 
        click: () => saveSettings(currentTheme === 'windows' ? 'macos' : 'windows') 
      },
      { type: 'separator' },
      { label: '刷新页面', role: 'reload', accelerator: 'Ctrl+R' },
    ];
    Menu.buildFromTemplate(template).popup({ window: mainWindow });
  });

  mainWindow.on('page-title-updated', (event) => {
    event.preventDefault();
    mainWindow.setTitle('DeepSeek');
  });

  mainWindow.on('close', (event) => {
    if (!isQuitting) {
      event.preventDefault();
      mainWindow.hide();
    }
  });
  
  setTimeout(() => {
    mainWindow.webContents.send('apply-theme', currentTheme);
  }, 300);
}

function createTray() {
  tray = new Tray(getResourcePath('icon/icon.ico'));
  tray.setToolTip('DeepSeek');
  const contextMenu = Menu.buildFromTemplate([
    { label: '打开 DeepSeek 窗口', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    { label: '检查更新', click: () => { triggerUpdate(); } },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit(); } }
  ]);
  tray.setContextMenu(contextMenu);
  tray.on('click', () => { mainWindow.show(); mainWindow.focus(); });
}

ipcMain.on('window-min', () => mainWindow.minimize());
ipcMain.on('window-max', () => {
  if (mainWindow.isMaximized()) mainWindow.unmaximize();
  else mainWindow.maximize();
});
ipcMain.on('window-close', () => mainWindow.close());

app.whenReady().then(() => {
  initSettings();
  globalShortcut.register('F12', () => false);
  globalShortcut.register('Control+Shift+I', () => false);
  createWindow();
  createTray(); 
});

app.on('before-quit', () => { isQuitting = true; });