const { app, BrowserWindow, Menu, Tray, globalShortcut, shell, dialog, net, WebContentsView, ipcMain } = require('electron');
const path = require('path');
const fs = require('fs');
const { exec } = require('child_process'); 

let mainWindow = null;
let tray = null;
let isQuitting = false;
let webView = null; 
let currentTheme = 'windows';

const CURRENT_VERSION = "v2.2.0"; // 当前版本号
const VERSION_URL = "https://raw.githubusercontent.com/Gle-Res/DeepSeek/main/version.json";

const appDataPath = path.join(app.getPath('appData'), 'DeepSeek');
const cachePath = path.join(appDataPath, 'Cache');
const settingsDir = path.join(appDataPath, 'Settings');
const settingsPath = path.join(settingsDir, 'Settings.json');

app.setPath('userData', cachePath);
app.commandLine.appendSwitch('enable-features', 'PersistentCookies');
app.commandLine.appendSwitch('disable-background-timer-throttling');

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

function launchExternalBrowser(url) {
  const browserPath = path.resolve(getResourcePath('Browser.exe'));
  if (fs.existsSync(browserPath)) {
    const command = `start "" "${browserPath}" "${url}"`;
    exec(command, { windowsHide: true }, (error) => { if (error) shell.openExternal(url); });
  } else { shell.openExternal(url); }
}

function launchHarness() {
  const harnessPath = path.resolve(getResourcePath('DownloadHarness.exe'));
  if (fs.existsSync(harnessPath)) {
    const command = `start "" "${harnessPath}"`;
    exec(command, { windowsHide: true }, (error) => { if (error) dialog.showErrorBox('启动失败', `无法启动 Harness。`); });
  } else { dialog.showMessageBox(mainWindow, { type: 'error', title: '未找到', message: `找不到 DownloadHarness.exe` }); }
}

// 【修复】：检查更新时始终显示当前版本号
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
            type: 'info', 
            title: '发现新版本',
            message: `发现新版本 ${remoteInfo.version}`,
            detail: `当前版本：${CURRENT_VERSION}\n最新版本：${remoteInfo.version}\n\n更新内容：\n${remoteInfo.intro || '无说明'}\n\n是否前往 GitHub 下载？`,
            buttons: ['立即前往', '稍后再说'], defaultId: 0, cancelId: 1
          }).then(({ response: btnIndex }) => {
            if (btnIndex === 0) shell.openExternal(`https://github.com/Gle-Res/DeepSeek/releases/tag/${remoteInfo.version}`);
          });
        } else {
          dialog.showMessageBox(mainWindow, {
            type: 'info', 
            title: '检查更新', 
            message: '当前已是最新版本',
            detail: `您的客户端 (${CURRENT_VERSION}) 已是最新状态。`, 
            buttons: ['确定']
          });
        }
      } catch (e) {
        // 即使是报错，也要显示当前版本
        dialog.showErrorBox('检查更新失败', `当前版本：${CURRENT_VERSION}\n解析版本信息失败。\n` + e.message);
      }
    });
  });
  request.on('error', (err) => {
    // 网络错误也带上版本号
    dialog.showErrorBox('网络错误', `当前版本：${CURRENT_VERSION}\n无法连接到更新服务器。\n` + err.message);
  });
  request.end();
}

function toggleTheme() { saveSettings(currentTheme === 'windows' ? 'macos' : 'windows'); }

