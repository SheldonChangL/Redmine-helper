// Utility (renderer-side copy — avoids CJS require in ESM context)
function secondsToDecimalHours(seconds) {
  return Math.round((seconds / 3600) * 100) / 100;
}

function formatDuration(ms) {
  const totalSec = Math.floor(ms / 1000);
  const h = Math.floor(totalSec / 3600);
  const m = Math.floor((totalSec % 3600) / 60);
  const s = totalSec % 60;
  const pad = (n) => String(n).padStart(2, '0');
  return `${pad(h)}:${pad(m)}:${pad(s)}`;
}

const POMODORO_WORK_SEC = 25 * 60;
const POMODORO_BREAK_SEC = 5 * 60;

/**
 * Render a timer widget inside `container`.
 * Calls `onStop({ hours })` when the user stops and wants to log.
 *
 * @param {HTMLElement} container
 * @param {{ onStop: (data: { hours: number }) => void }} opts
 */
export function renderTimer(container, { onStop }) {
  container.innerHTML = `
    <div class="timer-widget">
      <div class="timer-tabs">
        <button class="timer-tab active" data-mode="stopwatch">Stopwatch</button>
        <button class="timer-tab" data-mode="pomodoro">Pomodoro</button>
      </div>

      <div class="timer-display" id="timer-display">00:00:00</div>
      <div class="timer-label" id="timer-label"></div>

      <div class="timer-controls">
        <button class="btn btn-primary" id="btn-timer-start">Start</button>
        <button class="btn" id="btn-timer-reset" disabled>Reset</button>
        <button class="btn btn-success" id="btn-timer-log" disabled>Log time</button>
      </div>
    </div>
  `;

  let mode = 'stopwatch';        // 'stopwatch' | 'pomodoro'
  let intervalId = null;
  let running = false;
  let elapsedMs = 0;             // stopwatch accumulated ms
  let startTime = null;          // Date.now() when last started

  // Pomodoro state
  let pomodoroPhase = 'work';    // 'work' | 'break'
  let pomodoroRemainSec = POMODORO_WORK_SEC;
  let pomodoroIntervalId = null;
  let pomodoroAccumulatedWorkSec = 0;

  const display = container.querySelector('#timer-display');
  const label   = container.querySelector('#timer-label');
  const btnStart = container.querySelector('#btn-timer-start');
  const btnReset = container.querySelector('#btn-timer-reset');
  const btnLog   = container.querySelector('#btn-timer-log');

  // Tab switching
  container.querySelectorAll('.timer-tab').forEach(tab => {
    tab.addEventListener('click', () => {
      if (running) return; // don't switch while running
      mode = tab.dataset.mode;
      container.querySelectorAll('.timer-tab').forEach(t => t.classList.remove('active'));
      tab.classList.add('active');
      resetAll();
    });
  });

  function resetAll() {
    stopTimer();
    elapsedMs = 0;
    pomodoroPhase = 'work';
    pomodoroRemainSec = POMODORO_WORK_SEC;
    pomodoroAccumulatedWorkSec = 0;
    display.textContent = mode === 'stopwatch' ? '00:00:00' : formatDuration(POMODORO_WORK_SEC * 1000);
    label.textContent = mode === 'pomodoro' ? 'Work session' : '';
    btnStart.textContent = 'Start';
    btnReset.disabled = true;
    btnLog.disabled = true;
  }

  function stopTimer() {
    if (intervalId) { clearInterval(intervalId); intervalId = null; }
    if (pomodoroIntervalId) { clearInterval(pomodoroIntervalId); pomodoroIntervalId = null; }
    if (running && startTime) {
      elapsedMs += Date.now() - startTime;
      startTime = null;
    }
    running = false;
  }

  function tickStopwatch() {
    const total = elapsedMs + (Date.now() - startTime);
    display.textContent = formatDuration(total);
  }

  function tickPomodoro() {
    pomodoroRemainSec--;
    display.textContent = formatDuration(pomodoroRemainSec * 1000);

    if (pomodoroPhase === 'work') {
      pomodoroAccumulatedWorkSec++;
    }

    if (pomodoroRemainSec <= 0) {
      if (pomodoroPhase === 'work') {
        pomodoroPhase = 'break';
        pomodoroRemainSec = POMODORO_BREAK_SEC;
        label.textContent = 'Break';
      } else {
        pomodoroPhase = 'work';
        pomodoroRemainSec = POMODORO_WORK_SEC;
        label.textContent = 'Work session';
      }
    }
  }

  btnStart.addEventListener('click', () => {
    if (running) {
      // Pause
      stopTimer();
      btnStart.textContent = 'Resume';
      btnLog.disabled = false;
    } else {
      // Start / resume
      startTime = Date.now();
      running = true;
      btnStart.textContent = 'Pause';
      btnReset.disabled = false;
      btnLog.disabled = true;

      if (mode === 'stopwatch') {
        intervalId = setInterval(tickStopwatch, 250);
      } else {
        pomodoroIntervalId = setInterval(tickPomodoro, 1000);
        label.textContent = pomodoroPhase === 'work' ? 'Work session' : 'Break';
      }
    }
  });

  btnReset.addEventListener('click', () => {
    resetAll();
  });

  btnLog.addEventListener('click', () => {
    let workSec;
    if (mode === 'stopwatch') {
      workSec = Math.floor(elapsedMs / 1000);
    } else {
      workSec = pomodoroAccumulatedWorkSec;
    }
    const hours = secondsToDecimalHours(workSec);
    onStop({ hours });
  });

  // Init display
  display.textContent = '00:00:00';
}
