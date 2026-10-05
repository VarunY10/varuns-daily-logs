// Grab the pieces of the page we need to work with
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const dueInput = document.getElementById("due-input");
const slotStartInput = document.getElementById("slot-start");
const slotEndInput = document.getElementById("slot-end");
const list = document.getElementById("task-list");
const counter = document.getElementById("counter");
const toast = document.getElementById("toast");
const clearDoneBtn = document.getElementById("clear-done");
const emptyState = document.getElementById("empty-state");
const todayLabel = document.getElementById("today");

// Our tasks live here. Each task looks like:
// { text: "Run 5km", done: false, due: "2026-10-05", slotStart: "10:00", slotEnd: "10:30",
//   addedAt: "...", doneAt: null,
//   notes: [{ text: "Get the full-fat one", done: false }], notesOpen: false }
//   due       = the day it must be done by ("" if no due date)
//   slotStart = when you plan to START it, 24-hour form ("" if no time slot)
//   slotEnd   = when you plan to FINISH it ("" if no end time)
//   addedAt   = the moment it was added   ("logged in")
//   doneAt    = the moment it was ticked  ("logged out"), or null if not done yet
//   notes     = the numbered points (1, 2, 3...) for this task
//   notesOpen = is the notes box folded out right now?
//   id           = a unique name tag, so the timer can find this task again
//   focusSeconds = total time spent focusing on it with the timer
//   number       = its ticket number ("Task 7"), given when it's created and never changed
// We load them from the browser's memory (localStorage) so they survive a refresh.
// (The label "varun-dalle-tasks" is from the app's old name. Keep it! Changing it would lose all saved tasks.)
let tasks = JSON.parse(localStorage.getItem("varun-dalle-tasks")) || [];

// Make a unique name tag for a task, like "m1x2k9abc12"
function makeId() {
  return Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
}

// Older tasks were saved before name tags existed. Give them one now.
tasks.forEach((task) => {
  if (!task.id) task.id = makeId();
});

// Ticket numbers: the next new task gets this number. It only ever goes UP,
// so a deleted task's number is never reused (just like ticket numbers at a counter).
const NUMBER_KEY = "varun-daily-logs-next-task-number";
const highestNumber = Math.max(0, ...tasks.map((t) => t.number || 0));
let nextTaskNumber = Math.max(Number(localStorage.getItem(NUMBER_KEY)) || 1, highestNumber + 1);

// Older tasks don't have a number yet: number them in the order they were added
tasks.forEach((task) => {
  if (!task.number) task.number = nextTaskNumber++;
});
localStorage.setItem(NUMBER_KEY, nextTaskNumber);

// Save tasks into the browser's memory
function save() {
  localStorage.setItem("varun-dalle-tasks", JSON.stringify(tasks));
}
save(); // store the new name tags straight away

