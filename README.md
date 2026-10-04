# Varun Dalle

A to-do list webpage with a frosted-glass design over a fighter-jet background.
It's built with plain HTML, CSS and JavaScript, with no installs or build step.

## How to open it

Double-click `src/index.html`, or right-click it and choose "Open in Browser".

To see changes after editing the code, do a **hard refresh** with Cmd + Shift + R.

## Features

### Tasks
- **Add** a task by typing it and pressing **Add** (or Enter)
- **Tick** a task off with its round checkbox. A **"Smashed it mate"** message flies down the screen ✈️
- **Delete** a task with **✕**
- **Clear done tasks** removes every ticked task at once
- The bubble at the top shows how many tasks are left, or "All done 🎉"

### Dates and times
- **Due date** (optional): shown as `Due: 12 Oct`. It turns **red** once the date has passed and the task isn't done.
- **Time slot** (optional): a start and end time, like `10:00 – 10:30`, shown as a 🕙 bubble on the far right.
  You can also give only a start or only an end. A slot that ends before it starts is refused.
- **Added / Done times** are recorded automatically, like `Added: 4 Oct, 8:05 PM` and `Done: 4 Oct, 8:30 PM`.
  If you untick a task, its Done time is removed.

### Sorting
Tasks are listed in the order of your day: earliest time slot first.
Tasks without a slot go to the bottom, in the order they were added.

### Notes
Click **📝** on a task to open its numbered notes (1, 2, 3…):
- **Add** a point: type it and press Enter or **+**
- **Tick** a point off with its small checkbox
- **Edit** a point: double-click it, then press Enter to save or Esc to cancel
- **Delete** a point with its small **✕**

## Where your tasks are saved

Tasks are saved in your **browser's own storage** (`localStorage`), so they survive refreshes and restarts. Keep in mind:
- They live in **one browser** on **one computer**. Chrome and Safari each keep their own list.
- Always open the page **the same way** (the same file address). A different address starts an empty list.
- **Clearing your browser's history or site data deletes your tasks.**

## Project files

```
VC1/
├── README.md          ← this file
├── CLAUDE.md          ← notes for Claude (the AI helper) about this project
└── src/
    ├── index.html     ← the skeleton: what's on the page
    ├── style.css      ← the clothes: colours, layout, the glass look
    ├── script.js      ← the brain: adding, ticking, notes, sorting, saving
    └── assets/
        └── jet.png    ← background photo
```

The font is **Plus Jakarta Sans**, loaded from Google Fonts. Without internet the page uses the computer's normal font instead.
