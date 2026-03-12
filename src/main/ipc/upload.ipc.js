const { ipcMain, clipboard, nativeImage } = require('electron');
const { IPC } = require('../../shared/constants');
const uploadClient = require('../api/uploadClient');

function register() {
  ipcMain.handle(IPC.UPLOAD_CLIPBOARD, async () => {
    try {
      const img = clipboard.readImage();
      if (img.isEmpty()) return { ok: false, error: 'No image in clipboard.' };

      // Small thumbnail for preview (max 120px wide)
      const resized = img.resize({ width: 120, quality: 'good' });
      const previewDataUrl = 'data:image/png;base64,' + resized.toPNG().toString('base64');

      const token = await uploadClient.uploadBuffer(img.toPNG(), 'image/png');
      return { ok: true, token, filename: 'clipboard.png', contentType: 'image/png', previewDataUrl };
    } catch (err) {
      return { ok: false, error: err.response?.data?.errors?.join(', ') || err.message };
    }
  });

  // Upload an arbitrary file buffer sent from the renderer.
  // bytes is a Uint8Array serialised over IPC.
  ipcMain.handle(IPC.UPLOAD_FILE, async (_e, bytes, filename, contentType) => {
    try {
      const buffer = Buffer.from(bytes);
      const token = await uploadClient.uploadBuffer(buffer, contentType);
      return { ok: true, token, filename, contentType };
    } catch (err) {
      return { ok: false, error: err.response?.data?.errors?.join(', ') || err.message };
    }
  });
}

module.exports = { register };
