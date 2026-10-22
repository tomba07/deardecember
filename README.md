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
