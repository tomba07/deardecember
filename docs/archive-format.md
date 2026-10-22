# Miniography archive format v1 (draft)

Status: the first formal format specification, currently a validated draft. The app still imports and exports its earlier prototype structure; implementing this schema in the app is a separate step. There are no external users yet, so compatibility with prototype archives is not required.

## Container

A `.miniography` file is an ordinary ZIP archive. Changing its extension to `.zip` makes its contents accessible with common archive tools. It contains:

```text
my-story.miniography
├── miniography.json
└── media/
    └── seabrook-beach.jpg
```

`miniography.json` is UTF-8 JSON, preferably indented with two spaces. Original image bytes live in `media/`, not embedded as base64 in JSON. An optional `README.txt` or bundled `schema.json` may help future readers; neither changes the manifest's meaning. Exporters should use standard ZIP storage or Deflate compression and avoid proprietary extensions.

The schema is `schemas/miniography-v1.schema.json`. The example in `examples/format-v1/miniography.json` illustrates the manifest; the referenced childhood image is intentionally not supplied. It is a schema-valid manifest example, not a complete importable archive. Its timestamps and the journal/photo descriptions are illustrative.

This design starts at `formatVersion: 1`. The earlier prototype used `{format: "miniography", version: 1, answers: ...}`, but that experimental structure is not the formal v1 format. The file extension stays the same; importers identify the formal format using `formatVersion`. No compatibility or migration layer for prototype archives is required.

## Manifest

- `formatVersion`: exactly `1`.
- `language`: the collection's language tag, such as `en`, `de` or `en-GB`.
- `profile`: name, full birthday (`dateOfBirth`), birthplace (`placeOfBirth`) and optional free-form `placesLived` text.
- `entries`: one ordered array containing text and photo entries.

The profile belongs to the person, independently of the question catalog. Places lived are optional and never require structured city, country or date fields. Incomplete browser drafts can exist before a schema-valid archive is ready. A future app implementation should still offer a recovery backup for incomplete drafts rather than preventing backups or inventing missing facts.

Question catalogs and application UI state do not need to be copied into the archive. Each text entry contains the actual question wording, so it can be read without the app or catalog. Topic names are optional snapshots, not database references.

## Text entries

`type: "text"` requires `question`, `text`, `createdAt` and `modificationDates`.

`question` contains the original prompt. Use `null` for a free-form journal entry. `text` contains the original answer or journal text, as plain text with line breaks; consumers must not interpret it as HTML. Unanswered catalog questions are omitted. An optional `topic` keeps the named door or a journal topic.

Editing an existing answer changes that entry. Answering the same question again as a new journal reflection adds another entry with its own creation timestamp. The source entries remain independent of any generated PDF or rewritten biography. Generated biographies and saved editions are outside this minimal v1 draft. A closing message can be stored as a text entry; generated output must not overwrite source entries.

## Photo entries

`type: "photo"` requires `description`, `filePath`, `createdAt` and `modificationDates`.

- `description` provides context for understanding and positioning the image. It can be empty.
- `caption` is an optional literal label for PDF output. No caption is printed when it is missing or empty. Descriptions are not printed automatically.
- `filePath` points to an image inside `media/`, relative to the ZIP root. It uses a portable ASCII basename and a lowercase `jpg`, `jpeg`, `png` or `webp` extension. The path is case-sensitive.
- `createdAt` means when the photo was added to Miniography, not its capture date or the filesystem timestamp.
- `takenAt` is optional: either a known `YYYY-MM-DD` date or an exact UTC timestamp. Put uncertain dates such as “summer 1997” in `description`, rather than inventing precision.

## Reading order and placement

Array order is the intended reading order, not necessarily timestamp order. A photo follows the text entry it illustrates. Multiple consecutive photos form a group for the nearest preceding text entry; leading photos are standalone opening images. A later text entry starts the next group. Moving a photo in the array deliberately changes its context.

