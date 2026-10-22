# Dear December

Dear December helps you record the basic facts, ordinary details and memories of your life, for yourself and, if you choose, future generations. You do not need an extraordinary story or polished prose. The aim is a small, honest portrait of a person, rather than self-praise or an exhaustive biography.

This application begins with a 24-door advent calendar for the mind: a little time for reflection and journaling during Advent, with small moments as the main starting point. Its underlying format is broader: a generic, portable format for personal information that can support journals, biographies, family histories and other applications.

**Your information belongs to you.** You decide how to keep, use and share it. Personal information will never be used for advertising or collected into a central dataset for the project's own purposes. Local collection and export must remain available without agreeing to external processing.

Read [Purpose and principles](docs/project-principles.md) for the project's commitments, design consequences and current privacy limitations. The format is intended to be open and freely implementable; an explicit licence for the specification and schema is still pending.

Dear December is the advent-calendar application. Miniography remains the name of the generic, open personal-information format and the final generated portrait. The application downloads `.deardecember` journal files using the same ZIP/JSON format; Earlier `.adventofyou`, `.miniography` and `.zip` archives remain importable. The public introduction does not disclose the final miniography reveal.

The canonical project lives at `/Users/alexteschke/Dev/dear-december`.

## Source

- `src/index.html` — page structure
- `src/style.css` — styles and responsive layouts
- `src/app.js` — question banks, entry editing, story preview and PDF output
- `src/model.js` — collection state, timestamps and browser draft storage
- `src/archive.js` — ZIP import/export and archive validation
- `src/catalog.js` — prompt choices and original answer snapshots
- `src/facts.js` — basic facts inside the first calendar door
- `src/welcome.js` — English/German welcome copy and final-door keepsake reveal
- `src/manifest-validator.js` — generated offline validator; edit its schema instead
- `src/zip.js` — vendored JSZip 3.10.1 library
- `scripts/build.mjs` — generates deployment output from source
- `.openai/hosting.json` — existing Sites deployment configuration

Edit files in `src/`. `dist/` is generated and should not be edited.

## Run locally

```sh
npm run dev
```

Open http://localhost:8123. Requires Node.js 22.9+ (for optional environment-file loading). No dependency installation is needed to run the app. A localhost-only “Developer preview: unlock all doors” toggle allows testing outside Advent. Both this toggle and the sample journal are development tools available only on localhost; hosted sites expose neither.

## Build and preview

```sh
npm run build
npm run preview
```

Run `npm ci` first to install build dependencies. The build requires Node.js, regenerates the browser schema validator and copies the source into `dist/`, which is the directory configured for hosting. Run the build before packaging a deployment.

## Current scope

A first-visit popup introduces the everyday-memory idea and explains local browser storage, downloadable journal files and manual device transfer. Close, Escape, “Skip intro” and “Get started” all dismiss it; dismissal is remembered locally. The “About” links open a separate section with the fuller purpose, privacy and device-transfer explanation. The introduction is available in English and German and does not disclose the final reveal.

The main button shows a live countdown until December 1 in the visitor’s local time. Once available, it opens door 1 until that door has been answered or its basic facts completed; it then opens today’s door (capped at door 24). The calendar and button update at midnight and when returning to the tab.

The welcome explains why ordinary routines, preferences and memories may interest children and future generations. The longer explanation lives in the About dialog; the homepage focuses on the hero and calendar. Writing hints belong inside the doors. Device-transfer guidance and clear privacy language remain available. Before December 24, people revisit entries through their doors; the combined miniography and its homepage/navigation links are hidden. Opening the final door presents a personal reveal, followed by the combined miniography and PDF option. Those links stay available afterward. The sample journal also keeps the surprise until its final door.

Original text and photo entries autosave in the browser. The app includes separate photo context/captions, schema-validated `.miniography` ZIP import/export, entry editing and reordering, unfinished-draft recovery backups, and browser print-to-PDF. An optional local development server can generate an editable draft through the OpenAI API after explicit consent; German interface translation is partial (the generation preview currently uses English).

## Completed simulation

Choose “Try Alex’s completed story” above the calendar to explore 23 main answers and 46 follow-up answers. This session-only simulation preserves existing browser data; “Exit simulation” restores it. Supplied life facts are distinguished from invented sample details on the PDF cover. Use “Print / Save as PDF” in the story dialog to generate the book. A previously rendered sample may be available in `output/pdf/`; regenerate it to reflect the current branding.

## Content plan: the 24 topics

The agreed door names, topic boundaries and question-writing guidelines are documented in [docs/topics.md](docs/topics.md). This is the editorial reference for the catalog. The app currently uses the earlier 23-topic catalog plus a reveal door; applying the agreed list, including a question for door 24, is still pending.

## Calendar facts and question choices

Name, full birthday and birthplace belong to the first door, “Your beginnings”, alongside an optional places-lived text field. There is no separate profile page or popup. People can revisit the first door to change these facts and can answer other doors without completing them first. A complete portable archive requires the basic facts; unfinished collections can still be saved as draft backups. The archive continues to store facts in its structured `profile` object.

All 24 doors retain their names, which appear only after opening the door. Unopened doors show their number and decoration without revealing their topic, including in accessible labels. Opened-door state is remembered locally; existing imported answers also reveal their associated topics. Each of the 23 memory doors offers its original prompt, two alternatives from the catalog and a free memory option. Answers to different choices save independently. Original question wording stays with each answer. Profile details, places lived, entries, photo context/captions, timestamps and reading order travel with archive exports. Earlier prototype archive shapes are no longer supported. Printed stories include the profile and places-lived text.

