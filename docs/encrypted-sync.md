# Account-based encrypted sync — proposed design

Status: proposal, not implemented. The current app still uses local browser storage and manual backups. Provider selection and the journal-unlock/recovery experience are pending. This document does not change the archive format or current privacy claims.

## Intended experience

Sign in, unlock the journal, and continue on another device without transferring files. Entries, profile facts, photo bytes, descriptions, captions and saved generated text are encrypted on the device before upload. Keep ZIP export as an independent, portable copy. Plain ZIP, Markdown and PDF exports contain readable personal information; describe this when exporting.

Authentication and decryption are separate operations. A successful login alone must not give the server a journal decryption key. A proposed first version uses a separate journal passphrase with a downloadable recovery key; this needs a product decision before implementation. Changing or resetting a login password must not destroy access to encrypted content. Losing every unlock/recovery method means content cannot be recovered by support.

## Backend boundary

The repository currently has a static deployment and a loopback-only development proxy for optional AI generation. Neither is an account or sync backend. Use a maintained authentication provider and private storage with server-enforced ownership checks. Supabase Auth and private Storage are one candidate; no project has been provisioned or connected.

A provider necessarily receives account information and operational metadata such as user identifiers, object sizes, revisions and access times. Do not claim that account-based sync involves no central storage or metadata collection. The intended guarantee concerns journal content, not anonymity.

## Encryption and key lifecycle

- Generate a random journal key on the device. Use authenticated encryption from a maintained implementation or the browser's cryptography API; do not design a custom cipher.
- Encrypt profile, entries, photo metadata and generated text, as well as image bytes. Use opaque remote object names rather than personal names or original photo filenames.
- Store only encrypted key envelopes remotely. Never upload a plaintext journal key, journal passphrase or recovery secret. Specify the password KDF, parameters, random salt, authenticated envelope fields and nonce generation before implementation.
- Use fresh nonces as required by the chosen authenticated cipher. Bind ciphertext to its journal, object identity and format version to prevent object substitution. Reject altered, truncated or unsupported envelopes without overwriting the working journal.
- Keep unlocked keys in memory for the initial version. Local persisted journal content must also be encrypted; merely adding encrypted uploads would leave today's plaintext localStorage exposed. Define lock, reload, sign-out and account-switch behavior explicitly.
- Define passphrase change, recovery-key replacement, lost-device handling and account deletion before shipping. Key rewrapping is not equivalent to revoking a key already obtained by another party.

E2EE protects stored/synced content when endpoints are trusted. It cannot protect an unlocked journal against malicious application JavaScript, browser extensions, or a compromised device. Dependency controls, XSS protections and a restrictive content security policy remain necessary.

## Sync and migration

Use revisions and conditional writes to detect concurrent edits. Never silently overwrite a newer journal from another device. Upload referenced encrypted images before publishing the journal revision; retain the last readable revision if an upload fails. Keep unsynced local changes until acknowledged. Deletion must not cause an offline device to resurrect old content.

Retain import during migration: existing browser journals and ZIP/JSON backups need a route into an account. Offer explicit migration, encrypt locally, upload, then download/decrypt and verify the saved revision before removing legacy plaintext storage. Do not upload a sample journal as the personal journal. Keep the old copy if any step fails. After migration, import can move out of the main footer into account settings as a restore/transfer tool; removing it entirely would also remove backup restoration.

## AI processing

Ordinary encrypted sync must never send plaintext to an AI provider. The existing optional generation flow decrypts locally and sends only the user-reviewed text after explicit consent. Its disclosure must explain that this shares readable content with the selected provider; E2EE of the journal does not extend to that external processing. Images remain local unless a separate image-processing feature is explicitly introduced.

## Required verification before release

- Account A cannot read, replace or delete account B's encrypted objects or key envelopes, even by calling backend endpoints directly.
- Inspect upload requests, persisted local data and backend records: no readable journal content, original filenames, photo bytes or plaintext encryption keys.
- Wrong unlock secrets and tampered ciphertext fail without data loss.
- New-device unlock, recovery, password changes, sign-out, account switching and deletion work as documented.
- Concurrent changes and interrupted image uploads preserve recoverable data.
- Migration and export preserve all entries, original image bytes, captions, timestamps and generated text.
- Update the welcome, About, privacy principles and backup instructions only when the corresponding behavior is implemented and verified.

## References

- [OWASP Cryptographic Storage Cheat Sheet](https://cheatsheetseries.owasp.org/cheatsheets/Cryptographic_Storage_Cheat_Sheet.html)
- [Supabase Storage access control](https://supabase.com/docs/guides/storage/security/access-control)
