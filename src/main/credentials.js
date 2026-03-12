const { safeStorage, app } = require('electron');
const crypto = require('crypto');
const path = require('path');
const fs = require('fs');

const CRED_FILE = path.join(app.getPath('userData'), 'credentials.enc');
const FALLBACK_KEY_FILE = path.join(app.getPath('userData'), 'fallback.key');

function getFallbackKey() {
  if (fs.existsSync(FALLBACK_KEY_FILE)) {
    return fs.readFileSync(FALLBACK_KEY_FILE);
  }
  const key = crypto.randomBytes(32);
  fs.writeFileSync(FALLBACK_KEY_FILE, key, { mode: 0o600 });
  return key;
}

function encryptFallback(plaintext) {
  const key = getFallbackKey();
  const iv = crypto.randomBytes(16);
  const cipher = crypto.createCipheriv('aes-256-gcm', key, iv);
  const encrypted = Buffer.concat([cipher.update(plaintext, 'utf8'), cipher.final()]);
  const tag = cipher.getAuthTag();
  return Buffer.concat([iv, tag, encrypted]).toString('base64');
}

function decryptFallback(data) {
  const key = getFallbackKey();
  const buf = Buffer.from(data, 'base64');
  const iv = buf.subarray(0, 16);
  const tag = buf.subarray(16, 32);
  const encrypted = buf.subarray(32);
  const decipher = crypto.createDecipheriv('aes-256-gcm', key, iv);
  decipher.setAuthTag(tag);
  return decipher.update(encrypted) + decipher.final('utf8');
}

function encrypt(plaintext) {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.encryptString(plaintext).toString('base64');
  }
  return encryptFallback(plaintext);
}

function decrypt(data) {
  if (safeStorage.isEncryptionAvailable()) {
    return safeStorage.decryptString(Buffer.from(data, 'base64'));
  }
  return decryptFallback(data);
}

function save(baseUrl, apiKey) {
  const payload = JSON.stringify({ baseUrl, apiKey });
  fs.writeFileSync(CRED_FILE, encrypt(payload), { mode: 0o600 });
}

function load() {
  if (!fs.existsSync(CRED_FILE)) return null;
  try {
    const raw = fs.readFileSync(CRED_FILE, 'utf8');
    return JSON.parse(decrypt(raw));
  } catch {
    return null;
  }
}

function clear() {
  if (fs.existsSync(CRED_FILE)) fs.unlinkSync(CRED_FILE);
}

module.exports = { save, load, clear };
