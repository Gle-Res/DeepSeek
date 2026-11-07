const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-min'),
  maximize: () => ipcRenderer.send('window-max'),
  close: () => ipcRenderer.send('window-close'),
  
  getTheme: () => ipcRenderer.invoke('get-theme'),
  onApplyTheme: (callback) => ipcRenderer.on('apply-theme', (_event, theme) => callback(theme)),
  
  onWindowMaximized: (callback) => ipcRenderer.on('window-maximized', () => callback()),
  onWindowUnmaximized: (callback) => ipcRenderer.on('window-unmaximized', () => callback()),
  
  // 新增：焦点事件监听
  onWindowFocus: (callback) => ipcRenderer.on('window-focus', () => callback()),
  onWindowBlur: (callback) => ipcRenderer.on('window-blur', () => callback()),
});