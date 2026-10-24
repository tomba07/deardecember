# Dear December

Dear December helps you record the basic facts, ordinary details and memories of your life, for yourself and, if you choose, future generations. You do not need an extraordinary story or polished prose. The aim is a small, honest portrait of a person, rather than self-praise or an exhaustive biography.

This application begins with a 24-door advent calendar for the mind: a little time for reflection and journaling during Advent, with small moments as the main starting point. Its underlying format is broader: a generic, portable format for personal information that can support journals, biographies, family histories and other applications.

**Your information belongs to you.** You decide how to keep, use and share it. Personal information will never be used for advertising or collected into a central dataset for the project's own purposes. Local collection and export must remain available without agreeing to external processing.

Read [Purpose and principles](docs/project-principles.md) for the project's commitments, design consequences and current privacy limitations. The format is intended to be open and freely implementable; an explicit licence for the specification and schema is still pending.

Dear December is the advent-calendar application. The generic, open journal archive format stores original personal information; the generated portrait is called a mini biography. The application downloads `.deardecember` journal files using the same ZIP/JSON format; Earlier `.adventofyou`, `.miniography` and `.zip` archives remain importable. The public introduction does not disclose the final mini biography reveal.

The canonical project lives at `/Users/alexteschke/Dev/dear-december`.

## Source

- `src/index.html` — page structure
- `src/style.css` — styles and responsive layouts
- `src/app.js` — question banks, entry editing, Christmas reveal and PDF output
- `src/model.js` — collection state, timestamps and browser draft storage
- `src/archive.js` — ZIP import/export and archive validation
- `src/door-moments.js` — bilingual door introductions, opening effects and small closing messages
- `src/catalog.js` — prompt choices and original answer snapshots
- `src/facts.js` — basic facts inside the first calendar door
- `src/markdown.js` — generated, bundled Marked/DOMPurify renderer; regenerate with `node scripts/generate-markdown.mjs`
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

The welcome explains why ordinary routines, preferences and memories may interest children and future generations. The longer explanation lives in the About dialog; the homepage focuses on the hero and calendar. Writing hints belong inside the doors. Device-transfer guidance and clear privacy language remain available. Before December 24, people revisit entries through their doors; the Christmas options and their homepage/navigation links are hidden. Opening the final door presents a Christmas greeting, adapted for early developer previews, Christmas (December 24–26), belated visits (through January 6), or later returns. The reveal presents the original daily reflections as a gift from yourself, before any AI rewriting. A “What can I do with it?” section groups three options that invite people to download their journal (or unfinished backup), optionally turn their entries into an editable AI text for PDF/printing, and keep their files for possible future ways to use them. The teaser makes no promise of a feature or automatic reuse. Original entries can be printed directly from the Christmas reveal. There is no intermediate dialog containing the full source text; generation and saved-text access open directly from the reveal. Reopening door 24 returns to this reveal with an updated greeting. Those links stay available afterward. The sample journal also keeps the surprise until its final door.

Original text and photo entries autosave in the browser. The app includes separate photo context/captions, schema-validated `.miniography` ZIP import/export, entry editing and reordering, unfinished-draft recovery backups, and browser print-to-PDF. An optional local development server can generate an editable draft through the OpenAI API after explicit consent; German interface translation is partial (the generation preview currently uses English).

## Completed simulation

Choose “Try a sample journal” above the calendar to explore 23 main answers and 46 follow-up answers. This session-only simulation preserves existing browser data; “Exit simulation” restores it. Supplied life facts are distinguished from invented sample details on the PDF cover. Open door 24 and use “Print my original entries / Save as PDF” to print locally. A previously rendered sample may be available in `output/pdf/`; regenerate it to reflect the current branding.

## Content plan: the 24 topics

The agreed door names, topic boundaries and question-writing guidelines are documented in [docs/topics.md](docs/topics.md). This is the editorial reference for the catalog. The app currently uses the earlier 23-topic catalog plus a reveal door; applying the agreed list, including a question for door 24, is still pending.

