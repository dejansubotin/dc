import React, { useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import ImageUploader from './components/ImageUploader';
import ImageViewer from './components/ImageViewer';
import CommentSidebar from './components/CommentSidebar';
import ConfirmationModal from './components/ConfirmationModal';
import LoginModal from './components/LoginModal';
import ShareModal from './components/ShareModal';
import MySessionsModal from './components/MySessionsModal';
import HistoryModal from './components/HistoryModal';
import CreateSessionModal from './components/CreateSessionModal';
import MembersModal from './components/MembersModal';
import EditProfileModal from './components/EditProfileModal';
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
    message?: string;
    errorMessage?: string;
    requirePassword?: boolean;
  }>({ isOpen: false, isJoining: false, callback: () => {} });

  // --- Editor State ---
  const [pendingAnnotation, setPendingAnnotation] = useState<Annotation | null>(null);
  const [activeAnnotationId, setActiveAnnotationId] = useState<number | null>(null);

  // --- Other Modals State ---
  const [deleteModalState, setDeleteModalState] = useState({ isOpen: false, annotationId: null as number | null });
  const [shareModalOpen, setShareModalOpen] = useState(false);
  const [historyOpen, setHistoryOpen] = useState(false);
  const [mySessionsOpen, setMySessionsOpen] = useState(false);
  const [createSessionOpen, setCreateSessionOpen] = useState(false);
  const [pendingImageDataUrl, setPendingImageDataUrl] = useState<string | null>(null);
  const [pendingThumbDataUrl, setPendingThumbDataUrl] = useState<string | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);

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
        // Require user details before accessing a shared session
        if (!user) {
          setLoginModalState({ isOpen: true, isJoining: true, requirePassword: false, message: 'Access required. Please enter your name and email (and password if required) to join this session.', callback: () => window.location.reload() });
          setIsLoading(false);
          return;
        }
        // Strict mode: must be member to read; always try to join first
        try {
          await api.joinSession(sessionId, user.email, user.displayName);
          const session = await api.getSession(sessionId);
          setCurrentSession(session);
        } catch (error) {
          console.error("Join or fetch failed; likely needs password.", error);
          setLoginModalState({ isOpen: true, isJoining: true, requirePassword: true, message: 'Access required. This session may be password-protected. Please enter your details to continue.', errorMessage: (error as Error)?.message || 'Authentication required', callback: () => window.location.reload() });
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
        setLoginModalState(prev => ({
          isOpen: true,
          isJoining: prev.isJoining,
          requirePassword: prev.isJoining && sessionId ? true : prev.requirePassword,
          message: prev.message || 'Please try again.',
          errorMessage: (error as Error)?.message || 'Authentication failed',
          callback: prev.callback || (() => {})
        }));
    }
  };

  const handleImageUpload = useCallback(async (file: File) => {
    if (!currentUser) return;
    const reader = new FileReader();
    reader.onload = async () => {
      const imageDataUrl = reader.result as string;
      // Generate thumbnail in browser
      try {
        const img = new Image();
        img.onload = () => {
          const maxW = 400; const maxH = 300;
          let { width, height } = img;
          const ratio = Math.min(maxW / width, maxH / height, 1);
          width = Math.round(width * ratio);
          height = Math.round(height * ratio);
          const canvas = document.createElement('canvas');
          canvas.width = width; canvas.height = height;
          const ctx = canvas.getContext('2d');
          if (ctx) {
            ctx.drawImage(img, 0, 0, width, height);
            const thumb = canvas.toDataURL('image/jpeg', 0.75);
            setPendingThumbDataUrl(thumb);
          }
          setPendingImageDataUrl(imageDataUrl);
          setCreateSessionOpen(true);
        };
        img.onerror = () => {
          setPendingThumbDataUrl(null);
          setPendingImageDataUrl(imageDataUrl);
          setCreateSessionOpen(true);
        };
        img.src = imageDataUrl;
      } catch {
        setPendingThumbDataUrl(null);
        setPendingImageDataUrl(imageDataUrl);
        setCreateSessionOpen(true);
      }
    };
    reader.readAsDataURL(file);
  }, [currentUser]);

  const handleConfirmCreateSession = async (sessionName: string, sessionDescription?: string) => {
    if (!currentUser || !pendingImageDataUrl) return;
    try {
      const newSession = await api.createSession(currentUser.email, pendingImageDataUrl, sessionName || undefined, sessionDescription, pendingThumbDataUrl || undefined);
      setCurrentSession(newSession);
      window.history.pushState({}, '', `?sessionId=${newSession.id}`);
    } catch (error) {
      console.error("Failed to create session:", error);
      alert("Could not create session. Please try again.");
    } finally {
      setCreateSessionOpen(false);
      setPendingImageDataUrl(null);
      setPendingThumbDataUrl(null);
    }
  };

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

  const handleAddComment = useCallback(async (annotationId: number, commentText: string, parentId?: number) => {
    if (!currentUser || !currentSession) return;
    
    if (pendingAnnotation && pendingAnnotation.id === annotationId) {
      // It's a new annotation, we need to add it first, then the comment
      const newAnnotationWithComment = { ...pendingAnnotation, comments: [{
          id: Date.now(),
          userId: currentUser.email,
          author: currentUser.displayName,
          text: commentText,
          timestamp: Date.now(),
          parentId: undefined
      }]};
      await api.addAnnotation(currentSession.id, newAnnotationWithComment);
      setPendingAnnotation(null);
      setActiveAnnotationId(newAnnotationWithComment.id);
    } else {
      await api.addComment(currentSession.id, annotationId, currentUser.email, commentText, parentId);
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

  const handleToggleLike = useCallback(async (annotationId: number, commentId: number, like: boolean) => {
    if (!currentSession) return;
    await api.likeComment(currentSession.id, annotationId, commentId, like);
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
          <div>
            <a href="/" className="text-2xl font-bold text-cyan-400 hover:text-cyan-300 transition-colors">Design Collaborator</a>
            {currentSession && (
              <div className="mt-1 text-sm text-gray-300 flex gap-4">
                <span>
                  Annotations: <span className="font-semibold text-white">{currentSession.annotations.length}</span>
                </span>
                <span>
                  Comments: <span className="font-semibold text-white">{currentSession.annotations.reduce((sum, a) => sum + a.comments.length, 0)}</span>
                </span>
              </div>
            )}
          </div>
          <div className="flex items-center gap-4">
            {currentUser && (
              <div className="text-right">
                <div className="text-gray-300">Welcome, <span className="font-bold text-cyan-400">{currentUser.displayName}</span>!</div>
                {currentSession && (
                  <div className="text-xs text-gray-400 mt-0.5 relative group/name">
                    <span>
                      Session name: <span className="text-gray-200">{currentSession.sessionName || 'Untitled'}</span>
                    </span>
                    {(currentSession.sessionDescription || '').trim().length > 0 && (
                      <div className="absolute right-0 mt-1 bg-gray-900 text-gray-200 text-xs whitespace-pre-wrap border border-gray-700 rounded px-2 py-1 shadow-lg z-50 hidden group-hover/name:block max-w-sm">
                        {currentSession.sessionDescription}
                      </div>
                    )}
                  </div>
                )}
              </div>
            )}
            {currentSession && (
              <>
                {currentUser?.email === currentSession.ownerId && (
                  <button onClick={() => setShareModalOpen(true)} className="px-4 py-2 bg-cyan-600 hover:bg-cyan-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300">
                    Share Session
                  </button>
                )}
                <button onClick={() => setMembersOpen(true)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300">
                  Members
                </button>
                <button onClick={() => setHistoryOpen(true)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300">
                  History
                </button>
              </>
            )}
            {currentUser && (
              <button onClick={() => setMySessionsOpen(true)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300">
                My Sessions
              </button>
            )}
            {currentUser && !currentSession && (
              <>
                <button onClick={resetProject} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300">
                  New Session
                </button>
                <button onClick={() => setEditProfileOpen(true)} className="px-4 py-2 bg-gray-600 hover:bg-gray-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300">
                  Edit Profile
                </button>
              </>
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
                  onToggleLike={handleToggleLike}
                  onCancelPending={handleCancelPending}
                  onToggleSolve={handleToggleSolve}
                  collaborators={currentSession.collaboratorProfiles || []}
                />
              </div>
            </div>
          )}
        </main>
      </div>

      <LoginModal 
        isOpen={loginModalState.isOpen}
        isJoiningWithPassword={!!loginModalState.requirePassword}
        message={loginModalState.message}
        externalError={loginModalState.errorMessage}
        defaultDisplayName={currentUser?.displayName}
        defaultEmail={currentUser?.email}
        disableIdentityInputs={!!currentUser}
        onSubmit={handleLogin}
      />
      {currentSession && <ShareModal
        isOpen={shareModalOpen}
        onClose={() => setShareModalOpen(false)}
        onSetPassword={handleSetPassword}
        session={currentSession}
      />}
      {currentSession && (
        <HistoryModal
          isOpen={historyOpen}
          onClose={() => setHistoryOpen(false)}
          events={currentSession.history || []}
        />
      )}
      {currentUser && (
        <MySessionsModal
          isOpen={mySessionsOpen}
          onClose={() => setMySessionsOpen(false)}
          sessions={userSessions}
        />
      )}
      {currentUser && (
        <CreateSessionModal
          isOpen={createSessionOpen}
          onClose={() => { setCreateSessionOpen(false); setPendingImageDataUrl(null); }}
          onCreate={handleConfirmCreateSession}
        />
      )}
      {currentSession && (
        <MembersModal
          isOpen={membersOpen}
          onClose={() => setMembersOpen(false)}
          session={currentSession}
          currentUser={currentUser}
          onRemove={async (email) => {
            if (!currentSession) return;
            if (!confirm(`Remove ${email}? They will lose access.`)) return;
            try {
              const updated = await api.removeCollaborator(currentSession.id, email);
              setCurrentSession(updated);
            } catch (e) {
              alert((e as Error).message);
            }
          }}
        />
      )}
      {currentUser && (
        <EditProfileModal
          isOpen={editProfileOpen}
          initialUser={currentUser}
          onClose={() => setEditProfileOpen(false)}
          onSave={async (u) => {
            try {
              const updated = await api.createUser(u.email, u.displayName);
              api.setLocalUser(updated);
              setCurrentUser(updated);
              setEditProfileOpen(false);
              // refresh sessions list
              try { setUserSessions(await api.getUserSessions(updated.email)); } catch {}
            } catch (e) {
              alert((e as Error).message);
            }
          }}
        />
      )}
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
