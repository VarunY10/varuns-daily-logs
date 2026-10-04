// Grab the pieces of the page we need to work with
const form = document.getElementById("task-form");
const input = document.getElementById("task-input");
const list = document.getElementById("task-list");
const counter = document.getElementById("counter");
const toast = document.getElementById("toast");
const clearDoneBtn = document.getElementById("clear-done");

// Our tasks live here. Each task looks like: { text: "Buy milk", done: false }
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

// Draw all the tasks on the page
function render() {
  list.innerHTML = ""; // wipe the list clean, then rebuild it

  tasks.forEach((task, index) => {
    const li = document.createElement("li");
    if (task.done) li.classList.add("done");

    // Tick box: click it to mark done / not done
    const checkbox = document.createElement("input");
    checkbox.type = "checkbox";
    checkbox.checked = task.done;
    checkbox.addEventListener("change", () => {
      task.done = checkbox.checked;
      if (task.done) showToast(); // only celebrate when ticking, not un-ticking
      save();
      render();
    });

    // The task's words
    const text = document.createElement("span");
    text.textContent = task.text;

    // ✕ button: delete this task
    const del = document.createElement("button");
    del.textContent = "✕";
    del.className = "delete-btn";
    del.addEventListener("click", () => {
      tasks.splice(index, 1);
      save();
      render();
    });

    li.append(checkbox, text, del);
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

  tasks.push({ text: text, done: false });
  input.value = "";
  save();
  render();
});

// Draw the list once when the page first opens
render();