## Calendar facts and question choices

Name, full birthday and birthplace belong to the first door, “Your beginnings”, alongside an optional places-lived text field. There is no separate profile page or popup. People can revisit the first door to change these facts and can answer other doors without completing them first. A complete portable archive requires the basic facts; unfinished collections can still be saved as draft backups. The archive continues to store facts in its structured `profile` object.

The calendar distinguishes four states with opacity and small status icons, retaining the original pastel colours (status names remain available to screen readers and on hover): locked (not yet available), unopened (available), in progress (opened without any content), and completed (at least one nonblank answer or any first-door fact; door 24 requires its reveal). Additional questions remain optional. All 24 doors retain their names, which appear only after opening the door. Unopened doors show their number and decoration without revealing their topic, including in accessible labels. Opened-door state is remembered locally; existing imported answers also reveal their associated topics. Each of the 23 memory doors offers its original prompt, two alternatives from the catalog and a free memory option. Answers to different choices save independently. Original question wording stays with each answer. Profile details, places lived, entries, photo context/captions, timestamps and reading order travel with archive exports. Earlier prototype archive shapes are no longer supported. Printed stories include the profile and places-lived text.

Opening a door plays a brief paper-door animation and reveals its title and a short topic description, before the question picker and controls fade in. This sequence only runs when opening a door, not when switching questions. Reduced-motion preferences skip the effects. “Save & close” shows a small, dismissible, topic-specific message for a few seconds; empty doors get a gentle invitation to return, and failed saves retain the storage warning. Closing the Christmas reveal has its own festive message. These messages are original app copy, not attributed quotations. Each memory door holds one reflection. Choose a question on the first visit; returning opens your answer for editing. Additional entries from earlier versions remain available under About → Manage original entries.

## Optional API mini biography generation

[docs/generation.md](docs/generation.md) defines the flexible editorial structure, first-person voice, factuality rules, photo treatment and review checklist for a future generated mini biography. It includes a fictional source-to-draft example. The existing reveal and PDF still assemble original entries locally. API generation is a separate optional action after the reveal, or in developer preview.

To try it locally:

1. Copy `.env.example` to `.env` and set `OPENAI_API_KEY` in that file. It is ignored by Git.
2. Optionally change `OPENAI_MODEL` (default `gpt-4.1-mini`, a Responses API model supporting text output).
3. Restart `npm run dev`, then open http://127.0.0.1:8123. Stop an older server first if port 8123 is in use.
4. Enable developer preview, write entries or load the sample, open door 24 and select **Create my text** directly.
5. Use the short generation dialog to consent; privacy details and “Review and edit what gets sent” are expandable. The latter is a plain-text copy you can redact or rewrite, with a reset button; editing clears consent and never changes the journal. Each generation dialog starts with a fresh journal copy. After generation, a separate saved-text dialog provides the Markdown editor, formatting preview, download, PDF/print, and regenerate controls. Reopening saved text goes straight to this dialog without showing consent again. Regenerate opens fresh consent with a replacement warning; cancel returns to the existing edits.

The key stays in the local Node server, never the browser, archives or static build. The server binds only to `127.0.0.1`; it is not a production proxy. Static hosting and `npm run preview` retain the local-only experience without API generation. A public deployment would require a separately secured backend and a clear account/billing policy.

The default input copy contains basic facts, questions, answers, recording dates, and photo context/captions/capture dates. You can change or remove any of that text before sending. Only the text currently in the input editor and the collection language are sent as personal content, not the untouched journal snapshot, image bytes or local file paths. Nothing is sent merely by opening door 24 or the generation dialog. Each generation (including regeneration) requires fresh consent; API usage is billed to the configured key. The request uses `store: false`; provider abuse-monitoring retention can still apply. See [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data).

