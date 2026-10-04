// Grab the pieces of the page we need to work with
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const dueInput = document.getElementById("due-input");
const list = document.getElementById("task-list");
const counter = document.getElementById("counter");
const toast = document.getElementById("toast");
const clearDoneBtn = document.getElementById("clear-done");

// Our tasks live here. Each task looks like:
// { text: "Buy milk", done: false, due: "2026-10-05", addedAt: "...", doneAt: null }
//   due     = the day it must be done by ("" if no due date)
//   addedAt = the moment it was added   ("logged in")
//   doneAt  = the moment it was ticked  ("logged out"), or null if not done yet
// We load them from the browser's memory (localStorage) so they survive a refresh.
let tasks = JSON.parse(localStorage.getItem("varun-dalle-tasks")) || [];

// Save tasks into the browser's memory
function save() {
  localStorage.setItem("varun-dalle-tasks", JSON.stringify(tasks));
}

// Make "Smashed it mate" fly from the top of the screen to the bottom
function showToast() {
  toast.classList.remove("fly");
  void toast.offsetWidth; // little trick: makes the browser forget the old flight, so it can fly again
  toast.classList.add("fly");
}

// Today's date as "YYYY-MM-DD" (the same shape the date picker uses)
function todayString() {
  const now = new Date();
  const month = String(now.getMonth() + 1).padStart(2, "0");
  const day = String(now.getDate()).padStart(2, "0");
  return `${now.getFullYear()}-${month}-${day}`;
}

// A date → "12 Oct"
function shortDay(date) {
  return date.toLocaleDateString("en-GB", { day: "numeric", month: "short" });
}

// A due date from the picker, "2026-10-12" → "12 Oct"
function formatDay(dateString) {
  return shortDay(new Date(dateString + "T00:00"));
}

// A saved moment → "4 Oct, 7:59 PM"
function formatMoment(isoString) {
  const moment = new Date(isoString);
  const time = moment.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
  return `${shortDay(moment)}, ${time}`;
}

// Draw all the tasks on the page
function render() {
  list.innerHTML = ""; // wipe the list clean, then rebuild it
  const today = todayString();

  tasks.forEach((task, index) => {
    const li = document.createElement("li");
    if (task.done) li.classList.add("done");

    // Tick box: click it to mark done / not done
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      // Ticked → remember the time ("logged out"). Unticked → forget it.
      task.doneAt = task.done ? new Date().toISOString() : null;
      if (task.done) showToast(); // only celebrate when ticking, not un-ticking
      save();
      render();
    });

    // The task's words, with the small info line underneath
    const body = document.createElement("div");
    body.className = "task-body";

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const info = document.createElement("div");
    info.className = "task-info";

    if (task.due) {
      const due = document.createElement("span");
      due.textContent = `Due: ${formatDay(task.due)}`;
      // Date has passed and the task isn't done yet → red
      if (!task.done && task.due < today) due.className = "overdue";
      info.append(due);
    }
    if (task.addedAt) {
      const added = document.createElement("span");
      added.textContent = `Added: ${formatMoment(task.addedAt)}`;
      info.append(added);
    }
    if (task.doneAt) {
      const finished = document.createElement("span");
      finished.textContent = `Done: ${formatMoment(task.doneAt)}`;
      info.append(finished);
    }

    body.append(text, info);

    // ✕ button: delete this task
    const del = document.createElement("button");
    del.textContent = "✕";
    del.className = "delete-btn";
    del.addEventListener("click", () => {
      tasks.splice(index, 1);
      save();
      render();
    });

    li.append(checkbox, body, del);
    list.appendChild(li);
  });

  // Show how many tasks are left
  const left = tasks.filter((t) => !t.done).length;
  counter.textContent = tasks.length === 0
    ? "Nothing to do yet. Add a task above!"
    : `${left} of ${tasks.length} tasks left`;

  // Only show the Clear button when there's at least one done task to clear
  clearDoneBtn.hidden = !tasks.some((t) => t.done);
}

// Clear done tasks: keep only the tasks that are NOT done
clearDoneBtn.addEventListener("click", () => {
  tasks = tasks.filter((t) => !t.done);
  save();
  render();
});

// When you press Add (or Enter), add a new task
form.addEventListener("submit", (event) => {
  event.preventDefault(); // stop the page from reloading
  const text = input.value.trim();
  if (text === "") return; // ignore empty tasks

  tasks.push({
    text: text,
    done: false,
    due: dueInput.value, // "" if no date was picked
    addedAt: new Date().toISOString(), // the exact moment it was added
    doneAt: null,
  });
  input.value = "";
  dueInput.value = "";
  save();
  render();
});

// Draw the list once when the page first opens
render();
