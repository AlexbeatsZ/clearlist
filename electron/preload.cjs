const { contextBridge, ipcRenderer } = require('electron');
contextBridge.exposeInMainWorld('clearlist', {
  load: () => ipcRenderer.invoke('store:load'),
  save: (state) => ipcRenderer.invoke('store:save', state),
  exportData: (state) => ipcRenderer.invoke('data:export', state),
  importData: () => ipcRenderer.invoke('data:import'),
  restoreData: () => ipcRenderer.invoke('data:restore'),
  notify: (title, body) => ipcRenderer.invoke('notice', title, body),
  onBeforeClose: (callback) => ipcRenderer.on('window:before-close', () => callback()),
  readyToClose: (success) => ipcRenderer.send('window:ready-close', success),
});
