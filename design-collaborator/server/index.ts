import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Fix: Import fileURLToPath to resolve __dirname in ES Modules.

import { initializeDb, getSessionById, saveSession, findOrCreateUser, findUserByEmail, getUserSessions, getInactiveSessions, getSessionsToDelete, deleteSessionsByIds, countSessions, countUsers, getActiveCollaboratorEmails, DB_PATH } from './db';
import fs from 'fs';
import { sendNewCommentEmail } from './email';
import type { Session, Annotation, Comment, User, HistoryEvent, Collaborator } from '../types';

dotenv.config();
initializeDb();

// Using CommonJS compilation; __dirname is available after build.

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
  cors: {
    origin: "*", // Configure this more securely for production
    methods: ["GET", "POST"]
  }
});

const PORT = process.env.PORT || 3000;
const RETENTION_DAYS = parseInt(process.env.RETENTION_DAYS || '20', 10);

app.use(cors());
// Fix: No overload matches this call. Removed path argument to match a different overload.
app.use(express.json({ limit: '25mb' })); // Increase limit for image data URLs

// --- WebSocket Logic ---
io.on('connection', (socket) => {
  console.log('A user connected:', socket.id);

  socket.on('join_session', (sessionId) => {
    socket.join(sessionId);
    console.log(`Socket ${socket.id} joined room ${sessionId}`);
  });

  socket.on('disconnect', () => {
    console.log('User disconnected:', socket.id);
  });
});

const enrichSession = (session: Session): Session => {
    const profiles: Collaborator[] = session.collaboratorIds
        .map(email => findUserByEmail(email))
        .filter((u): u is User => !!u)
        .map(u => ({ email: u.email, displayName: u.displayName }));
    return { ...session, collaboratorProfiles: profiles };
};

const broadcastSessionUpdate = (sessionId: string, session: Session) => {
    io.to(sessionId).emit('session_updated', enrichSession(session));
};

const appendHistory = (session: Session, event: HistoryEvent) => {
    const list = session.history || [];
    list.push(event);
    // Optional: keep last 200 events
    session.history = list.slice(-200);
};

// --- API Endpoints ---
const apiRouter = express.Router();

// User routes
apiRouter.post('/users', (req, res) => {
    const { email, displayName } = req.body;
    if (!email || !displayName) {
        return res.status(400).json({ error: 'Email and displayName are required' });
    }
    const user = findOrCreateUser(email, displayName);
    res.json(user);
});

apiRouter.get('/users/:email/sessions', (req, res) => {
    const { email } = req.params;
    const sessions = getUserSessions(email);
    res.json(sessions);
});


