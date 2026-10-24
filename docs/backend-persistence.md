# Login and backend persistence

Status: implemented with production deployment packaging. See [deployment/operations](../deploy/README.md) for the actual runtime and limitations. The chosen first version uses regular private server storage, not end-to-end encryption. This supersedes the earlier managed-provider/passphrase proposal for the next implementation step. E2EE remains a possible later project, not an advertised capability.

## Reference: chesscoop / Checkmates

The reference implementation is the local sibling repository `../chesscoop/site`:

- `lib/auth.ts`: Better Auth, verified email/password sign-in, Resend verification/reset email, database-backed sessions and auth rate limiting.
- `lib/current-user.ts`: verified session lookup, with identity derived on the server.
- `db/sqlite.ts`: better-sqlite3, WAL, foreign keys and a busy timeout.
- `db/schema.ts` and `deploy/migrate.mjs`: tracked schemas and transactional migrations.
- `app/api/rooms/route.ts`: authenticated API, origin checks, ownership/membership checks and revision conflict responses.
- `deploy/compose.yml` and `deploy/README.md`: a separate Docker service on the shared VM, persistent data volume, Caddy HTTPS, health checks and migration-aware deployment/rollback.

Reuse this pattern and deployment conventions, not the chess-specific models, shared auth sessions or credentials. Dear December gets its own auth secret, database, volume and app identity. Do not copy permissive password settings: the reference currently allows a one-character minimum. Use an appropriate password policy for a public personal-journal app.

## Application structure

Keep the existing vanilla JavaScript UI and tagged JSON format. A React/Next.js rewrite is unnecessary for this change: Better Auth supports a vanilla client and Node server integration. Add a production-capable same-origin Node service for authentication, journal/media APIs and static assets. The current loopback development server is not a production server and must not simply be exposed publicly.

Suggested modules:

- `server/auth.mjs`: Better Auth and Resend configuration.
- `server/database.mjs`, tracked migrations: SQLite connections and schema lifecycle.
- `server/journals.mjs`: session/owner checks, validation, revision-controlled persistence.
- `server/media.mjs`: private image storage, upload validation and owner-authorized reads.
- `server/index.mjs`: production HTTP entry point, static files, API routes and health endpoint.
- `src/account.js`, `src/persistence.js`: account UI, migration, loading and save coordination.

Pin dependencies and use the same runtime/native-SQLite build discipline as Checkmates. Preserve the existing localhost developer controls, but require an explicit local development configuration; reset must never silently delete a production account.

## Account flow

The public landing page explains the calendar and offers sign in / create account. Account creation sends a verification email. Only verified sessions can read or change journals. Include sign-out, forgotten-password/reset and account deletion. Use Better Auth's session cookies and origin/CSRF protections; do not invent a parallel token scheme in localStorage. Apply auth rate limits and trust forwarded client IP headers only from the configured proxy.

On first sign-in, create an empty private journal or load the existing one. On a second device, signing in loads that same journal and photos. No separate encryption passphrase or recovery key in this version. Sign-out/account switching clears the previous journal from memory, previews and any account-scoped browser cache before another account can load.

The backend is the persisted source of truth. This first version retains unsaved edits in page memory and warns before navigation; it does not claim persistent offline editing. Never present a local-only change as saved to the account. Decide explicitly whether an offline queue persists across sign-out; first version should not leave another person's readable journal behind in a shared browser.

## Persistence model

Use one journal per account initially. Store the existing generic tagged manifest as a JSON document rather than inventing a database column for each label. The archive schema stays independent of the backend. Store generated Markdown and calendar metadata alongside the manifest, outside its portable minimal schema.

Conceptual tables:

| Table | Content |
| --- | --- |
| Better Auth tables | Users, accounts, sessions, verification tokens and auth rate limits. |
| `journals` | Journal ID, unique owner user ID, revision, tagged manifest JSON, generated draft/calendar metadata, creation/update times. |
| `journal_assets` | Asset ID, owning journal, archive-relative path, private storage key, content type, byte count and upload time. |

Owner IDs always come from the verified server session. Every read, update, upload and delete checks ownership server-side. A client-supplied journal ID or file path never grants access. Cascade account deletion through journal rows and referenced private files. Define deletion of retained backups separately and disclose the retention policy before launch.

## Saving and conflicts

Load document plus revision. Debounce autosave after editing; display Saving…, Saved, Offline / not saved, or a clear error. Keep pending changes until the server acknowledges them.

