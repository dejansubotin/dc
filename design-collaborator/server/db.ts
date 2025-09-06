import Database from 'better-sqlite3';
import type { Session, Annotation, Comment, User } from '../types';

const db = new Database('collaborator.db');

// --- Schema Initialization ---
export function initializeDb() {
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      email TEXT PRIMARY KEY,
      displayName TEXT NOT NULL
    );
  `);
  
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      id TEXT PRIMARY KEY,
      ownerId TEXT NOT NULL,
      imageUrl TEXT NOT NULL,
      annotations TEXT NOT NULL, -- JSON blob
      password TEXT,
      collaboratorIds TEXT NOT NULL, -- JSON blob
      createdAt INTEGER NOT NULL,
      history TEXT, -- JSON blob of events
      FOREIGN KEY (ownerId) REFERENCES users(email)
    );
  `);
  // Best-effort migration for existing DBs: add history column if missing
  try {
    const columns = db.prepare(`PRAGMA table_info(sessions)`).all() as { name: string }[];
    if (!columns.find(c => c.name === 'history')) {
      db.prepare(`ALTER TABLE sessions ADD COLUMN history TEXT`).run();
    }
  } catch (e) {
    // ignore
  }
  console.log("Database initialized successfully.");
}

// --- User Queries ---
export const findOrCreateUser = (email: string, displayName: string): User => {
    let user = db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
    if (!user) {
        db.prepare('INSERT INTO users (email, displayName) VALUES (?, ?)').run(email, displayName);
        user = { email, displayName };
    } else if (user.displayName !== displayName) {
        // Update display name if it has changed
        db.prepare('UPDATE users SET displayName = ? WHERE email = ?').run(displayName, email);
        user.displayName = displayName;
    }
    return user;
};

export const findUserByEmail = (email: string): User | undefined => {
    return db.prepare('SELECT * FROM users WHERE email = ?').get(email) as User | undefined;
}

// --- Session Queries ---
const rowToSession = (row: any): Session | null => {
    if (!row) return null;
    return {
        ...row,
        annotations: JSON.parse(row.annotations),
        collaboratorIds: JSON.parse(row.collaboratorIds),
        history: row.history ? JSON.parse(row.history) : [],
    };
};

export const getSessionById = (id: string): Session | null => {
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    return rowToSession(row);
};

export const getUserSessions = (email: string): Session[] => {
    const rows = db.prepare("SELECT * FROM sessions WHERE json_each.value = ?").all(email)
    const sessions: Session[] = [];
    // This is a naive way to find sessions for a user.
    // A better approach would be a dedicated collaborators table for larger scale.
    const allSessions = db.prepare('SELECT * FROM sessions ORDER BY createdAt DESC').all();
    for (const row of allSessions) {
        const session = rowToSession(row);
        if (session && session.collaboratorIds.includes(email)) {
            sessions.push(session);
        }
    }
    return sessions.slice(0, 10);
};

export const saveSession = (session: Session) => {
    const existing = db.prepare('SELECT id FROM sessions WHERE id = ?').get(session.id);
    const annotationsJson = JSON.stringify(session.annotations);
    const collaboratorIdsJson = JSON.stringify(session.collaboratorIds);
    const historyJson = JSON.stringify(session.history || []);
    
    if (existing) {
        db.prepare(`
            UPDATE sessions
            SET ownerId = ?, imageUrl = ?, annotations = ?, password = ?, collaboratorIds = ?, createdAt = ?, history = ?
            WHERE id = ?
        `).run(session.ownerId, session.imageUrl, annotationsJson, session.password, collaboratorIdsJson, session.createdAt, historyJson, session.id);
    } else {
        db.prepare(`
            INSERT INTO sessions (id, ownerId, imageUrl, annotations, password, collaboratorIds, createdAt, history)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `).run(session.id, session.ownerId, session.imageUrl, annotationsJson, session.password, collaboratorIdsJson, session.createdAt, historyJson);
    }
};