// Session routes
apiRouter.post('/sessions', (req, res) => {
    try {
        const { ownerEmail, imageDataUrl, sessionName, sessionDescription } = req.body;
        if (!ownerEmail || !imageDataUrl) {
            return res.status(400).json({ error: 'ownerEmail and imageDataUrl are required' });
        }
        // Ensure owner exists (defensive if FK is enforced)
        findOrCreateUser(ownerEmail, ownerEmail.split('@')[0] || ownerEmail);

        const now = Date.now();
        const newSession: Session = {
            id: `sid_${Date.now()}`,
            ownerId: ownerEmail,
            sessionName,
            sessionDescription,
            imageUrl: '',
            sessionThumbnailUrl: '',
            annotations: [],
            collaboratorIds: [ownerEmail],
            blockedEmails: [],
            createdAt: now,
            lastActivity: now as any,
            history: [],
        };
        // Persist image to disk under /data/uploads
        try {
          const m = /^data:(.*?);base64,(.*)$/.exec(imageDataUrl || '');
          if (!m) throw new Error('Invalid image data');
          const mime = m[1] || 'application/octet-stream';
          const b64 = m[2];
          const ext = mime.includes('png') ? 'png' : mime.includes('jpeg') || mime.includes('jpg') ? 'jpg' : mime.includes('webp') ? 'webp' : 'bin';
          const uploadsDir = '/data/uploads';
          try { fs.mkdirSync(uploadsDir, { recursive: true }); } catch {}
          const filename = `${newSession.id}.${ext}`;
          const filePath = `${uploadsDir}/${filename}`;
          fs.writeFileSync(filePath, Buffer.from(b64, 'base64'));
          newSession.imageUrl = `/uploads/${filename}`;
        } catch (e) {
          console.error('Failed to save image to disk:', e);
          return res.status(400).json({ error: 'Invalid image data' });
        }
        // Optional thumbnail
        try {
          const thumbDataUrl = (req.body.thumbnailDataUrl || '') as string;
          if (thumbDataUrl.startsWith('data:')) {
            const m2 = /^data:(.*?);base64,(.*)$/.exec(thumbDataUrl);
            if (m2) {
              const mime2 = m2[1] || 'image/jpeg';
              const b642 = m2[2];
              const ext2 = mime2.includes('png') ? 'png' : 'jpg';
              const thumbsDir = '/data/uploads/thumbs';
              try { fs.mkdirSync(thumbsDir, { recursive: true }); } catch {}
              const thumbFile = `${thumbsDir}/${newSession.id}.${ext2}`;
              fs.writeFileSync(thumbFile, Buffer.from(b642, 'base64'));
              newSession.sessionThumbnailUrl = `/uploads/thumbs/${newSession.id}.${ext2}`;
            }
          }
        } catch (e) {
          console.warn('Thumbnail generation failed or skipped:', e);
        }
        appendHistory(newSession, { id: Date.now(), type: 'session_created', actor: ownerEmail, message: `Session created${sessionName ? `: ${sessionName}` : ''}`, timestamp: Date.now() });
        saveSession(newSession);
        res.status(201).json(enrichSession(newSession));
    } catch (err: any) {
        console.error('Error creating session:', err?.message || err);
        res.status(500).send('Internal Server Error');
    }
});

apiRouter.get('/sessions/:id', (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    // Require membership (owner or collaborator) to read any session
    const caller = (req.header('x-user-email') || '').toLowerCase();
    const blocked = (session.blockedEmails || []).map(e=>e.toLowerCase());
    if (blocked.includes(caller)) return res.status(403).json({ error: 'Access revoked' });
    const isAllowed = caller && (caller === session.ownerId.toLowerCase() || session.collaboratorIds.map(e=>e.toLowerCase()).includes(caller));
    if (!isAllowed) return res.status(403).json({ error: 'Authentication required' });
    res.json(enrichSession(session));
});

apiRouter.post('/sessions/:id/collaborators', (req, res) => {
    const session = getSessionById(req.params.id);
    const { email, displayName, password } = req.body as { email: string; displayName: string; password?: string };
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.isDisabled) return res.status(403).json({ error: 'Session is disabled' });
    const emailLower = (email || '').toLowerCase();
    const isExisting = session.ownerId.toLowerCase() === emailLower || session.collaboratorIds.map(e => e.toLowerCase()).includes(emailLower);
    const blocked = (session.blockedEmails || []).map(e=>e.toLowerCase());
    if (blocked.includes(emailLower)) return res.status(403).json({ error: 'Access revoked' });
    if (session.password && !isExisting) {
        const pwd = (password || '').trim();
        if (session.password !== pwd) {
            return res.status(403).json({ error: 'Incorrect password' });
        }
    }
    findOrCreateUser(email, displayName);
    if (!session.collaboratorIds.map(e=>e.toLowerCase()).includes(emailLower)) {
        session.collaboratorIds.push(email);
        saveSession(session);
    }
    appendHistory(session, { id: Date.now(), type: 'user_joined', actor: email, message: `${displayName} joined`, timestamp: Date.now() });
    (session as any).lastActivity = Date.now();
    saveSession(session);
    broadcastSessionUpdate(session.id, session);
    res.json(enrichSession(session));
});

