// ============================================================
// FOCUS TIMER: works like the Timer in Apple's Clock app
// ============================================================
// This file is loaded BEFORE script.js. It only gets things ready;
// script.js calls initTimer() at the end, once your tasks are loaded.

const TIMER_KEY = "varun-daily-logs-timer";           // where the timer is saved in the browser
const RECENTS_KEY = "varun-daily-logs-timer-recents"; // where recent timers are saved
const ROW_HEIGHT = 34;                // height of one number in the scroll wheels, in pixels
const RING_LENGTH = 2 * Math.PI * 92; // the full length of the ring's line (a circle with radius 92)
const PAGE_TITLE = document.title;    // the normal browser-tab name

// Pieces of the timer card
const timerCard = document.getElementById("timer-card");
const focusLabel = document.getElementById("focus-label");
const focusTaskName = document.getElementById("focus-task-name");
const setupBox = document.getElementById("timer-setup");
const wheelsBox = document.getElementById("wheels");
const runBox = document.getElementById("timer-run");
const ringProgress = document.getElementById("ring-progress");
const timeText = document.getElementById("timer-time");
const endsText = document.getElementById("timer-ends");
const cancelBtn = document.getElementById("timer-cancel");
const mainBtn = document.getElementById("timer-main");
const quickBox = document.getElementById("timer-quick");
const recentsTitle = document.getElementById("recents-title");
const recentsBox = document.getElementById("recents");

// The timer's memory. status is one of: "idle", "running", "paused", "done"
//   duration     = how long the whole timer is, in seconds
//   remaining    = seconds left (used while paused)
//   endAt        = the exact moment it will finish (used while running)
//   runStartedAt = when the current running stretch began (to count focus time)
//   taskId/Text  = the task you're focusing on, if any
function freshTimer() {
  return { status: "idle", duration: 0, remaining: 0, endAt: null, runStartedAt: null, taskId: null, taskText: "" };
}
let timer = JSON.parse(localStorage.getItem(TIMER_KEY)) || freshTimer();
let recents = JSON.parse(localStorage.getItem(RECENTS_KEY)) || []; // e.g. [1500, 2700] = 25 min, 45 min
let picked = { hours: 0, min: 25, sec: 0 }; // what the scroll wheels are set to

function saveTimer() {
  localStorage.setItem(TIMER_KEY, JSON.stringify(timer));
}

// ---------- Turning seconds into words ----------

// 1453 → "24:13", 3909 → "1:05:09" (like Apple's big countdown)
function clockText(totalSeconds) {
  const s = Math.max(0, Math.ceil(totalSeconds));
  const h = Math.floor(s / 3600);
  const m = Math.floor((s % 3600) / 60);
  const sec = String(s % 60).padStart(2, "0");
  return h > 0 ? `${h}:${String(m).padStart(2, "0")}:${sec}` : `${m}:${sec}`;
}

// 1500 → "25 min", 5400 → "1 h 30 min", 90 → "1 min 30 s"
function durationLabel(seconds) {
  const h = Math.floor(seconds / 3600);
  const m = Math.floor((seconds % 3600) / 60);
  const s = seconds % 60;
  const parts = [];
  if (h) parts.push(`${h} h`);
  if (m) parts.push(`${m} min`);
  if (s) parts.push(`${s} s`);
  return parts.join(" ") || "0 s";
}

// ---------- The scroll wheels (hours, min, sec) ----------

function buildWheels() {
  [["hours", 23], ["min", 59], ["sec", 59]].forEach(([unit, max]) => {
    const wheel = document.createElement("div");
    wheel.className = "wheel";

    // A tall list of numbers you scroll up and down. It "snaps" so one number sits in the middle.
    const scroller = document.createElement("div");
    scroller.className = "wheel-scroll";
    scroller.dataset.unit = unit;
    for (let n = 0; n <= max; n++) {
      const item = document.createElement("div");
      item.className = "wheel-item";
      item.textContent = n;
      // Clicking a number scrolls it into the middle
      item.addEventListener("click", () => scroller.scrollTo({ top: n * ROW_HEIGHT, behavior: "smooth" }));
      scroller.appendChild(item);
    }

    // Whenever the wheel moves, work out which number is in the middle
    scroller.addEventListener("scroll", () => {
      const n = Math.min(max, Math.max(0, Math.round(scroller.scrollTop / ROW_HEIGHT)));
      picked[unit] = n;
      markSelected(scroller, n);
      mainBtn.disabled = timer.status === "idle" && pickedSeconds() === 0; // can't start a 0-second timer
    });

    // The word that sits beside the middle number: "hours", "min", "sec"
    const tag = document.createElement("span");
    tag.className = "wheel-label";
    tag.textContent = unit;

    wheel.append(scroller, tag);
    wheelsBox.appendChild(wheel);
  });
}

