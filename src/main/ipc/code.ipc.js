'use strict';

const { ipcMain } = require('electron');
const { IPC } = require('../../shared/constants');
const fs   = require('fs');
const path = require('path');

const CODE_EXTENSIONS = new Set([
  '.js', '.ts', '.jsx', '.tsx', '.mjs', '.cjs',
  '.py', '.rb', '.go', '.java', '.cs', '.cpp', '.c', '.h',
  '.php', '.swift', '.kt', '.rs', '.vue', '.svelte',
  '.css', '.scss', '.html', '.md',
  '.json', '.yaml', '.yml', '.toml', '.sh',
]);

const SKIP_DIRS = new Set([
  'node_modules', '.git', 'dist', 'build', 'coverage',
  '__pycache__', '.next', 'vendor', 'target', '.cache', '.turbo',
]);

const MAX_FILE_BYTES  = 50  * 1024; // 50 KB per file
const MAX_TOTAL_BYTES = 200 * 1024; // 200 KB total across all files

function walkDir(dirPath, rootPath, files, totalBytes) {
  let entries;
  try {
    entries = fs.readdirSync(dirPath, { withFileTypes: true });
  } catch {
    return;
  }

  for (const entry of entries) {
    if (totalBytes.n >= MAX_TOTAL_BYTES) break;

    const fullPath = path.join(dirPath, entry.name);
    const relPath  = path.relative(rootPath, fullPath);

    if (entry.isDirectory()) {
      if (!SKIP_DIRS.has(entry.name)) walkDir(fullPath, rootPath, files, totalBytes);
    } else if (entry.isFile()) {
      const ext = path.extname(entry.name).toLowerCase();
      if (!CODE_EXTENSIONS.has(ext)) continue;

      let stat;
      try { stat = fs.statSync(fullPath); } catch { continue; }
      if (stat.size > MAX_FILE_BYTES) continue;

      let content;
      try { content = fs.readFileSync(fullPath, 'utf-8'); } catch { continue; }

      totalBytes.n += content.length;
      files.push({ path: relPath, content });
    }
  }
}

function register() {
  ipcMain.handle(IPC.CODE_READ, (_e, dirPath) => {
    if (!dirPath || !dirPath.trim()) {
      return { ok: false, error: 'No directory path provided.' };
    }

    const resolved = path.resolve(dirPath.trim());
    try {
      fs.accessSync(resolved, fs.constants.R_OK);
    } catch {
      return { ok: false, error: `Cannot read directory: ${resolved}` };
    }

    const totalBytes = { n: 0 };
    const files      = [];
    walkDir(resolved, resolved, files, totalBytes);

    if (files.length === 0) {
      return { ok: false, error: 'No supported code files found in that directory.' };
    }

    return { ok: true, files, truncated: totalBytes.n >= MAX_TOTAL_BYTES };
  });

  ipcMain.handle(IPC.CODE_WRITE_PATCH, (_e, dirPath, filename, patchText) => {
    if (!dirPath || !dirPath.trim()) {
      return { ok: false, error: 'No directory path provided.' };
    }

    const resolvedDir = path.resolve(dirPath.trim());
    try {
      fs.accessSync(resolvedDir, fs.constants.W_OK);
    } catch {
      return { ok: false, error: `Cannot write to directory: ${resolvedDir}` };
    }

    const safeFilename = path.basename(String(filename || 'ai-generated.patch').trim() || 'ai-generated.patch');
    if (!safeFilename.endsWith('.patch') && !safeFilename.endsWith('.diff')) {
      return { ok: false, error: 'Patch filename must end with .patch or .diff.' };
    }

    const content = String(patchText || '');
    if (!content.trim()) {
      return { ok: false, error: 'No patch content provided.' };
    }

    const targetPath = path.join(resolvedDir, safeFilename);
    try {
      fs.writeFileSync(targetPath, content, 'utf-8');
    } catch (err) {
      return { ok: false, error: `Failed to write patch: ${err.message}` };
    }

    return { ok: true, path: targetPath };
  });
}

module.exports = { register };
