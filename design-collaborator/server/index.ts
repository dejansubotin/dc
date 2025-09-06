import express from 'express';
import http from 'http';
import { Server } from 'socket.io';
import cors from 'cors';
import dotenv from 'dotenv';
import path from 'path';

// Fix: Import fileURLToPath to resolve __dirname in ES Modules.

import { initializeDb, getSessionById, saveSession, findOrCreateUser, findUserByEmail, getUserSessions } from './db';
import { sendNewCommentEmail } from './email';
import type { Session, Annotation, Comment, User } from '../types';

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

app.use(cors());
// Fix: No overload matches this call. Removed path argument to match a different overload.
app.use(express.json({ limit: '10mb' })); // Increase limit for image data URLs

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

const broadcastSessionUpdate = (sessionId: string, session: Session) => {
    io.to(sessionId).emit('session_updated', session);
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
    const { ownerEmail, imageDataUrl } = req.body;
    if (!ownerEmail || !imageDataUrl) {
        return res.status(400).json({ error: 'ownerEmail and imageDataUrl are required' });
    }
    const newSession: Session = {
        id: `sid_${Date.now()}`,
        ownerId: ownerEmail,
        imageUrl: imageDataUrl,
        annotations: [],
        collaboratorIds: [ownerEmail],
        createdAt: Date.now(),
    };
    saveSession(newSession);
    res.status(201).json(newSession);
});

apiRouter.get('/sessions/:id', (req, res) => {
    const session = getSessionById(req.params.id);
    if (session) {
        res.json(session);
    } else {
        res.status(404).json({ error: 'Session not found' });
    }
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
    broadcastSessionUpdate(session.id, session);
    res.json(session);
});

apiRouter.put('/sessions/:id/password', (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    session.password = req.body.password || undefined;
    saveSession(session);
    broadcastSessionUpdate(session.id, session);
    res.json(session);
});

// Annotation and Comment routes
apiRouter.post('/sessions/:id/annotations', (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const { annotation } = req.body;
    session.annotations.push(annotation);
    saveSession(session);
    broadcastSessionUpdate(session.id, session);
    res.status(201).json(session);
});

apiRouter.delete('/sessions/:id/annotations/:annoId', (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    session.annotations = session.annotations.filter(a => a.id !== parseInt(req.params.annoId));
    saveSession(session);
    broadcastSessionUpdate(session.id, session);
    res.json(session);
});

apiRouter.put('/sessions/:id/annotations/:annoId/solve', (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    const { isSolved } = req.body;
    session.annotations = session.annotations.map(a => 
        a.id === parseInt(req.params.annoId) ? { ...a, isSolved } : a
    );
    saveSession(session);
    broadcastSessionUpdate(session.id, session);
    res.json(session);
});

apiRouter.post('/sessions/:id/annotations/:annoId/comments', async (req, res) => {
    const session = getSessionById(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    
    const { userEmail, text } = req.body;
    const user = findUserByEmail(userEmail);
    if (!user) return res.status(404).json({ error: 'User not found' });

    const newComment: Comment = {
        id: Date.now(),
        userId: user.email,
        author: user.displayName,
        text,
        timestamp: Date.now()
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

    saveSession(session);
    broadcastSessionUpdate(session.id, session);

    // Send email notifications
    const recipients = session.collaboratorIds
        .filter(email => email !== user.email) // Don't send to the commenter
        .map(email => findUserByEmail(email))
        .filter((u): u is User => !!u);
        
    await sendNewCommentEmail(session, newComment, recipients);
    
    res.status(201).json(session);
});

// Use the API router
app.use('/api', apiRouter);

// Serve frontend
// Fix: No overload matches this call. Removed path argument to match a different overload.
app.use(express.static(path.join(__dirname, '..', 'public')));
app.get('*', (req, res) => {
    res.sendFile(path.join(__dirname, '..', 'public', 'index.html'));
});


server.listen(PORT, () => {
  console.log(`Server running on http://localhost:${PORT}`);
});
