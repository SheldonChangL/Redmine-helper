/**
 * Generates a placeholder 512×512 app icon (solid #B22222 with rounded feel).
 * Run once: node scripts/generate-icons.js
 * Replace build/icons/icon.png with a real design before shipping.
 * electron-builder will auto-convert icon.png → .icns (macOS) and .ico (Windows).
 */
const fs   = require('fs');
const path = require('path');
const zlib = require('zlib');

const OUT  = path.join(__dirname, '../build/icons');
const SIZE = 512;
const R = 0xB2, G = 0x22, B = 0x22; // Redmine-ish dark red

// ── Minimal CRC-32 ────────────────────────────────────────────────────────
const CRC_TABLE = (() => {
  const t = new Uint32Array(256);
  for (let n = 0; n < 256; n++) {
    let c = n;
    for (let k = 0; k < 8; k++) c = (c & 1) ? (0xEDB88320 ^ (c >>> 1)) : (c >>> 1);
    t[n] = c;
  }
  return t;
})();

function crc32(buf) {
  let crc = 0xFFFFFFFF;
  for (const b of buf) crc = CRC_TABLE[(crc ^ b) & 0xFF] ^ (crc >>> 8);
  return (crc ^ 0xFFFFFFFF) >>> 0;
}

// ── PNG builder ───────────────────────────────────────────────────────────
function pngChunk(type, data) {
  const typeBytes = Buffer.from(type, 'ascii');
  const payload   = Buffer.concat([typeBytes, data]);
  const lenBuf    = Buffer.alloc(4); lenBuf.writeUInt32BE(data.length);
  const crcBuf    = Buffer.alloc(4); crcBuf.writeUInt32BE(crc32(payload));
  return Buffer.concat([lenBuf, payload, crcBuf]);
}

function makePNG(w, h, r, g, b) {
  const sig  = Buffer.from([137, 80, 78, 71, 13, 10, 26, 10]);

  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8]  = 8; // bit depth
  ihdr[9]  = 2; // colour type RGB
  // bytes 10-12: compression, filter, interlace = 0

  // One row: filter byte 0 (None) + RGB pixels
  const row = Buffer.alloc(1 + w * 3);
  for (let x = 0; x < w; x++) {
    row[1 + x * 3]     = r;
    row[1 + x * 3 + 1] = g;
    row[1 + x * 3 + 2] = b;
  }
  const raw        = Buffer.concat(Array.from({ length: h }, () => row));
  const compressed = zlib.deflateSync(raw, { level: 9 });

  return Buffer.concat([
    sig,
    pngChunk('IHDR', ihdr),
    pngChunk('IDAT', compressed),
    pngChunk('IEND', Buffer.alloc(0)),
  ]);
}

// ── Write ─────────────────────────────────────────────────────────────────
fs.mkdirSync(OUT, { recursive: true });
const iconPath = path.join(OUT, 'icon.png');
fs.writeFileSync(iconPath, makePNG(SIZE, SIZE, R, G, B));
console.log(`Created ${iconPath} (${SIZE}×${SIZE} placeholder)`);
console.log('Replace with a real icon before distributing.');
console.log('electron-builder will convert icon.png → .icns and .ico at build time.');
