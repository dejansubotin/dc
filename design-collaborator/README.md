# Image Collaborator

Image Collaborator is a real-time, web-based tool designed for seamless design review and visual feedback. Users can upload an image, share a unique link, and collaboratively leave comments on specific regions of the image. It's built to be fast, intuitive, and self-hostable.

![App Screenshot](https://i.imgur.com/example.png) <!-- Replace with an actual screenshot -->

## Key Features

-   **Real-Time Collaboration**: Changes and comments appear instantly for all participants via WebSockets.
-   **Region-Specific Commenting**: Draw a box on any part of the image to start a discussion thread.
-   **Clean UI**: Comments are neatly organized in a sidebar, preventing them from covering the design.
-   **Zoom & Pan**: Effortlessly navigate high-resolution images for detailed feedback.
-   **Shareable Sessions**: Invite collaborators easily with a unique URL.
-   **Password Protection**: Secure your feedback sessions with an optional password.
-   **Session History**: Logged-in users can quickly access their previous sessions.
-   **"Mark as Solved"**: Keep track of feedback that has been addressed.
-   **Email Notifications**: Collaborators receive an email when a new comment is posted.

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
├── nginx.conf.template     # Nginx config template for the frontend container
├── entrypoint.sh           # Entrypoint script for the frontend container
├── docker-compose.yml      # Docker Compose file for easy local setup
├── package.json            # Frontend dependencies and scripts
├── index.html              # Main HTML file
├── src/
│   ├── components/         # React components
│   ├── services/           # API and local storage services
│   ├── App.tsx             # Main application component
│   └── index.tsx           # React entrypoint
└── server/
    ├── Dockerfile          # Dockerfile for the backend Node.js server
    ├── package.json        # Backend dependencies and scripts
    ├── collaborator.db     # SQLite database file (created on run)
    ├── .env.example        # Example environment variables for the server
    ├── db.ts               # Database initialization and queries
    ├── email.ts            # Email sending logic
    └── index.ts            # Backend Express server and WebSocket logic
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
    docker-compose up --build
    ```

    This command will:
    -   Build the Docker images for both the frontend and backend services.
    -   Create and start the containers.
    -   Set up a network for the containers to communicate.

Once it's running, the application will be accessible at **http://localhost:8080**.
