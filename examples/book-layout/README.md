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

Pages 2–5 use the childhood facts supplied by the user. Page 6 is explicitly fictional and demonstrates a fuller text page. The stock photograph demonstrates placement and is explicitly labelled as illustrative, not a family photograph.

This is a design specimen, not the final automatic pagination system. A full journal should combine related short entries and let longer passages flow, rather than assigning every answer a page. Paper tint is for the preview; a print mode should allow unprinted white paper.

## Reproduce

Requires Python with `reportlab`, and Georgia regular/italic TrueType fonts. The script defaults to the standard macOS supplemental fonts directory. To use another installation, provide `--font-dir` containing `Georgia.ttf` and `Georgia Italic.ttf`.

```sh
python3 examples/book-layout/generate.py
```

Optional output: `--output /absolute/path/sample.pdf`.

## Photograph

“Seabrook Beach”, Mike Coates, released as CC0 by the photographer on PublicDomainPictures.net:
https://www.publicdomainpictures.net/en/view-image.php?image=8313&picture=seabrook-beach

Downloaded original sample asset:
https://www.publicdomainpictures.net/pictures/10000/velka/seabrook-beach-29941281355211SG6E.jpg

The source lists Trevaunance, Saint Agnes, Seabrook. This is not evidence of the user's particular childhood beach. No attribution is required under CC0; the sample includes a credit and source link for clarity.
