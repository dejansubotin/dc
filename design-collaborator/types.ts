
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
  imageUrl: string;
  annotations: Annotation[];
  password?: string;
  collaboratorIds: string[]; // array of user emails
  createdAt: number;
}
