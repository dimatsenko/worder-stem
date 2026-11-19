# Worder web MVP

## Scope

Two screens: select English decks by CEFR level, then study. The existing
landing page links to `app.html`; its appearance and shared header are retained.
The catalog contains 5,943 words: A1 (1,076), A2 (990), B1 (902), B2 (1,571),
C1 (1,404). These are the five bundled English levels in the iOS project.

The entry screen and “Налаштування” dialog share the same level-selection component.
The study screen supports animated flipping, four-choice translation tests,
browser pronunciation, touch/mouse swipes, keyboard arrows, unlimited undo within the current
session and session resume. “Налаштування” opens a level-selection dialog; “Режим”
selects new words, due reviews or both, matching `Models/StudyMode.swift`.
The mode is saved between visits. Changing modes rebuilds the queue while
preserving word progress. Level changes apply only after “Застосувати”; closing
the dialog leaves the selection and queue intact. Bold study counters share
the controls row. Buttons use white surfaces and black text, with vertical
spacing around the bottom actions. Study statistics have no progress bar.
Sessions contain up to 15 newly learned words plus due reviews. There is no
daily limit: “Вчити далі” immediately starts another session. Daily counters
are statistics only, and never restrict the queue.

## Native source mapping

The implementation was based on the actual sources in
the `Worder/` directory of the native application project:

| Web module | Native reference |
| --- | --- |
| `src/scripts/app/scheduler.js` | `Services/SpacedRepetitionScheduler.swift` |
| `src/scripts/app/session.js` | `Services/StudySessionAlgorithm.swift`, `Services/SessionOrdering.swift`, `ViewModels/StudySessionViewModel.swift`, `docs/CardOrderLogic.md` |
| `src/scripts/app/quiz.js` | `Services/TranslationChoiceGenerator.swift`, `Services/WordQueryService.swift`, `Services/AnswerChecker.swift` |
| `src/styles/app/app.css`, `src/scripts/app/components/` | `Views/CardView.swift`, `Views/CardContent/*.swift`, `Support/DesignSystem.swift`, `Models/SwipeHints.swift` |
| `assets/data/english.json` | `en_cefr_{a1,a2,b1,b2,c1}.json`, `builtin_word_corrections_v1.json` |

The scheduler preserves the initial ease of 2.5, minimum ease of 1.3,
failure-dependent SM-2 quality, next-calendar-day first review, rounded
interval growth capped at 365 days, and return to learning after eight lapses.
A failed review is due immediately. Only its first failure in a session adds
a lapse. Tests always offer the answer and three unique distractors, prioritizing
the same level and part of speech, then the same level, then the full catalog.
Identical translations are excluded. Each test accepts one selection; incorrect
answers return the word to the queue. There is no keyboard-entry exercise.

The queue uses batches of 15, up to 10 due reviews, and new words from the
selected levels. Due reviews span all English levels. Cards being learned
are interleaved; failed cards return after the protected three-card window
plus a random two-to-six-card gap. Every fourth answer shuffles the later tail.
The web adaptation counts **distinct pending words** against the session size,
so repeat appearances never occupy multiple slots. Unlike the native free
plan, the web version has no daily cap, per the user's instruction.

Cards keep the native white surface, 32px corners, soft shadow, serif word
heading, phonetic transcription, highlighted example and status accents.
Cards occupy the available screen height above the bottom action buttons;
flipping or choosing an answer never changes the card height. Long content
scrolls inside the card. The background uses the landing page's 32px grid.
Desktop cards are up to 600px wide with outer gutters. Card buttons have no
shadows, including on hover, and use light-gray surfaces. Horizontal dragging follows the pointer; short or
unavailable swipes return to center. Vertical touch scrolling remains native.
Animations respect reduced-motion preferences and block repeated actions.
Native system serif uses the browser's Georgia/serif fallback. Pronunciation
uses an English voice from the browser rather than the iOS speech service.

## Data and persistence

`localStorage` key: `worder.web.v1`. It stores level selection, progress by
stable word ID, daily counters and the current queue. Reloading resumes the
queue; changing levels starts a new queue without deleting learned progress.
Daily counters reset on the local calendar date. Tabs receive storage updates.
Undo uses a stack without a step or daily cap. Each entry restores the answered
word, queue, failures and counters; it is available on the completion screen too.
The stack lasts until the page reloads, a new session starts, levels/mode change,
or another tab updates progress.

If storage cannot be read or written, the app shows a notice and allows a
temporary in-memory session. Invalid saved data is not overwritten. Clearing
site data removes browser progress. There is no server, login, analytics,
cross-device sync, AI deck generation, subscriptions or service worker.
An internet connection is needed to load the app and catalog. Native gap-filling
exercises are outside this two-screen MVP.

Reimport the dictionaries, then rebuild:

```sh
python3 scripts/import_worder_decks.py /path/to/native/Worder
npm run build
npm test
```

The importer applies exact native content corrections and generates
deterministic IDs from the source fields. If the source dictionary entry itself
is rewritten in a future import, its ID changes; migrate existing progress
explicitly before deploying such a catalog update.

## Validation

Automated checks cover native scheduling reference values, interval limits,
lapses, review/new mixing, safe reinsertion, consecutive unlimited sessions,
wrong-answer retries, day rollover, answer comparison and storage failures.
Build checks verify every generated page and its local links/assets.


## Current code structure

The learning UI uses Vue 3 Single-File Components with `<script setup>`.
`App.vue` connects `composables/useStudyApp.js` to `components/StudyScreen.vue`;
`main.js` only mounts the application. Buttons call explicit Vue handlers,
and shared commands are provided through `study-context.js`. Vite compiles
templates during the build; there is no vendored runtime template compiler.
The existing CSS and domain rules remain unchanged. See [DEFENSE.md](DEFENSE.md)
for a Ukrainian walkthrough and [the README](../README.md) for build commands.