A write includes the revision last loaded. Use an atomic conditional update (`WHERE id = ? AND owner_id = ? AND revision = ?`) and increment the revision on success. A mismatch returns 409 and preserves local edits. Do not retry stale writes until they overwrite another device: offer to load the newer version or explicitly retain a copy of the local draft. The small first version need not implement live collaborative editing.

The server validates the tagged manifest, IDs, links, timestamps, size limits and referenced media before committing. Persist document and generated-draft metadata in one database transaction where they change together. Record saves must preserve unknown tags and linked context.

## Images

Store original image files in a private directory on the app's persistent volume, not under a public static path. Use opaque server storage keys. Authenticate image requests and check their journal ownership. Serve with the actual validated content type, no sniffing, and private/no-store caching as appropriate.

Uploads retain the existing file-size, signature and decode limits. Resolve paths from trusted database rows; do not concatenate arbitrary request paths into filesystem paths. Upload a new asset successfully before saving a manifest revision that references it. Failed uploads leave the previous readable document intact. Clean up abandoned uploads and removed files only when no live journal references them.

## API outline

| Route | Behavior |
| --- | --- |
| `/api/auth/*` | Better Auth account/session/verification/reset endpoints. |
| `GET /api/journal` | Current verified user's journal, metadata and revision; no shared/public listing. |
| `PUT /api/journal` | Validate and conditionally save using the expected revision. |
| `POST /api/journal/assets` | Validate and store a private image for this journal. |
| `GET /api/journal/assets/:id` | Read an owned image after authentication. |
| `DELETE /api/journal/assets/:id` | Remove an unreferenced owned asset. |
| `GET /api/journal/export` | Download the current journal and original images as a ZIP, including saved draft metadata when requested. |
| `DELETE /api/account` | Confirmed deletion with fresh authentication, session revocation and associated data cleanup. |
| `GET /api/health` | Minimal health response with no personal data or secrets. |

Use bounded payloads, validated content types, no-store responses for personal API data, origin checks for mutations and authenticated per-user rate limits. Do not log journal bodies or generated prompts.

## Existing local journals and backups

After sign-in, detect an existing local journal and offer an explicit migration. If the account already has content, never overwrite it automatically. Upload images first, commit the document, then verify the saved result before deleting or retiring the legacy local copy. Leave it recoverable if any step fails.

Keep ZIP export as a user-owned offline copy, with all original images and saved generated text. Move import from the main footer into Settings → Restore or import a journal. It remains useful for existing users, rollback and moving from another application; export without restore would not be a complete backup flow. Preserve compatibility with current and legacy ZIP/JSON backups.

The welcome and About text must explain account storage rather than claiming entries never leave the browser. For this version the service operator can access content: HTTPS and login provide transport/access protection, not E2EE. Exports remain readable personal files. No advertising or unrelated reuse; the ownership/export commitments remain.

## AI generation

Cloud generation remains optional and requires explicit consent to send reviewed text to OpenAI. Adding account storage does not grant AI-processing consent. If the current loopback-only generation proxy becomes a public feature, it needs verified sessions, per-user concurrency/rate limits, spending controls and an explicit billing/key policy before it is enabled. Account persistence can ship with the existing copyable-prompt route while that policy is decided. Never expose the current shared-key development endpoint as a public unmetered proxy.

## Hosting and operations

Follow Checkmates' deployment pattern on the shared VM, with a new app directory/container, separate persistent volume and an explicit Caddy route for the chosen hostname. Do not modify or reuse the Checkmates database or overwrite other proxy routes. A hostname and production email identity must be configured before deployment; this document does not provision either.

Back up SQLite using a consistent database-backup mechanism, not a casual copy of a live WAL database. Back up the corresponding media files as well. Test restoration of database plus images. Use migration-aware releases, health checks, rollback procedures and bounded logs. An image rollback alone cannot undo a breaking database migration.

## Implementation order and acceptance

1. Auth/backend foundation with local test configuration, email verification/reset and server-side isolation tests.
2. Journal/media persistence with conditional revisions and image round-trip tests.
3. Account UI, save-status feedback, account switching and explicit local migration.
4. Export/restore in settings, deletion and accurate welcome/privacy copy.
5. Deployment packaging and restore/rollout tests. Deploy only after the actual host/email configuration is selected.

Required acceptance checks include cross-account read/write/image denial; expired/unverified session rejection; concurrent-save conflict preservation; upload/save failures; sign-out isolation; legacy local/ZIP migration; full image/generated-text export and restoration; account deletion; database/media restore; and absence of private content in logs.

References: [Better Auth installation and vanilla client](https://better-auth.com/docs/installation), [Better Auth SQLite support](https://better-auth.com/docs/adapters/sqlite). Local Checkmates source is the reference for the actual deployment pattern above.