// Make the middle number bright and the others faded
function markSelected(scroller, n) {
  [...scroller.children].forEach((item, i) => item.classList.toggle("selected", i === n));
}

// Scroll each wheel to the picked numbers (needed whenever the wheels become visible again)
function showPickedOnWheels() {
  wheelsBox.querySelectorAll(".wheel-scroll").forEach((scroller) => {
    scroller.scrollTop = picked[scroller.dataset.unit] * ROW_HEIGHT;
    markSelected(scroller, picked[scroller.dataset.unit]);
  });
}

function pickedSeconds() {
  return picked.hours * 3600 + picked.min * 60 + picked.sec;
}

// ---------- Start, pause, resume, cancel, finish ----------

function startTimer(seconds, task = null) {
  if (seconds <= 0) return;
  if (timer.status === "running" || timer.status === "paused") cancelTimer(); // stop (and count) the old one first
  unlockSound();
  const now = Date.now();
  timer = {
    status: "running",
    duration: seconds,
    remaining: seconds,
    endAt: now + seconds * 1000,
    runStartedAt: now,
    taskId: task ? task.id : null,
    taskText: task ? task.text : "",
  };
  rememberRecent(seconds);
  saveTimer();
  updateTimerUI();
  render(); // so the task you're focusing on lights up
}

function pauseTimer() {
  const now = Date.now();
  creditFocus(now - timer.runStartedAt);
  timer.remaining = (timer.endAt - now) / 1000;
  timer.status = "paused";
  timer.endAt = null;
  timer.runStartedAt = null;
  saveTimer();
  updateTimerUI();
  render();
}

function resumeTimer() {
  unlockSound();
  const now = Date.now();
  timer.endAt = now + timer.remaining * 1000;
  timer.runStartedAt = now;
  timer.status = "running";
  saveTimer();
  updateTimerUI();
}

function cancelTimer() {
  if (timer.status === "running") creditFocus(Math.min(Date.now(), timer.endAt) - timer.runStartedAt);
  timer = freshTimer();
  saveTimer();
  updateTimerUI();
  render();
}

function finishTimer() {
  creditFocus(timer.endAt - timer.runStartedAt);
  timer.status = "done";
  timer.remaining = 0;
  timer.endAt = null;
  timer.runStartedAt = null;
  saveTimer();
  playChime();
  showToast("Time's up! ⏰");
  updateTimerUI();
  render();
}

// After "Time's up!", go back to the wheels
function closeDoneTimer() {
  timer = freshTimer();
  saveTimer();
  updateTimerUI();
  render();
}

// Add focused time to the task you were focusing on (ms = milliseconds, 1000 ms = 1 second)
function creditFocus(ms) {
  if (!timer.taskId) return;
  const task = tasks.find((t) => t.id === timer.taskId);
  if (!task) return; // the task was deleted meanwhile
  task.focusSeconds = (task.focusSeconds || 0) + Math.max(0, Math.round(ms / 1000));
  save();
}

// ---------- Focusing on a task ----------

// How long a task's time slot is, in minutes: 10:00–10:30 → 30. No full slot → 0
function slotMinutes(task) {
  if (!task.slotStart || !task.slotEnd) return 0;
  const [h1, m1] = task.slotStart.split(":").map(Number);
  const [h2, m2] = task.slotEnd.split(":").map(Number);
  return h2 * 60 + m2 - (h1 * 60 + m1);
}

// Called by the ⏱️ button on each task: start a timer for the task's slot length (or 25 min)
function startFocusOnTask(task) {
  startTimer((slotMinutes(task) || 25) * 60, task);
  timerCard.scrollIntoView({ behavior: "smooth", block: "nearest" }); // on phones, scroll down to the timer
}

function isFocusingOn(task) {
  return (timer.status === "running" || timer.status === "paused") && timer.taskId === task.id;
}

// ---------- Recent timers ----------

function rememberRecent(seconds) {
  recents = [seconds, ...recents.filter((s) => s !== seconds)].slice(0, 3); // newest first, no repeats, max 3
  localStorage.setItem(RECENTS_KEY, JSON.stringify(recents));
}

