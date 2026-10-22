# Miniography generation: editorial specification

Status: editorial specification with an initial optional OpenAI API implementation for local development. The default reveal and PDF still assemble original entries locally. API generation requires a separate informed choice; see the [setup and testing instructions](../README.md#optional-api-miniography-generation).

## Purpose

Create a small, readable portrait of a person's life from their own recorded material. Capture ordinary details that the person, their children or future generations might enjoy discovering. The output is not a celebration of achievements, an exhaustive biography or a collection of life lessons.

Generation reorganises and lightly connects existing material. It does not supply missing experiences, interpret someone's personality or make their life sound more impressive. A few specific details can be a complete result.

This editorial specification is separate from the [portable archive format](archive-format.md). The archive preserves original facts, answers, photos and context. A generated miniography is an editable interpretation of selected source material and must never replace it.

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

Place photographs beside passages they actually illustrate, using their source position and descriptions as context. A photo may be omitted from a particular draft if there is no fitting passage; its original remains in the archive.

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

## Draft status and source traceability

Present generated output as an editable draft assembled from the person's entries. Explain that first-person text may have been reorganised or paraphrased and is not a verbatim account. Let the person correct, shorten or discard it before saving or printing.

The initial implementation retains references from draft sections to the source entries used. Source references, unresolved conflicts and review notes belong in an editing/review layer, not in the finished prose. The archive's minimal v1 format has no generated-draft or citation structure. Drafts live only in the current page session and may be downloaded as a separate review JSON document (`draftFormatVersion: 1`), not as part of the portable journal. This document contains `provider`, `model`, `generatedAt`, `draft` (`sections` with `heading`, editable `text` and `sourceIds`, plus `reviewNotes`) and the exact `source` snapshot. The snapshot has language, profile facts and ordered source entries with request-local IDs. `profile` identifies the facts; `entry-N` identifies the Nth entry in that frozen snapshot, so reordering the live journal cannot change the meaning of its references. The downloaded review document excludes photos and paths and is not yet importable. Keep a separate journal archive for original media. References identify model-selected supporting records; they do not verify factual fidelity.

Original entries are authoritative. Regenerating a draft must not overwrite either those entries or a previously edited draft without an explicit choice.

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

The loopback-only Node development server reads `OPENAI_API_KEY` and optional `OPENAI_MODEL` from the environment (or ignored `.env` file). The browser first fetches nonsecret availability metadata. An explicit consent action sends a validated, bounded text projection to `/api/generate`; the server calls the OpenAI Responses API with strict JSON-schema output, no tools, and `store: false`. Source data is treated as untrusted data, not prompt instructions. Responses are checked for completion, refusal and valid section source references before replacing a draft. No request/response content is logged or saved on the server. No automatic retries incur additional calls.

The consent dialog names OpenAI, previews the source JSON, explains paid API usage and provider retention, and links to [OpenAI data controls](https://developers.openai.com/api/docs/guides/your-data). API data is not used for training by default unless the account opts in; abuse-monitoring logs may retain content for up to 30 days with exceptions. Disabling response storage is not zero retention. Photos remain local; only their context, captions and known capture dates enter the request.

The review interface provides editable sections, original-source comparisons and review notes. Original collection/archive data is never overwritten. Previous drafts survive failed regeneration, while successful regeneration explicitly replaces the old session draft after renewed consent. Closing while a request is running stops waiting locally; provider work and charges may still occur. A downloaded review document preserves edits and source traceability. Photos are positioned using referenced source IDs, with remaining photos after the prose. Printed output labels the result as AI-assisted.
