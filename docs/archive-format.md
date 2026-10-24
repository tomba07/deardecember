# Tagged personal records — archive format, version 1

The format is a generic collection of text and file records. Dear December is one application of it. The schema has no `profile`, entry `type`, `question`, `topic`, `caption` or `description` properties. Meaning is expressed with plain string labels in `tags`; generic `relatedTo` links associate records.

## ZIP layout

```text
my-journal.deardecember
├── miniography.json
├── README.txt              optional
└── media/
    └── photograph.jpg
```

The download is an ordinary ZIP. `.zip` is accepted on import, along with the historical extensions. `miniography.json` remains the manifest filename for compatibility. Text is UTF-8. Original image bytes are separate files, never base64 inside this manifest. The current app supports JPG, PNG and WebP; safe portable filenames match the schema. No URLs, absolute paths or traversal are allowed.

## Collection

Required fields are `formatVersion: 1`, `language` (a BCP 47 language tag), and `entries` (an ordered array). `isSample: true` identifies simulated material. Empty collections and collections without personal facts are valid. Unknown structural properties are rejected; labels are extensible.

## Record

| Field | Contract |
| --- | --- |
| `id` | Required unique, portable identifier. Remains stable while editing. |
| `tags` | Required array of distinct, nonblank strings. May be empty. Labels are case-sensitive; unknown labels must be preserved. |
| `text` | Plain text, preserving line breaks. Exactly one of `text` or `filePath` is required. Nonblank. |
| `filePath` | Relative path to an original file in `media/`. Exactly one of `text` or `filePath` is required. |
| `relatedTo` | Optional array of distinct record IDs in this collection. No missing targets or self-links. This links context to content without a question-specific field. |
| `createdAt` | Optional UTC RFC 3339 timestamp for creation/addition to the collection. Do not invent it for imported facts whose recording time is unknown. |
| `modificationDates` | Optional chronological array of later UTC content-edit timestamps. Requires `createdAt` when nonempty. No duplicates. These are edit dates, not past content versions. |

Array order is reading order for content records. Apps may place linked contextual records beside their content when serializing. Links and IDs, rather than adjacency alone, preserve their association. New records use random UUIDs in this app. Reordering and export do not change content timestamps.

## Example

```json
{
  "formatVersion": 1,
  "language": "en",
  "entries": [
    {"id": "name", "tags": ["person:name"], "text": "Alex"},
    {
      "id": "memory",
      "tags": ["reflection", "childhood", "dear-december:door:3"],
      "text": "We rode our bikes until it got dark.",
      "createdAt": "2026-10-23T12:00:00Z",
      "modificationDates": []
    },
    {
      "id": "prompt",
      "tags": ["question"],
      "text": "What did you enjoy after school?",
      "relatedTo": ["memory"]
    },
    {"id": "photo", "tags": ["photo"], "filePath": "media/bicycle.jpg", "relatedTo": ["memory"]},
    {"id": "context", "tags": ["photo:context"], "text": "My bicycle beside the garden gate.", "relatedTo": ["photo"]},
    {"id": "label", "tags": ["photo:caption"], "text": "The bicycle", "relatedTo": ["photo"]}
  ]
}
```

These are plain labels, not tag objects or key/value maps. A question is an ordinary text record bearing the `question` label; it is not a required question field on every reflection. Free writing needs no question record.

## Dear December label conventions

These labels are application conventions, not required schema fields. Other apps may add their own labels without changing the schema.

| Label | Calendar interpretation |
| --- | --- |
| `person:name` | Name text. |
| `person:date-of-birth` | Birthday text in `YYYY-MM-DD` form. |
| `person:place-of-birth` | Birthplace text. |
| `person:places-lived` | Optional free-form places lived. |
| `reflection` | A reflection or journal entry; other ordinary text records are also retained and editable. |
| `question` | Original prompt wording, linked to a reflection. |
| `topic` | Topic/door title wording, linked to a reflection. |
| `photo` | A photograph; `filePath` determines the actual file content. |
| `photo:context` | Photo context text, linked to a file record. Never automatically printed or rewritten as autobiography. |
| `photo:caption` | Literal printed label, linked to a file record. |
| `photo:taken-at` | Known capture date/timestamp as text, linked to a file record. Approximate dates belong in context. |
| `dear-december:door:1` … `dear-december:door:23` | Stable calendar association for a reflection, independent of prompt wording or language. |

When multiple facts share a recognized label, the calendar displays the first and preserves the remaining records. Unknown labels on displayed records survive edits. Context records the calendar does not interpret are retained. The UI uses a calendar-specific view internally; the persisted collection and new exported manifests use the generic tagged structure.

## Validation and migration

[The JSON Schema](../schemas/dear-december-v1.schema.json) defines structure, label arrays, dates and path syntax. `npm run validate:format` checks the schema and example. The application separately validates unique IDs, reference integrity, timestamp ordering, language tags, ZIP integrity and image bytes. Limits remain 25 MB compressed, 30 MB expanded, 2 MB manifest, 3 MB per image, 40 megapixels per image and 2,000 records. Questions and other contextual records count toward the record limit.

The early v1 format used `profile` and text/photo variants. As a pre-release format change, the tagged design remains version 1. Existing journals are recognized by their legacy `profile` root and checked with the isolated [legacy schema](../schemas/legacy-journal-v1.schema.json). Old browser documents and ZIP/JSON backups are converted to tagged records on the next successful save/export. Facts with no known recording timestamp stay undated. Existing original text/photo timestamps and wording are preserved. Future structural changes require an explicit version/migration decision.

## Backup and local storage

`dear-december-backup.zip` contains `draft-backup.json` and original files in `media/`. Its `collection` uses this same tagged schema. The envelope additionally carries generated Markdown and local editing/calendar metadata. It is separate from the minimal portable manifest. Older JSON backups with embedded media remain importable. Imported data replaces the current journal only after validation, confirmation and a successful storage write.

Local storage under `miniography-document-v1` contains the tagged collection, photo data URLs, generated text and editing metadata. Data URLs are a browser-storage detail, not the archive format. ZIP export, Markdown and PDF are unencrypted; keep personal copies somewhere you trust. Generated Markdown never overwrites the source records.

Sync/login remains a proposal in [encrypted-sync.md](encrypted-sync.md); none of these format changes uploads data.
