const { app, BrowserWindow, ipcMain } = require('electron');
const path = require('path');
const { createTray } = require('./tray');
const { register: registerHotkeys, unregister: unregisterHotkeys } = require('./hotkeys');
const { registerAll: registerIpc } = require('./ipc/index');
const { initStore } = require('./cache/store');
const { IPC } = require('../shared/constants');

let mainWindow = null;
let spotlightWindow = null;

// Track intended visibility separately from window state to prevent
// the blur→hide race when Cmd+Shift+N is pressed while spotlight is open.
let spotlightVisible = false;
let lastSpotlightHideTime = 0;

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

function hideSpotlight() {
  spotlightVisible = false;
  lastSpotlightHideTime = Date.now();
  if (spotlightWindow) spotlightWindow.hide();
}

function createSpotlightWindow() {
  spotlightWindow = new BrowserWindow({
    width: 560,
    height: 480,
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

  // Hide on blur (click away). The toggleSpotlight timestamp check prevents
  // the global shortcut from re-showing the window after this immediate hide.
  spotlightWindow.on('blur', () => hideSpotlight());

  return spotlightWindow;
}

function toggleSpotlight() {
  // If the window was just hidden (by blur or previous hide) within the last 300ms,
  // treat this shortcut press as "confirm hide" rather than "show" — prevents
  // the window from immediately re-appearing after blur fires before the shortcut.
  if (spotlightVisible || (Date.now() - lastSpotlightHideTime < 300)) {
    hideSpotlight();
  } else {
    spotlightVisible = true;
    spotlightWindow.show();
    spotlightWindow.focus();
  }
}

app.whenReady().then(async () => {
  const store = await initStore();
  registerIpc(store);

  mainWindow = createMainWindow();
  spotlightWindow = createSpotlightWindow();

  createTray(mainWindow);
  registerHotkeys(mainWindow, toggleSpotlight);

  ipcMain.on(IPC.SPOTLIGHT_CLOSE, () => hideSpotlight());
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
