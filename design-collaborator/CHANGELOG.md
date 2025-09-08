# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

### Added
- Multi-image sessions: upload up to 10 images per session. Images display as horizontally paged slides with a thumbnail strip for quick jumps. Existing pan/zoom (Space + drag, wheel) works per image.
- Per-image annotations: annotations are bound to an image via `imageIndex`; comments/likes/history continue to work.
- API: `POST /api/sessions` now accepts an `images` array (each with `imageDataUrl` and optional `thumbnailDataUrl`) as an alternative to the single `imageDataUrl` body parameter.

### Changed
- Database: new `images` column on `sessions` storing an array of `{ url, thumbnailUrl }`. Cleanup jobs remove all related files for multi-image sessions.

### Notes
- Backwards compatible: existing single-image sessions continue to work and display with the original viewer; lists use the first image/thumbnail.

## [0.6.0] - 2025-09-06

### Added
- Monitoring dashboard at `/monitor` (password `bluewheel101!`), showing sessions, DB size, images/thumbnails counts and sizes, profiles, and container network totals.
- Members modal: list members; owner can remove collaborators. Removed users are blocked from access/rejoin.
- Session disable/restore workflow: owner can disable a session (read‑only) and schedule deletion in 30 minutes with a visible countdown; can restore within the window; permanent deletion cleans DB and files.
- Disk image storage and client‑side thumbnails (served from `/uploads`), replacing base64 storage for new sessions.
- Header badge “Read‑only” for disabled sessions; title click navigates home; favicon from `favicon.ico`.
- Edit Profile modal and auto‑populated, read‑only identity in join modal for known users.

### Changed
- Strict join flow: existing collaborators don’t need to re‑enter password; blocked users receive Access Revoked.
- Initial password modal shows no error until a failed submit.
- Nginx proxies `/uploads` and `/monitor` to backend.

### Fixed
- Various join/auto‑join edge cases; name/email prefill/locking in join modal.

## [0.4.0] - 2025-09-06

### Added
- Multi-level threaded replies with collapsible threads and reply counts.
- Comment likes (♥/♡) with live updates; new endpoint to toggle likes.
- Session naming on creation (`sessionName`) and display in lists/history.
- “My Sessions” modal and header button to open sessions in new tabs.
- Login modal improvements: dynamic password requirement and protected-session label.

### Changed
- Access control: All sessions now require membership (owner or collaborator) to read.
- Client join-first flow: attempts to join on shared link, then fetch; includes `x-user-email` header on reads.

### Fixed
- Password prompt no longer appears for non-protected sessions when joining via a shared link.

## [0.3.1] - 2025-09-06

### Fixed
- Backend JSON body limit increased to 25mb for image uploads.
- Nginx `client_max_body_size 25m` to avoid 413 on uploads.
- Nginx `/api` proxy preserves the prefix (fixes 502 on `/api/users`).
- Server build/run path alignment; robust startup script selects correct entrypoint.
- SQLite path moved to `/data/collaborator.db` and switched to a named Docker volume.
- Added `GET /api/health` endpoint for quick health checks.
- `getUserSessions` simplified to avoid invalid `json_each` usage.

### Changed
- Docker Compose: removed explicit container names; parameterized frontend host port with `PUBLIC_PORT`.

## [0.3.0] - 2025-09-06

### Added
- Per-user display colors for comment authors (deterministic by email).
- Session History modal and backend history persistence (`Session.history`).
- Stats under the title: total annotations and total comments in session.
- Threaded replies (one level) to comments via `parentId`.

## [0.2.0] - 2025-09-06

### Added
- Production-ready Docker setup:
  - `server/Dockerfile` (multi-stage) and `Dockerfile` (frontend build + Nginx).
  - `nginx.conf` serving SPA and proxying `/api` and Socket.IO.
  - `docker-compose.yml` to orchestrate services.
  - Example env files: `server/.env.example` and `docker.env.example`.

### Fixed
- Various TypeScript build issues (ESM/CJS mismatch, missing Node types).

## [0.1.0] - 2025-09-06

### Added
- Initial codebase with React frontend, Node/Express backend, and SQLite persistence.

[Unreleased]: https://example.com/compare/v0.6.0...HEAD
[0.6.0]: https://example.com/compare/v0.4.0...v0.6.0
[0.4.0]: https://example.com/compare/v0.3.1...v0.4.0
[0.3.1]: https://example.com/compare/v0.3.0...v0.3.1
[0.3.0]: https://example.com/compare/v0.2.0...v0.3.0
[0.2.0]: https://example.com/compare/v0.1.0...v0.2.0
[0.1.0]: https://example.com/releases/v0.1.0
