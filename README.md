# Miniography

The canonical project lives at `/Users/alexteschke/Dev/miniography`.

## Source

- `src/index.html` — page structure
- `src/style.css` — styles and responsive layouts
- `src/app.js` — question banks and application behavior
- `src/zip.js` — vendored JSZip 3.10.1 library
- `scripts/build.mjs` — generates deployment output from source
- `.openai/hosting.json` — existing Sites deployment configuration

Edit files in `src/`. `dist/` is generated and should not be edited.

## Run locally

```sh
npm run dev
```

Open http://localhost:8123. Requires Python 3. No dependency installation is needed.

## Build and preview

```sh
npm run build
npm run preview
```

The build requires Node.js and copies the source into `dist/`, which is the directory configured for hosting. Run the build before packaging a deployment.

## Current scope

Answers and optional follow-up answers autosave in the browser. The app includes photo uploads, ZIP-based `.miniography` import/export, and browser print-to-PDF. AI biography generation is not connected; German interface translation is partial.

## Completed simulation

Choose “Try Alex’s completed story” above the calendar to explore 23 main answers and 46 follow-up answers. This session-only simulation preserves existing browser data; “Exit simulation” restores it. Supplied life facts are distinguished from invented sample details on the PDF cover. Use “Print / Save as PDF” in the story dialog to generate the book. A rendered sample is in `output/pdf/alex-miniography-simulation.pdf`.

## Profile and question choices

“Your profile” is always available in the header. Before answering doors, add a name, full birthday (18+) and birthplace. Places lived is an optional free-form text field; its placeholder suggests places and approximate years. Older structured entries are converted to text without losing their details. Existing birth-year-only profiles keep their data and ask for the missing details.

All 24 doors retain their names. Each of the 23 memory doors offers its original prompt, two alternatives from the catalog and a free memory option. Answers to different choices save independently. Original answers and follow-ups remain available. Profile details, residences, choice answers and photo captions travel with archive exports; older archives remain importable. Printed stories include the profile and places-lived text.

Opening a memory door first shows a question picker. Selecting a prompt opens its response field. “A little more of your story” returns to that same picker to answer another question or edit an existing answer. Older follow-up answers appear as answered choices rather than separate follow-up fields.

## Portable archive format (v1 draft)

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

The validation command checks the schema, example and positive/negative manifest cases. ZIP member checks, referenced image validation and chronological timestamp comparisons require separate archive-level validation.

### Implementation status

This is a validated specification draft. The app's current import/export still uses its earlier prototype structure and does not yet implement this schema. Compatibility with those experimental archives is not required; breaking changes are acceptable before release. The formal format starts at `formatVersion: 1`.
