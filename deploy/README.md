# Dear December on the shared VM

Hostname: https://deardecember.mteschke.com
Application: `/opt/apps/dear-december`, Docker service/container `dear-december`, private volume `dear_december_data`, shared network `web`. Caddy terminates HTTPS and overwrites `X-Real-IP`. No application port is published to the host.

## Configuration and deploy

The VM-only `/opt/apps/dear-december/deploy/.env` (mode 600) contains `BETTER_AUTH_URL`, an independent random `BETTER_AUTH_SECRET`, `RESEND_API_KEY` and `EMAIL_FROM`. Share the existing transactional email service, not the Checkmates auth secret or database. The sender domain must be verified in Resend. Local env files and API keys are excluded from release packaging. Public OpenAI generation is intentionally disabled; the copyable prompt remains available.

Run `./deploy/update-vm.sh`. It builds static assets locally, packages the production server, installs Linux dependencies in a Node 24 image, and waits for health. SQL migrations run transactionally at startup and have recorded checksums. Existing releases are backed up before migration. A failed health check restores the old image; breaking migrations still require database rollback from a tested backup. Never use image rollback as a substitute for a database rollback.

The Caddy route lives in the sibling `mteschke-vm-infra/proxy/Caddyfile`. Validate and reload the existing proxy configuration, preserving every other route. DNS is a DNS-only A record pointing to the shared VM, as with Checkmates.

## Backups and retention

`/opt/apps/dear-december/deploy/backup.sh` briefly stops only this application, creates a consistent SQLite online backup plus corresponding original media, and restarts it even if backup fails. Completed archives are stored with mode 600 in `/opt/apps/dear-december/backups`. A nightly VM job runs this script. An independent hourly retention job removes backups before they exceed 30 days; successful backups also apply the same retention policy. The database, media and sessions contain private data; do not publish or copy these archives into the web root.

These backups are on the same VM and do not protect against loss of the VM disk. User ZIP export remains independent; off-VM operational backups should be added before depending on this service for irreplaceable material.

A restore requires stopping the app, extracting the selected backup into a temporary directory, checking its SQLite integrity and media references, then replacing the database and media together in the volume. Preserve the current volume first, remove stale WAL/SHM files while the app is stopped, restore ownership to UID/GID 1000, and start a compatible image. A smoke restore is performed against a separate temporary database/directory before first rollout. Do not experiment on another application's database or volume.

Account deletion removes the live user, sessions, journal and photo rows, and the user's private media directory. Existing backups expire within 30 days. Original photo uploads that remain unreferenced for 24 hours are cleaned up hourly. Each account has a 30 MB image allowance; individual images retain the 3 MB / 40 megapixel limits. Uploads stop when the VM has under 200 MB free. This does not replace disk monitoring.

## Local account server

Run `npm run build`, create ignored `.env.accounts` with `BETTER_AUTH_URL=http://127.0.0.1:3000`, a random auth secret, `PORT=3000`, `DATA_DIR=.data`, and a working email sender. Run `npm run dev:accounts`. The existing `npm run dev` remains a loopback-only local-storage/API-generation preview. Static previews also remain local-only. The account server always enforces authentication, including on localhost; it does not provide fake verified accounts or a production reset shortcut.

`npm test` includes backend/browser tests with an injected in-memory email sink and temporary databases. No real messages are sent by tests. Production uses Resend. `GET /api/health` checks the database; `GET /api/account/config` advertises account mode. All journal/media routes require a verified session and the expected account header, protecting against account-switch races.

## Save and restore behavior

The backend is the source of truth. Changes autosave after a short pause; the interface distinguishes loading, saving, saved and failure/conflict. Unacknowledged edits stay in page memory with a navigation warning; there is no claim of persistent offline editing. Reloading an unsaved page can lose those edits after dismissing the warning. Signing out tries to flush; a failed save requires explicit discard confirmation. A stale revision never overwrites a newer device's version. Download a full backup before choosing to load the server version.

Existing browser journals are detected and offered as explicit account migration in Settings. They are not uploaded automatically. Migration uploads images, saves, reads the result back, verifies the tagged collection, and only then removes the old browser document. ZIP/JSON restore is under Account, and full ZIP export remains available. Account journals are not written to localStorage. Local intro-dismissal preferences are retained. This release uses ordinary private storage, not E2EE: the operator can access server content.
