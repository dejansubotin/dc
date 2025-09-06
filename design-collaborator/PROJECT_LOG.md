# Project Log: Design/Image Collaborator

This document summarizes what the app does, how it’s structured, and how to run and deploy it.

## Overview

A real‑time, web‑based tool for design review and visual feedback. Users upload an image, share a link, and annotate regions with comments. Collaboration is live via WebSockets. The app is self‑hostable and ships with a Docker Compose setup (works with Coolify).

## Key Features

- Real‑time updates via Socket.IO
- Region‑specific annotations with threaded comments (one‑level replies)
- Session sharing with optional password
- Session history log (who did what, when)
- Email notifications on new comments (optional SMTP)
- Session list for returning users

## Architecture

- Frontend: React (TypeScript) + Vite, served by Nginx in production
- Backend: Node.js (TypeScript) + Express + Socket.IO
- Storage: SQLite (better‑sqlite3) persisted on a Docker volume
- Reverse proxy: Nginx serves the SPA and proxies `/api` and `/socket.io` to the backend

## Code Structure (top‑level)

- `App.tsx` — main React app
- `components/` — UI components (uploader, viewer, comments, modals, etc.)
- `services/` — API client and utilities
- `types.ts` — shared TypeScript types across frontend and backend
- `server/` — backend (Express, Socket.IO, DB access)
- `Dockerfile` — frontend build (Vite) and runtime (Nginx)
- `server/Dockerfile` — backend multi‑stage build
- `nginx.conf` — Nginx config for SPA + proxy
- `docker-compose.yml` — orchestrates frontend + backend

## Data Model (types.ts)

- `User`: `{ email, displayName }`
- `Comment`: `{ id, userId, author, text, timestamp, parentId? }` (parentId for replies)
- `Annotation`: `{ id, x, y, width, height, comments: Comment[], isSolved }`
- `Session`: `{ id, ownerId, imageUrl, annotations, password?, collaboratorIds, createdAt, history? }`
- `HistoryEvent`: `{ id, type, actor?, message, timestamp }`

Notes:
- `Session.imageUrl` stores a data URL (base64) in the current implementation.
- `Session.history` tracks activity for the “History” modal and is persisted in SQLite.

## API (high‑level)

Base path: `/api`

- `POST /users` — create/find user: `{ email, displayName }`
- `GET /users/:email/sessions` — recent sessions for a user
- `POST /sessions` — create session: `{ ownerEmail, imageDataUrl }`
- `GET /sessions/:id` — get session
- `POST /sessions/:id/collaborators` — join session: `{ email, displayName, password? }`
- `PUT /sessions/:id/password` — set/remove password: `{ password? }`
- `POST /sessions/:id/annotations` — add annotation: `{ annotation }`
- `DELETE /sessions/:id/annotations/:annoId` — delete annotation
- `PUT /sessions/:id/annotations/:annoId/solve` — toggle solved: `{ isSolved }`
- `POST /sessions/:id/annotations/:annoId/comments` — add comment or reply: `{ userEmail, text, parentId? }`
- `GET /health` — simple health check `{ ok: true }`

WebSockets (Socket.IO):
- `join_session` — client joins a room by `sessionId`
- `session_updated` — broadcast updated `Session` payload to room

## Deployment

- Container orchestration: `docker-compose.yml`
  - `frontend` (Nginx) exposes HTTP on container port 80; optional host mapping via `PUBLIC_PORT`
  - `server` (Node/Express) exposes port 3000 (internal only)
  - Named volume `app-data` mounted at `/data` in `server` for SQLite persistence
- Nginx (`nginx.conf`):
  - Serves static assets and SPA fallback
  - Proxies `/api` → `server:3000` (prefix preserved)
  - Proxies `/socket.io` for WebSocket upgrades
  - `client_max_body_size 25m;` for image uploads
- Backend limits: `express.json({ limit: '25mb' })`

### Environment Variables

- Frontend/Coolify (Compose substitutions):
  - `PUBLIC_PORT` — host port to publish frontend (if not using domain routing)
  - `APP_BASE_URL` — public URL used in emails (e.g., `https://collab.example.com`)
- Server:
  - `APP_BASE_URL` — same as above
  - `DB_PATH` — optional override (default `/data/collaborator.db`)
  - SMTP (optional): `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`

### Coolify Notes

- App type: Docker Compose
- Compose file path: `docker-compose.yml`
- Attach domain to the `frontend` service (container port 80) and enable HTTPS
- If using domain routing only, you can remove host `ports` mapping and rely on Coolify’s proxy

## Local Development

- Backend:
  - `cd server && npm install && npm run dev` (http://localhost:3000)
- Frontend:
  - `npm install && npm run dev` (http://localhost:5173; proxies `/api` to 3000)
- Docker (prod‑like):
  - `cp docker.env.example .env`
  - `docker compose up --build`
  - Frontend at `http://localhost:${PUBLIC_PORT:-8081}`

## Email Notifications

- If SMTP envs are unset, emails are skipped with a log message. Set SMTP vars to enable notifications.

## Security & Limits

- Session password is a basic shared secret; not a user auth system.
- Increase Nginx/body limits if you plan larger images.

## Future Ideas

- File storage instead of base64 (e.g., object storage) for large images
- Multi‑level threaded comments and comment edit/delete history
- Fine‑grained access control per session

