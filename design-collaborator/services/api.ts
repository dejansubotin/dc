import type { User, Session, Annotation } from '../types';

const API_BASE_URL = '/api'; // Using a relative URL for proxying
const CURRENT_USER_KEY = 'image-collaborator-user';

async function handleResponse<T>(response: Response): Promise<T> {
  const contentType = response.headers.get('content-type');
  if (!response.ok) {
    let errorMessage = `HTTP error! status: ${response.status}`;
    if (contentType && contentType.includes('application/json')) {
      const errorJson = await response.json();
      errorMessage = errorJson.error || errorMessage;
    } else {
      const errorText = await response.text();
      errorMessage = errorText || errorMessage;
    }
    throw new Error(errorMessage);
  }
  if (contentType && contentType.includes('application/json')) {
    return response.json();
  }
  // Handle non-json responses if necessary
  return response.text() as unknown as T;
}

// --- Local User Management ---

export function getLocalUser(): User | null {
  try {
    const userJson = localStorage.getItem(CURRENT_USER_KEY);
    return userJson ? JSON.parse(userJson) : null;
  } catch (error) {
    console.error("Error retrieving current user:", error);
    return null;
  }
}

export function setLocalUser(user: User | null) {
  if (user) {
    localStorage.setItem(CURRENT_USER_KEY, JSON.stringify(user));
  } else {
    localStorage.removeItem(CURRENT_USER_KEY);
  }
}

// --- API Calls ---

// Fix: Explicitly type the response handling to resolve promise type mismatch.
export const createUser = (email: string, displayName: string, honeypot?: string): Promise<User> => {
  return fetch(`${API_BASE_URL}/users`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, displayName, honeypot }),
  }).then(response => handleResponse<User>(response));
};

// Fix: Explicitly type the response handling to resolve promise type mismatch.
export const createSession = (ownerEmail: string, imageDataUrl: string, sessionName?: string, sessionDescription?: string, thumbnailDataUrl?: string): Promise<Session> => {
    return fetch(`${API_BASE_URL}/sessions`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ ownerEmail, imageDataUrl, sessionName, sessionDescription, thumbnailDataUrl }),
    }).then(response => handleResponse<Session>(response));
};

export const createSessionMulti = (
  ownerEmail: string,
  images: { imageDataUrl: string; thumbnailDataUrl?: string }[],
  sessionName?: string,
  sessionDescription?: string,
): Promise<Session> => {
  return fetch(`${API_BASE_URL}/sessions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ ownerEmail, images, sessionName, sessionDescription }),
  }).then(response => handleResponse<Session>(response));
};

// Fix: Explicitly type the response handling to resolve promise type mismatch.
export const getSession = (sessionId: string): Promise<Session> => {
    const user = getLocalUser();
    const headers: Record<string, string> = {};
    if (user?.email) headers['x-user-email'] = user.email;
    return fetch(`${API_BASE_URL}/sessions/${sessionId}`, { headers }).then(response => handleResponse<Session>(response));
};

// Fix: Explicitly type the response handling to resolve promise type mismatch.
export const getUserSessions = (email: string): Promise<Session[]> => {
    return fetch(`${API_BASE_URL}/users/${email}/sessions`).then(response => handleResponse<Session[]>(response));
};

// Fix: Explicitly type the response handling to resolve promise type mismatch.
export const joinSession = (sessionId: string, email: string, displayName: string, password?: string, honeypot?: string): Promise<Session> => {
    return fetch(`${API_BASE_URL}/sessions/${sessionId}/collaborators`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, displayName, password, honeypot }),
    }).then(response => handleResponse<Session>(response));
};

// Fix: Explicitly type the response handling to resolve promise type mismatch.
export const setSessionPassword = (sessionId: string, password?: string): Promise<Session> => {
    const actor = getLocalUser()?.email;
    return fetch(`${API_BASE_URL}/sessions/${sessionId}/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ password, actor }),
    }).then(response => handleResponse<Session>(response));
};

// Fix: Explicitly type the response handling to resolve promise type mismatch.
export const addAnnotation = (sessionId: string, annotation: Annotation): Promise<Session> => {
    const actor = getLocalUser()?.email;
    return fetch(`${API_BASE_URL}/sessions/${sessionId}/annotations`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ annotation, actor }),
    }).then(response => handleResponse<Session>(response));
};

// Fix: Explicitly type the response handling to resolve promise type mismatch.
export const deleteAnnotation = (sessionId: string, annotationId: number): Promise<Session> => {
    return fetch(`${API_BASE_URL}/sessions/${sessionId}/annotations/${annotationId}`, {
        method: 'DELETE',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ actor: getLocalUser()?.email }),
    }).then(response => handleResponse<Session>(response));
};

// Fix: Explicitly type the response handling to resolve promise type mismatch.
export const toggleAnnotationSolve = (sessionId: string, annotationId: number, isSolved: boolean): Promise<Session> => {
    return fetch(`${API_BASE_URL}/sessions/${sessionId}/annotations/${annotationId}/solve`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ isSolved, actor: getLocalUser()?.email }),
    }).then(response => handleResponse<Session>(response));
};

// Fix: Explicitly type the response handling to resolve promise type mismatch.
export const addComment = (sessionId: string, annotationId: number, userEmail: string, text: string, parentId?: number): Promise<Session> => {
    return fetch(`${API_BASE_URL}/sessions/${sessionId}/annotations/${annotationId}/comments`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userEmail, text, parentId }),
    }).then(response => handleResponse<Session>(response));
};

// Fix: Explicitly type the response handling to resolve promise type mismatch.
export const updateComment = (sessionId: string, annotationId: number, commentId: number, text: string): Promise<Session> => {
    return fetch(`${API_BASE_URL}/sessions/${sessionId}/annotations/${annotationId}/comments/${commentId}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ text }),
    }).then(response => handleResponse<Session>(response));
};

// Fix: Explicitly type the response handling to resolve promise type mismatch.
export const deleteComment = (sessionId: string, annotationId: number, commentId: number): Promise<Session> => {
    return fetch(`${API_BASE_URL}/sessions/${sessionId}/annotations/${annotationId}/comments/${commentId}`, {
        method: 'DELETE',
    }).then(response => handleResponse<Session>(response));
};

export const likeComment = (sessionId: string, annotationId: number, commentId: number, like: boolean): Promise<Session> => {
  const user = getLocalUser();
  return fetch(`${API_BASE_URL}/sessions/${sessionId}/annotations/${annotationId}/comments/${commentId}/like`, {
    method: 'PUT',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ userEmail: user?.email, like }),
  }).then(response => handleResponse<Session>(response));
};

export const removeCollaborator = (sessionId: string, email: string): Promise<Session> => {
  const user = getLocalUser();
  return fetch(`${API_BASE_URL}/sessions/${sessionId}/collaborators/${encodeURIComponent(email)}`, {
    method: 'DELETE',
    headers: { 'x-user-email': user?.email || '' },
  }).then(response => handleResponse<Session>(response));
};

export const disableSession = (sessionId: string): Promise<Session> => {
  const user = getLocalUser();
  return fetch(`${API_BASE_URL}/sessions/${sessionId}/disable`, {
    method: 'POST',
    headers: { 'x-user-email': user?.email || '' },
  }).then(response => handleResponse<Session>(response));
};

export const restoreSession = (sessionId: string): Promise<Session> => {
  const user = getLocalUser();
  return fetch(`${API_BASE_URL}/sessions/${sessionId}/restore`, {
    method: 'POST',
    headers: { 'x-user-email': user?.email || '' },
  }).then(response => handleResponse<Session>(response));
};
