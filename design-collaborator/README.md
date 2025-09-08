# Image Collaborator

Image Collaborator is a real-time, web-based tool designed for seamless design review and visual feedback. Users can upload an image, share a unique link, and collaboratively leave comments on specific regions of the image. It's built to be fast, intuitive, and self-hostable.

![App Screenshot](https://i.imgur.com/example.png) <!-- Replace with an actual screenshot -->

## Key Features

-   **Real-Time Collaboration**: Changes and comments appear instantly for all participants via WebSockets.
-   **Annotations & Threads**: Draw regions, have multi-level threaded discussions, collapse threads; per-user colors and likes.
-   **Multi-Image Sessions**: Upload up to 10 images per session; navigate via a thumbnail strip and horizontal slides. Pan with Space + drag; zoom with the mouse wheel per image.
-   **Shareable Sessions**: Invite collaborators with a unique URL; strict membership required to view.
-   **Password Protection**: Protect sessions with an optional password; existing collaborators don’t need to re-enter it.
-   **Members Management**: See current members; owners can remove (block) members.
-   **Disable & Restore**: Owners can disable a session (read-only) and schedule deletion in 30 minutes with a visible countdown; restore within the window.
-   **History & My Sessions**: View activity timeline; easily open past sessions. Sessions have names and optional descriptions.
-   **Disk Storage + Thumbnails**: Images stored on disk and served via `/uploads`; thumbnails speed up lists.
-   **Monitoring Dashboard**: Quick stats at `/monitor` (password protected).
-   **Email Notifications**: Optional SMTP email on new comments.

## Tech Stack

The project is a monorepo containing a React frontend and a Node.js backend.

| Area      | Technology                                                                                                  |
| :-------- | :---------------------------------------------------------------------------------------------------------- |
| **Frontend**  | `React (TypeScript)`, `Tailwind CSS`, `Vite`, `Socket.IO Client`                                            |
| **Backend**   | `Node.js (TypeScript)`, `Express.js`, `Socket.IO`, `SQLite (better-sqlite3)`, `Nodemailer`                |
| **Deployment**| `Docker`, `Docker Compose`, `Nginx` (as a reverse proxy and static file server for the frontend) |

## Project Structure

```
.
├── Dockerfile              # Dockerfile for the frontend React app
├── nginx.conf              # Nginx config for the frontend container (SPA + proxy /api, /monitor, /uploads)
├── docker-compose.yml      # Docker Compose file for easy local setup
├── package.json            # Frontend dependencies and scripts
├── index.html              # Main HTML file
├── components/             # React components
├── services/               # API and local storage services
├── App.tsx                 # Main application component
├── index.tsx               # React entrypoint
└── server/
    ├── Dockerfile          # Dockerfile for the backend Node.js server
    ├── package.json        # Backend dependencies and scripts
    ├── collaborator.db     # SQLite database file (created on run; mounted at /data in Docker)
    ├── .env.example        # Example environment variables for the server
    ├── db.ts               # Database initialization and queries
    ├── email.ts            # Email sending logic
    └── index.ts            # Backend Express server and WebSocket logic

Uploads and thumbnails are stored under `/data/uploads` and `/data/uploads/thumbs` in the server container and served at `/uploads/...`.
```

---

## Getting Started: Local Development

Follow these steps to run the frontend and backend servers separately on your local machine.

### Prerequisites

-   Node.js (v18 or newer)
-   npm

### 1. Backend Setup

First, get the server running.

```bash
# 1. Navigate to the server directory
cd server

# 2. Install dependencies
npm install

# 3. Create an environment file from the example
cp .env.example .env
```

**4. Configure Email:**
Open the newly created `server/.env` file and fill in your SMTP credentials. This is required for sending comment notifications. If you don't have an SMTP server, you can use a service like [Mailtrap](https://mailtrap.io/) for development.

```ini
# server/.env
SMTP_HOST=smtp.example.com
SMTP_PORT=587
SMTP_USER=your_username
SMTP_PASS=your_password
SMTP_FROM_EMAIL="Collaborator <no-reply@example.com>"
APP_BASE_URL=http://localhost:5173 # Frontend dev server URL
```

**5. Start the Backend Server:**

```bash
# This will start the server on http://localhost:3000
npm run dev
```

### 2. Frontend Setup

Now, start the React development server in a new terminal window.

```bash
# 1. Navigate to the project root (if you are in the server/ directory, run `cd ..`)
# 2. Install dependencies
npm install

# 3. Start the frontend dev server
npm run dev
```

The frontend will now be running and accessible at **http://localhost:5173** (or another port if 5173 is busy). The Vite dev server is pre-configured to proxy API requests to your backend at `http://localhost:3000`.

---

## Using Multi-Image Sessions

- On the home screen, drag & drop multiple image files or select several via the file picker. Up to 10 images are accepted; extra files are ignored.
- After creating the session, use the thumbnail bar at the top to jump to an image or horizontally scroll between slides.
- Pan by holding Space and dragging with the left mouse button; zoom with the mouse wheel—both apply per image.
- Annotations and their comment threads are specific to the image where they were created.

Note: The backend JSON body size limit is 25 MB by default. Large images may exceed this when uploading many at once; increase limits in Express and Nginx if needed.

## Getting Started: Docker (Production-like)

This is the recommended way to run the entire application stack locally. It mirrors a production deployment.

### Prerequisites

-   Docker
-   Docker Compose

### Steps

1.  **Configure Backend Environment**:
    Navigate to the `server/` directory, create a `.env` file from the example (`cp .env.example .env`), and fill in your SMTP details as described in the "Local Development" section above.

2.  **Configure Docker Compose Environment**:
    In the project's **root** directory, create a `.env` file from the `docker.env.example` file.

    ```bash
    # In the root directory of the project
    cp docker.env.example .env
    ```

    This file tells the frontend container where to find the backend. The default values should work for a standard local Docker setup.

3.  **Build and Run**:
    From the root directory, run the following command:

    ```bash
    docker compose up --build
    ```

    This command will:
    -   Build the Docker images for both the frontend and backend services.
    -   Create and start the containers.
    -   Set up a network for the containers to communicate.

Once it's running, the application will be accessible at **http://localhost:8081** (or your mapped port).

## Ops & Admin

-   **Monitoring**: Visit `/monitor` (password: `bluewheel101!`) for sessions, DB size, images/thumbnails, profiles and container network totals.
-   **Retention**: Sessions inactive for `RETENTION_DAYS` (default 20) are deleted daily. Disabled sessions are removed 30 minutes after disable.
-   **Env Vars** (server):
    - `APP_BASE_URL` – public URL used in emails
    - `DB_PATH` – database path (default `/data/collaborator.db`)
    - `RETENTION_DAYS` – inactivity retention window (default `20`)
    - SMTP: `SMTP_HOST`, `SMTP_PORT`, `SMTP_USER`, `SMTP_PASS`, `SMTP_FROM_EMAIL`

## Identity & Access

- Identity is stored in the browser (localStorage) and auto-filled in join dialogs; only password is typed if the session is protected.
- Owners can remove collaborators; removed users are blocked from viewing or rejoining (even with the password).
- Click the header title to go home; favicon is provided via `favicon.ico`.

## API Notes

- Create session (single): `POST /api/sessions` with `{ ownerEmail, imageDataUrl, thumbnailDataUrl?, sessionName?, sessionDescription? }`.
- Create session (multi): `POST /api/sessions` with `{ ownerEmail, images: [{ imageDataUrl, thumbnailDataUrl? }, ...], sessionName?, sessionDescription? }` (max 10 images). On success, the response `Session` may include `images?: { url, thumbnailUrl? }[]`.
