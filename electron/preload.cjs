const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('agentOS', {
  version: () => ipcRenderer.invoke('app:version'),
});
