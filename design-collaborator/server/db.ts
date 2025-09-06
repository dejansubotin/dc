import Database from 'better-sqlite3';
import path from 'path';
import type { Session, Annotation, Comment, User } from '../types';

export const DB_PATH = process.env.DB_PATH || '/data/collaborator.db';
const db = new Database(DB_PATH);

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
      sessionName TEXT,
      sessionDescription TEXT,
      imageUrl TEXT NOT NULL,
      sessionThumbnailUrl TEXT,
      annotations TEXT NOT NULL, -- JSON blob
      password TEXT,
      collaboratorIds TEXT NOT NULL, -- JSON blob
      createdAt INTEGER NOT NULL,
      lastActivity INTEGER NOT NULL,
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
    if (!columns.find(c => c.name === 'sessionName')) {
      db.prepare(`ALTER TABLE sessions ADD COLUMN sessionName TEXT`).run();
    }
    if (!columns.find(c => c.name === 'sessionDescription')) {
      db.prepare(`ALTER TABLE sessions ADD COLUMN sessionDescription TEXT`).run();
    }
    if (!columns.find(c => c.name === 'sessionThumbnailUrl')) {
      db.prepare(`ALTER TABLE sessions ADD COLUMN sessionThumbnailUrl TEXT`).run();
    }
    if (!columns.find(c => c.name === 'lastActivity')) {
      db.prepare(`ALTER TABLE sessions ADD COLUMN lastActivity INTEGER`).run();
      // Backfill lastActivity with createdAt for existing rows
      db.prepare(`UPDATE sessions SET lastActivity = COALESCE(lastActivity, createdAt)`).run();
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
        sessionName: row.sessionName,
        sessionDescription: row.sessionDescription,
        sessionThumbnailUrl: row.sessionThumbnailUrl,
        annotations: JSON.parse(row.annotations),
        collaboratorIds: JSON.parse(row.collaboratorIds),
        lastActivity: row.lastActivity ?? row.createdAt,
        history: row.history ? JSON.parse(row.history) : [],
    };
};

export const getSessionById = (id: string): Session | null => {
    const row = db.prepare('SELECT * FROM sessions WHERE id = ?').get(id);
    return rowToSession(row);
};

export const getUserSessions = (email: string): Session[] => {
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
            SET ownerId = ?, sessionName = ?, sessionDescription = ?, imageUrl = ?, sessionThumbnailUrl = ?, annotations = ?, password = ?, collaboratorIds = ?, createdAt = ?, lastActivity = ?, history = ?
            WHERE id = ?
        `).run(session.ownerId, session.sessionName, session.sessionDescription, session.imageUrl, session.sessionThumbnailUrl, annotationsJson, session.password, collaboratorIdsJson, session.createdAt, (session as any).lastActivity ?? session.createdAt, historyJson, session.id);
    } else {
        db.prepare(`
            INSERT INTO sessions (id, ownerId, sessionName, sessionDescription, imageUrl, sessionThumbnailUrl, annotations, password, collaboratorIds, createdAt, lastActivity, history)
            VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `).run(session.id, session.ownerId, session.sessionName, session.sessionDescription, session.imageUrl, session.sessionThumbnailUrl, annotationsJson, session.password, collaboratorIdsJson, session.createdAt, (session as any).lastActivity ?? session.createdAt, historyJson);
    }
};

export function countSessions(): number {
  const row = db.prepare('SELECT COUNT(*) as c FROM sessions').get() as { c: number };
  return row?.c || 0;
}

export function countUsers(): number {
  const row = db.prepare('SELECT COUNT(*) as c FROM users').get() as { c: number };
  return row?.c || 0;
}

export function getActiveCollaboratorEmails(sinceMs: number): string[] {
  const rows = db.prepare('SELECT ownerId, collaboratorIds FROM sessions WHERE lastActivity >= ?').all(sinceMs) as { ownerId: string; collaboratorIds: string }[];
  const emails = new Set<string>();
  for (const r of rows) {
    if (r.ownerId) emails.add(r.ownerId);
    try {
      const collabs: string[] = JSON.parse(r.collaboratorIds);
      for (const e of collabs) if (e) emails.add(e);
    } catch {}
  }
  return Array.from(emails);
}

export function getInactiveSessions(thresholdMs: number): { id: string; imageUrl: string; sessionThumbnailUrl?: string }[] {
  const rows = db.prepare(`SELECT id, imageUrl, sessionThumbnailUrl FROM sessions WHERE lastActivity < ?`).all(thresholdMs) as { id: string; imageUrl: string; sessionThumbnailUrl?: string }[];
  return rows;
}

export function deleteSessionsByIds(ids: string[]): number {
  if (!ids.length) return 0;
  const placeholders = ids.map(() => '?').join(',');
  const stmt = db.prepare(`DELETE FROM sessions WHERE id IN (${placeholders})`);
  const info = stmt.run(...ids);
  try { db.exec('VACUUM'); } catch {}
  return info.changes || 0;
}
