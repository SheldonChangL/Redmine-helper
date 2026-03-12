const axios = require('axios');
const credentials = require('../credentials');

/**
 * Upload a binary buffer to Redmine's /uploads.json endpoint.
 * Returns the upload token string.
 * @param {Buffer} buffer
 * @param {string} contentType
 * @returns {Promise<string>} token
 */
async function uploadBuffer(buffer, contentType = 'application/octet-stream') {
  const creds = credentials.load();
  if (!creds) throw new Error('No credentials configured.');

  const res = await axios.post(
    `${creds.baseUrl.replace(/\/$/, '')}/uploads.json`,
    buffer,
    {
      headers: {
        'X-Redmine-API-Key': creds.apiKey,
        // Redmine's /uploads.json only accepts application/octet-stream
        'Content-Type': 'application/octet-stream',
      },
      timeout: 30000,
    }
  );
  return res.data.upload.token;
}

module.exports = { uploadBuffer };
