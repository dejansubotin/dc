
export interface User {
  email: string;
  displayName: string;
}

export interface Comment {
  id: number;
  userId: string; // user's email
  author: string; // user's displayName
  text: string;
  timestamp: number;
  parentId?: number; // optional parent comment id for replies
  likes?: string[]; // user emails that liked this comment
}

export interface Annotation {
  id: number;
  x: number; // percentage
  y: number; // percentage
  width: number; // percentage
  height: number; // percentage
  comments: Comment[];
  isSolved: boolean;
}

export interface SelectionRectangle {
    x: number;
    y: number;
    width: number;
    height: number;
}

export interface Session {
  id: string;
  ownerId: string; // user's email
  sessionName?: string;
  sessionDescription?: string;
  imageUrl: string;
  sessionThumbnailUrl?: string;
  annotations: Annotation[];
  password?: string;
  collaboratorIds: string[]; // array of user emails
  createdAt: number;
  history?: HistoryEvent[];
  collaboratorProfiles?: Collaborator[];
}

export interface HistoryEvent {
  id: number; // epoch ms unique enough
  type: 'session_created' | 'user_joined' | 'password_set' | 'password_removed' | 'annotation_added' | 'annotation_deleted' | 'annotation_solved' | 'annotation_reopened' | 'comment_added' | 'comment_liked' | 'comment_unliked';
  actor?: string; // email of user performing action
  message: string;
  timestamp: number;
}

export interface Collaborator {
  email: string;
  displayName: string;
}