// Make a message fly from the top of the screen to the bottom ("Smashed it mate" unless told otherwise)
function showToast(message = "Smashed it mate") {
  toast.textContent = message;
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

// A date → "7:59 PM"
function shortTime(date) {
  return date.toLocaleTimeString("en-US", { hour: "numeric", minute: "2-digit", hour12: true });
}

// A saved moment → "4 Oct, 7:59 PM"
function formatMoment(isoString) {
  const moment = new Date(isoString);
  return `${shortDay(moment)}, ${shortTime(moment)}`;
}

// Has this task's due date already passed? (late once the whole day is over)
function isOverdue(task) {
  return !task.done && Boolean(task.due) && task.due < todayString();
}

// The time slot as words: "10:00 – 10:30", or just "10:00" / "until 10:30"
function slotText(task) {
  if (task.slotStart && task.slotEnd) return `${task.slotStart} – ${task.slotEnd}`;
  if (task.slotStart) return task.slotStart;
  return `until ${task.slotEnd}`;
}

// Which task's "Add a note" box should get the typing cursor after the next redraw
let focusNotesOf = null;

// Build the fold-out notes box for one task: numbered points you can tick, edit and delete
function renderNotes(task) {
  if (!task.notes) task.notes = []; // older tasks didn't have notes yet

  const panel = document.createElement("div");
  panel.className = "notes-panel";

  // The numbered list. <ol> = "ordered list": the browser writes 1, 2, 3... for us
  const ol = document.createElement("ol");
  task.notes.forEach((note, noteIndex) => {
    const item = document.createElement("li");
    if (note.done) item.classList.add("note-done");

    // Small tick box for this point
    const tick = document.createElement("input");
    tick.type = "checkbox";
    tick.checked = note.done;
    tick.addEventListener("change", () => {
      note.done = tick.checked;
      save();
      render();
    });

    // The point's words. Double-click to edit them.
    const words = document.createElement("span");
    words.className = "note-text";
    words.textContent = note.text;
    words.title = "Double-click to edit";
    words.addEventListener("dblclick", () => {
      const editBox = document.createElement("input");
      editBox.type = "text";
      editBox.className = "note-edit";
      editBox.value = note.text;
      let finished = false;
      const finish = (keep) => {
        if (finished) return; // stop it running twice (Enter, then losing focus)
        finished = true;
        const newText = editBox.value.trim();
        if (keep && newText !== "") note.text = newText; // empty? keep the old words
        save();
        render();
      };
      editBox.addEventListener("keydown", (e) => {
        if (e.key === "Enter") finish(true);
        if (e.key === "Escape") finish(false); // Esc = cancel
      });
      editBox.addEventListener("blur", () => finish(true)); // clicking away also saves
      words.replaceWith(editBox);
      editBox.focus();
      editBox.select();
    });

    // Small ✕ to delete this point. The numbers below move up by themselves.
    const remove = document.createElement("button");
    remove.className = "note-delete";
    remove.textContent = "✕";
    remove.addEventListener("click", () => {
      task.notes.splice(noteIndex, 1);
      save();
      render();
    });

    item.append(tick, words, remove);
    ol.appendChild(item);
  });

  // The "Add a note" box and + button
  const addRow = document.createElement("form");
  addRow.className = "note-add";
  const addBox = document.createElement("input");
  addBox.type = "text";
  addBox.placeholder = "Add a note...";
  addBox.dataset.taskIndex = tasks.indexOf(task); // a name tag, so we can find this box again later
  const plus = document.createElement("button");
  plus.type = "submit";
  plus.textContent = "+";
  addRow.addEventListener("submit", (e) => {
    e.preventDefault(); // stop the page from reloading
    const noteText = addBox.value.trim();
    if (noteText === "") return;
    task.notes.push({ text: noteText, done: false });
    focusNotesOf = task; // keep typing more points straight away
    save();
    render();
  });
  addRow.append(addBox, plus);

  panel.append(ol, addRow);
  return panel;
}

// The time a task is sorted by: its slot start, or its end if it only has an end.
// No slot at all → null
function slotSortTime(task) {
  return task.slotStart || task.slotEnd || null;
}

// Put tasks in the order of your day: earliest time slot first, tasks without a slot at the bottom
function sortedBySlot(allTasks) {
  return [...allTasks].sort((a, b) => { // [...allTasks] = sort a COPY, so the saved order stays the same
    const timeA = slotSortTime(a);
    const timeB = slotSortTime(b);
    if (timeA && !timeB) return -1; // a has a slot, b doesn't → a goes first
    if (!timeA && timeB) return 1;  // b has a slot, a doesn't → b goes first
    if (!timeA && !timeB) return 0; // neither has a slot → keep the order they were added
    return timeA.localeCompare(timeB); // both have slots → earlier time first ("09:00" before "10:00")
  });
}

// Draw all the tasks on the page
function render() {
  list.innerHTML = ""; // wipe the list clean, then rebuild it

  sortedBySlot(tasks).forEach((task) => {
    const li = document.createElement("li");
    if (task.done) li.classList.add("done");
    if (isFocusingOn(task)) li.classList.add("focusing"); // glows pink while the timer runs for it

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

    // Small "TASK 3" label above the task's words
    const number = document.createElement("span");
    number.className = "task-number";
    number.textContent = `Task ${task.number}`;

    const text = document.createElement("span");
    text.className = "task-text";
    text.textContent = task.text;

    const info = document.createElement("div");
    info.className = "task-info";

    if (task.due) {
      const due = document.createElement("span");
      due.textContent = `Due: ${formatDay(task.due)}`;
      // Due date has passed and the task isn't done yet → red
      if (isOverdue(task)) due.className = "overdue";
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
    if (task.focusSeconds >= 60) {
      const focused = document.createElement("span");
      focused.className = "focused-time";
      // Whole minutes only: 3061 seconds → "51 min focused"
      focused.textContent = `⏱️ ${durationLabel(Math.floor(task.focusSeconds / 60) * 60)} focused`;
      info.append(focused);
    }

    body.append(number, text, info);

    // ⏱️ button: start the focus timer for this task
    const focusBtn = document.createElement("button");
    focusBtn.className = "focus-btn";
    focusBtn.textContent = "⏱️";
    focusBtn.title = "Focus on this task";
    focusBtn.addEventListener("click", () => startFocusOnTask(task));

    // 📝 button: open / close this task's notes. Shows how many points it has.
    const notesBtn = document.createElement("button");
    notesBtn.className = "notes-btn";
    notesBtn.textContent = `📝 ${(task.notes || []).length}`;
    notesBtn.title = task.notesOpen ? "Hide notes" : "Show notes";
    notesBtn.addEventListener("click", () => {
      task.notesOpen = !task.notesOpen;
      if (task.notesOpen) focusNotesOf = task; // jump straight into the "Add a note" box
      save();
      render();
    });

    // ✕ button: delete this task
    const del = document.createElement("button");
    del.textContent = "✕";
    del.className = "delete-btn";
    del.addEventListener("click", () => {
      tasks.splice(tasks.indexOf(task), 1); // find THIS task in the saved list and remove it
      save();
      render();
    });

    // The three buttons live together in one little group (on phones the group moves under the task)
    const actions = document.createElement("div");
    actions.className = "task-actions";
    actions.append(focusBtn, notesBtn, del);

    li.append(checkbox, body, actions);

    // 🕙 Time slot bubble: the very last thing on the far right.
    // Tasks without a slot get an invisible one, so the 📝 and ✕ buttons line up on every row.
    const slot = document.createElement("span");
    slot.className = "slot-badge";
    if (task.slotStart || task.slotEnd) {
      slot.textContent = `🕙 ${slotText(task)}`;
    } else {
      slot.classList.add("slot-empty");
    }
    li.append(slot);

    // Notes go on their own line underneath, centred in the tile
    if (task.notesOpen) {
      const notesRow = document.createElement("div");
      notesRow.className = "notes-row";
      notesRow.append(renderNotes(task));
      li.append(notesRow);
    }
    list.appendChild(li);
  });

  // If we just opened notes or added a point, put the typing cursor back in that "Add a note" box
  if (focusNotesOf) {
    const box = list.querySelector(`[data-task-index="${tasks.indexOf(focusNotesOf)}"]`);
    if (box) box.focus();
    focusNotesOf = null;
  }

  // The bubble at the top: how many tasks are left
  const left = tasks.filter((t) => !t.done).length;
  counter.textContent = tasks.length === 0 ? "No tasks"
    : left === 0 ? "All done 🎉"
    : `${left} left`;

  // Only show the "Nothing to do yet" message when the list is empty
  emptyState.hidden = tasks.length > 0;

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

  // A slot must finish AFTER it starts. If not, show a little warning and don't add yet
  if (slotStartInput.value && slotEndInput.value && slotEndInput.value <= slotStartInput.value) {
    slotEndInput.setCustomValidity("The end time must be after the start time");
    slotEndInput.reportValidity();
    return;
  }

  tasks.push({
    text: text,
    done: false,
    due: dueInput.value, // "" if no date was picked
    slotStart: slotStartInput.value, // "" if no start time was picked
    slotEnd: slotEndInput.value,     // "" if no end time was picked
    addedAt: new Date().toISOString(), // the exact moment it was added
    doneAt: null,
    notes: [],
    notesOpen: false,
    id: makeId(),
    focusSeconds: 0,
    number: nextTaskNumber, // this task's ticket number...
  });
  nextTaskNumber++; // ...and the next task gets the next one
  localStorage.setItem(NUMBER_KEY, nextTaskNumber);
  input.value = "";
  dueInput.value = "";
  slotStartInput.value = "";
  slotEndInput.value = "";
  save();
  render();
});

// As soon as you change the end time, clear any old "end must be after start" warning
slotEndInput.addEventListener("input", () => slotEndInput.setCustomValidity(""));

// Write today's date under the title, like "Sunday, 4 October"
todayLabel.textContent = new Date().toLocaleDateString("en-GB", {
  weekday: "long", day: "numeric", month: "long",
});

// Draw the list once when the page first opens
render();

// Get the focus timer going (it lives in timer.js)
initTimer();
