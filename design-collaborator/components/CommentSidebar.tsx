
import React, { useState, useEffect } from 'react';
import type { Annotation, User } from '../types';

interface CommentSidebarProps {
  currentUser: User | null;
  annotations: Annotation[];
  pendingAnnotation: Annotation | null;
  activeAnnotationId: number | null;
  onAddComment: (annotationId: number, commentText: string) => void;
  onUpdateComment: (annotationId: number, commentId: number, newText: string) => void;
  onDeleteComment: (annotationId: number, commentId: number) => void;
  onCancelPending: () => void;
  onToggleSolve: (annotationId: number) => void;
}

const CommentIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-10 w-10 text-gray-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
    </svg>
);

const EditIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.5L15.232 5.232z" />
  </svg>
);

const DeleteIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-4 w-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
  </svg>
);

const CheckIcon: React.FC = () => (
  <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
  </svg>
);

const ReopenIcon: React.FC = () => (
    <svg xmlns="http://www.w3.org/2000/svg" className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 15l-2 5L9 9l11 4-5 2zm0 0l5 5M7.188 8.188A9.023 9.023 0 0112 5c4.97 0 9 4.03 9 9s-4.03 9-9 9a9 9 0 01-8.58-6.08" />
    </svg>
);


const CommentSidebar: React.FC<CommentSidebarProps> = ({ 
  currentUser,
  annotations, 
  pendingAnnotation, 
  activeAnnotationId, 
  onAddComment, 
  onUpdateComment, 
  onDeleteComment,
  onCancelPending,
  onToggleSolve
}) => {
  const [newComment, setNewComment] = useState('');
  const [editingComment, setEditingComment] = useState<{ id: number; text: string } | null>(null);

  const activeAnnotation = 
    (activeAnnotationId && pendingAnnotation?.id === activeAnnotationId ? pendingAnnotation : null) || 
    annotations.find(a => a.id === activeAnnotationId);

  const isPendingActive = activeAnnotation?.id === pendingAnnotation?.id;
  const isSolved = activeAnnotation?.isSolved ?? false;

  useEffect(() => {
    setNewComment('');
    setEditingComment(null);
  }, [activeAnnotationId]);

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (newComment.trim() && activeAnnotationId && !isSolved) {
      onAddComment(activeAnnotationId, newComment.trim());
      setNewComment('');
    }
  };

  const handleCancelNewComment = () => {
    if (isPendingActive) {
      onCancelPending();
    }
    setNewComment('');
  };

  const handleSaveEdit = () => {
    if (editingComment && activeAnnotationId && editingComment.text.trim() && !isSolved) {
      onUpdateComment(activeAnnotationId, editingComment.id, editingComment.text.trim());
      setEditingComment(null);
    }
  };

  return (
    <div className="bg-gray-800 rounded-lg shadow-2xl h-full flex flex-col p-6">
      <div className="flex justify-between items-center border-b border-gray-700 pb-3 mb-4">
        <h2 className="text-xl font-bold text-cyan-400">Comments</h2>
        {activeAnnotation && !isPendingActive && (
          <button
            onClick={() => onToggleSolve(activeAnnotation.id)}
            className={`flex items-center px-3 py-1 text-sm font-semibold rounded-md transition-colors ${
              isSolved 
              ? 'bg-yellow-600 hover:bg-yellow-700 text-white' 
              : 'bg-green-600 hover:bg-green-700 text-white'
            }`}
          >
            {isSolved ? <ReopenIcon /> : <CheckIcon />}
            {isSolved ? 'Re-open' : 'Mark as Solved'}
          </button>
        )}
      </div>

      <div className="flex-grow overflow-y-auto pr-2 relative">
        {!activeAnnotation ? (
          <div className="h-full flex flex-col items-center justify-center text-center text-gray-500">
            <CommentIcon />
            <p className="mt-4 font-semibold">No selection active</p>
            <p className="text-sm">Click an existing selection or drag on the image to create a new one.</p>
          </div>
        ) : (
          <div>
            {isSolved && (
                <div className="bg-green-900/50 border border-green-700 text-green-300 text-center p-3 rounded-lg mb-4">
                    <p className="font-bold">This discussion has been marked as resolved.</p>
                </div>
            )}
            {activeAnnotation.comments.length === 0 && (
              <p className="text-gray-400 text-sm italic">
                {isPendingActive ? 'Add a comment to save this selection.' : 'Be the first to comment on this selection.'}
              </p>
            )}
            <div className="space-y-4">
              {activeAnnotation.comments.map((comment) => {
                 const canModify = currentUser?.email === comment.userId;
                 return editingComment?.id === comment.id && !isSolved ? (
                  // EDITING VIEW
                  <div key={comment.id} className="bg-gray-700 p-3 rounded-lg">
                    <textarea
                      value={editingComment.text}
                      onChange={(e) => setEditingComment({ ...editingComment, text: e.target.value })}
                      className="w-full p-2 bg-gray-900 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition"
                      rows={3}
                      autoFocus
                    />
                    <div className="flex items-center justify-end gap-2 mt-2">
                      <button 
                        onClick={() => setEditingComment(null)}
                        className="px-3 py-1 bg-gray-600 text-white text-sm font-semibold rounded-md hover:bg-gray-500 transition-colors"
                      >
                        Cancel
                      </button>
                      <button 
                        onClick={handleSaveEdit}
                        disabled={!editingComment.text.trim()}
                        className="px-3 py-1 bg-cyan-600 text-white text-sm font-semibold rounded-md hover:bg-cyan-700 disabled:bg-gray-500 transition-colors"
                      >
                        Save
                      </button>
                    </div>
                  </div>
                ) : (
                  // DISPLAY VIEW
                  <div key={comment.id} className="bg-gray-700/50 p-3 rounded-lg group relative">
                     {canModify && !isSolved && (
                        <div className="absolute top-2 right-2 flex gap-2 opacity-0 group-hover:opacity-100 transition-opacity">
                            <button
                            onClick={() => setEditingComment({ id: comment.id, text: comment.text })}
                            className="p-1.5 rounded-full bg-gray-600 text-gray-300 hover:bg-yellow-500 hover:text-white"
                            aria-label="Edit comment"
                            >
                            <EditIcon />
                            </button>
                            <button 
                            onClick={() => activeAnnotationId && onDeleteComment(activeAnnotationId, comment.id)}
                            className="p-1.5 rounded-full bg-gray-600 text-gray-300 hover:bg-red-500 hover:text-white"
                            aria-label="Delete comment"
                            >
                            <DeleteIcon />
                            </button>
                        </div>
                     )}
                    <div className="flex items-baseline gap-2 mb-1">
                        <p className="font-bold text-sm text-yellow-400">{comment.author}</p>
                        <p className="text-xs text-gray-500">{new Date(comment.timestamp).toLocaleString()}</p>
                    </div>
                    <p className="text-gray-300 whitespace-pre-wrap pr-16">{comment.text}</p>
                  </div>
                )
              })}
            </div>
          </div>
        )}
      </div>
      {activeAnnotation && (
        <div className="mt-4 pt-4 border-t border-gray-700">
          <form onSubmit={handleSubmit}>
            <textarea
              value={newComment}
              onChange={(e) => setNewComment(e.target.value)}
              placeholder={isSolved ? "This thread is solved." : "Add your comment..."}
              className="w-full p-2 bg-gray-700 border border-gray-600 rounded-md focus:ring-2 focus:ring-cyan-500 focus:border-cyan-500 outline-none transition disabled:bg-gray-800 disabled:cursor-not-allowed"
              rows={3}
              disabled={isSolved}
            />
            <div className="flex gap-2 mt-2">
              <button
                type="submit"
                disabled={!newComment.trim() || isSolved}
                className="flex-grow px-4 py-2 bg-cyan-600 text-white font-semibold rounded-md hover:bg-cyan-700 disabled:bg-gray-600 disabled:cursor-not-allowed transition-colors"
              >
                {isPendingActive ? 'Save Selection' : 'Post Comment'}
              </button>
              {(newComment.trim() || isPendingActive) && !isSolved && (
                  <button
                      type="button"
                      onClick={handleCancelNewComment}
                      className="flex-shrink-0 px-4 py-2 bg-gray-600 text-white font-semibold rounded-md hover:bg-gray-500 transition-colors"
                  >
                      Cancel
                  </button>
              )}
            </div>
          </form>
        </div>
      )}
    </div>
  );
};

export default CommentSidebar;
