# Varun Dalle – project notes for Claude

## What this is
A to-do list webpage called "Varun Dalle". Plain HTML, CSS and JavaScript, with no frameworks and no build step. The README lists the user-facing features.

## Files
- `src/index.html`: page structure (header, two-row add form, list, toast)
- `src/style.css`: frosted-glass look; colours live in CSS variables under `:root`
- `src/script.js`: all behaviour. `render()` rebuilds the whole list from `tasks` on every change.
- `src/assets/jet.png`: background photo

## Data
Tasks are saved in localStorage under `varun-dalle-tasks`. Each task looks like:
`{ text, done, due, slotStart, slotEnd, addedAt, doneAt, notes: [{ text, done }], notesOpen }`
- Older saved tasks may be missing newer fields, so always handle that (e.g. `task.notes || []`).
- The list is shown sorted by time slot (`sortedBySlot`, which sorts a copy). Never rely on the on-screen position as an index into `tasks`; use `tasks.indexOf(task)`.

## Testing
Test changes in a copy of `src/` in the scratchpad with headless Chrome: append a "robot" script that drives the page, then screenshot it and check for errors. Headless Chrome's minimum window width is 500px.

## About the owner
Varun is new to coding and is learning by vibe coding.
- Explain changes in very simple words, like to a 5-year-old.
- Make small changes, one at a time.
- Keep code simple and add short comments explaining what each part does.
- When a request is open to interpretation, confirm with a quick sketch or options before building.
- Remind Varun to hard refresh (Cmd + Shift + R) to test in the browser, and to commit when something works.
