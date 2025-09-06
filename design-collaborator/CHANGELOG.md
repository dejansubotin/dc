# Changelog

All notable changes to this project will be documented in this file.

The format is based on Keep a Changelog and this project adheres to Semantic Versioning.

## [Unreleased]

- TBD

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

[Unreleased]: https://example.com/compare/v0.4.0...HEAD
[0.4.0]: https://example.com/compare/v0.3.1...v0.4.0
[0.3.1]: https://example.com/compare/v0.3.0...v0.3.1
[0.3.0]: https://example.com/compare/v0.2.0...v0.3.0
[0.2.0]: https://example.com/compare/v0.1.0...v0.2.0
[0.1.0]: https://example.com/releases/v0.1.0
