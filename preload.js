const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  minimize: () => ipcRenderer.send('window-min'),
  maximize: () => ipcRenderer.send('window-max'),
  close: () => ipcRenderer.send('window-close'),
  
  onApplyTheme: (callback) => ipcRenderer.on('apply-theme', (_event, theme) => callback(theme)),
  
  // 【新增】：暴露最大化/还原的监听接口
  onWindowMaximized: (callback) => ipcRenderer.on('window-maximized', () => callback()),
  onWindowUnmaximized: (callback) => ipcRenderer.on('window-unmaximized', () => callback()),
});