// Remove collaborator (owner only)
apiRouter.delete('/sessions/:id/collaborators/:email', (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const actor = (req.header('x-user-email') || '').toLowerCase();
    if (actor !== session.ownerId.toLowerCase()) return res.status(403).json({ error: 'Only owner can remove collaborators' });
    const target = decodeURIComponent(req.params.email || '').toLowerCase();
    if (!target || target === session.ownerId.toLowerCase()) return res.status(400).json({ error: 'Invalid target' });
    const before = session.collaboratorIds.length;
    session.collaboratorIds = session.collaboratorIds.filter(e => e.toLowerCase() !== target);
    session.blockedEmails = Array.from(new Set([...(session.blockedEmails || []), target]));
    appendHistory(session, { id: Date.now(), type: 'user_joined', actor: actor, message: `Member removed: ${target}` , timestamp: Date.now() });
    (session as any).lastActivity = Date.now();
    saveSession(session);
    broadcastSessionUpdate(session.id, session);
    res.json(enrichSession(session));
});

apiRouter.put('/sessions/:id/password', (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    session.password = req.body.password || undefined;
    appendHistory(session, { id: Date.now(), type: session.password ? 'password_set' : 'password_removed', actor: req.body.actor || undefined, message: session.password ? 'Password set' : 'Password removed', timestamp: Date.now() });
    (session as any).lastActivity = Date.now();
    saveSession(session);
    broadcastSessionUpdate(session.id, session);
    res.json(enrichSession(session));
});

// Annotation and Comment routes
apiRouter.post('/sessions/:id/annotations', (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.isDisabled) return res.status(403).json({ error: 'Session is disabled' });
    const { annotation } = req.body;
    session.annotations.push(annotation);
    appendHistory(session, { id: Date.now(), type: 'annotation_added', actor: req.body.actor || undefined, message: `Annotation ${annotation.id} added`, timestamp: Date.now() });
    (session as any).lastActivity = Date.now();
    saveSession(session);
    broadcastSessionUpdate(session.id, session);
    res.status(201).json(enrichSession(session));
});

apiRouter.delete('/sessions/:id/annotations/:annoId', (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.isDisabled) return res.status(403).json({ error: 'Session is disabled' });
    session.annotations = session.annotations.filter(a => a.id !== parseInt(req.params.annoId));
    appendHistory(session, { id: Date.now(), type: 'annotation_deleted', actor: req.body.actor || undefined, message: `Annotation ${req.params.annoId} deleted`, timestamp: Date.now() });
    (session as any).lastActivity = Date.now();
    saveSession(session);
    broadcastSessionUpdate(session.id, session);
    res.json(enrichSession(session));
});

apiRouter.put('/sessions/:id/annotations/:annoId/solve', (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.isDisabled) return res.status(403).json({ error: 'Session is disabled' });
    const { isSolved } = req.body;
    session.annotations = session.annotations.map(a => 
        a.id === parseInt(req.params.annoId) ? { ...a, isSolved } : a
    );
    appendHistory(session, { id: Date.now(), type: isSolved ? 'annotation_solved' : 'annotation_reopened', actor: req.body.actor || undefined, message: `Annotation ${req.params.annoId} ${isSolved ? 'solved' : 'reopened'}`, timestamp: Date.now() });
    (session as any).lastActivity = Date.now();
    saveSession(session);
    broadcastSessionUpdate(session.id, session);
    res.json(enrichSession(session));
});

apiRouter.post('/sessions/:id/annotations/:annoId/comments', async (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.isDisabled) return res.status(403).json({ error: 'Session is disabled' });
    
    const { userEmail, text, parentId } = req.body;
    const user = findUserByEmail(userEmail);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newComment: Comment = {
        id: Date.now(),
        userId: user.email,
        author: user.displayName,
        text,
        timestamp: Date.now(),
        parentId: typeof parentId === 'number' ? parentId : undefined,
        likes: [],
    };

    let annotationFound = false;
    session.annotations = session.annotations.map(a => {
        if (a.id === parseInt(req.params.annoId)) {
            a.comments.push(newComment);
            annotationFound = true;
        }
        return a;
    });

    if (!annotationFound) return res.status(404).json({ error: 'Annotation not found' });

    appendHistory(session, { id: Date.now(), type: 'comment_added', actor: user.email, message: parentId ? `${user.displayName} replied to comment ${parentId}` : `${user.displayName} commented on ${req.params.annoId}`, timestamp: Date.now() });
    (session as any).lastActivity = Date.now();
    saveSession(session);
    broadcastSessionUpdate(session.id, session);

    // Send email notifications
    const recipients = session.collaboratorIds
        .filter(email => email !== user.email) // Don't send to the commenter
        .map(email => findUserByEmail(email))
        .filter((u): u is User => !!u);
        
    await sendNewCommentEmail(session, newComment, recipients);
    
    res.status(201).json(enrichSession(session));
});