function createWindow() {
  mainWindow = new BrowserWindow({
    width: 1280, height: 800, minWidth: 900, minHeight: 600,
    title: 'DeepSeek', frame: false, autoHideMenuBar: true,    
    icon: getResourcePath('icon/icon.ico'),
    webPreferences: { preload: path.join(__dirname, 'preload.js'), nodeIntegration: false, contextIsolation: true, devTools: false },
  });

  Menu.setApplicationMenu(null);
  mainWindow.loadFile('renderer/index.html'); 

  webView = new WebContentsView({
    webPreferences: { partition: 'persist:deepseek_session', nodeIntegration: false, contextIsolation: true }
  });
  webView.webContents.loadURL('https://chat.deepseek.com/');
  mainWindow.contentView.addChildView(webView);

  const resizeWebView = () => {
    const { width, height } = mainWindow.getContentBounds();
    webView.setBounds({ x: 0, y: 40, width: width, height: height - 40 });
  };
  mainWindow.on('resize', resizeWebView);
  setTimeout(resizeWebView, 100); 

  mainWindow.on('maximize', () => mainWindow.webContents.send('window-maximized'));
  mainWindow.on('unmaximize', () => mainWindow.webContents.send('window-unmaximized'));
  mainWindow.on('focus', () => mainWindow.webContents.send('window-focus'));
  mainWindow.on('blur', () => mainWindow.webContents.send('window-blur'));

  webView.webContents.on('will-navigate', (event, url) => {
    if (!url.includes('deepseek.com')) { event.preventDefault(); launchExternalBrowser(url); }
  });

  webView.webContents.setWindowOpenHandler(({ url }) => {
    if (!url.includes('deepseek.com')) { launchExternalBrowser(url); return { action: 'deny' }; }
    return { action: 'allow' }; 
  });

  webView.webContents.on('before-input-event', (event, input) => {
    if (input.type !== 'keyDown') return;
    const ctrl = input.control;
    const key = input.key.toLowerCase();
    if (ctrl && key === 'r') { event.preventDefault(); webView.webContents.reload(); return; }
    if (ctrl && key === 'h') { event.preventDefault(); launchHarness(); return; }
    if (ctrl && key === 'm') { event.preventDefault(); toggleTheme(); return; }
    if (ctrl && key === 'u') { event.preventDefault(); triggerUpdate(); return; }
    if (input.key === 'F12' || (ctrl && input.shift && key === 'i')) { event.preventDefault(); }
  });

  webView.webContents.on('context-menu', (event) => {
    event.preventDefault(); 
    const template = [
      { label: '撤销', accelerator: 'Ctrl+Z', click: () => webView.webContents.undo() },
      { label: '重做', accelerator: 'Ctrl+Y', click: () => webView.webContents.redo() },
      { type: 'separator' },
      { label: '剪切', accelerator: 'Ctrl+X', click: () => webView.webContents.cut() },
      { label: '复制', accelerator: 'Ctrl+C', click: () => webView.webContents.copy() },
      { label: '粘贴', accelerator: 'Ctrl+V', click: () => webView.webContents.paste() },
      { label: '全选', accelerator: 'Ctrl+A', click: () => webView.webContents.selectAll() },
      { type: 'separator' },
      { label: '刷新页面', accelerator: 'Ctrl+R', click: () => webView.webContents.reload() },
      { type: 'separator' },
      { label: currentTheme === 'windows' ? '切换 MacOS 主题' : '恢复 Windows 主题', accelerator: 'Ctrl+M', click: () => toggleTheme() },
      { label: '下载 DeepSeek Harness', accelerator: 'Ctrl+H', click: () => launchHarness() },
      { label: '检查更新', accelerator: 'Ctrl+U', click: () => triggerUpdate() }
    ];
    Menu.buildFromTemplate(template).popup({ window: mainWindow });
  });

  mainWindow.on('page-title-updated', (event) => { event.preventDefault(); mainWindow.setTitle('DeepSeek'); });
  mainWindow.on('close', (event) => { if (!isQuitting) { event.preventDefault(); mainWindow.hide(); } });
  
  mainWindow.webContents.on('did-finish-load', () => {
    mainWindow.webContents.send('apply-theme', currentTheme);
  });
}

function createTray() {
  tray = new Tray(getResourcePath('icon/icon.ico'));
  tray.setToolTip('DeepSeek');
  tray.setContextMenu(Menu.buildFromTemplate([
    { label: '打开 DeepSeek 窗口', click: () => { mainWindow.show(); mainWindow.focus(); } },
    { type: 'separator' },
    { label: '检查更新', click: () => triggerUpdate() },
    { type: 'separator' },
    { label: '退出', click: () => { isQuitting = true; app.quit(); } }
  ]));
  tray.on('click', () => { mainWindow.show(); mainWindow.focus(); });
}

ipcMain.on('window-min', () => mainWindow.minimize());
ipcMain.on('window-max', () => { if (mainWindow.isMaximized()) mainWindow.unmaximize(); else mainWindow.maximize(); });
ipcMain.on('window-close', () => mainWindow.close());

ipcMain.handle('get-theme', () => currentTheme);

app.whenReady().then(() => {
  initSettings();
  globalShortcut.register('F12', () => false);
  globalShortcut.register('Control+Shift+I', () => false);
  globalShortcut.register('Control+M', () => toggleTheme());
  globalShortcut.register('Control+U', () => triggerUpdate());
  globalShortcut.register('Control+H', () => launchHarness());
  createWindow();
  createTray(); 
});

app.on('before-quit', () => { isQuitting = true; });