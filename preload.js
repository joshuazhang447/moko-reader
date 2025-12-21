// preload.js

// Import the necessary Electron modules.
const { contextBridge, ipcRenderer } = require('electron');

// Expose a controlled and secure API to the renderer process (your web page)
contextBridge.exposeInMainWorld('electronAPI', {
  
  // This function can now be called from your front-end scripts like this:
  // window.electronAPI.refreshLibrary()
  refreshLibrary: () => ipcRenderer.invoke('refresh-library')

});