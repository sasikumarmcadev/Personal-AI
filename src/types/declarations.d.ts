// types/declarations.d.ts
declare module '*.js' {
  const content: any;
  export default content;
}

declare module '../../hooks/useChatWithFirestore' {
  import { User } from 'firebase/auth';
  
  export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    isStreaming?: boolean;
  }

  export interface ChatSession {
    id: string;
    title: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
  }

  export interface UseChatWithFirestoreReturn {
    sessions: ChatSession[];
    currentSessionId: string | null;
    messages: ChatMessage[];
    isLoading: boolean;
    error: string | null;
    loadingSessions: boolean;
    createNewSession: (firstMessage?: ChatMessage) => Promise<ChatSession>;
    selectSession: (sessionId: string) => void;
    sendMessage: (content: string) => Promise<void>;
    regenerateResponse: (messageIndex: number) => Promise<void>;
    deleteSession: (sessionId: string) => Promise<void>;
    stopGeneration: () => void;
    getCurrentSession: () => ChatSession | null;
    isAuthenticated: boolean;
    user: User | null;
  }

  export function useChatWithFirestore(): UseChatWithFirestoreReturn;
}

declare module '../../lib/firebase.js' {
  import { Auth, GoogleAuthProvider } from 'firebase/auth';
  import { Firestore } from 'firebase/firestore';
  
  export const auth: Auth;
  export const db: Firestore;
  export const googleProvider: GoogleAuthProvider;
}

declare module '../../lib/firestoreService.js' {
  import { User } from 'firebase/auth';
  
  export interface ChatMessage {
    id: string;
    role: 'user' | 'assistant';
    content: string;
    timestamp: string;
    isStreaming?: boolean;
  }

  export interface ChatSession {
    id: string;
    title: string;
    userId: string;
    createdAt: string;
    updatedAt: string;
  }

  export function createOrUpdateUser(user: User): Promise<void>;
  export function createChatSession(userId: string, title: string): Promise<ChatSession>;
  export function getUserChatSessions(userId: string): Promise<ChatSession[]>;
  export function addMessage(sessionId: string, message: Omit<ChatMessage, 'id'>): Promise<void>;
  export function updateChatSessionTitle(sessionId: string, title: string): Promise<void>;
  export function deleteChatSession(sessionId: string): Promise<void>;
  export function generateSessionTitle(message: ChatMessage | Omit<ChatMessage, 'id'>): string;
  export function subscribeToUserSessions(userId: string, callback: (sessions: ChatSession[]) => void): () => void;
  export function subscribeToSessionMessages(sessionId: string, callback: (messages: ChatMessage[]) => void): () => void;
}