// Like/unlike a comment
apiRouter.put('/sessions/:id/annotations/:annoId/comments/:commentId/like', (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.isDisabled) return res.status(403).json({ error: 'Session is disabled' });
    const annoId = parseInt(req.params.annoId);
    const commentId = parseInt(req.params.commentId);
    const { userEmail, like } = req.body as { userEmail: string; like: boolean };
    if (!userEmail) return res.status(400).json({ error: 'userEmail is required' });

    let found = false;
    session.annotations = session.annotations.map(a => {
        if (a.id !== annoId) return a;
        a.comments = a.comments.map(c => {
            if (c.id !== commentId) return c;
            found = true;
            const set = new Set(c.likes || []);
            if (like) set.add(userEmail); else set.delete(userEmail);
            return { ...c, likes: Array.from(set) };
        });
        return a;
    });
    if (!found) return res.status(404).json({ error: 'Comment not found' });

    appendHistory(session, { id: Date.now(), type: like ? 'comment_liked' : 'comment_unliked', actor: userEmail, message: `${userEmail} ${like ? 'liked' : 'unliked'} comment ${commentId}`, timestamp: Date.now() });
    (session as any).lastActivity = Date.now();
    saveSession(session);
    broadcastSessionUpdate(session.id, session);
    res.json(enrichSession(session));
});

// Use the API router
app.use('/api', apiRouter);

// Serve uploaded images from /data/uploads
app.use('/uploads', express.static('/data/uploads'));

// --- Monitoring Dashboard (password: hardcoded) ---
const MONITOR_PASSWORD = 'bluewheel101!';
const MONITOR_COOKIE = 'monitor_auth';

function monitorAuthorized(req: express.Request): boolean {
  try {
    const cookie = (req.headers.cookie || '').split(';').map(s=>s.trim()).find(s => s.startsWith(MONITOR_COOKIE+'='));
    return cookie?.endsWith('1') || false;
  } catch { return false; }
}

