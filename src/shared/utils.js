/**
 * Convert seconds to decimal hours, rounded to 2 decimal places.
 * @param {number} seconds
 * @returns {number}
 */
function secondsToDecimalHours(seconds) {
  return Math.round((seconds / 3600) * 100) / 100;
}

/**
 * Format milliseconds as HH:MM:SS string.
 * @param {number} ms
 * @returns {string}
 */
function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

module.exports = { secondsToDecimalHours, formatDuration };