Opening a memory door first shows a question picker. Selecting a prompt opens its response field. “A little more of your story” returns to that same picker to answer another question or edit an existing answer. Earlier answers remain visible above the picker and while writing the next answer, with an edit action for each. Additional imported answers appear as answered choices when associated with a known topic; all entries remain editable from the story preview.

## Optional API miniography generation

[docs/generation.md](docs/generation.md) defines the flexible editorial structure, first-person voice, factuality rules, photo treatment and review checklist for a future generated miniography. It includes a fictional source-to-draft example. The existing reveal and PDF still assemble original entries locally. API generation is a separate optional action after the reveal, or in developer preview.

To try it locally:

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` in that file. It is ignored by Git.
2. Optionally change `OPENAI_MODEL` (default `gpt-4.1-mini`, a Responses API model supporting structured output).
3. Restart `npm run dev`, then open http://127.0.0.1:8123. Stop an older server first if port 8123 is in use.
4. Enable developer preview, write entries or load the sample, open door 24 and then the miniography. Select **Create an AI draft (optional)**.
5. Review the exact source-data preview, consent to sending it to OpenAI, and generate. Compare sections against their sources, edit, then download the draft or print it.

The key stays in the local Node server, never the browser, archives or static build. The server binds only to `127.0.0.1`; it is not a production proxy. Static hosting and `npm run preview` retain the local-only experience without API generation. A public deployment would require a separately secured backend and a clear account/billing policy.

Only the projected basic facts, language, questions, answers, recording dates, and photo context/captions/capture dates are sent, not image bytes or local file paths. Nothing is sent merely by opening door 24 or the generation dialog. Each generation (including regeneration) requires fresh consent; API usage is billed to the configured key. The request uses `store: false`; provider abuse-monitoring retention can still apply. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

Drafts stay separate from the original collection and last only for the current page session. **Download draft & sources** saves a separate JSON review document with the source snapshot and section references; it is not an importable journal archive and does not contain photographs. Export the journal separately to preserve photos. Generated PDF photos use local assets, supplied captions and section references; unmatched photos follow the prose. API errors and failed regeneration leave the previous draft and all entries intact. Tests use a mocked provider; actual model quality and account access must be checked with an explicitly initiated API run.

## Portable archive format (v1)

A `.miniography` file is a ZIP containing a readable JSON manifest and original photos:

```text
my-story.miniography
├── miniography.json
└── media/
    └── seabrook-beach.jpg
```

The manifest contains:

| Field | Meaning |
| --- | --- |
| `formatVersion` | `1`, the first formal version of the format. |
| `language` | Collection language, such as `en` or `de`. |
| `profile` | `name`, `dateOfBirth`, `placeOfBirth`, and optional free-form `placesLived`. |
| `entries` | An ordered array of text and photo entries. Array order determines reading order and photo placement. |
| `isSample` | Optional marker identifying simulated/example content. |

Text entries store `type: "text"`, the original `question`, and the response in `text`. A journal entry uses `question: null`. An optional `topic` preserves the named door.

Photo entries store `type: "photo"`, contextual `description`, and `filePath`, such as `media/seabrook-beach.jpg`. An optional `caption` provides the printed label; descriptions are not printed automatically. Place photos immediately after the text they illustrate. Optional `takenAt` records a known capture date; approximate dates belong in the description.

Both entry types have `createdAt` and a `modificationDates` array of subsequent edit timestamps. Timestamps use UTC; photo `createdAt` means when it was added to Miniography, not when it was taken. Edit dates track when changes occurred, not previous versions of the content. Import and export preserve timestamps.

JSON keeps the source material readable, JSON Schema defines its structure, and ZIP bundles the photos without embedding them into JSON. PDFs are reading copies; the archive preserves the original material for further writing and printing.

### Specification and validation

- [Full format specification](docs/archive-format.md) — archive layout, field meanings, ordering, timestamps and importer requirements.
- [JSON Schema](schemas/dear-december-v1.schema.json) — machine-readable structural validation using Draft 2020-12.
- [Example manifest](examples/format-v1/journal.json) — an answer, a photo and a journal entry. Its photo reference is illustrative; no childhood image is included, so this is not a complete archive.

```sh
npm install
npm run validate:format
```

The validation command checks the schema, example and positive/negative manifest cases. ZIP members, referenced images, chronological timestamps and integrity are also validated by the app before importing. Failed imports leave the existing collection intact.

### Browser integration checks

```sh
npm exec playwright install chromium
npm test
```

The tests cover real archive round trips, original photo bytes, edit timestamps, ordering, malformed ZIPs and images, failed imports, storage failures, simulation isolation and recovery backups. The generated browser validator requires no network access at runtime.

### Saving and recovery

“Download my journal” creates a `.deardecember` file using the formal `formatVersion: 1` ZIP format. Complete the basic facts in door 1 first. “Backup unfinished draft” downloads a separate recovery JSON file when the profile is incomplete. Restore either file using “Import archive / draft”. The collection is stored locally in this browser; export a backup to keep it safe.

The app now uses the formal format directly. Earlier experimental archive shapes are unsupported, and earlier prototype browser storage is left untouched. In “Your story”, edit original entries or move them up/down; both the archive and PDF use the resulting order. The story preview is derived from those entries rather than a separate rewritten biography.

A sample of the new archive is available locally at `output/archive/sample-journal.deardecember`; it carries `isSample: true` and includes 69 simulated answers.