app.get(['/monitor', '/'], async (req, res, next) => {
  // Only intercept base '/' if requesting specifically monitor (by query) — otherwise continue to SPA
  if (req.path === '/' && req.query.monitor !== '1') return next();
  if (!monitorAuthorized(req)) {
    return res.status(200).send(`<!DOCTYPE html><html><head><meta charset="utf-8"><title>Monitor Login</title>
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0f172a;color:#e2e8f0;display:flex;align-items:center;justify-content:center;height:100vh;margin:0} .card{background:#111827;border:1px solid #334155;border-radius:12px;padding:24px;max-width:360px;width:100%;box-shadow:0 10px 30px rgba(0,0,0,.4)} input{width:100%;padding:10px;border:1px solid #475569;background:#0b1220;color:#e2e8f0;border-radius:8px} button{margin-top:12px;width:100%;padding:10px;background:#06b6d4;color:white;border:none;border-radius:8px;cursor:pointer} .muted{color:#94a3b8;font-size:12px;margin-top:8px;text-align:center}</style></head>
    <body><div class="card"><h2>Monitoring Dashboard</h2><form method="POST" action="/monitor"><input type="password" name="password" placeholder="Password" autofocus /><button type="submit">Enter</button><div class="muted">Access is restricted.</div></form></div></body></html>`);
  }
  try {
    const totalSessions = countSessions();
    const totalProfiles = countUsers();
    const fiveDaysAgo = Date.now() - 5*24*60*60*1000;
    const activeProfiles = getActiveCollaboratorEmails(fiveDaysAgo).length;
    // DB size
    const dbSize = (() => { try { return fs.statSync(DB_PATH).size; } catch { return 0; } })();
    // Images and thumbnails
    const imgDir = '/data/uploads';
    const thumbsDir = '/data/uploads/thumbs';
    function dirStats(dir: string){
      try { const files = fs.readdirSync(dir, { withFileTypes: true }).filter(f=>f.isFile());
        let size=0; for (const f of files) { try { size += fs.statSync(dir+'/'+f.name).size; } catch{} }
        return { count: files.length, size };
      } catch { return { count:0, size:0 }; }
    }
    const img = dirStats(imgDir);
    const thumbs = dirStats(thumbsDir);
    // Simple network totals from /proc/net/dev (container scope)
    let netRx = 0, netTx = 0, iface='';
    try {
      const data = fs.readFileSync('/proc/net/dev','utf8').split('\n').slice(2);
      for (const line of data) {
        const parts = line.trim().split(/[:\s]+/).filter(Boolean);
        if (parts.length >= 17) {
          const ifn = parts[0];
          if (ifn === 'lo' || !ifn) continue;
          const rx = parseInt(parts[1]||'0',10); const tx = parseInt(parts[9]||'0',10);
          netRx += rx; netTx += tx; iface = ifn;
        }
      }
    } catch {}
    function fmtBytes(n:number){const u=['B','KB','MB','GB','TB'];let i=0;let v=n;while(v>=1024&&i<u.length-1){v/=1024;i++}return v.toFixed(1)+' '+u[i]}
    const html = `<!DOCTYPE html><html><head><meta charset='utf-8'><title>Monitor</title><meta name='viewport' content='width=device-width, initial-scale=1' /><style>body{font-family:system-ui,Segoe UI,Roboto,Helvetica,Arial,sans-serif;background:#0f172a;color:#e2e8f0;margin:0;padding:24px} .grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(220px,1fr));gap:16px} .card{background:#111827;border:1px solid #334155;border-radius:12px;padding:16px} .title{font-size:18px;margin:0 0 16px;color:#67e8f9} .k{color:#94a3b8} .v{font-weight:700;color:#e2e8f0} .bar{margin:16px 0 8px;color:#94a3b8;font-size:12px}</style></head><body>
    <h1 style='margin:0 0 16px'>Monitoring Dashboard</h1>
    <div class='grid'>
      <div class='card'><div class='title'>Sessions</div><div><span class='k'>Total:</span> <span class='v'>${totalSessions}</span></div></div>
      <div class='card'><div class='title'>Database</div><div><span class='k'>Size:</span> <span class='v'>${fmtBytes(dbSize)}</span></div><div><span class='k'>Path:</span> ${DB_PATH}</div></div>
      <div class='card'><div class='title'>Images</div><div><span class='k'>Count:</span> <span class='v'>${img.count}</span></div><div><span class='k'>Total size:</span> <span class='v'>${fmtBytes(img.size)}</span></div></div>
      <div class='card'><div class='title'>Thumbnails</div><div><span class='k'>Count:</span> <span class='v'>${thumbs.count}</span></div><div><span class='k'>Total size:</span> <span class='v'>${fmtBytes(thumbs.size)}</span></div></div>
      <div class='card'><div class='title'>Profiles</div><div><span class='k'>Total:</span> <span class='v'>${totalProfiles}</span></div><div><span class='k'>Active (5d):</span> <span class='v'>${activeProfiles}</span></div></div>
      <div class='card'><div class='title'>Network (${iface||'container'})</div><div><span class='k'>RX:</span> <span class='v'>${fmtBytes(netRx)}</span></div><div><span class='k'>TX:</span> <span class='v'>${fmtBytes(netTx)}</span></div></div>
    </div>
    </body></html>`;
    res.status(200).send(html);
  } catch (e) {
    res.status(500).send('Monitor error');
  }
});

