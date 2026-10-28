# A5 book design proof

A standalone six-page sample for reviewing the proposed mini biography typography and layout. It does **not** change the application's PDF export or upload journal data anywhere.

Output: `output/pdf/dear-december-a5-sample.pdf` (ignored by Git).

## Design

- DIN A5 portrait, 148 × 210 mm.
- Warm white paper and near-black text; no decorative panels or icons.
- Embedded Georgia regular and italic; body 15.5 pt with 23 pt leading.
- Chapter headings 30–31 pt; cover name 43 pt.
- Mirrored margins: 21 mm inside, 18 mm outside; small outside folios.
- Short memories stay short. No invented lessons or filler to reach a page count.
- A full-width photograph with a plain caption; no crop across the binding.

All names, dates, places and memories are fictional. A neutral placeholder demonstrates photo placement without using a personal or stock photograph. Page 6 demonstrates a fuller text page.

This is a design specimen, not the final automatic pagination system. A full journal should combine related short entries and let longer passages flow, rather than assigning every answer a page. Paper tint is for the preview; a print mode should allow unprinted white paper.

## Reproduce

Requires Python with `reportlab`, and Georgia regular/italic TrueType fonts. The script defaults to the standard macOS supplemental fonts directory. To use another installation, provide `--font-dir` containing `Georgia.ttf` and `Georgia Italic.ttf`.

```sh
python3 examples/book-layout/generate.py
```

Optional output: `--output /absolute/path/sample.pdf`.

## Image placeholder

The sample uses a neutral rectangle labelled “Your photograph”. The application sample builds it from a small SVG locally. No real personal photographs or biographical information are included.

## Actual application export

The app now has a browser-local A5 PDF renderer. Reproduce its sample through the real Download PDF button:

```sh
npm run build
node examples/book-layout/export-app-sample.mjs
```

This writes `output/pdf/dear-december-a5-export.pdf`. It uses bundled, openly licensed Source Serif 4 rather than depending on system Georgia. The original Python design proof above is retained for comparison.
