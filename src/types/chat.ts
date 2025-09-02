// types/chat.ts
export interface Message {
  id: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string; // Always string for consistency with Firestore
  isStreaming?: boolean;
  error?: string;
}

export interface ChatMessage extends Message {
  // ChatMessage is the same as Message for now
  // This ensures compatibility with existing code
}

export interface ChatSession {
  id: string;
  userId: string;
  title: string;
  messages: ChatMessage[];
  createdAt: string; // Always string for consistency with Firestore
  updatedAt: string; // Always string for consistency with Firestore
  messageCount: number;
  isActive?: boolean;
  metadata?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  };
}

export interface UserProfile {
  id: string;
  uid: string;
  email: string;
  displayName: string;
  photoURL: string | null;
  createdAt: string;
  updatedAt: string;
  preferences?: {
    theme?: 'light' | 'dark';
    language?: string;
    notifications?: boolean;
    defaultModel?: string;
    defaultTemperature?: number;
  };
  subscription?: {
    plan: 'free' | 'premium' | 'pro';
    status: 'active' | 'inactive' | 'cancelled';
    expiresAt?: string;
  };
}

export interface ConversationSummary {
  id: string;
  title: string;
  messageCount: number;
  lastMessageAt: string;
  preview: string; // First few words of the last message
}

export interface ChatSettings {
  model: string;
  temperature: number;
  maxTokens: number;
  streamResponse: boolean;
  systemPrompt?: string;
}

export interface ApiError {
  code: string;
  message: string;
  details?: any;
}

export interface StreamingResponse {
  id: string;
  content: string;
  isComplete: boolean;
  error?: string;
}

// Utility types for API responses
export interface CreateSessionResponse {
  session: ChatSession;
  success: boolean;
  error?: string;
}

export interface SendMessageResponse {
  message: Message;
  success: boolean;
  error?: string;
}

export interface UpdateSessionResponse {
  session: ChatSession;
  success: boolean;
  error?: string;
}

// Firestore document types (for internal use)
export interface FirestoreMessage {
  id?: string;
  role: 'user' | 'assistant' | 'system';
  content: string;
  timestamp: string;
  isStreaming?: boolean;
  error?: string;
  sessionId?: string;
  userId?: string;
}

export interface FirestoreSession {
  id?: string;
  userId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  isActive?: boolean;
  metadata?: {
    model?: string;
    temperature?: number;
    maxTokens?: number;
    [key: string]: any;
  };
}

// Hook return types
export interface UseChatReturn {
  currentSession: ChatSession;
  isLoading: boolean;
  error: string | null;
  streamingMessageId: string | null;
  sendMessage: (content: string) => Promise<void>;
  stopGeneration: () => void;
  clearChat: () => void;
  regenerateResponse: (messageIndex: number) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
}

export interface UseChatWithFirestoreReturn {
  // State
  sessions: ChatSession[];
  currentSessionId: string | null;
  messages: Message[];
  isLoading: boolean;
  error: string | null;
  loadingSessions: boolean;
  streamingMessageId: string | null;
  
  // Actions
  createNewSession: (firstMessage?: Message) => Promise<ChatSession>;
  selectSession: (sessionId: string) => void;
  sendMessage: (content: string) => Promise<void>;
  regenerateResponse: (messageIndex: number) => Promise<void>;
  editMessage: (messageId: string, newContent: string) => Promise<void>;
  deleteSession: (sessionId: string) => Promise<void>;
  clearCurrentSession: () => Promise<void>;
  stopGeneration: () => void;
  
  // Getters
  getCurrentSession: () => ChatSession | null;
  getSessionStats: () => any;
  exportChatHistory: () => Promise<any>;
  
  // Auth state
  isAuthenticated: boolean;
  user: any;
}

// Component prop types
export interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
}

export interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onStop?: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

export interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  currentSessionId: string;
}

export interface EmptyStateProps {
  onSendMessage: (message: string) => void;
}

// Utility functions for type conversion
export const createMessage = (
  role: 'user' | 'assistant' | 'system',
  content: string,
  id?: string
): Message => ({
  id: id || Date.now().toString(),
  role,
  content,
  timestamp: new Date().toISOString()
});

export const createChatSession = (
  userId: string,
  title: string,
  id?: string
): ChatSession => ({
  id: id || Date.now().toString(),
  userId,
  title,
  messages: [],
  createdAt: new Date().toISOString(),
  updatedAt: new Date().toISOString(),
  messageCount: 0,
  isActive: true
});

export const formatTimestamp = (timestamp: string | Date): string => {
  const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
  return date.toISOString();
};

export const parseTimestamp = (timestamp: string): Date => {
  return new Date(timestamp);
};

// Validation functions
export const isValidMessage = (message: any): message is Message => {
  return (
    typeof message === 'object' &&
    typeof message.id === 'string' &&
    ['user', 'assistant', 'system'].includes(message.role) &&
    typeof message.content === 'string' &&
    typeof message.timestamp === 'string'
  );
};

export const isValidChatSession = (session: any): session is ChatSession => {
  return (
    typeof session === 'object' &&
    typeof session.id === 'string' &&
    typeof session.userId === 'string' &&
    typeof session.title === 'string' &&
    Array.isArray(session.messages) &&
    typeof session.createdAt === 'string' &&
    typeof session.updatedAt === 'string' &&
    typeof session.messageCount === 'number'
  );
};