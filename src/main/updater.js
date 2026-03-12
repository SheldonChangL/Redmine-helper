const { autoUpdater } = require('electron-updater');
const { dialog, app } = require('electron');

/**
 * Initialise the auto-updater.
 * Only runs in production builds (app.isPackaged = true).
 * Flow: check → show dialog → download → show restart dialog → quit+install.
 *
 * @param {BrowserWindow} mainWindow
 */
function initAutoUpdater(mainWindow) {
  if (!app.isPackaged) return;

  autoUpdater.autoDownload        = false; // ask the user first
  autoUpdater.autoInstallOnAppQuit = true;  // install on next quit if user chose Later

  autoUpdater.on('update-available', (info) => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Available',
      message: `Redmine Helper ${info.version} is available`,
      detail: 'A new version is ready to download. Update now?',
      buttons: ['Download Update', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.downloadUpdate();
    });
  });

  autoUpdater.on('update-downloaded', () => {
    dialog.showMessageBox(mainWindow, {
      type: 'info',
      title: 'Update Ready',
      message: 'Update downloaded',
      detail: 'Restart Redmine Helper to apply the update.',
      buttons: ['Restart Now', 'Later'],
      defaultId: 0,
      cancelId: 1,
    }).then(({ response }) => {
      if (response === 0) autoUpdater.quitAndInstall();
    });
  });

  autoUpdater.on('error', (err) => {
    console.error('[updater]', err.message);
  });

  autoUpdater.checkForUpdates();
}

module.exports = { initAutoUpdater };
