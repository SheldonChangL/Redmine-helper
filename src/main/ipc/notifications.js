const { Notification } = require('electron');
const { IPC } = require('../../shared/constants');

/**
 * Fire a native OS notification for a poller change event and push the
 * event to the renderer via IPC so the UI can react (e.g. refresh list).
 *
 * @param {BrowserWindow|null} mainWindow
 * @param {{ type: string, issue: object, from?: string, to?: string }} event
 */
function fire(mainWindow, event) {
  const { type, issue } = event;

  let title, body;
  if (type === 'assigned') {
    title = 'New Assignment';
    body = `#${issue.id} — ${issue.subject}`;
  } else if (type === 'status_changed') {
    title = `Issue #${issue.id} Updated`;
    body = `${issue.subject}\n${event.from} → ${event.to}`;
  } else {
    return;
  }

  if (Notification.isSupported()) {
    const notif = new Notification({ title, body });
    notif.on('click', () => {
      if (mainWindow && !mainWindow.isDestroyed()) {
        mainWindow.show();
        mainWindow.focus();
      }
    });
    notif.show();
  }

  // Also push to renderer so the issue list can auto-refresh
  if (mainWindow && !mainWindow.isDestroyed()) {
    mainWindow.webContents.send(IPC.NOTIFY_ISSUE_CHANGED, event);
  }
}

module.exports = { fire };
