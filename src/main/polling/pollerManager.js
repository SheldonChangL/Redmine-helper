const issuePoller = require('./issuePoller');

let timer = null;

/**
 * Start (or restart) the polling loop.
 * Uses a setTimeout chain — not setInterval — so slow network responses
 * never cause overlapping requests.
 *
 * @param {object} store  electron-store instance
 * @param {function} onEvent  called with each change event
 */
function start(store, onEvent) {
  stop(); // cancel any running loop and reset snapshot

  const intervalMs = Math.max(30, (store?.get('pollInterval') ?? 60)) * 1000;

  async function tick() {
    try {
      const events = await issuePoller.poll();
      for (const ev of events) onEvent(ev);
    } catch {
      // swallow unexpected errors — will retry on next tick
    }
    timer = setTimeout(tick, intervalMs);
  }

  timer = setTimeout(tick, intervalMs);
}

function stop() {
  clearTimeout(timer);
  timer = null;
  issuePoller.reset();
}

module.exports = { start, stop };
