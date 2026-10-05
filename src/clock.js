// ============================================================
// LIVE CLOCK: the current time in India (IST), top-left of the page
// ============================================================
// It always shows India time, even if the computer is set to another country.

const clockHours = document.getElementById("clock-h");
const clockMinutes = document.getElementById("clock-m");
const clockColon = document.getElementById("clock-colon");
const clockSeconds = document.getElementById("clock-sec");
const clockAmPm = document.getElementById("clock-ampm");
const clockDate = document.getElementById("clock-date");
const clockBarFill = document.getElementById("clock-bar-fill");

// A "translator" that turns any moment into India's time.
// "Asia/Kolkata" is the official name of the IST time zone.
const istTime = new Intl.DateTimeFormat("en-US", {
  timeZone: "Asia/Kolkata",
  hour: "2-digit",
  minute: "2-digit",
  second: "2-digit",
  hour12: true,
});
const istDate = new Intl.DateTimeFormat("en-GB", {
  timeZone: "Asia/Kolkata",
  weekday: "short",
  day: "numeric",
  month: "short",
});

let lastSecond = null;

function updateClock() {
  const now = new Date();

  // Split the time into pieces: hour, minute, second, AM/PM
  const parts = {};
  istTime.formatToParts(now).forEach((p) => (parts[p.type] = p.value));

  if (parts.second === lastSecond) return; // nothing new to show yet
  lastSecond = parts.second;

  clockHours.textContent = parts.hour;
  clockMinutes.textContent = parts.minute;
  clockSeconds.textContent = parts.second;
  clockAmPm.textContent = parts.dayPeriod.toUpperCase();
  clockDate.textContent = istDate.format(now); // "Mon, 5 Oct"

  const sec = Number(parts.second);

  // The colon blinks: bright on even seconds, dim on odd ones
  clockColon.classList.toggle("dim", sec % 2 === 1);

  // The bar fills up across the minute, then jumps back to empty at :00
  clockBarFill.classList.toggle("reset", sec === 0); // no sliding animation when it jumps back
  clockBarFill.style.transform = `scaleX(${sec / 59})`; // stretch the bar from the left (0 = empty, 1 = full)
}

updateClock();
setInterval(updateClock, 200); // check 5 times a second, so it ticks right on time
