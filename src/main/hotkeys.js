const { globalShortcut } = require('electron');
const { toggleWindow } = require('./tray');

function register(mainWindow, spotlightWindow) {
  // Toggle main window
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    toggleWindow(mainWindow);
  });

  // Open quick-create spotlight
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    if (spotlightWindow) {
      spotlightWindow.show();
      spotlightWindow.focus();
    }
  });
}

function unregister() {
  globalShortcut.unregisterAll();
}

module.exports = { register, unregister };