Generated text and edits autosave in this browser alongside the journal, separately from the original entries, and survive reloads. **Open my saved text** reopens them without an API connection or a new generation request. Recovery backups include the generated text; importing a different journal clears the previous journal’s generated text. Sample generation stays temporary and cannot overwrite a personal draft. The model returns one Markdown document, not structured sections or source comparisons. **Download Markdown** saves the current edited text as `my-mini-biography.md`; it contains no source snapshot, credentials or image bytes and is not an importable journal archive. Export the journal separately to preserve photos. The local formatting preview and PDF use a bundled Markdown renderer with sanitization: raw HTML, active links and embedded remote images are excluded. PDF printing uses the current local profile and photos, with photos following the generated prose in archive order and only supplied captions printed. If the journal has changed since generation, the editor shows a notice. Browser storage failure shows a warning while leaving editing and Markdown download available. API errors and failed regeneration leave the previous draft and all entries intact. Tests use a mocked provider; actual model quality and account access must be checked with an explicitly initiated API run.

## Use your preferred AI

Door 24 also offers **Use my own AI · Get the prompt**, including on static hosting without an API key. This opens a local dialog with the same writing instructions as built-in generation, an explicit output language and a readable copy of the reflections. Review or redact the reflections, then copy the complete prompt or download `mini-biography-prompt.txt`. No model request is made. If clipboard access is denied, the prompt is selected for manual copying.

A short hint explains that local LLMs can keep reflections on the device when inference runs entirely locally. Pasting into an online service is the person’s choice and subject to that service’s privacy terms. Photos and paths are excluded from the prompt.

Optionally paste the resulting Markdown into **Bring your result back** and save it in the same local editor for editing, Markdown download and PDF/printing. Replacing existing saved text is clearly labelled. Entering this route from the API consent dialog preserves the edited input; returning resets consent without sending anything.

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
| `entries` | Ordered generic records containing `id`, plain `tags`, and either `text` or `filePath`. |
| `isSample` | Optional marker identifying simulated/example content. |

All content, including name, birthday and birthplace, is stored as tagged records. There is no fixed `profile`, `type` or `question` property. Context such as a question, topic or photo caption is another text record with a label (`question`, `topic`, `photo:caption`) and a generic `relatedTo` link. Tags are plain strings, for example `["reflection", "childhood"]`, never key/value objects. Custom labels survive import, editing and export.

`createdAt` and `modificationDates` are optional; existing known timestamps are preserved, and missing historical timestamps are not invented. The calendar still presents familiar fact, reflection and photo controls through an internal view. Newly persisted collections and exported files use the tagged schema. Legacy profile/text/photo archives and backups remain importable.

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

“Download my journal” creates a `.deardecember` file using the formal `formatVersion: 1` ZIP format. Personal facts may be incomplete. “Backup unfinished draft” downloads `dear-december-backup.zip`, including unfinished profile fields, all original entries, image files in `media/`, and any saved generated text. Restore it using “Open an existing journal”; older JSON backups can still be imported. The collection is stored locally in this browser; export a backup to keep it safe.

The app now uses the formal format directly. Earlier experimental archive shapes are unsupported, and earlier prototype browser storage is left untouched. Under About → Manage original entries, edit imported or other original entries and move them up/down; both the archive and local source PDF use the resulting order. The original full-text summary dialog has been removed.

A sample of the new archive is available locally at `output/archive/sample-journal.deardecember`; it carries `isSample: true` and includes 69 simulated answers.

On localhost, **Reset all data** in the developer controls deletes this app’s saved journal, photos, generated text and welcome preference, then reloads to a fresh start. It asks for confirmation, also clears the personal journal when a sample is active, and is unavailable on hosted pages. Downloaded backups are unaffected.

Door 24 opens on or after December 24 only when doors 1–23 are completed. Its locked tooltip explains the requirement. Developer preview bypasses the date, but still requires completion; the sample journal can be used to preview the full reveal. A saved reflection completes a memory door, and saved basic facts can complete door 1.

The proposed next storage architecture follows the local Checkmates project: Better Auth, SQLite/Drizzle and private photo storage on the existing VM deployment pattern. The first version would use regular private server storage, not E2EE. See [login and backend persistence concept](docs/backend-persistence.md). This is a documented plan; the current app remains local-only until implemented.
