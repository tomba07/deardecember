# Miniography

Miniography helps you record the basic facts, ordinary details and memories of your life, for yourself and, if you choose, future generations. You do not need an extraordinary story or polished prose. The aim is a small, honest portrait of a person, rather than self-praise or an exhaustive biography.

This application begins with a 24-door advent calendar. Its underlying format is broader: a generic, portable format for personal information that can support journals, biographies, family histories and other applications.

**Your information belongs to you.** You decide how to keep, use and share it. Personal information will never be used for advertising or collected into a central dataset for the project's own purposes. Local collection and export must remain available without agreeing to external processing.

Read [Purpose and principles](docs/project-principles.md) for the project's commitments, design consequences and current privacy limitations. The format is intended to be open and freely implementable; an explicit licence for the specification and schema is still pending.

The canonical project lives at `/Users/alexteschke/Dev/miniography`.

## Source

- `src/index.html` — page structure
- `src/style.css` — styles and responsive layouts
- `src/app.js` — question banks, entry editing, story preview and PDF output
- `src/model.js` — collection state, timestamps and browser draft storage
- `src/archive.js` — ZIP import/export and archive validation
- `src/catalog.js` — prompt choices and original answer snapshots
- `src/profile.js` — fixed profile fields
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

Open http://localhost:8123. Requires Python 3. No dependency installation is needed. A localhost-only “Developer preview: unlock all doors” toggle allows testing outside Advent. Both this toggle and the sample journal are development tools available only on localhost; hosted sites expose neither.

## Build and preview

```sh
npm run build
npm run preview
```

Run `npm ci` first to install build dependencies. The build requires Node.js, regenerates the browser schema validator and copies the source into `dist/`, which is the directory configured for hosting. Run the build before packaging a deployment.

## Current scope

A first-visit popup introduces the everyday-memory idea and explains local browser storage, downloadable `.miniography` files and manual device transfer. Close, Escape, “Skip intro” and “Get started” all dismiss it; dismissal is remembered locally. “About Miniography” reopens it. The introduction is available in English and German and does not disclose the final reveal.

The welcome explains why ordinary routines, preferences and memories may interest children and future generations. Writing hints belong inside the doors; the homepage avoids a walkthrough or model answer. Device-transfer guidance and clear privacy language remain available. Before December 24, people revisit entries through their doors; the combined miniography and its homepage/navigation links are hidden. Opening the final door presents a personal reveal, followed by the combined miniography and PDF option. Those links stay available afterward. The sample journal also keeps the surprise until its final door.

Original text and photo entries autosave in the browser. The app includes separate photo context/captions, schema-validated `.miniography` ZIP import/export, entry editing and reordering, unfinished-draft recovery backups, and browser print-to-PDF. AI biography generation is not connected; German interface translation is partial.

## Completed simulation

Choose “Try Alex’s completed story” above the calendar to explore 23 main answers and 46 follow-up answers. This session-only simulation preserves existing browser data; “Exit simulation” restores it. Supplied life facts are distinguished from invented sample details on the PDF cover. Use “Print / Save as PDF” in the story dialog to generate the book. A rendered sample is in `output/pdf/alex-miniography-simulation.pdf`.

## Content plan: the 24 topics

The agreed door names, topic boundaries and question-writing guidelines are documented in [docs/topics.md](docs/topics.md). This is the editorial reference for the catalog. The app currently uses the earlier 23-topic catalog plus a reveal door; applying the agreed list, including a question for door 24, is still pending.

## Profile and question choices

“Your profile” is always available in the header. Before answering doors, add a name, full birthday and birthplace. Places lived is an optional free-form text field; its placeholder suggests places and approximate years. Older structured entries are converted to text without losing their details. Existing birth-year-only profiles keep their data and ask for the missing details.

All 24 doors retain their names, which appear only after opening the door. Unopened doors show their number and decoration without revealing their topic, including in accessible labels. Opened-door state is remembered locally; existing imported answers also reveal their associated topics. Each of the 23 memory doors offers its original prompt, two alternatives from the catalog and a free memory option. Answers to different choices save independently. Original question wording stays with each answer. Profile details, places lived, entries, photo context/captions, timestamps and reading order travel with archive exports. Earlier prototype archive shapes are no longer supported. Printed stories include the profile and places-lived text.

Opening a memory door first shows a question picker. Selecting a prompt opens its response field. “A little more of your story” returns to that same picker to answer another question or edit an existing answer. Additional imported answers appear as answered choices when associated with a known topic; all entries remain editable from the story preview.

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
- [JSON Schema](schemas/miniography-v1.schema.json) — machine-readable structural validation using Draft 2020-12.
- [Example manifest](examples/format-v1/miniography.json) — an answer, a photo and a journal entry. Its photo reference is illustrative; no childhood image is included, so this is not a complete archive.

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

“Export archive” creates the formal `formatVersion: 1` ZIP. Complete the required profile fields first. “Backup unfinished draft” downloads a separate recovery JSON file when the profile is incomplete. Restore either file using “Import archive / draft”. The collection is stored locally in this browser; export a backup to keep it safe.

The app now uses the formal format directly. Earlier experimental archive shapes are unsupported, and earlier prototype browser storage is left untouched. In “Your story”, edit original entries or move them up/down; both the archive and PDF use the resulting order. The story preview is derived from those entries rather than a separate rewritten biography.

A sample of the new archive is available locally at `output/archive/alex-simulation.miniography`; it carries `isSample: true` and includes 69 simulated answers.
