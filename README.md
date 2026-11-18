# How Linux Works — Study Lab

An offline-friendly, interactive study companion for **How Linux Works: What Every Superuser Should Know, 3rd Edition** by Brian Ward (No Starch Press, 2021).

The guide follows the book chapter by chapter. All prose is original study material — a paraphrased companion that points back to the book's chapter and section numbers. The book remains the primary source; this site is for review, practice, and spaced repetition.

## Run it

No build step and no dependencies. From this folder:

```bash
./serve.sh          # http://localhost:8099
# or
python3 -m http.server 8099
```

Then open <http://localhost:8099/>.

A local server is recommended (rather than opening `index.html` directly) so that the service worker and offline cache can work. Everything else, including progress saving, works without a network connection once the page has loaded.

## What's inside

| Area | What it covers |
| --- | --- |
| **17 chapter modules** | Notes, learning objectives, diagrams, section references, callouts, key terms |
| **Interactive visuals** | Three stage-by-stage walkthroughs: boot, command execution, and packet journey, with playback, scrubbing, and failure injection |
| **Command reference** | 235 commands with descriptions and one-click copy |
| **Labs** | 175 step-by-step exercises with checkboxes and safety notes |
| **Quizzes** | 89 multiple-choice questions with explanations and scoring |
| **Flashcards** | 111 cards, filterable by chapter, with mastery tracking |
| **Practice exam** | 25 random questions drawn from all chapters, timed, with a scored review |
| **Search** | Full-text search across notes, commands, cards, and quiz questions (`Ctrl K` or `/`) |
| **Progress** | Completion, quiz accuracy, lab steps, cards mastered, exam history; stored in `localStorage` |
| **Themes** | Dark and light, remembered per browser (`?theme=light` / `?theme=dark` to override) |
| **Print** | Chapter notes print cleanly via the **Print notes** button |

Progress is local to the browser. There is no account, server, or telemetry. Use **My progress → Reset all** to start over, or **Export JSON** to keep a copy.

## Chapters

| # | Chapter | Track |
| --- | --- | --- |
| 1 | The Big Picture | Foundations |
| 2 | Basic Commands and Directory Hierarchy | Foundations |
| 3 | Devices | Devices, disks & boot |
| 4 | Disks and Filesystems | Devices, disks & boot |
| 5 | How the Linux Kernel Boots | Devices, disks & boot |
| 6 | How User Space Starts | Devices, disks & boot |
| 7 | System Configuration: Logging, System Time, Batch Jobs, and Users | Administration |
| 8 | A Closer Look at Processes and Resource Utilization | Administration |
| 9 | Understanding Your Network and Its Configuration | Networking & shell |
| 10 | Network Applications and Services | Networking & shell |
| 11 | Introduction to Shell Scripts | Networking & shell |
| 12 | Network File Transfer and Sharing | Networking & shell |
| 13 | User Environments | Desktop & development |
| 14 | A Brief Survey of the Linux Desktop and Printing | Desktop & development |
| 15 | Development Tools | Desktop & development |
| 16 | Introduction to Compiling Software from C Source Code | Desktop & development |
| 17 | Virtualization | Desktop & development |

## Project layout

```
linux-study/
├── index.html              App shell and page chrome
├── css/style.css           All styling, responsive + print
├── js/app.js               Routing, rendering, quizzes, exam, search, progress
├── data/book.js            Book metadata and study tracks
├── data/visuals.js         Boot, command, and packet walkthroughs
├── data/ch01.js … ch17.js  One module per chapter
├── manifest.webmanifest    Installable web app metadata
├── sw.js                   Offline cache (service worker)
├── icon.svg                App icon
└── serve.sh                Local server helper
```

Chapter files are plain scripts that push into `window.HLW.chapters`. Each module has this shape:

```js
HLW.chapters.push({
  id: 2,
  title: "Basic Commands and Directory Hierarchy",
  short: "Commands",
  track: "foundations",
  minutes: 35,
  blurb: "…",
  objectives: ["…"],
  sections: [{ id: "ch2-shell", title: "…", ref: "2.1", html: "<p>…</p>", diagram: {…}, callout: {…} }],
  commands: [{ cmd: "ls -l", desc: "…" }],
  labs: [{ title: "…", goal: "…", steps: [{ text: "…", cmd: "…" }] }],
  cards: [{ front: "…", back: "…" }],
  quiz: [{ q: "…", options: ["…"], answer: 1, explain: "…" }]
});
```

Quiz `answer` values are zero-based indices. Keep commands non-destructive and clearly marked when they need `sudo`.

## Adding or editing content

1. Edit the relevant `data/chNN.js` file (or add a new one and load it in `index.html` in numeric order).
2. Check syntax: `node --check data/ch02.js`.
3. Bump `CACHE` in `sw.js` if you want returning visitors to pick up the change immediately.
4. Reload the page. Progress state lives under the `hlw-study-v1` key.

There is no framework and no bundler, so any static host works (GitHub Pages, Netlify, a Raspberry Pi, or a local Termux server).

## Keyboard shortcuts

- `Ctrl K` / `Cmd K` — open search
- `/` — open search (when not typing)
- `↑` / `↓` — move through search results
- `Enter` — open the highlighted result
- `←` / `→` — step through a visual explainer
- `Space` — play or pause a visual explainer
- `Esc` — close search or the mobile navigation

## Attribution

Chapter structure and section references follow *How Linux Works, 3rd Edition* by Brian Ward. This is an unofficial study aid and is not affiliated with the author or No Starch Press. If you are studying the book, keep it open beside this guide.
