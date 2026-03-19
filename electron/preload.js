/**
 * Electron Preload Script
 * Exposes a minimal safe API to the renderer via contextBridge.
 */
const { contextBridge, ipcRenderer } = require('electron');

contextBridge.exposeInMainWorld('electronAPI', {
  // Expose platform for OS-specific behaviour
  platform: process.platform,
  // Send a message to the main process
  send: (channel, data) => ipcRenderer.send(channel, data),
  // Receive a message from the main process
  on: (channel, cb) => ipcRenderer.on(channel, (_event, ...args) => cb(...args)),
});
