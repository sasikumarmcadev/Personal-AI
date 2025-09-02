// App.tsx - Fixed version with optimized re-rendering
import React, { useState, useEffect, useCallback, useRef, useMemo } from 'react';
import { Menu, AlertCircle, Loader2 } from 'lucide-react';
import Sidebar from './components/chat/Sidebar';
import MobileHeader from './components/chat/Header';
import ChatInput from './components/chat/ChatInput';
import MessageBubble from './components/chat/MessageBubble';
import EmptyState from './components/chat/EmptyState';
import { ApiKeySetup } from './components/ui/ApiKeySetup';
import { AuthProvider, useAuth } from './components/chat/AuthContext';
import { ChatSession, Message } from './types/chat';
import { createChatCompletion, GroqMessage } from './services/groqClient';
import {
  createChatSession,
  deleteChatSession,
  subscribeToUserSessions,
  subscribeToSessionMessages,
  generateSessionTitle,
  addMessage,
  updateMessage,
  updateChatSessionTitle,
  updateChatSessionMessageCount
} from './lib/firestoreService';

// Define types for the callback parameters
interface FirestoreSession {
  id: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  messageCount: number;
  userId?: string;
}

interface FirestoreMessage {
  id: string;
  role: string;
  content: string;
  timestamp: string;
  isStreaming?: boolean;
}

// Helper function to convert Firestore session to ChatSession
const convertFirestoreSession = (session: FirestoreSession): ChatSession => ({
  id: session.id,
  userId: session.userId || '',
  title: session.title,
  messages: [],
  createdAt: typeof session.createdAt === 'string' ? session.createdAt : new Date(session.createdAt).toISOString(),
  updatedAt: typeof session.updatedAt === 'string' ? session.updatedAt : new Date(session.updatedAt).toISOString(),
  messageCount: session.messageCount
});

// Helper function to convert Firestore message to Message
const convertFirestoreMessage = (msg: FirestoreMessage): Message => ({
  id: msg.id,
  role: msg.role as 'user' | 'assistant',
  content: msg.content,
  timestamp: typeof msg.timestamp === 'string' ? msg.timestamp : new Date(msg.timestamp).toISOString(),
  isStreaming: msg.isStreaming || false
});

// Memoized Empty State Component
const MemoizedEmptyState = React.memo(EmptyState);

// Memoized Message Bubble Component with proper comparison
const MemoizedMessageBubble = React.memo(MessageBubble, (prevProps, nextProps) => {
  return (
    prevProps.message.id === nextProps.message.id &&
    prevProps.message.content === nextProps.message.content &&
    prevProps.message.isStreaming === nextProps.message.isStreaming &&
    prevProps.showRegenerate === nextProps.showRegenerate
  );
});

// Memoized Sidebar Component
const MemoizedSidebar = React.memo(Sidebar, (prevProps, nextProps) => {
  return (
    prevProps.isOpen === nextProps.isOpen &&
    prevProps.currentSessionId === nextProps.currentSessionId &&
    prevProps.sessions.length === nextProps.sessions.length &&
    JSON.stringify(prevProps.sessions) === JSON.stringify(nextProps.sessions)
  );
});

// Memoized Mobile Header Component
const MemoizedMobileHeader = React.memo(MobileHeader);

// Memoized Chat Input Component
const MemoizedChatInput = React.memo(ChatInput, (prevProps, nextProps) => {
  return (
    prevProps.isLoading === nextProps.isLoading &&
    prevProps.disabled === nextProps.disabled
  );
});

