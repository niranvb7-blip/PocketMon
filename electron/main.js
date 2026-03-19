/**
 * Electron Main Process
 * Loads the bundled Phaser game (dist/index.html) in a locked retro window.
 */
const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');

const IS_DEV = process.env.NODE_ENV === 'development';

function createWindow() {
  const win = new BrowserWindow({
    width:  960,
    height: 640,
    resizable: false,
    fullscreenable: true,
    title: 'PocketMon',
    icon: path.join(__dirname, '../src/assets/icon.png'),
    webPreferences: {
      contextIsolation: true,
      nodeIntegration: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  // Hide menu bar to keep the retro feel
  win.setMenuBarVisibility(false);

  if (IS_DEV) {
    // In dev mode, Webpack dev-server serves the game
    win.loadURL('http://localhost:8080');
    win.webContents.openDevTools({ mode: 'detach' });
  } else {
    win.loadFile(path.join(__dirname, '../dist/index.html'));
  }
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => {
    if (BrowserWindow.getAllWindows().length === 0) createWindow();
  });
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});