app.post('/monitor', express.urlencoded({ extended: true }), (req, res) => {
  const pwd = (req.body?.password || '') as string;
  if (pwd === MONITOR_PASSWORD) {
    res.setHeader('Set-Cookie', `${MONITOR_COOKIE}=1; HttpOnly; SameSite=Lax; Path=/; Max-Age=${60*60}`);
    return res.redirect('/monitor');
  }
  res.status(401).send('<html><body style="background:#0f172a;color:#e2e8f0;font-family:system-ui"><p>Invalid password.</p><a style="color:#67e8f9" href="/monitor">Try again</a></body></html>');
});
// Disable a session (owner only) — schedules deletion in 30 minutes
apiRouter.post('/sessions/:id/disable', (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const actor = (req.header('x-user-email') || '').toLowerCase();
    if (actor !== session.ownerId.toLowerCase()) return res.status(403).json({ error: 'Only owner can disable session' });
    const now = Date.now();
    session.isDisabled = true;
    session.deleteAt = now + 30 * 60 * 1000;
    appendHistory(session, { id: now, type: 'annotation_deleted', actor, message: 'Session disabled (scheduled for deletion)', timestamp: now });
    (session as any).lastActivity = now;
    saveSession(session);
    broadcastSessionUpdate(session.id, session);
    res.json(enrichSession(session));
});

// Restore a disabled session (owner only)
apiRouter.post('/sessions/:id/restore', (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const actor = (req.header('x-user-email') || '').toLowerCase();
    if (actor !== session.ownerId.toLowerCase()) return res.status(403).json({ error: 'Only owner can restore session' });
    session.isDisabled = false;
    session.deleteAt = undefined;
    const now = Date.now();
    appendHistory(session, { id: now, type: 'annotation_added', actor, message: 'Session restored (deletion cancelled)', timestamp: now });
    (session as any).lastActivity = now;
    saveSession(session);
    broadcastSessionUpdate(session.id, session);
    res.json(enrichSession(session));
});
// Health
app.get('/api/health', (_req, res) => {
    res.json({ ok: true });
});

// Serve frontend
// Fix: No overload matches this call. Removed path argument to match a different overload.
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
  const intervalMs = 24 * 60 * 60 * 1000; // daily
  setInterval(() => {
    try {
      const threshold = Date.now() - (RETENTION_DAYS * 24 * 60 * 60 * 1000);
      const stale = getInactiveSessions(threshold);
      if (stale.length) {
        for (const s of stale) {
          if (s.imageUrl && s.imageUrl.startsWith('/uploads/')) {
            const diskPath = '/data' + s.imageUrl;
            try { fs.unlinkSync(diskPath); } catch {}
          }
          const thumb = (s as any).sessionThumbnailUrl as string | undefined;
          if (thumb && thumb.startsWith('/uploads/')) {
            const tpath = '/data' + thumb;
            try { fs.unlinkSync(tpath); } catch {}
          }
        }
        const removed = deleteSessionsByIds(stale.map(s => s.id));
        if (removed > 0) console.log(`Cleaned up ${removed} inactive session(s).`);
      }
    } catch (e) {
      console.warn('Cleanup task failed:', e);
    }
  }, intervalMs);
  // Frequent task for scheduled deletions (every minute)
  setInterval(() => {
    try {
      const due = getSessionsToDelete(Date.now());
      if (due.length) {
        for (const s of due) {
          if (s.imageUrl && s.imageUrl.startsWith('/uploads/')) {
            const p = '/data' + s.imageUrl; try { fs.unlinkSync(p); } catch {}
          }
          const t = (s as any).sessionThumbnailUrl; if (t && t.startsWith('/uploads/')) { const p2 = '/data' + t; try { fs.unlinkSync(p2); } catch {} }
        }
        const removed = deleteSessionsByIds(due.map((s: { id: string }) => s.id));
        if (removed > 0) console.log(`Deleted ${removed} session(s) scheduled for deletion.`);
      }
    } catch (e) { console.warn('Scheduled deletion cleanup failed:', e); }
  }, 60 * 1000);
});