// Main App Content Component with optimized state management
const AppContent: React.FC = () => {
  const { currentUser, userDataLoaded } = useAuth();
  const [hasApiKey, setHasApiKey] = useState(false);
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(() => window.innerWidth < 1024);
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [currentSessionId, setCurrentSessionId] = useState<string>('');
  const [messages, setMessages] = useState<Message[]>([]);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);

  // Refs to prevent unnecessary re-renders and track state
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  const lastSessionUpdateRef = useRef<string>('');
  const lastMessageUpdateRef = useRef<string>('');
  const initializationRef = useRef<boolean>(false);
  const sessionSubscriptionRef = useRef<(() => void) | null>(null);
  const messageSubscriptionRef = useRef<(() => void) | null>(null);
  const resizeTimeoutRef = useRef<NodeJS.Timeout | null>(null);
  const scrollTimeoutRef = useRef<NodeJS.Timeout | null>(null);

  // Memoized values to prevent re-renders
  const isAuthenticated = useMemo(() => !!currentUser, [currentUser]);
  const hasValidSession = useMemo(() => !!currentSessionId && currentSessionId !== '', [currentSessionId]);
  const hasMessages = useMemo(() => messages.length > 0, [messages.length]);

  // Stable callback references using useCallback with proper dependencies
  const scrollToBottom = useCallback(() => {
    if (scrollTimeoutRef.current) {
      clearTimeout(scrollTimeoutRef.current);
    }
    scrollTimeoutRef.current = setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  }, []);

  // Optimized message effect with proper cleanup
  useEffect(() => {
    const currentMessageIds = messages.map(m => `${m.id}-${m.content.length}`).join(',');
    if (lastMessageUpdateRef.current !== currentMessageIds && messages.length > 0) {
      lastMessageUpdateRef.current = currentMessageIds;
      scrollToBottom();
    }
    return () => {
      if (scrollTimeoutRef.current) {
        clearTimeout(scrollTimeoutRef.current);
      }
    };
  }, [messages, scrollToBottom]);

  // Optimized resize handler
  useEffect(() => {
    const handleResize = () => {
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
      resizeTimeoutRef.current = setTimeout(() => {
        const newIsMobile = window.innerWidth < 1024;
        setIsMobile(prev => {
          if (prev !== newIsMobile) {
            if (newIsMobile && sidebarOpen) {
              setSidebarOpen(false);
            }
            return newIsMobile;
          }
          return prev;
        });
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    return () => {
      window.removeEventListener('resize', handleResize);
      if (resizeTimeoutRef.current) {
        clearTimeout(resizeTimeoutRef.current);
      }
    };
  }, [sidebarOpen]);

  // API key check - only runs once
  useEffect(() => {
    const apiKey = import.meta.env.VITE_GROQ_API_KEY;
    setHasApiKey(!!apiKey && apiKey !== 'your_groq_api_key_here');
  }, []);

  const handleApiKeySet = useCallback(() => {
    setHasApiKey(true);
  }, []);

  // Optimized session subscription with proper cleanup
  useEffect(() => {
    // Clean up any existing subscription
    if (sessionSubscriptionRef.current) {
      sessionSubscriptionRef.current();
      sessionSubscriptionRef.current = null;
    }

    if (currentUser && userDataLoaded) {
      if (!initializationRef.current) {
        setLoadingSessions(true);
        initializationRef.current = true;
      }

      sessionSubscriptionRef.current = subscribeToUserSessions(currentUser.uid, (updatedSessions: FirestoreSession[]) => {
        const sessionHash = updatedSessions.map(s => `${s.id}-${s.updatedAt}`).join(',');
        
        // Only update if sessions actually changed
        if (lastSessionUpdateRef.current !== sessionHash) {
          lastSessionUpdateRef.current = sessionHash;
          
          const formattedSessions: ChatSession[] = updatedSessions.map(convertFirestoreSession);
          
          setSessions(prev => {
            // Deep comparison to prevent unnecessary updates
            if (JSON.stringify(prev) === JSON.stringify(formattedSessions)) {
              return prev;
            }
            return formattedSessions;
          });
          
          setLoadingSessions(false);

          // Handle session selection with functional updates
          setCurrentSessionId(prevSessionId => {
            if (!prevSessionId && formattedSessions.length > 0) {
              return formattedSessions[0].id;
            } else if (prevSessionId && !formattedSessions.find(s => s.id === prevSessionId)) {
              if (formattedSessions.length > 0) {
                return formattedSessions[0].id;
              } else {
                setMessages([]);
                return '';
              }
            }
            return prevSessionId;
          });
        } else {
          setLoadingSessions(false);
        }
      });
    } else if (!currentUser) {
      // Reset state when user logs out
      setSessions([]);
      setCurrentSessionId('');
      setMessages([]);
      setLoadingSessions(false);
      initializationRef.current = false;
    }

    return () => {
      if (sessionSubscriptionRef.current) {
        sessionSubscriptionRef.current();
        sessionSubscriptionRef.current = null;
      }
    };
  }, [currentUser, userDataLoaded]);

  // Optimized message subscription with proper cleanup
  useEffect(() => {
    // Clean up existing subscription
    if (messageSubscriptionRef.current) {
      messageSubscriptionRef.current();
      messageSubscriptionRef.current = null;
    }

    if (currentSessionId && !currentSessionId.startsWith('temp-')) {
      console.log('Setting up message subscription for session:', currentSessionId);
      
      messageSubscriptionRef.current = subscribeToSessionMessages(currentSessionId, (firestoreMessages: FirestoreMessage[]) => {
        console.log('Received messages from Firestore:', firestoreMessages);
        
        const messageHash = firestoreMessages.map(m => `${m.id}-${m.content.length}-${m.isStreaming}`).join(',');
        
        // Only update if messages actually changed
        if (lastMessageUpdateRef.current !== messageHash) {
          lastMessageUpdateRef.current = messageHash;
          const convertedMessages = firestoreMessages.map(convertFirestoreMessage);
          console.log('Converting and setting messages:', convertedMessages);
          
          setMessages(convertedMessages);
        }
      });
    } else if (currentSessionId.startsWith('temp-')) {
      // For temp sessions, don't clear messages - they're managed locally
      console.log('Using local messages for temp session:', currentSessionId);
    } else if (!currentSessionId || currentSessionId === '') {
      console.log('No session selected, clearing messages');
      setMessages([]);
      lastMessageUpdateRef.current = '';
    }

    return () => {
      if (messageSubscriptionRef.current) {
        messageSubscriptionRef.current();
        messageSubscriptionRef.current = null;
      }
    };
  }, [currentSessionId]);

  // Stable handlers using useCallback with proper dependencies
  const handleNewChat = useCallback(async () => {
    if (!currentUser) {
      const tempSessionId = `temp-${Date.now()}`;
      setCurrentSessionId(tempSessionId);
      setMessages([]);
      setSidebarOpen(false);
      return;
    }

    try {
      const newSession = await createChatSession(currentUser.uid, 'New conversation');
      setCurrentSessionId(newSession.id);
      setSidebarOpen(false);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  }, [currentUser]);

  const handleSelectSession = useCallback((sessionId: string) => {
    if (currentSessionId !== sessionId) {
      setCurrentSessionId(sessionId);
      setSidebarOpen(false);
    }
  }, [currentSessionId]);

  const handleDeleteSession = useCallback(async (sessionId: string) => {
    if (!currentUser) {
      if (currentSessionId === sessionId) {
        await handleNewChat();
      }
      return;
    }

    try {
      await deleteChatSession(sessionId);
    } catch (error) {
      console.error('Error deleting session:', error);
      throw error;
    }
  }, [currentUser, currentSessionId, handleNewChat]);

  const handleSendMessage = useCallback(async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    const trimmedContent = messageText.trim();
    
    setIsLoading(true);
    setError(null);

    // Create abort controller
    abortControllerRef.current = new AbortController();

    try {
      let sessionId = currentSessionId;
      let isNewSession = false;

      // Handle session creation/conversion
      if (!sessionId || sessionId === '') {
        if (currentUser) {
          const newSession = await createChatSession(currentUser.uid, generateSessionTitle({ content: trimmedContent }));
          sessionId = newSession.id;
          setCurrentSessionId(sessionId);
          isNewSession = true;
        } else {
          sessionId = `temp-${Date.now()}`;
          setCurrentSessionId(sessionId);
        }
      } else if (sessionId.startsWith('temp-') && currentUser) {
        const newSession = await createChatSession(currentUser.uid, generateSessionTitle({ content: trimmedContent }));
        sessionId = newSession.id;
        setCurrentSessionId(sessionId);
        isNewSession = true;
      }

      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: trimmedContent,
        timestamp: new Date().toISOString(),
      };

      const assistantMessageId = (Date.now() + 1).toString();
      const assistantMessage: Message = {
        id: assistantMessageId,
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      };

      // Always update local state first for immediate feedback
      setMessages(prev => [...prev, userMessage, assistantMessage]);

      // Handle Firestore operations for authenticated users
      let savedUserMessage = null;
      let savedAssistantMessage = null;
      
      if (currentUser && !sessionId.startsWith('temp-')) {
        try {
          savedUserMessage = await addMessage(sessionId, {
            role: 'user',
            content: trimmedContent,
            timestamp: new Date().toISOString()
          });

          savedAssistantMessage = await addMessage(sessionId, {
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            isStreaming: true
          });
          
          setStreamingMessageId(savedAssistantMessage.id);
        } catch (firestoreError) {
          console.error('Firestore error (continuing with local state):', firestoreError);
          // Continue with local state even if Firestore fails
        }
      }

      // Prepare conversation history for AI
      const currentMessages = sessionId.startsWith('temp-') ? messages : messages;
      const conversationHistory: GroqMessage[] = currentMessages
        .filter(msg => msg.content.trim() !== '' && !msg.isStreaming)
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      // Add current user message to conversation
      conversationHistory.push({ role: 'user', content: trimmedContent });

      console.log('Sending to AI:', conversationHistory);

      try {
        const aiResponse = await createChatCompletion(conversationHistory);

        console.log('AI Response:', aiResponse);

        if (!aiResponse || aiResponse.trim() === '') {
          throw new Error('Empty response from AI service');
        }

        // Update local state with AI response
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: aiResponse, isStreaming: false }
            : msg
        ));

        // Update Firestore if authenticated
        if (currentUser && savedAssistantMessage && !sessionId.startsWith('temp-')) {
          try {
            await updateMessage(savedAssistantMessage.id, {
              content: aiResponse,
              isStreaming: false,
              timestamp: new Date().toISOString()
            });
          } catch (firestoreError) {
            console.error('Error updating message in Firestore:', firestoreError);
            // Local state is already updated, so this is not critical
          }
        }

        // Handle session title and count updates
        if (currentUser && !sessionId.startsWith('temp-') && (isNewSession || messages.length === 0)) {
          try {
            const title = generateSessionTitle({ content: trimmedContent });
            await updateChatSessionTitle(sessionId, title);
            await updateChatSessionMessageCount(sessionId, 2);
          } catch (firestoreError) {
            console.error('Error updating session metadata:', firestoreError);
          }
        }

      } catch (aiError) {
        console.error('AI API error:', aiError);
        
        const errorMessage = aiError instanceof Error 
          ? `Sorry, I encountered an error: ${aiError.message}` 
          : 'Sorry, I encountered an error while processing your request. Please try again.';
        
        // Update local state with error
        setMessages(prev => prev.map(msg => 
          msg.id === assistantMessageId 
            ? { ...msg, content: errorMessage, isStreaming: false, error: errorMessage }
            : msg
        ));

        // Update Firestore with error if applicable
        if (currentUser && savedAssistantMessage && !sessionId.startsWith('temp-')) {
          try {
            await updateMessage(savedAssistantMessage.id, {
              content: errorMessage,
              isStreaming: false,
              timestamp: new Date().toISOString()
            });
          } catch (firestoreError) {
            console.error('Error updating error message in Firestore:', firestoreError);
          }
        }
        
        setError('Failed to get AI response. Please try again.');
      }

    } catch (err) {
      console.error('Error sending message:', err);
      setError(err instanceof Error ? err.message : 'Failed to send message. Please try again.');
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
      abortControllerRef.current = null;
      setSidebarOpen(false);
    }
  }, [currentSessionId, currentUser, messages, isLoading]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    setStreamingMessageId(null);
  }, []);

  const handleRegenerate = useCallback(async (messageIndex: number) => {
    if (messageIndex < 1 || messageIndex >= messages.length || isLoading) return;

    const targetMessage = messages[messageIndex];
    if (!targetMessage || targetMessage.role !== 'assistant') return;

    setIsLoading(true);
    setError(null);

    try {
      const conversationHistory: GroqMessage[] = messages
        .slice(0, messageIndex)
        .filter(msg => msg.content.trim() !== '')
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      const newResponse = await createChatCompletion(conversationHistory);

      if (!newResponse || newResponse.trim() === '') {
        throw new Error('Empty response from AI service');
      }

      // Update the message
      if (currentSessionId.startsWith('temp-')) {
        setMessages(prev => prev.map((msg, index) => 
          index === messageIndex 
            ? { ...msg, content: newResponse, timestamp: new Date().toISOString(), isStreaming: false }
            : msg
        ));
      } else if (currentUser) {
        await updateMessage(targetMessage.id, {
          content: newResponse,
          timestamp: new Date().toISOString(),
          isStreaming: false
        });
      }

    } catch (err) {
      console.error('Error regenerating response:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [messages, currentSessionId, currentUser, isLoading]);

  // Stable callback handlers for UI components
  const handleSidebarClose = useCallback(() => {
    setSidebarOpen(false);
  }, []);

  const handleMenuClick = useCallback(() => {
    setSidebarOpen(true);
  }, []);

  // Optimized memoized components with stable props
  const sidebarProps = useMemo(() => ({
    isOpen: sidebarOpen,
    onClose: handleSidebarClose,
    sessions,
    onNewChat: handleNewChat,
    onSelectSession: handleSelectSession,
    onDeleteSession: handleDeleteSession,
    currentSessionId: currentSessionId || ''
  }), [sidebarOpen, handleSidebarClose, sessions, handleNewChat, handleSelectSession, handleDeleteSession, currentSessionId]);

  const mobileHeaderProps = useMemo(() => ({
    onMenuClick: handleMenuClick,
    onNewChat: handleNewChat
  }), [handleMenuClick, handleNewChat]);

  const chatInputProps = useMemo(() => ({
    onSendMessage: handleSendMessage,
    onStop: stopGeneration,
    isLoading,
    disabled: false
  }), [handleSendMessage, stopGeneration, isLoading]);

  // Memoized message rendering with optimized key generation
  const messagesComponent = useMemo(() => {
    if (!hasValidSession || !hasMessages) {
      return <MemoizedEmptyState onSendMessage={handleSendMessage} />;
    }

    return (
      <div className="max-w-4xl mx-auto w-full px-2 sm:px-4">
        {messages.map((message: Message, index: number) => {
          const messageKey = `${message.id}-${message.content.length}-${message.isStreaming}`;
          const showRegenerate = message.role === 'assistant' &&
            index === messages.length - 1 &&
            !message.isStreaming &&
            !isLoading;

          return (
            <div 
              key={messageKey}
              className={`${message.role === 'assistant' ? 'bg-gray-50/30' : 'bg-white'}`}
            >
              <div className="max-w-3xl mx-auto px-2 md:px-4">
                <MemoizedMessageBubble
                  message={message}
                  onRegenerate={() => handleRegenerate(index)}
                  showRegenerate={showRegenerate}
                />
              </div>
            </div>
          );
        })}
        
        {isLoading && (
          <div className="bg-gray-50/30">
            <div className="max-w-3xl mx-auto px-2 md:px-4">
              <MemoizedMessageBubble
                message={{
                  id: 'loading-indicator',
                  role: 'assistant',
                  content: 'Thinking...',
                  timestamp: new Date().toISOString(),
                  isStreaming: true,
                }}
                showRegenerate={false}
              />
            </div>
          </div>
        )}
        
        <div ref={messagesEndRef} />
      </div>
    );
  }, [hasValidSession, hasMessages, messages, isLoading, handleSendMessage, handleRegenerate]);

  // Early returns with memoized components
  if (!hasApiKey) {
    return <ApiKeySetup onApiKeySet={handleApiKeySet} />;
  }

  if (loadingSessions && currentUser) {
    return (
      <div className="flex h-screen bg-gray-50 items-center justify-center">
        <div className="flex items-center space-x-2 text-gray-600">
          <Loader2 className="w-5 h-5 animate-spin" />
          <span>Loading your chats...</span>
        </div>
      </div>
    );
  }

  if (!currentUser) {
    return (
      <div className="flex h-screen bg-gray-50">
        <MemoizedSidebar
          isOpen={true}
          onClose={() => {}}
          sessions={[]}
          onNewChat={handleNewChat}
          onSelectSession={() => {}}
          onDeleteSession={() => {}}
          currentSessionId=""
        />
        <div className="flex-1 flex flex-col">
          <div className="flex-1 flex items-center justify-center">
            <div className="text-center p-8">
              <h2 className="text-2xl font-semibold text-gray-800 mb-4">Welcome to Sasi AI Assist</h2>
              <p className="text-gray-600 mb-6">Please sign in to start chatting and save your conversation history.</p>
            </div>
          </div>
          <div className="flex-shrink-0 bg-white border-t border-gray-200">
            <MemoizedChatInput {...chatInputProps} />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gray-50">
      <MemoizedSidebar {...sidebarProps} />

      <div className="flex-1 flex flex-col min-w-0">
        {isMobile && (
          <MemoizedMobileHeader {...mobileHeaderProps} />
        )}

        <div className="flex-1 flex flex-col min-h-0">
          <div
            ref={messagesContainerRef}
            className="flex-1 overflow-y-auto bg-white"
          >
            {messagesComponent}
          </div>

          {error && (
            <div className="flex-shrink-0 mx-auto max-w-4xl w-full px-3 md:px-4 py-2">
              <div className="p-3 bg-red-50 border border-red-200 rounded-lg text-red-700 text-sm">
                <div className="flex items-center">
                  <AlertCircle className="w-4 h-4 mr-2" />
                  {error}
                </div>
              </div>
            </div>
          )}

          <div className="flex-shrink-0 bg-white border-t border-gray-200">
            <MemoizedChatInput {...chatInputProps} />
          </div>
        </div>
      </div>
    </div>
  );
};

// Main App Component with AuthProvider
const App: React.FC = () => {
  return (
    <AuthProvider>
      <AppContent />
    </AuthProvider>
  );
};

export default App;