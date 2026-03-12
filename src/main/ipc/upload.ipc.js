const { ipcMain, clipboard } = require('electron');
const { IPC } = require('../../shared/constants');
const uploadClient = require('../api/uploadClient');

function register() {
  ipcMain.handle(IPC.UPLOAD_CLIPBOARD, async () => {
    try {
      const img = clipboard.readImage();
      if (img.isEmpty()) return { ok: false, error: 'No image in clipboard.' };

      const pngBuffer = img.toPNG();
      const token = await uploadClient.uploadImage(pngBuffer);
      return { ok: true, token };
    } catch (err) {
      return { ok: false, error: err.response?.data?.errors?.join(', ') || err.message };
    }
  });
}

module.exports = { register };
