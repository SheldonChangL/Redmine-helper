const { globalShortcut } = require('electron');
const { toggleWindow } = require('./tray');

function register(mainWindow, spotlightWindow) {
  // Toggle main window
  globalShortcut.register('CommandOrControl+Shift+R', () => {
    toggleWindow(mainWindow);
  });

  // Toggle quick-create spotlight
  globalShortcut.register('CommandOrControl+Shift+N', () => {
    if (spotlightWindow) {
      if (spotlightWindow.isVisible()) {
        spotlightWindow.hide();
      } else {
        spotlightWindow.show();
        spotlightWindow.focus();
      }
    }
  });
}

function unregister() {
  globalShortcut.unregisterAll();
}

module.exports = { register, unregister };