The app can use descriptions to suggest placement, but should persist the chosen placement in array order. PDF generation follows that order, scaling photos and flowing text without forced page breaks per entry. No IDs or relationship tables are required for this version. Cross-references to multiple memories are outside its scope.

## Dates and edits

`createdAt` is immutable. `modificationDates` starts as `[]`, contains distinct subsequent edit timestamps in chronological order, and excludes `createdAt`. Dates use UTC RFC 3339 timestamps with uppercase `T` and `Z`; fractional seconds are allowed.

Append one timestamp for each committed content change, not every keystroke, export or import. Changing an answer, description, caption, question or known capture date is a content change. Reordering entries or renaming a media file for packaging is not. Import/export preserves existing timestamps; importing a file is not a new creation event. These are edit dates, not content revisions: past wording cannot be recovered from them.

The app should record entry timestamps when this format is implemented. Existing prototype data has no reliable entry timestamps; preserving or migrating it is not a requirement for this draft. Any optional conversion must not claim to recover historical timestamps that were never recorded.

`dateOfBirth` is a calendar date without a timezone. The schema checks that it is a real date; age eligibility belongs to application policy, not the portable file format.

## Validation

JSON Schema Draft 2020-12 describes fields, entry variants, required values, unknown-property rejection, media-path syntax, date syntax and date validity. Consumers must enable date/date-time format assertions: Draft 2020-12 permits validators to treat `format` as annotation unless explicitly configured.

Run:

```sh
npm run validate:format
```

This validates the schema and example and exercises valid and invalid manifest cases. It does not inspect ZIP files or image bytes.

A complete archive importer must additionally check:

1. Exactly one root manifest; no duplicate ZIP member names, absolute paths, traversal paths or symlinks. A media reference must resolve to a normal file inside the archive.
2. Every referenced image exists and can be decoded as the declared supported image type. Different entries may deliberately reference the same file. Exporters should omit unreferenced media.
3. Modification timestamps are strictly ascending and later than the entry's creation timestamp. No schema here performs comparisons across timestamp values.
4. Full language-tag validity, plus resource limits for manifest size, entry count, image size and total decompressed size. These limits are application policy and must be reported clearly rather than truncating data.
5. The format version is supported before replacing any existing local collection. Validation failures leave the current collection intact.

All entries and profile fields reject unknown properties in this draft, so accidental misspellings do not silently disappear. Future structural changes require a new format version and explicit migration. Importers must not silently downgrade or strip fields from unsupported versions.

## Why JSON inside ZIP?

JSON keeps the original words and metadata easy to inspect with ordinary tools. JSON Schema gives the format an independently checkable contract. ZIP keeps image files beside the manifest and compresses the text. This is the proposed interchange/archive format; the application's internal storage can change independently.

Alternatives have different strengths:

| Format | Useful property | Tradeoff for this archive |
| --- | --- | --- |
| YAML | Readable multiline text and comments | More syntax and parsing rules; little benefit for an app-written archive. |
| Markdown plus metadata | Pleasant for a human-readable journal export | Does not by itself define typed mixed entries, photo metadata or edit dates. Useful as an additional export. |
| CBOR | Compact binary representation | Needs a decoder to inspect; compactness is not the priority for the source manifest. |
| SQLite | Queries, transactions and incremental updates | A reasonable future working database, but requires database tooling to inspect the archive. |

Recommendation: keep JSON + JSON Schema + ZIP for portability and preservation. Add Markdown/PDF as reading formats, not as the only source of truth.

References: [JSON Schema Draft 2020-12](https://json-schema.org/draft/2020-12), [validation and format behavior](https://json-schema.org/draft/2020-12/json-schema-validation), [YAML specification](https://yaml.org/spec/1.2.2/), [CBOR RFC 8949](https://www.rfc-editor.org/rfc/rfc8949.html), [SQLite as an application file format](https://www.sqlite.org/aff_short.html).
