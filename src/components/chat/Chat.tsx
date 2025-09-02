import React, { useState, useRef, useEffect } from 'react';
import { AlertTriangle, Loader2 } from 'lucide-react';
import Sidebar from './Sidebar';
import MobileHeader from './Header';
import ChatInput from './ChatInput';
import MessageBubble from './MessageBubble';
import EmptyState from './EmptyState';
import { useAuth } from './AuthContext';
import { useChatWithFirestore } from '../../hooks/useChatWithFirestore';
import { Message } from '../../types/chat';
import { createChatCompletion } from '../../services/groqClient';

export default function Chat() {
  const { currentUser } = useAuth();
  const {
    sessions,
    currentSessionId,
    messages: firestoreMessages,
    isLoading: firestoreLoading,
    error: firestoreError,
    loadingSessions,
    createNewSession,
    selectSession,
    sendMessage: firestoreSendMessage,
    regenerateResponse: firestoreRegenerateResponse,
    deleteSession,
    stopGeneration,
    isAuthenticated
  } = useChatWithFirestore();

  // Local state for unauthenticated users
  const [localMessages, setLocalMessages] = useState<Message[]>([]);
  const [localLoading, setLocalLoading] = useState(false);
  const [localError, setLocalError] = useState<string | null>(null);

  const [isSidebarOpen, setIsSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(window.innerWidth < 1024);
  
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  // Use appropriate messages and loading state based on authentication
  const messages = isAuthenticated ? firestoreMessages : localMessages;
  const isLoading = isAuthenticated ? firestoreLoading : localLoading;
  const error = isAuthenticated ? firestoreError : localError;

  useEffect(() => {
    const handleResize = () => {
      setIsMobile(window.innerWidth < 1024);
      // Close sidebar on resize to mobile if it was open
      if (window.innerWidth < 1024 && isSidebarOpen) {
        setIsSidebarOpen(false);
      }
    };

    window.addEventListener('resize', handleResize);
    return () => window.removeEventListener('resize', handleResize);
  }, [isSidebarOpen]);

  const scrollToBottom = () => {
    setTimeout(() => {
      messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, 100);
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const handleSendMessage = async (messageText: string) => {
    if (!messageText.trim() || isLoading) return;

    try {
      if (isAuthenticated) {
        // Use Firestore for authenticated users
        await firestoreSendMessage(messageText);
      } else {
        // Handle locally for unauthenticated users
        setLocalLoading(true);
        setLocalError(null);

        // Create user message
        const userMessage: Message = {
          id: Date.now().toString(),
          role: 'user',
          content: messageText.trim(),
          timestamp: new Date().toISOString(),
        };

        setLocalMessages(prev => [...prev, userMessage]);

        // Create assistant placeholder
        const assistantMessage: Message = {
          id: (Date.now() + 1).toString(),
          role: 'assistant',
          content: '',
          timestamp: new Date().toISOString(),
          isStreaming: true
        };

        setLocalMessages(prev => [...prev, assistantMessage]);

        try {
          // Prepare conversation history
          const conversationHistory = localMessages.map(msg => ({
            role: msg.role as 'user' | 'assistant',
            content: msg.content
          }));
          conversationHistory.push({ role: 'user', content: messageText.trim() });

          // Get AI response
          const response = await createChatCompletion(conversationHistory);

          // Update assistant message with response
          setLocalMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: response, isStreaming: false }
                : msg
            )
          );
        } catch (aiError) {
          console.error('AI Error:', aiError);
          const errorMessage = 'Sorry, I encountered an error. Please try again.';
          
          setLocalMessages(prev => 
            prev.map(msg => 
              msg.id === assistantMessage.id 
                ? { ...msg, content: errorMessage, isStreaming: false, error: errorMessage }
                : msg
            )
          );
          setLocalError('Failed to get AI response. Please try again.');
        } finally {
          setLocalLoading(false);
        }
      }
      
      setIsSidebarOpen(false); // Close sidebar on mobile after sending
    } catch (error) {
      console.error('Error sending message:', error);
    }
  };

  const handleRegenerate = async (messageIndex: number) => {
    try {
      if (isAuthenticated) {
        await firestoreRegenerateResponse(messageIndex);
      } else {
        // Handle regeneration locally for unauthenticated users
        if (messageIndex < 0 || messageIndex >= localMessages.length) return;
        
        const targetMessage = localMessages[messageIndex];
        if (targetMessage.role !== 'assistant') return;

        setLocalLoading(true);
        setLocalError(null);

        try {
          // Get conversation history up to this point
          const conversationHistory = localMessages
            .slice(0, messageIndex)
            .map(msg => ({
              role: msg.role as 'user' | 'assistant',
              content: msg.content
            }));

          // Get new response
          const response = await createChatCompletion(conversationHistory);

          // Update the message
          setLocalMessages(prev => 
            prev.map((msg, idx) => 
              idx === messageIndex 
                ? { ...msg, content: response, timestamp: new Date().toISOString(), isStreaming: false }
                : msg
            )
          );
        } catch (error) {
          console.error('Error regenerating:', error);
          setLocalError('Failed to regenerate response. Please try again.');
        } finally {
          setLocalLoading(false);
        }
      }
    } catch (error) {
      console.error('Error regenerating response:', error);
    }
  };

  const handleNewChat = async () => {
    try {
      if (isAuthenticated) {
        await createNewSession();
      } else {
        // Clear local messages for unauthenticated users
        setLocalMessages([]);
        setLocalError(null);
      }
      setIsSidebarOpen(false);
    } catch (error) {
      console.error('Error creating new chat:', error);
    }
  };

  const handleSelectSession = (sessionId: string) => {
    selectSession(sessionId);
    setIsSidebarOpen(false);
  };

  const handleDeleteSession = async (sessionId: string) => {
    try {
      await deleteSession(sessionId);
    } catch (error) {
      console.error('Error deleting session:', error);
    }
  };

  // Show loading state while sessions are loading for authenticated users
  if (loadingSessions && isAuthenticated) {
    return (
      <div className="flex h-screen bg-gradient-to-br from-slate-50 to-blue-50/30 items-center justify-center">
        <div className="flex flex-col items-center space-y-4 text-slate-600 bg-white/70 backdrop-blur-sm rounded-2xl p-8 shadow-lg border border-white/50">
          <div className="w-16 h-16 border-4 border-blue-200 border-t-blue-600 rounded-full animate-spin"></div>
          <div className="flex items-center space-x-2">
            <span className="text-lg font-medium">Loading your conversations...</span>
          </div>
          <p className="text-sm text-slate-500">Please wait while we sync your data</p>
        </div>
      </div>
    );
  }

  return (
    <div className="flex h-screen bg-gradient-to-br from-slate-50 via-white to-slate-50/50">
      {/* Sidebar */}
      <Sidebar
        isOpen={isSidebarOpen}
        onClose={() => setIsSidebarOpen(false)}
        sessions={isAuthenticated ? sessions : []}
        onNewChat={handleNewChat}
        onSelectSession={handleSelectSession}
        onDeleteSession={handleDeleteSession}
        currentSessionId={currentSessionId || ''}
      />

      {/* Main Content */}
      <div className="flex-1 flex flex-col min-w-0 backdrop-blur-sm">
        {/* Mobile Header - Only show on mobile */}
        {isMobile && (
          <MobileHeader
            onMenuClick={() => setIsSidebarOpen(true)}
            onNewChat={handleNewChat}
          />
        )}

        {/* Chat Area */}
        <div
          ref={messagesContainerRef}
          className="flex-1 overflow-y-auto bg-white/40 backdrop-blur-sm"
        >
          {messages.length === 0 ? (
            <EmptyState onSendMessage={handleSendMessage} />
          ) : (
            <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
              {messages.map((message: Message, index: number) => (
                <div 
                  key={`${message.id}-${index}`} 
                  className={`${message.role === 'assistant' ? 'bg-gradient-to-r from-blue-50/30 to-slate-50/30 backdrop-blur-sm border-y border-blue-100/20' : 'bg-transparent'}`}
                >
                  <div className="max-w-4xl mx-auto px-4 md:px-6">
                    <MessageBubble
                      message={message}
                      onRegenerate={() => handleRegenerate(index)}
                      showRegenerate={
                        message.role === 'assistant' &&
                        index === messages.length - 1 &&
                        !message.isStreaming &&
                        !isLoading
                      }
                    />
                  </div>
                </div>
              ))}
              
              {/* Loading indicator */}
              {isLoading && (
                <div className="bg-gradient-to-r from-blue-50/30 to-slate-50/30 backdrop-blur-sm border-y border-blue-100/20">
                  <div className="max-w-4xl mx-auto px-4 md:px-6">
                    <MessageBubble
                      message={{
                        id: 'loading-indicator',
                        role: 'assistant',
                        content: 'Thinking...',
                        timestamp: new Date().toISOString(),
                        isStreaming: true,
                      }}
                    />
                  </div>
                </div>
              )}
              
              <div ref={messagesEndRef} />
            </div>
          )}
        </div>

        {/* Error message */}
        {error && (
          <div className="mx-auto max-w-4xl mb-4 px-4 md:px-6">
            <div className="p-4 bg-gradient-to-r from-red-50 to-red-50/70 backdrop-blur-sm border border-red-200/50 rounded-2xl text-red-700 shadow-lg">
              <div className="flex items-center">
                <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <AlertTriangle className="w-4 h-4 text-red-600" />
                </div>
                <div>
                  <p className="font-medium">Something went wrong</p>
                  <p className="text-sm text-red-600 mt-1">{error}</p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Input area - Fixed at the bottom */}
        <div className="sticky bottom-0 bg-white/80 backdrop-blur-md border-t border-slate-200/50 shadow-2xl">
          <ChatInput
            onSendMessage={handleSendMessage}
            onStop={stopGeneration}
            isLoading={isLoading}
            disabled={false} // Enable for all users
          />
        </div>
      </div>
    </div>
  );
}