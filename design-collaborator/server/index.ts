import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Fix: Import fileURLToPath to resolve __dirname in ES Modules.

import { initializeDb, getSessionById, saveSession, findOrCreateUser, findUserByEmail, getUserSessions, getInactiveSessions, deleteSessionsByIds } from './db';
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
    const isAllowed = caller && (caller === session.ownerId.toLowerCase() || session.collaboratorIds.map(e=>e.toLowerCase()).includes(caller));
    if (!isAllowed) return res.status(403).json({ error: 'Authentication required' });
    res.json(enrichSession(session));
});

apiRouter.post('/sessions/:id/collaborators', (req, res) => {
    const session = getSessionById(req.params.id);
    const { email, displayName, password } = req.body;
    if (!session) return res.status(404).json({ error: 'Session not found' });
    if (session.password && session.password !== password) {
        return res.status(403).json({ error: 'Incorrect password' });
    }
    findOrCreateUser(email, displayName);
    if (!session.collaboratorIds.includes(email)) {
        session.collaboratorIds.push(email);
        saveSession(session);
    }
    appendHistory(session, { id: Date.now(), type: 'user_joined', actor: email, message: `${displayName} joined`, timestamp: Date.now() });
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
});
