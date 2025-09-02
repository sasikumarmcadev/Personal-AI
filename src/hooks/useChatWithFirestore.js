// hooks/useChatWithFirestore.js
import { useState, useEffect, useCallback, useRef } from 'react';
import { useAuth } from '../components/chat/AuthContext';
import {
  createChatSession,
  getUserChatSessions,
  addMessage,
  updateMessage,
  updateChatSessionTitle,
  deleteChatSession,
  generateSessionTitle,
  subscribeToUserSessions,
  subscribeToSessionMessages
} from '../lib/firestoreService';
import { createChatCompletion } from '../services/groqClient';

export const useChatWithFirestore = () => {
  const { currentUser, userDataLoaded } = useAuth();
  const [sessions, setSessions] = useState([]);
  const [currentSessionId, setCurrentSessionId] = useState(null);
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState(null);
  const [loadingSessions, setLoadingSessions] = useState(true);
  const [streamingMessageId, setStreamingMessageId] = useState(null);
  
  const hasSetInitialSession = useRef(false);
  const messagesRef = useRef(messages);

  // Keep messagesRef updated
  useEffect(() => {
    messagesRef.current = messages;
  }, [messages]);

  // Load user sessions when authenticated
  useEffect(() => {
    let unsubscribe = null;

    if (currentUser && userDataLoaded) {
      unsubscribe = subscribeToUserSessions(currentUser.uid, (updatedSessions) => {
        setSessions(updatedSessions);
        setLoadingSessions(false);
        
        if (!hasSetInitialSession.current && updatedSessions.length > 0 && !currentSessionId) {
          hasSetInitialSession.current = true;
          setCurrentSessionId(updatedSessions[0].id);
        }
      });
    } else if (!currentUser) {
      setSessions([]);
      setMessages([]);
      setCurrentSessionId(null);
      setLoadingSessions(false);
      hasSetInitialSession.current = false;
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentUser, userDataLoaded]);

  // Subscribe to messages for current session
  useEffect(() => {
    let unsubscribe = null;

    if (currentSessionId) {
      unsubscribe = subscribeToSessionMessages(currentSessionId, (updatedMessages) => {
        // Ensure messages are properly sorted by timestamp
        const sortedMessages = updatedMessages.sort((a, b) => 
          new Date(a.timestamp) - new Date(b.timestamp)
        );
        setMessages(sortedMessages);
      });
    } else {
      setMessages([]);
    }

    return () => {
      if (unsubscribe) {
        unsubscribe();
      }
    };
  }, [currentSessionId]);

  const createNewSession = useCallback(async (firstMessage = null) => {
    if (!currentUser) {
      throw new Error('User not authenticated');
    }

    try {
      const title = firstMessage ? generateSessionTitle(firstMessage) : 'New conversation';
      const newSession = await createChatSession(currentUser.uid, title);
      
      hasSetInitialSession.current = true;
      setCurrentSessionId(newSession.id);
      setError(null);
      
      return newSession;
    } catch (err) {
      console.error('Error creating new session:', err);
      setError('Failed to create new chat session');
      throw err;
    }
  }, [currentUser]);

  const selectSession = useCallback((sessionId) => {
    setCurrentSessionId(sessionId);
    setError(null);
  }, []);

  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || isLoading) return;

    const trimmedContent = content.trim();
    setError(null);
    setIsLoading(true);

    try {
      let sessionId = currentSessionId;
      
      // Create new session if none exists
      if (!sessionId) {
        const userMessage = { 
          id: '',
          role: 'user', 
          content: trimmedContent,
          timestamp: new Date().toISOString()
        };
        const newSession = await createNewSession(userMessage);
        sessionId = newSession.id;
      }

      // Add user message to Firestore
      const userMessage = {
        role: 'user',
        content: trimmedContent,
        timestamp: new Date().toISOString()
      };

      const savedUserMessage = await addMessage(sessionId, userMessage);

      // Create placeholder assistant message
      const assistantMessage = {
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      };

      const savedAssistantMessage = await addMessage(sessionId, assistantMessage);
      setStreamingMessageId(savedAssistantMessage.id);

      // Prepare conversation history for AI - use current messages from ref
      const conversationHistory = messagesRef.current.map(msg => ({
        role: msg.role,
        content: msg.content
      }));
      
      // Add current user message
      conversationHistory.push({
        role: 'user',
        content: trimmedContent
      });

      try {
        // Get AI response
        const aiResponse = await createChatCompletion(conversationHistory);
        
        // Update the assistant message with the complete response
        await updateMessage(savedAssistantMessage.id, {
          content: aiResponse,
          isStreaming: false
        });

      } catch (aiError) {
        console.error('AI API error:', aiError);
        
        // Update with error message
        const errorMessage = 'Sorry, I encountered an error while processing your request. Please try again.';
        await updateMessage(savedAssistantMessage.id, {
          content: errorMessage,
          isStreaming: false
        });
        
        setError('Failed to get AI response');
      }

      // Update session title if this is the first exchange
      if (messagesRef.current.length === 0) {
        const title = generateSessionTitle(userMessage);
        await updateChatSessionTitle(sessionId, title);
      }

    } catch (err) {
      console.error('Error sending message:', err);
      setError('Failed to send message. Please try again.');
      throw err;
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
    }
  }, [currentSessionId, isLoading, createNewSession]);

  const regenerateResponse = useCallback(async (messageIndex) => {
    if (isLoading || messageIndex < 1 || !currentSessionId) return;

    setIsLoading(true);
    setError(null);

    try {
      const targetMessage = messages[messageIndex];
      if (!targetMessage || targetMessage.role !== 'assistant') {
        throw new Error('Invalid message for regeneration');
      }

      // Get conversation history up to the user message before this assistant message
      const conversationHistory = messages
        .slice(0, messageIndex)
        .map(msg => ({
          role: msg.role,
          content: msg.content
        }));

      setStreamingMessageId(targetMessage.id);

      try {
        // Get new response
        const newResponse = await createChatCompletion(conversationHistory);
        
        // Update the message with the complete response
        await updateMessage(targetMessage.id, newResponse);
        
      } catch (aiError) {
        console.error('AI API error during regeneration:', aiError);
        const errorMessage = 'Sorry, I encountered an error while regenerating the response. Please try again.';
        await updateMessage(targetMessage.id, errorMessage);
        setError('Failed to regenerate response');
      }
      
    } catch (err) {
      console.error('Error regenerating response:', err);
      setError('Failed to regenerate response. Please try again.');
    } finally {
      setIsLoading(false);
      setStreamingMessageId(null);
    }
  }, [currentSessionId, messages, isLoading]);

  const editMessage = useCallback(async (messageId, newContent) => {
    if (!messageId || !newContent.trim()) return;

    try {
      await updateMessage(messageId, newContent.trim());
    } catch (err) {
      console.error('Error editing message:', err);
      setError('Failed to edit message');
      throw err;
    }
  }, []);

  const deleteSession = useCallback(async (sessionId) => {
    try {
      await deleteChatSession(sessionId);
      
      if (sessionId === currentSessionId) {
        setCurrentSessionId(null);
        setMessages([]);
        hasSetInitialSession.current = false;
      }
      
      setError(null);
    } catch (err) {
      console.error('Error deleting session:', err);
      setError('Failed to delete chat session');
      throw err;
    }
  }, [currentSessionId]);

  const clearCurrentSession = useCallback(async () => {
    if (!currentSessionId) return;

    try {
      await deleteChatSession(currentSessionId);
      const newSession = await createNewSession();
    } catch (err) {
      console.error('Error clearing session:', err);
      setError('Failed to clear session');
      throw err;
    }
  }, [currentSessionId, createNewSession]);

  const stopGeneration = useCallback(() => {
    setIsLoading(false);
    setStreamingMessageId(null);
  }, []);

  const getCurrentSession = useCallback(() => {
    return sessions.find(session => session.id === currentSessionId) || null;
  }, [sessions, currentSessionId]);

  const exportChatHistory = useCallback(async () => {
    if (!currentUser) return null;

    try {
      const allSessions = await getUserChatSessions(currentUser.uid);
      const exportData = {
        user: {
          uid: currentUser.uid,
          email: currentUser.email,
          displayName: currentUser.displayName
        },
        sessions: allSessions,
        messages: {},
        exportDate: new Date().toISOString()
      };

      return exportData;
    } catch (err) {
      console.error('Error exporting chat history:', err);
      setError('Failed to export chat history');
      return null;
    }
  }, [currentUser]);

  const getSessionStats = useCallback(() => {
    const currentSession = getCurrentSession();
    if (!currentSession) return null;

    const sessionMessages = messages;
    const userMessages = sessionMessages.filter(msg => msg.role === 'user');
    const assistantMessages = sessionMessages.filter(msg => msg.role === 'assistant');

    return {
      totalMessages: sessionMessages.length,
      userMessages: userMessages.length,
      assistantMessages: assistantMessages.length,
      sessionTitle: currentSession.title,
      createdAt: currentSession.createdAt,
      updatedAt: currentSession.updatedAt
    };
  }, [messages, getCurrentSession]);

  return {
    sessions,
    currentSessionId,
    messages,
    isLoading,
    error,
    loadingSessions,
    streamingMessageId,
    
    createNewSession,
    selectSession,
    sendMessage,
    regenerateResponse,
    editMessage,
    deleteSession,
    clearCurrentSession,
    stopGeneration,
    
    getCurrentSession,
    getSessionStats,
    exportChatHistory,
    
    isAuthenticated: !!currentUser,
    user: currentUser
  };
};