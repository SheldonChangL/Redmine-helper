const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { createTray } = require('./tray');
const { register: registerHotkeys, unregister: unregisterHotkeys } = require('./hotkeys');
const { registerAll: registerIpc } = require('./ipc/index');
const { initStore } = require('./cache/store');
const { IPC } = require('../shared/constants');

let mainWindow = null;
let spotlightWindow = null;

function createMainWindow() {
  mainWindow = new BrowserWindow({
    width: 900,
    height: 680,
    minWidth: 700,
    minHeight: 500,
    show: false,
    titleBarStyle: process.platform === 'darwin' ? 'hiddenInset' : 'default',
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  mainWindow.loadFile(path.join(__dirname, '../renderer/index.html'));

  mainWindow.once('ready-to-show', () => mainWindow.show());

  mainWindow.on('close', (e) => {
    if (!app.isQuitting) {
      e.preventDefault();
      mainWindow.hide();
    }
  });

  return mainWindow;
}

function createSpotlightWindow() {
  spotlightWindow = new BrowserWindow({
    width: 560,
    height: 320,
    frame: false,
    transparent: true,
    alwaysOnTop: true,
    skipTaskbar: true,
    resizable: false,
    show: false,
    webPreferences: {
      nodeIntegration: false,
      contextIsolation: true,
      sandbox: false,
      preload: path.join(__dirname, 'preload.js'),
    },
  });

  spotlightWindow.loadFile(path.join(__dirname, '../renderer/spotlight.html'));

  spotlightWindow.on('blur', () => spotlightWindow.hide());

  return spotlightWindow;
}

app.whenReady().then(async () => {
  const store = await initStore();
  registerIpc(store);

  mainWindow = createMainWindow();
  spotlightWindow = createSpotlightWindow();

  createTray(mainWindow);
  registerHotkeys(mainWindow, spotlightWindow);

  ipcMain.on(IPC.SPOTLIGHT_CLOSE, () => {
    if (spotlightWindow) spotlightWindow.hide();
  });
});

app.on('before-quit', () => {
  app.isQuitting = true;
  unregisterHotkeys();
});

app.on('window-all-closed', () => {
  if (process.platform !== 'darwin') app.quit();
});

app.on('activate', () => {
  if (mainWindow) {
    mainWindow.show();
    mainWindow.focus();
  }
});
