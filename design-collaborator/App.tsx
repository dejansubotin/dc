import React, { useState, useCallback, useEffect, useRef } from 'react';
import { io, Socket } from 'socket.io-client';
import ImageUploader from './components/ImageUploader';
import ImageViewer from './components/ImageViewer';
import MultiImageViewer from './components/MultiImageViewer';
import CommentSidebar from './components/CommentSidebar';
import ConfirmationModal from './components/ConfirmationModal';
import LoginModal from './components/LoginModal';
import ShareModal from './components/ShareModal';
import MySessionsModal from './components/MySessionsModal';
import HistoryModal from './components/HistoryModal';
import CreateSessionModal from './components/CreateSessionModal';
import MembersModal from './components/MembersModal';
import EditProfileModal from './components/EditProfileModal';
import DisableCountdown from './components/DisableCountdown';
import AddImagesModal from './components/AddImagesModal';
import SessionHistory from './components/SessionHistory';
import LandingPage from './components/LandingPage.tsx';
import LegalPage from './components/LegalPage';
import type { Annotation, SelectionRectangle, User, Session, Comment } from './types';
import * as api from './services/api';

// The backend URL should be configured properly for production
// For development, it might be http://localhost:3000
const API_URL = '';

const App: React.FC = () => {
  const pathname = typeof window === 'undefined' ? '/' : window.location.pathname;
  const legalRoute = pathname === '/privacy' ? 'privacy' : pathname === '/terms' ? 'terms' : null;
  const isLegalRoute = legalRoute !== null;

  const [currentUser, setCurrentUser] = useState<User | null>(null);
  const [showLanding, setShowLanding] = useState(() => {
    if (typeof window === 'undefined') return true;
    const params = new URLSearchParams(window.location.search);
    return !params.get('sessionId');
  });
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
  const [pendingImages, setPendingImages] = useState<{ dataUrl: string; thumb?: string }[] | null>(null);
  const [membersOpen, setMembersOpen] = useState(false);
  const [editProfileOpen, setEditProfileOpen] = useState(false);
  const [addImagesOpen, setAddImagesOpen] = useState(false);
  const [deleteImageState, setDeleteImageState] = useState<{ isOpen: boolean; index: number | null; message?: string }>(() => ({ isOpen: false, index: null }));

  // --- Initialization and Socket Effect ---
  useEffect(() => {
    if (isLegalRoute) {
      setIsLoading(false);
      return;
    }

    const initializeApp = async () => {
      const user = api.getLocalUser();
      const params = new URLSearchParams(window.location.search);
      const sessionId = params.get('sessionId');
      // SEO: prevent indexing session pages
      const ensureRobotsTag = (content: string) => {
        if (typeof document === 'undefined') return;
        let meta = document.querySelector('meta[name="robots"]') as HTMLMetaElement | null;
        if (!meta) {
          meta = document.createElement('meta');
          meta.name = 'robots';
          document.head.appendChild(meta);
        }
        meta.content = content;
      };
      if (sessionId) ensureRobotsTag('noindex, nofollow'); else ensureRobotsTag('index, follow');

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
          // Do not show an error before the user attempts to submit a password.
          setLoginModalState({ isOpen: true, isJoining: true, requirePassword: true, message: 'Access required. This session may be password-protected. Please enter your details to continue.', errorMessage: undefined, callback: () => window.location.reload() });
        }
      }
      setIsLoading(false);
    };
    initializeApp();
  }, [isLegalRoute]);

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
  
  const handleLogin = async (displayName: string, email: string, password?: string, honeypot?: string) => {
    const params = new URLSearchParams(window.location.search);
    const sessionId = params.get('sessionId');

    try {
        if (sessionId && loginModalState.isJoining) {
            await api.joinSession(sessionId, email, displayName, password, honeypot);
        }
        
        const user = await api.createUser(email, displayName, honeypot);
        api.setLocalUser(user);
        setCurrentUser(user);
        setShowLanding(false);
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

  const handleImageUpload = useCallback(async (files: File[]) => {
    if (!currentUser) return;
    // Read all files and build thumbs
    const promises = files.map(file => new Promise<{ dataUrl: string; thumb?: string }>((resolve) => {
      const reader = new FileReader();
      reader.onload = () => {
        const imageDataUrl = reader.result as string;
        try {
          const img = new Image();
          img.onload = () => {
            const maxW = 400; const maxH = 300;
            let { width, height } = img as HTMLImageElement;
            const ratio = Math.min(maxW / width, maxH / height, 1);
            width = Math.round(width * ratio);
            height = Math.round(height * ratio);
            const canvas = document.createElement('canvas');
            canvas.width = width; canvas.height = height;
            const ctx = canvas.getContext('2d');
            let thumb: string | undefined;
            if (ctx) {
              ctx.drawImage(img, 0, 0, width, height);
              thumb = canvas.toDataURL('image/jpeg', 0.75);
            }
            resolve({ dataUrl: imageDataUrl, thumb });
          };
          img.onerror = () => resolve({ dataUrl: imageDataUrl });
          img.src = imageDataUrl;
        } catch {
          resolve({ dataUrl: imageDataUrl });
        }
      };
      reader.readAsDataURL(file);
    }));
    const results = await Promise.all(promises);
    if (results.length === 1) {
      // Keep single-image code path for backward compatibility
      setPendingImageDataUrl(results[0].dataUrl);
      setPendingThumbDataUrl(results[0].thumb || null);
      setPendingImages(null);
    } else {
      setPendingImages(results);
      setPendingImageDataUrl(null);
      setPendingThumbDataUrl(null);
    }
    setCreateSessionOpen(true);
  }, [currentUser]);

  const handleConfirmCreateSession = async (sessionName: string, sessionDescription?: string) => {
    if (!currentUser) return;
    try {
      let newSession;
      if (pendingImages && pendingImages.length > 0) {
        newSession = await api.createSessionMulti(
          currentUser.email,
          pendingImages.map(p => ({ imageDataUrl: p.dataUrl, thumbnailDataUrl: p.thumb })),
          sessionName || undefined,
          sessionDescription
        );
      } else if (pendingImageDataUrl) {
        newSession = await api.createSession(currentUser.email, pendingImageDataUrl, sessionName || undefined, sessionDescription, pendingThumbDataUrl || undefined);
      } else {
        return;
      }
      setCurrentSession(newSession);
      window.history.pushState({}, '', `?sessionId=${newSession.id}`);
    } catch (error) {
      console.error("Failed to create session:", error);
      alert("Could not create session. Please try again.");
    } finally {
      setCreateSessionOpen(false);
      setPendingImageDataUrl(null);
      setPendingThumbDataUrl(null);
      setPendingImages(null);
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
  const handleSelectionEnd = useCallback((selection: SelectionRectangle, imageIndex?: number) => {
    if (currentSession?.isDisabled) return;
    const newAnnotation: Annotation = {
      id: Date.now(),
      ...selection,
      comments: [],
      isSolved: false,
      imageIndex: typeof imageIndex === 'number' ? imageIndex : 0,
    };
    setPendingAnnotation(newAnnotation);
    setActiveAnnotationId(newAnnotation.id);
  }, []);

  const handleAddComment = useCallback(async (annotationId: number, commentText: string, parentId?: number) => {
    if (!currentUser || !currentSession) return;
    if (currentSession.isDisabled) return;
    
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
    if (currentSession.isDisabled) return;
    await api.updateComment(currentSession.id, annotationId, commentId, newText);
  }, [currentSession]);
  
  const handleDeleteComment = useCallback(async (annotationId: number, commentId: number) => {
    if (!currentSession) return;
    if (currentSession.isDisabled) return;
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
    if (currentSession.isDisabled) return;
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
    if (currentSession.isDisabled) return;
    const annotation = currentSession.annotations.find(a => a.id === annotationId);
    if(annotation) {
        await api.toggleAnnotationSolve(currentSession.id, annotationId, !annotation.isSolved);
    }
  }, [currentSession]);
  
  const handleLandingStart = () => {
    if (currentUser) {
      setShowLanding(false);
      return;
    }
    setLoginModalState({
      isOpen: true,
      isJoining: false,
      message: 'Create your Image Comment profile to launch the reviewer workspace.',
      callback: (newUser) => {
        setCurrentUser(newUser || null);
        setShowLanding(false);
      },
    });
  };

  if (isLoading && !showLanding) {
    return <div className="min-h-screen bg-gray-900" />;
  }

  if (isLegalRoute && legalRoute) {
    return <LegalPage variant={legalRoute} />;
  }

  if (showLanding) {
    return (
      <>
        <LandingPage onStart={handleLandingStart} />
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
      </>
    );
  }

  return (
    <>
      <div className="min-h-screen bg-gray-900 text-gray-200 flex flex-col font-sans">
        <header className="p-4 bg-gray-800/50 backdrop-blur-sm border-b border-gray-700 flex justify-between items-center z-20 shrink-0">
          <div>
            <a href="/" className="text-2xl font-bold text-cyan-400 hover:text-cyan-300 transition-colors">Image Comment</a>
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
                  <div className="text-xs text-gray-400 mt-0.5 relative group/name flex items-center gap-2">
                    <span>
                      Session name: <span className="text-gray-200">{currentSession.sessionName || 'Untitled'}</span>
                    </span>
                    {currentSession.isDisabled && (
                      <span className="inline-flex items-center px-2 py-0.5 rounded-full bg-red-900/40 border border-red-600 text-red-300 text-[11px]">
                        Read-only
                      </span>
                    )}
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
                {currentUser?.email === currentSession.ownerId && (
                  currentSession.isDisabled ? (
                    <button onClick={async ()=>{ try{ const updated = await api.restoreSession(currentSession.id); setCurrentSession(updated);} catch(e){ alert((e as Error).message);} }} className="px-4 py-2 bg-green-600 hover:bg-green-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300">Restore</button>
                  ) : (
                    <button onClick={async ()=>{ if(!confirm('Disable this session? It will be deleted in 30 minutes.')) return; try{ const updated = await api.disableSession(currentSession.id); setCurrentSession(updated);} catch(e){ alert((e as Error).message);} }} className="px-4 py-2 bg-red-600 hover:bg-red-700 text-white font-semibold rounded-lg shadow-md transition-colors duration-300">Delete Session</button>
                  )
                )}
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
                {(() => {
                  const images = (currentSession.images && currentSession.images.length > 0)
                    ? currentSession.images
                    : [{ url: currentSession.imageUrl, thumbnailUrl: currentSession.sessionThumbnailUrl }];
                  return (
                    <MultiImageViewer
                      key={currentSession.id + ':' + images.length}
                      images={images}
                      annotations={currentSession.annotations}
                      pendingAnnotation={pendingAnnotation}
                      activeAnnotationId={activeAnnotationId}
                      onSelectionEnd={handleSelectionEnd}
                      onAnnotationClick={handleAnnotationClick}
                      onDeleteAnnotation={handleDeleteAnnotation}
                      canAddImages={currentUser?.email === currentSession.ownerId && !currentSession.isDisabled && images.length < 10}
                      onOpenAddImages={() => setAddImagesOpen(true)}
                      canDeleteImages={currentUser?.email === currentSession.ownerId && !currentSession.isDisabled && images.length > 1}
                      onDeleteImage={(idx) => {
                        if (!currentSession) return;
                        const hasAnnos = currentSession.annotations.some(a => (a.imageIndex ?? 0) === idx);
                        if (hasAnnos) {
                          setDeleteImageState({ isOpen: true, index: idx, message: 'This image has annotations and comments. Deleting it will permanently remove all annotations and comments for this image. Are you sure?' });
                        } else {
                          (async () => {
                            try { const updated = await api.deleteSessionImage(currentSession.id, idx); setCurrentSession(updated); }
                            catch (e) { alert((e as Error).message); }
                          })();
                        }
                      }}
                    />
                  );
                })()}
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
      {currentSession?.isDisabled && currentSession.deleteAt && (
        <DisableCountdown deleteAt={currentSession.deleteAt} />
      )}
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
        <ConfirmationModal
          isOpen={deleteImageState.isOpen}
          onClose={() => setDeleteImageState({ isOpen: false, index: null })}
          onConfirm={async () => {
            if (!currentSession || deleteImageState.index == null) return;
            try {
              const updated = await api.deleteSessionImage(currentSession.id, deleteImageState.index);
              setCurrentSession(updated);
            } catch (e) {
              alert((e as Error).message);
            } finally {
              setDeleteImageState({ isOpen: false, index: null });
            }
          }}
          title="Remove Image?"
        >
          <p>{deleteImageState.message || 'Remove this image from the session?'}</p>
        </ConfirmationModal>
      )}
      {currentSession && (
        <AddImagesModal
          isOpen={addImagesOpen}
          onClose={() => setAddImagesOpen(false)}
          remainingCapacity={Math.max(0, 10 - ((currentSession.images?.length || 1)))}
          onSelectFiles={async (files) => {
            if (!currentSession) return;
            // Build data URLs + thumbs
            const results = await Promise.all(files.map((file) => new Promise<{ dataUrl: string; thumb?: string }>((resolve) => {
              const reader = new FileReader();
              reader.onload = () => {
                const imageDataUrl = reader.result as string;
                try {
                  const img = new Image();
                  img.onload = () => {
                    const maxW = 400; const maxH = 300;
                    let { width, height } = img as HTMLImageElement;
                    const ratio = Math.min(maxW / width, maxH / height, 1);
                    width = Math.round(width * ratio);
                    height = Math.round(height * ratio);
                    const canvas = document.createElement('canvas');
                    canvas.width = width; canvas.height = height;
                    const ctx = canvas.getContext('2d');
                    let thumb: string | undefined;
                    if (ctx) { ctx.drawImage(img, 0, 0, width, height); thumb = canvas.toDataURL('image/jpeg', 0.75); }
                    resolve({ dataUrl: imageDataUrl, thumb });
                  };
                  img.onerror = () => resolve({ dataUrl: imageDataUrl });
                  img.src = imageDataUrl;
                } catch { resolve({ dataUrl: imageDataUrl }); }
              };
              reader.readAsDataURL(file);
            })));
            try {
              const updated = await api.addSessionImages(currentSession.id, results.map(r => ({ imageDataUrl: r.dataUrl, thumbnailDataUrl: r.thumb })));
              setCurrentSession(updated);
              setAddImagesOpen(false);
            } catch (e) {
              alert((e as Error).message);
            }
          }}
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
