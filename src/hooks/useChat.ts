// hooks/useChat.ts (Enhanced with complete Firestore integration) - FIXED VERSION
import { useState, useCallback, useRef } from 'react';
import { Message, ChatSession } from '../types/chat';
import { createChatCompletion, GroqMessage } from '../services/groqClient';
import { useAuth } from '../components/chat/AuthContext';
import {
  addMessage,
  updateMessage,
  updateChatSessionTitle,
  updateChatSessionMessageCount,
  generateSessionTitle
} from '../lib/firestoreService';

export const useChat = (initialSession: ChatSession | null, onSessionUpdate: (session: ChatSession) => void) => {
  const { currentUser } = useAuth();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [streamingMessageId, setStreamingMessageId] = useState<string | null>(null);
  const abortControllerRef = useRef<AbortController | null>(null);
  
  // Use ref to track the session to prevent unnecessary updates
  const sessionRef = useRef<ChatSession | null>(initialSession);

  const updateSession = useCallback((updater: (session: ChatSession) => ChatSession) => {
    if (!sessionRef.current) return;
    
    const updatedSession = updater(sessionRef.current);
    sessionRef.current = updatedSession;
    onSessionUpdate(updatedSession);
  }, [onSessionUpdate]);

  const sendMessage = useCallback(async (content: string) => {
    if (!content.trim() || isLoading || !sessionRef.current) return;

    setIsLoading(true);
    setError(null);
    
    // Create abort controller for streaming
    abortControllerRef.current = new AbortController();

    const trimmedContent = content.trim();

    try {
      let sessionId = sessionRef.current.id;
      let isNewSession = false;

      // Handle temporary sessions (for non-authenticated users)
      if (sessionId.startsWith('temp-')) {
        if (currentUser) {
          // Create a real session in Firestore
          const { createChatSession } = await import('../lib/firestoreService');
          const newSession = await createChatSession(currentUser.uid, generateSessionTitle({ content: trimmedContent }));
          sessionId = newSession.id;
          isNewSession = true;
          
          // Update the session ID
          updateSession(session => ({
            ...session,
            id: sessionId,
            title: newSession.title
          }));
        } else {
          // For non-authenticated users, work with local state only
          sessionId = sessionRef.current.id;
        }
      }

      // Create user message
      const userMessage: Message = {
        id: Date.now().toString(),
        role: 'user',
        content: trimmedContent,
        timestamp: new Date().toISOString(),
      };

      // Add user message to local state first for immediate UI feedback
      updateSession(session => ({
        ...session,
        messages: [...session.messages, userMessage],
        messageCount: session.messages.length + 1,
        updatedAt: new Date().toISOString()
      }));

      // Save user message to Firestore if user is authenticated and session is real
      let firestoreUserMessageId: string | null = null;
      if (currentUser && !sessionId.startsWith('temp-')) {
        try {
          const savedUserMessage = await addMessage(sessionId, {
            role: 'user',
            content: trimmedContent,
            timestamp: new Date().toISOString()
          });
          firestoreUserMessageId = savedUserMessage.id;
        } catch (error) {
          console.error('Error saving user message to Firestore:', error);
          // Continue with local operation even if Firestore fails
        }
      }

      // Create assistant message placeholder
      const assistantMessage: Message = {
        id: (Date.now() + 1).toString(),
        role: 'assistant',
        content: '',
        timestamp: new Date().toISOString(),
        isStreaming: true
      };

      // Add assistant message placeholder to local state
      updateSession(session => ({
        ...session,
        messages: [...session.messages, assistantMessage],
        messageCount: session.messages.length + 1
      }));

      // Save assistant message placeholder to Firestore if authenticated
      let firestoreAssistantMessageId: string | null = null;
      if (currentUser && !sessionId.startsWith('temp-')) {
        try {
          const savedMessage = await addMessage(sessionId, {
            role: 'assistant',
            content: '',
            timestamp: new Date().toISOString(),
            isStreaming: true
          });
          firestoreAssistantMessageId = savedMessage.id;
          setStreamingMessageId(savedMessage.id);
        } catch (error) {
          console.error('Error saving assistant message placeholder to Firestore:', error);
        }
      }

      // Prepare conversation history for AI - include ALL previous messages from the current session
      const conversationHistory: GroqMessage[] = sessionRef.current.messages
        .filter(msg => msg.id !== assistantMessage.id && msg.content.trim() !== '') // Exclude the placeholder and empty messages
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      // Add the current user message to the history
      conversationHistory.push({ role: 'user', content: trimmedContent });

      try {
        console.log('Sending to AI:', conversationHistory); // Debug log
        
        // Get AI response using Groq API
        const response = await createChatCompletion(conversationHistory);
        
        console.log('AI Response received:', response); // Debug log

        if (!response || response.trim() === '') {
          throw new Error('Empty response from AI service');
        }

        // Update assistant message with AI response in local state
        updateSession(session => ({
          ...session,
          messages: session.messages.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: response, isStreaming: false }
              : msg
          ),
          updatedAt: new Date().toISOString()
        }));

        // Update assistant message in Firestore if authenticated
        if (currentUser && firestoreAssistantMessageId && !sessionId.startsWith('temp-')) {
          try {
            await updateMessage(firestoreAssistantMessageId, {
              content: response,
              isStreaming: false,
              timestamp: new Date().toISOString()
            });
            console.log('Message updated in Firestore:', firestoreAssistantMessageId); // Debug log
          } catch (error) {
            console.error('Error updating assistant message in Firestore:', error);
          }
        }

        // Update session title if this is the first exchange or new session
        if ((sessionRef.current.messages.length === 2 || isNewSession) && currentUser && !sessionId.startsWith('temp-')) {
          const title = generateSessionTitle({ content: trimmedContent });
          
          updateSession(session => ({
            ...session,
            title
          }));

          try {
            await updateChatSessionTitle(sessionId, title);
          } catch (error) {
            console.error('Error updating session title in Firestore:', error);
          }
        }

        // Update message count in Firestore
        if (currentUser && !sessionId.startsWith('temp-')) {
          try {
            const newMessageCount = sessionRef.current.messages.length;
            await updateChatSessionMessageCount(sessionId, newMessageCount);
          } catch (error) {
            console.error('Error updating message count in Firestore:', error);
          }
        }

      } catch (aiError) {
        console.error('AI API error:', aiError);
        
        const errorMessage = aiError instanceof Error 
          ? `Sorry, I encountered an error: ${aiError.message}` 
          : 'Sorry, I encountered an error while processing your request. Please try again.';
        
        // Update assistant message with error in local state
        updateSession(session => ({
          ...session,
          messages: session.messages.map(msg => 
            msg.id === assistantMessage.id 
              ? { ...msg, content: errorMessage, isStreaming: false, error: errorMessage }
              : msg
          )
        }));

        // Update assistant message in Firestore if authenticated
        if (currentUser && firestoreAssistantMessageId && !sessionId.startsWith('temp-')) {
          try {
            await updateMessage(firestoreAssistantMessageId, {
              content: errorMessage,
              isStreaming: false,
              timestamp: new Date().toISOString()
            });
          } catch (error) {
            console.error('Error updating error message in Firestore:', error);
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
    }
  }, [updateSession, currentUser, isLoading]);

  const stopGeneration = useCallback(() => {
    if (abortControllerRef.current) {
      abortControllerRef.current.abort();
    }
    setIsLoading(false);
    setStreamingMessageId(null);
  }, []);

  const clearChat = useCallback(() => {
    if (!sessionRef.current) return;
    updateSession(session => ({
      ...session,
      messages: [],
      messageCount: 0
    }));
    setError(null);
  }, [updateSession]);

  const regenerateResponse = useCallback(async (messageIndex: number) => {
    if (!sessionRef.current || messageIndex < 0 || messageIndex >= sessionRef.current.messages.length || isLoading) return;

    const targetMessage = sessionRef.current.messages[messageIndex];
    if (!targetMessage || targetMessage.role !== 'assistant') return;

    setIsLoading(true);
    setError(null);

    try {
      // Get conversation history up to the user message before this assistant message
      const conversationHistory: GroqMessage[] = sessionRef.current.messages
        .slice(0, messageIndex)
        .filter(msg => msg.content.trim() !== '') // Filter out empty messages
        .map(msg => ({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        }));

      // Generate new response using Groq API
      const response = await createChatCompletion(conversationHistory);

      if (!response || response.trim() === '') {
        throw new Error('Empty response from AI service');
      }

      // Update the assistant message in local state
      updateSession(session => ({
        ...session,
        messages: session.messages.map((msg, index) => 
          index === messageIndex 
            ? { ...msg, content: response, timestamp: new Date().toISOString(), isStreaming: false }
            : msg
        )
      }));

      // Update in Firestore if authenticated and not a temporary session
      if (currentUser && !sessionRef.current.id.startsWith('temp-')) {
        try {
          // Note: You might need to store Firestore message IDs in your local messages
          // For now, we'll rely on the real-time listener to sync the changes
          const firestoreMessageId = targetMessage.id; // Assuming this is the Firestore ID
          await updateMessage(firestoreMessageId, {
            content: response,
            timestamp: new Date().toISOString(),
            isStreaming: false
          });
        } catch (error) {
          console.error('Error updating regenerated message in Firestore:', error);
        }
      }

    } catch (err) {
      console.error('Error regenerating response:', err);
      setError(err instanceof Error ? err.message : 'Failed to regenerate response. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, [updateSession, currentUser, isLoading]);

  const editMessage = useCallback(async (messageId: string, newContent: string) => {
    if (!newContent.trim() || !sessionRef.current) return;

    try {
      // Update in local state
      updateSession(session => ({
        ...session,
        messages: session.messages.map(msg => 
          msg.id === messageId 
            ? { ...msg, content: newContent.trim(), timestamp: new Date().toISOString() }
            : msg
        )
      }));

      // Update in Firestore if authenticated and not a temporary session
      if (currentUser && !sessionRef.current.id.startsWith('temp-')) {
        try {
          await updateMessage(messageId, {
            content: newContent.trim(),
            timestamp: new Date().toISOString()
          });
        } catch (error) {
          console.error('Error updating edited message in Firestore:', error);
        }
      }

    } catch (err) {
      console.error('Error editing message:', err);
      setError('Failed to edit message');
    }
  }, [updateSession, currentUser]);

  // Update the ref when initialSession changes
  if (initialSession !== sessionRef.current) {
    sessionRef.current = initialSession;
  }

  return {
    currentSession: sessionRef.current,
    isLoading,
    error,
    streamingMessageId,
    sendMessage,
    stopGeneration,
    clearChat,
    regenerateResponse,
    editMessage
  };
};