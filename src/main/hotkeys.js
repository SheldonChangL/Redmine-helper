const { globalShortcut } = require('electron');
const { toggleWindow } = require('./tray');

function register(mainWindow, toggleSpotlight) {
  // Toggle main window
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    toggleWindow(mainWindow);
  });

  // Toggle quick-create spotlight
  globalShortcut.register('CommandOrControl+Shift+N', toggleSpotlight);
}

function unregister() {
  globalShortcut.unregisterAll();
}

module.exports = { register, unregister };