function renderRecents() {
  recentsBox.innerHTML = "";
  recentsTitle.hidden = recents.length === 0;
  recents.forEach((seconds) => {
    const chip = document.createElement("button");
    chip.type = "button";
    chip.className = "chip";
    chip.textContent = `↺ ${durationLabel(seconds)}`;
    chip.addEventListener("click", () => startTimer(seconds));
    recentsBox.appendChild(chip);
  });
}

// ---------- The chime (made by code, no sound file needed) ----------

let audio = null;

// Browsers only allow sound after you've clicked something, so we "unlock" it when you press Start
function unlockSound() {
  try {
    audio = audio || new (window.AudioContext || window.webkitAudioContext)();
    if (audio.state === "suspended") audio.resume();
  } catch (e) {
    audio = null; // no sound available, the timer still works
  }
}

// Three soft "ding"s
function playChime() {
  if (!audio) return;
  [0, 0.35, 0.7].forEach((delay) => {
    const tone = audio.createOscillator(); // makes a pure musical note
    const volume = audio.createGain();     // fades it in and out
    tone.type = "sine";
    tone.frequency.value = 880; // the note A, quite high and bright
    const t = audio.currentTime + delay;
    volume.gain.setValueAtTime(0.0001, t);
    volume.gain.exponentialRampToValueAtTime(0.3, t + 0.02);
    volume.gain.exponentialRampToValueAtTime(0.0001, t + 0.3);
    tone.connect(volume).connect(audio.destination);
    tone.start(t);
    tone.stop(t + 0.32);
  });
}

// ---------- Drawing the timer card ----------

// Show the right parts and button labels for the current status
function updateTimerUI() {
  const idle = timer.status === "idle";

  setupBox.hidden = !idle;
  quickBox.hidden = !idle;
  runBox.hidden = idle;
  runBox.classList.toggle("done", timer.status === "done");
  if (idle) {
    showPickedOnWheels(); // after un-hiding, so the wheels can scroll
    renderRecents();
  }

  focusLabel.hidden = !timer.taskText;
  focusTaskName.textContent = timer.taskText;

  cancelBtn.disabled = idle;
  const labels = { idle: "Start", running: "Pause", paused: "Resume", done: "Done" };
  mainBtn.textContent = labels[timer.status];
  mainBtn.className = `round-btn ${timer.status === "running" ? "pause" : "start"}`;
  mainBtn.disabled = idle && pickedSeconds() === 0;

  drawTime();
}

// The big countdown, the ring, the "ends at" line and the browser-tab name
function drawTime() {
  const left = timer.status === "running" ? (timer.endAt - Date.now()) / 1000 : timer.remaining;
  const doneFraction = timer.duration ? 1 - left / timer.duration : 0;
  ringProgress.style.strokeDashoffset = RING_LENGTH * Math.min(1, Math.max(0, doneFraction));

  if (timer.status === "done") {
    timeText.textContent = "Time's up!";
    endsText.textContent = timer.taskText ? "Well focused 💪" : "⏰";
    document.title = "⏰ Time's up!";
  } else if (timer.status === "paused") {
    timeText.textContent = clockText(left);
    endsText.textContent = "Paused";
    document.title = `⏸ ${clockText(left)} · ${PAGE_TITLE}`;
  } else if (timer.status === "running") {
    timeText.textContent = clockText(left);
    endsText.textContent = `🔔 ${shortTime(new Date(timer.endAt))}`;
    document.title = `${clockText(left)} · ${PAGE_TITLE}`;
  } else {
    document.title = PAGE_TITLE;
  }
}

// ---------- Getting started (called from the end of script.js) ----------

function initTimer() {
  buildWheels();
  ringProgress.style.strokeDasharray = RING_LENGTH;

  // The two round buttons
  mainBtn.addEventListener("click", () => {
    if (timer.status === "idle") startTimer(pickedSeconds());
    else if (timer.status === "running") pauseTimer();
    else if (timer.status === "paused") resumeTimer();
    else closeDoneTimer();
  });
  cancelBtn.addEventListener("click", () => (timer.status === "done" ? closeDoneTimer() : cancelTimer()));

  // Quick focus buttons: 25 / 15 / 5 min
  quickBox.querySelectorAll("[data-minutes]").forEach((chip) => {
    chip.addEventListener("click", () => startTimer(Number(chip.dataset.minutes) * 60));
  });

  // If the timer finished while the page was closed, finish it now
  if (timer.status === "running" && Date.now() >= timer.endAt) finishTimer();
  updateTimerUI();

  // Every quarter of a second: update the countdown, and finish when time's up
  setInterval(() => {
    if (timer.status !== "running") return;
    if (Date.now() >= timer.endAt) finishTimer();
    else drawTime();
  }, 250);
}
