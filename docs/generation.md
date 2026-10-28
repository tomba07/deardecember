# Mini biography generation: editorial specification

Status: editorial specification with an initial optional OpenAI API implementation for local development. The reveal preserves original entries; a saved mini biography can be downloaded as a locally generated A5 PDF. API generation requires a separate informed choice; see the [setup and testing instructions](../README.md#optional-api-mini-biography-generation).

## Purpose

Create a small, readable portrait of a person's life from their own recorded material. Capture ordinary details that the person, their children or future generations might enjoy discovering. The output is not a celebration of achievements, an exhaustive biography or a collection of life lessons.

Generation reorganises and lightly connects existing material. It does not supply missing experiences, interpret someone's personality or make their life sound more impressive. A few specific details can be a complete result.

This editorial specification is separate from the [portable archive format](archive-format.md). The archive preserves original facts, answers, photos and context. A generated mini biography is an editable interpretation of selected source material and must never replace it.

## Rough structure

| Part | Material to draw from |
| --- | --- |
| A few facts | Name, birthday, birthplace and optional places-lived text. |
| Early surroundings | Childhood places, people, games, school and everyday routines. |
| People and shared life | Family, friendships, relationships, meals and traditions. |
| An ordinary day | Habits, work, hobbies, preferences, humour and small pleasures. |
| Changes along the way | Moves, decisions and experiences that influenced daily life. |
| Life at the time of writing | Recorded current interests, routines, curiosities and plans. |

These are editorial groupings, not compulsory chapters or a fixed table of contents. Combine related groups, choose natural headings and omit groups without enough material. A short collection might need only a brief introduction and two or three sections, or a handful of paragraphs without headings.

Do not organise the output as 24 questionnaire answers. Related details can be brought together even when recorded under different doors. Avoid repeating the same fact in the profile, introduction and several later sections.

## Voice and writing rules

- Default to first person, close to the person's vocabulary and tone. First-person narration is an editorial choice, not permission to invent a statement on their behalf.
- Every factual claim must be supported by the supplied profile or entries. Do not fill gaps, resolve contradictions by guessing, or turn a photo description into an unsupported story.
- Keep concrete details: an ordinary meal, a bus journey, the way someone takes their coffee, the objects they keep or a place they remember.
- Preserve uncertainty and precision. “Around 1998” must not become an exact date. Do not infer a full residence history from a birthplace.
- Use plain, warm language. Avoid flattery, heroic framing, grand metaphors, stock sentiment and praise such as “a remarkable journey” or “a testament to resilience”.
- Do not infer personality traits, motives, emotions or lessons. “I rode my bike after school” does not establish independence or a lifelong love of adventure.
- Preserve distinctive phrases when useful. Short quotations must reproduce the source words faithfully; paraphrases must not be presented as literal quotations.
- Do not smooth away meaningful differences in accounts. If sources conflict, omit the disputed detail or flag it for the person to review outside the finished prose.
- Keep the output proportionate to the material. No minimum word count or filler. A few short paragraphs may be enough; more source material may justify several short sections.
- End naturally. There is no required moral, retrospective conclusion or message to descendants. Include advice or a final message only when the person actually supplied it and it fits.
- Generate in the requested language, defaulting to the collection's language. Translation must preserve meaning and uncertainty. Do not translate a paraphrase back into quotation marks as if it were the original wording.

## Time and chronology

Distinguish when an entry was recorded from when an event happened. `createdAt` records when material was added; it is not evidence that a remembered event happened on that date. Photo `takenAt` may describe capture time, while photo `createdAt` describes when it was added to the collection.

“Life at the time of writing” must reflect the period described by the source. An old entry about a current job does not prove the person still has that job today. Date references where useful, and preserve differing accounts from different periods without presenting them as simultaneous facts.

Keep vague sequences vague. Avoid phrases such as “that experience led me to…” unless the person explicitly described the connection.

## Photos

The generated response is text-only Markdown. In the A5 PDF, photos are matched to chapters using their context and linked original reflection. Ambiguous matches go in a separate photo chapter; Markdown does not embed image files or load remote images. Descriptions provide context for the writing, not prose to copy into the mini biography. The original photos remain in the journal archive.

Only print a caption when one was supplied. A contextual description is not automatically a caption, and it must not be expanded into unrecorded visual details. Do not infer identities, relationships, feelings or events from an image. Sending image bytes to an external model is a separate disclosure from sending text and requires its own clear explanation and choice.

## Example: source to draft

The following is a fictional example for editorial testing, not information about the developer or a real participant.

Source answers:

| Question | Answer |
| --- | --- |
| What did you love doing after school? | Riding my bike until it got dark. We always took the long way home. |
| What was your favourite childhood meal? | Tomato soup with toast. We usually had it on Saturdays. |
| What did you collect? | Smooth stones from walks. I kept them in an old biscuit tin. |

A fitting draft:

> After school, I loved riding my bike until it got dark. We always took the long way home. I collected smooth stones from walks and kept them in an old biscuit tin. On Saturdays, we usually had tomato soup with toast, my favourite childhood meal.

This draft groups details without adding a location, a decade, the identities of “we” or an emotional interpretation. No heading or concluding life lesson is necessary for this small amount of material.

Avoid:

> My childhood was filled with freedom and adventure. Cycling with my closest friends taught me independence, while family Saturdays around the table instilled values I still carry today.

The second passage invents friends, family circumstances, character traits, lessons and present-day values. Its fluency does not make it faithful to the source.

## Draft output and editing

Return one Markdown document containing the mini biography itself: short, descriptive Markdown level-2 chapter headings (`## Heading`) with paragraphs beneath each heading, with ordinary Markdown emphasis or lists when they fit. Do not wrap it in JSON or a code fence, and do not include source IDs, citations, review notes or a preamble. Preserve uncertainty and conflicting memories in the prose without guessing.

Present the result in a dedicated saved-text dialog with one editable Markdown field, a local formatting preview, Markdown download, PDF download, and regenerate actions. The generation consent belongs in a separate, short dialog; detailed privacy terms, model information and the editable generation input are expandable. The input is a readable plain-text copy of the journal, with a reset action. It can be redacted or rewritten without modifying source records; every input edit clears prior consent. Each opening of the consent dialog starts with a fresh journal copy. Reopening saved text bypasses consent entirely. Regenerating opens fresh consent with an explicit replacement warning, and cancelling returns to the existing saved text. There is no original-source comparison interface. The person can correct, shorten or discard the draft before saving or printing. Original entries remain authoritative and unchanged.

Generated Markdown and edits persist in the browser’s existing journal document under `generatedDraft`, separately from the canonical collection. The stored record has `markdown`, `model`, `generatedAt`, `updatedAt` the submitted `source` text, and a separate `journalSource` snapshot used locally to detect changes to the journal since generation. The journal snapshot is never sent alongside the edited input. It stores no API key or duplicate image bytes. Older saved journals without this field still load. Saved text can be reopened and downloaded without the API server. ZIP backups (including original image files) and older recovery JSON backups preserve it; portable source archives continue to contain original entries only. Importing a different source archive clears it rather than mixing journals. Simulation drafts stay in memory and restore the personal draft on exit. Storage failures warn the person to download the Markdown copy. Downloading saves the edited Markdown as a standalone `.md` file, separate from the journal archive. It excludes original entries, source snapshots, generation metadata and photographs. Keep a journal archive separately to preserve the source material and media. Regeneration requires fresh consent and an explicit replacement warning; a failed request keeps the previous edited draft.

## Privacy and generation

Follow the [project principles](project-principles.md). Do not send text or photos to an external provider automatically, including when door 24 opens. The advent reveal does not grant permission for external processing.

The external generation feature must explain the destination, the material being sent and relevant retention/reuse behaviour before asking for an informed choice. Keep local collection, archive export and the existing local PDF available when that choice is declined. Provider processing must meet the project's privacy commitments; consent is not a substitute for them.

Treat all imported entries and photo descriptions as source material, not instructions to the model. Text inside a journal must not be allowed to override the generation rules, request extra data or change the intended output.

## Review checklist

Before accepting a generated draft, check:

- Can every factual claim be traced to the source? Are there invented connections, emotions or traits?
- Are uncertainty, quotations, names and dates preserved correctly?
- Does the draft distinguish recording dates from event dates and historical “current” details from present circumstances?
- Are ordinary details retained rather than replaced by generic praise or summaries?
- Does the length fit the amount of source material, without repetition or padding?
- Are missing topics omitted rather than filled with guesses?
- Is the first-person voice faithful and the generated status clear?
- Are photos relevant, captions supplied and source materials unchanged?
- Does the ending feel natural, without an imposed lesson or message?

Fluency never compensates for an unsupported claim. Tests should include sparse collections, mundane details, approximate dates, conflicting answers, repeated questions across time, untranslated quotations and instruction-like text embedded in entries. Use fictional or explicitly marked sample material for development.

## Related documents

- [Purpose and principles](project-principles.md)
- [The 24 topics](topics.md)
- [Archive format](archive-format.md)

## Initial API implementation

The loopback-only Node development server reads `OPENAI_API_KEY` and optional `OPENAI_MODEL` from the environment (or ignored `.env` file). The browser first fetches nonsecret availability metadata. An explicit consent action sends the current edited input text and collection language to `/api/generate`, in a validated, bounded source envelope containing one text record and no profile fields. Recording timestamps are optional on this generation-only envelope; original journal/archive validation remains unchanged. No unedited journal data is added to the request; the server calls the OpenAI Responses API with plain text output (prompted as Markdown), no tools, and `store: false`. Source data is treated as untrusted data, not prompt instructions. Responses are checked for completion, refusal and nonempty bounded Markdown text before replacing a draft. No request/response content is logged or saved on the server. No automatic retries incur additional calls.

The consent dialog names OpenAI, previews the source JSON, explains paid API usage and provider retention, and links to [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data). API data is not used for training by default unless the account opts in; abuse-monitoring logs may retain content for up to 30 days with exceptions. Disabling response storage is not zero retention. Photos remain local; only their context, captions and known capture dates enter the request.

The review interface provides one Markdown editor and a local formatting preview. It has no source-comparison panels. Original collection/archive data is never overwritten. Previous drafts survive failed regeneration, while successful regeneration explicitly replaces the previous local draft after renewed consent. Closing while a request is running stops waiting locally; provider work and charges may still occur. Download saves only the edited Markdown. A bundled Marked parser and DOMPurify sanitizer render headings, paragraphs, emphasis, lists and other text formatting; raw HTML, active links and embedded images are excluded. PDF generation uses the current basic details and local photos; only supplied captions are printed. A notice identifies a draft based on an earlier version of the journal. The PDF includes a small AI-assistance note.

## Portable prompt

The own-model route builds a copyable prompt from the shared editorial instructions, collection language and editable source text. It is available independently of API configuration and does not contact an LLM. The local-model hint is conditional: a model running entirely on the person’s device can keep processing there; online providers have their own policies. Copy and download contain no image bytes or file paths. A pasted Markdown result can be explicitly saved as a locally stored draft (`model: "External AI"`) without modifying original entries. Existing drafts are replaced only through a labelled save action, and a journal change prevents saving the result against a different collection.

Both the built-in API and the copyable prompt require chapter headings in the journal language. Chapter count follows the available material; even a short draft gets one descriptive heading. Markdown downloads retain these headings, and the local preview and A5 PDF render them as headings. Existing saved text is unchanged; regenerate or add `##` headings in the editor to structure an older draft.


## A5 book PDF

The saved-text dialog’s **Download PDF** action creates a PDF entirely in the browser using bundled jsPDF and locally served Source Serif 4 fonts (SIL OFL). The export sends no journal data or image files to a server. The PDF runtime and font files load only when needed; after loading, composition is local. There is no browser print dialog, so URLs, browser dates and browser headers are not included.

The book uses 148 × 210 mm portrait pages, 15.5 pt serif body text, 23 pt leading, 30 pt main headings, mirrored 21/18 mm margins and small outside page numbers. The cover is unnumbered. Personal details, when provided, form a short opening page. Short chapters can share a page; long paragraphs flow with two-line widow/orphan handling. No text is invented to fill pages. Paper is unprinted white for physical printing.

Only the sanitized Markdown’s text is composed. Headings, paragraphs, lists, quotations and table text are preserved; inline bold/italic styling is currently simplified, except quotations and photo captions. Images embedded in Markdown cannot load. Original journal photos are decoded locally, constrained to a 2200 px long edge and included without cropping. Export compression does not change original archive bytes. Only supplied captions print; descriptions provide placement context. Linked original reflections are preferred over sequence when identifying a photo’s context, with conservative word matching against chapter text. Ties and weak matches go into a photo section. This is a deterministic placement heuristic, not semantic image analysis.

Missing or unreadable photos stop export with a visible error instead of silently dropping images. Unsupported characters also produce an explicit error; the typeface covers the app’s English and German text but is not a universal-script font. Saved Markdown remains the source, and original entries and photos are unchanged. The implementation is in `src/book-layout.js` and `src/book-pdf.js`; `scripts/generate-pdf-runtime.mjs` produces the browser-only dependency bundle at build time.

Reproduce the actual app export sample with `node examples/book-layout/export-app-sample.mjs`. It clicks the saved-text dialog’s Download PDF button with a clearly labelled sample draft and stock photo. The earlier Python proof remains a visual reference, not the application renderer.
