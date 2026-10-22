# Purpose and principles

## A little of a life, kept

Dear December helps people record the basic facts, ordinary details and memories of their lives. It is a small portrait of a person: where they came from, what they enjoyed, who mattered to them and how everyday life felt.

There is no need to have led an extraordinary life, demonstrate achievements or write polished prose. This is not a book of self-praise or an exhaustive, formal biography. A favourite meal, a childhood home or a habit someone would recognise can say as much as a major milestone.

The collection can be useful to its author now, grow into a journal or become something to pass on to future generations. Sharing and passing it on are choices, never obligations. Keeping it entirely private is an equally complete use of the project.

## The advent calendar is a beginning

This application starts as an advent calendar for the mind: 24 named doors invite people to pause, reflect and journal a little during Advent. Small moments are the main starting point, while larger experiences and broader reflections also belong. People choose which questions to answer, how much to write and when to return.

The first-use explanation invites people to keep everyday details that children or future generations might enjoy discovering: routines, food, favourite things, familiar places and small moments. It does not ask for profound lessons, a moral message or an impressive life story. Writing hints belong inside the doors; the homepage does not prescribe a model answer or provide a step-by-step walkthrough. The combined miniography and PDF are a surprise introduced when the final door is opened on December 24. Before then, people revisit their entries through the individual doors; there is no combined journal invitation or preview. The reveal presents their own miniography before opening the full collection and PDF option. Afterward, it remains available. Local developer tools can bypass the date for testing.

The calendar is one way to start collecting information. It does not define the limits of the collection or the underlying format. People can continue after December, revisit a question or use their material in a different project.

The application should make it easy to begin and easy to stop. It should not turn personal reflection into a performance, a competition or an obligation to complete every door.

## A format beyond this application

Dear December is the advent-calendar application; the underlying Miniography format is a generic, open format for recording personal information. It stores profile facts, original text entries, photos and their context in a portable archive. Those source materials can form the basis of a miniography, a fuller biography, a journal, a family history or another fitting project.

The format must remain useful independently of this website, its calendar and its developers. Another application should be able to read a collection, preserve its meaning and use it with the person's permission. The format specification and schema are documented in the repository; inspecting an archive does not require a proprietary service.

Extensions are welcome when they serve a clear purpose. Once the format is released, extensions and structural changes must have documented versioning and preservation rules so applications can recognise what they support. An application must not silently discard information it does not understand. An open format does not mean that the personal information stored in it is public.

Original records are the foundation. Generated biographies, summaries and printable documents are interpretations of that material; they must not overwrite the original words or quietly turn guesses into facts. Creating an output should leave the person free to revise it, discard it or use another application.

## Your information belongs to you

Privacy and ownership are core requirements, not optional features. The person creating a collection retains control of their information and decides how it is stored, used, exported, shared or deleted.

The project makes these commitments:

- Personal information will never be used for advertising, ad targeting or commercial profiling.
- Personal information will never be collected into a central dataset for the project's own purposes.
- Using the calendar, writing an entry or generating an output does not grant permission to reuse the information for unrelated purposes.
- People can keep their collection private, keep their own copies and use the open archive with other applications. Export is a core capability, not a paid escape route.
- Sharing is deliberate and initiated by the person. There should be no public collection, automatic publishing or social sharing by default.
- Future features that send information to another service must explain what is sent, to whom and why, and require an informed choice before transmission. Declining must leave local collection and export usable.

These commitments also guide future AI features. Personal entries must not be silently sent to an AI provider. Any optional external processing must be assessed against the same privacy and ownership requirements, including the recipient's retention and reuse terms. Convenience does not override those requirements.

Choosing another application does not transfer these project commitments to that application's operator. The format should make transfer possible; people still need a clear choice about the destination and its practices.

## Design consequences

- Collect only what helps people record their lives. Name, birthday and birthplace establish basic context; places lived are optional. Additional questions and photo descriptions remain optional.
- Keep original text, photos and context portable. Preserve question wording, timestamps and reading order through import and export.
- Make privacy understandable in the interface: where information is saved, whether it leaves the device and what an action will share.
- Make meaningful actions explicit. Answering, sharing, exporting and deleting are different actions with different consequences.
- Prefer local processing and storage. A server account or central copy should not be necessary to keep a personal collection.
- Keep outputs modest and readable. The aim is to capture a person, not make a life sound more impressive.

## Current implementation and limits

A dismissible first-visit introduction explains the purpose, local storage and portable file concept without revealing the December 24 keepsake. It can be skipped, closed or dismissed with Escape with a separate About dialog for the fuller purpose, privacy and storage explanation. The dismissal flag is stored only in this browser; it is not part of the personal archive or sent to a server.

The current app stores its collection in this browser and exports a ZIP-based `.deardecember` journal file using the Miniography format. There is no account requirement or central journal collection. An optional loopback-only development server can send a text projection to OpenAI after explicit consent; its API key stays on the server. The default reveal and PDF work locally without that choice. See [generation](generation.md) for the data sent, provider retention, session-draft limits and setup. Archive export and browser print-to-PDF are initiated by the person using the app.

Browser storage is not a permanent backup. It may be cleared or become unavailable, and another person with access to the same browser profile may be able to read it. Exported archives are ordinary, unencrypted ZIP files; treat them as personal documents. Local storage alone is not a claim of encryption or protection from someone who controls the device.

The interface currently loads fonts from Google Fonts. That creates third-party font requests, although entries and photo contents are not sent as part of those requests. Before describing the entire app as making no third-party requests or working fully offline, those fonts need to be bundled locally or replaced with system fonts. Privacy claims must describe actual behaviour, not just intent.

Publishing a schema does not, by itself, establish an open-source licence. The format is intended to be freely implementable by other applications; a suitable explicit licence for the specification and schema still needs to be chosen and added. Version 1 is currently a pre-release implementation and may change before release.

## Related documents

- [The 24 topics](topics.md): the calendar's editorial plan.
- [Miniography generation](generation.md): the editorial structure and rules for future generated drafts.
- [Archive format](archive-format.md): the portable format and its implementation rules.
- [JSON Schema](../schemas/dear-december-v1.schema.json): the machine-readable structure.
