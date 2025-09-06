import React, { useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import ImageUploader from './components/ImageUploader';
import ImageViewer from './components/ImageViewer';
import CommentSidebar from './components/CommentSidebar';
import ConfirmationModal from './components/ConfirmationModal';
import LoginModal from './components/LoginModal';
import ShareModal from './components/ShareModal';
import SessionHistory from './components/SessionHistory';
import type { Annotation, SelectionRectangle, User, Session, Comment } from './types';
import * as api from './services/api';

// The backend URL should be configured properly for production
// For development, it might be http://localhost:3000
const API_URL = '';

const App: React.FC = () => {
  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [currentSession, setCurrentSession] = useState<Session | null>(null);
  const [userSessions, setUserSessions] = useState<Session[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const socketRef = useRef<Socket | null>(null);

  // --- Login Modal State ---
  const [loginModalState, setLoginModalState] = useState<{
    isOpen: boolean;
    isJoining: boolean;
    callback: (user?: User) => void;
  }>({ isOpen: false, isJoining: false, callback: () => {} });

  // --- Editor State ---
  const [pendingAnnotation, setPendingAnnotation] = useState<Annotation | null>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<number | null>(null);

  // --- Other Modals State ---
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, annotationId: null as number | null });
  const [shareModalOpen, setShareModalOpen] = useState(false);

  // --- Initialization and Socket Effect ---
  useEffect(() => {
    const initializeApp = async () => {
      const user = api.getLocalUser();
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('sessionId');

      if (user) {
        setCurrentUser(user);
        try {
          const sessions = await api.getUserSessions(user.email);
          setUserSessions(sessions);
        } catch (error) {
          console.error("Failed to fetch user sessions", error);
        }
      }

      if (sessionId) {
        try {
          const session = await api.getSession(sessionId);
          if (session.password && (!user || (session.ownerId !== user.email && !session.collaboratorIds.includes(user.email)))) {
             setLoginModalState({ isOpen: true, isJoining: true, callback: () => window.location.reload() });
          } else {
             setCurrentSession(session);
          }
        } catch (error) {
          console.error("Session not found or error fetching it.", error);
          window.history.replaceState({}, '', window.location.pathname);
        }
      } else if (!user) {
        setLoginModalState({ isOpen: true, isJoining: false, callback: (newUser) => setCurrentUser(newUser || null) });
      }
      setIsLoading(false);
    };
    initializeApp();
  }, []);

  useEffect(() => {
    if (!currentSession) return;
    
    // Connect to WebSocket server
    const socket = io(API_URL);
    socketRef.current = socket;
    
    socket.on('connect', () => {
      console.log('Connected to server');
      socket.emit('join_session', currentSession.id);
    });

    socket.on('session_updated', (updatedSession: Session) => {
      console.log('Session updated via WebSocket');
      setCurrentSession(updatedSession);
    });

    socket.on('disconnect', () => {
      console.log('Disconnected from server');
    });

    return () => {
      socket.disconnect();
      socketRef.current = null;
    };

  }, [currentSession?.id]);
  
  const handleLogin = async (displayName: string, email: string, password?: string) => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('sessionId');

    try {
        if (sessionId && loginModalState.isJoining) {
            await api.joinSession(sessionId, email, displayName, password);
        }
        
        const user = await api.createUser(email, displayName);
        api.setLocalUser(user);
        setCurrentUser(user);
        setLoginModalState({ isOpen: false, isJoining: false, callback: () => {} });
        loginModalState.callback?.(user);
    } catch(error) {
        console.error("Login failed:", error);
        alert(`Error: ${(error as Error).message}`);
    }
  };

  const handleImageUpload = useCallback(async (file: File) => {
    if (!currentUser) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const imageDataUrl = reader.result as string;
      try {
        const newSession = await api.createSession(currentUser.email, imageDataUrl);
        setCurrentSession(newSession);
        window.history.pushState({}, '', `?sessionId=${newSession.id}`);
      } catch (error) {
        console.error("Failed to create session:", error);
        alert("Could not create session. Please try again.");
      }
    };
    reader.readAsDataURL(file);
  }, [currentUser]);

  const handleSetPassword = async (password: string) => {
    if (currentSession) {
      try {
        const updatedSession = await api.setSessionPassword(currentSession.id, password);
        setCurrentSession(updatedSession); // Or wait for websocket update
      } catch(error) {
        console.error("Failed to set password:", error);
        alert("Could not set password.");
      }
    }
  };
  
  const handleSelectSession = (sessionId: string) => {
    window.location.search = `?sessionId=${sessionId}`;
  };

  const resetProject = () => {
    window.location.href = window.location.pathname;
  };

  // --- Annotation & Comment handlers ---
  const handleSelectionEnd = useCallback((selection: SelectionRectangle) => {
    const newAnnotation: Annotation = {
      id: Date.now(),
      ...selection,
      comments: [],
      isSolved: false,
    };
    setPendingAnnotation(newAnnotation);
    setActiveAnnotationId(newAnnotation.id);
  }, []);

  const handleAddComment = useCallback(async (annotationId: number, commentText: string) => {
    if (!currentUser || !currentSession) return;
    
    if (pendingAnnotation && pendingAnnotation.id === annotationId) {
      // It's a new annotation, we need to add it first, then the comment
      const newAnnotationWithComment = { ...pendingAnnotation, comments: [{
          id: Date.now(),
          userId: currentUser.email,
          author: currentUser.displayName,
          text: commentText,
          timestamp: Date.now()
      }]};
      await api.addAnnotation(currentSession.id, newAnnotationWithComment);
      setPendingAnnotation(null);
      setActiveAnnotationId(newAnnotationWithComment.id);
    } else {
      await api.addComment(currentSession.id, annotationId, currentUser.email, commentText);
    }
  }, [pendingAnnotation, currentSession, currentUser]);
  
  const handleUpdateComment = useCallback(async (annotationId: number, commentId: number, newText: string) => {
    if (!currentSession) return;
    await api.updateComment(currentSession.id, annotationId, commentId, newText);
  }, [currentSession]);
  
  const handleDeleteComment = useCallback(async (annotationId: number, commentId: number) => {
    if (!currentSession) return;
    await api.deleteComment(currentSession.id, annotationId, commentId);
  }, [currentSession]);

  const handleAnnotationClick = useCallback((annotationId: number) => {
    if (pendingAnnotation) setPendingAnnotation(null);
    setActiveAnnotationId(annotationId);
  }, [pendingAnnotation]);

  const handleDeleteAnnotation = useCallback((annotationId: number) => {
    const annotationToDelete = currentSession?.annotations.find(a => a.id === annotationId);
    if (!annotationToDelete) return;
    const uniqueAuthors = new Set(annotationToDelete.comments.map(c => c.author));
    if (uniqueAuthors.size > 1 && currentUser?.email !== currentSession?.ownerId) {
      setDeleteModalState({ isOpen: true, annotationId: annotationId });
    } else {
      performDeleteAnnotation(annotationId);
    }
  }, [currentSession, currentUser]);

  const performDeleteAnnotation = async (annotationId: number) => {
    if (!currentSession) return;
    await api.deleteAnnotation(currentSession.id, annotationId);
    if (activeAnnotationId === annotationId) {
      setActiveAnnotationId(null);
    }
  };
  const confirmDelete = () => {
    if (deleteModalState.annotationId) performDeleteAnnotation(deleteModalState.annotationId);
    setDeleteModalState({ isOpen: false, annotationId: null });
  };
  const cancelDelete = () => setDeleteModalState({ isOpen: false, annotationId: null });
  const handleCancelPending = useCallback(() => {
    setPendingAnnotation(null);
    setActiveAnnotationId(null);
  }, []);

  const handleToggleSolve = useCallback(async (annotationId: number) => {
    if (!currentSession) return;
    const annotation = currentSession.annotations.find(a => a.id === annotationId);
    if(annotation) {
        await api.toggleAnnotationSolve(currentSession.id, annotationId, !annotation.isSolved);
    }
  }, [currentSession]);
  
  if (isLoading) {
    return <div className="min-h-screen bg-gray-900" />;
  }

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col font-sans">
        <header className="p-4 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 flex justify-between items-center z-20 shrink-0">
          <h1 className="text-2xl font-bold text-cyan-400">Design Collaborator</h1>
          <div className="flex items-center gap-4">
            {currentUser && <span className="text-gray-300">Welcome, <span className="font-bold text-cyan-400">{currentUser.displayName}</span>!</span>}
            {currentSession && currentUser?.email === currentSession.ownerId && (
              <button onClick={() => setShareModalOpen(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300">
                Share Session
              </button>
            )}
            {currentUser && !currentSession && (
              <button onClick={resetProject} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300">
                New Session
              </button>
            )}
          </div>
        </header>
        <main className="flex-grow flex items-center justify-center p-4 lg:p-8 overflow-hidden">
          {!currentSession ? (
            <div className="flex flex-col items-center gap-8 w-full max-w-2xl">
              <ImageUploader onImageUpload={handleImageUpload} />
              <SessionHistory sessions={userSessions} onSelectSession={handleSelectSession} />
            </div>
          ) : (
            <div className="flex w-full h-full max-h-[calc(100vh-120px)] gap-6">
              <div className="flex-grow flex items-center justify-center bg-gray-900/50 rounded-lg overflow-hidden">
                <ImageViewer
                  key={currentSession.id}
                  imageUrl={currentSession.imageUrl}
                  annotations={currentSession.annotations}
                  pendingAnnotation={pendingAnnotation}
                  activeAnnotationId={activeAnnotationId}
                  onSelectionEnd={handleSelectionEnd}
                  onAnnotationClick={handleAnnotationClick}
                  onDeleteAnnotation={handleDeleteAnnotation}
                />
              </div>
              <div className="w-full max-w-sm flex-shrink-0">
                <CommentSidebar
                  currentUser={currentUser}
                  annotations={currentSession.annotations}
                  pendingAnnotation={pendingAnnotation}
                  activeAnnotationId={activeAnnotationId}
                  onAddComment={handleAddComment}
                  onUpdateComment={handleUpdateComment}
                  onDeleteComment={handleDeleteComment}
                  onCancelPending={handleCancelPending}
                  onToggleSolve={handleToggleSolve}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      <LoginModal 
        isOpen={loginModalState.isOpen}
        isJoiningWithPassword={loginModalState.isJoining}
        onSubmit={handleLogin}
      />
      {currentSession && <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onSetPassword={handleSetPassword}
        session={currentSession}
      />}
      <ConfirmationModal
        isOpen={deleteModalState.isOpen}
        onClose={cancelDelete}
        onConfirm={confirmDelete}
        title="Delete Annotation?"
      >
        <p>This annotation has comments from multiple users. Are you sure you want to permanently delete it?</p>
      </ConfirmationModal>
    </>
  );
};

export default App;
