import React, { useRef, useEffect } from 'react';
import { useChat } from '../../hooks/useChat';
import MessageBubble from './MessageBubble';
import ChatInput from './ChatInput';
import EmptyState from './EmptyState';
import { ChatSession } from '../../types/chat';
import { AlertTriangle } from 'lucide-react';

interface ChatInterfaceProps {
  session: ChatSession;
  onSessionUpdate: (session: ChatSession) => void;
}

export const ChatInterface: React.FC<ChatInterfaceProps> = ({
  session,
  onSessionUpdate
}) => {
  const {
    isLoading,
    error,
    sendMessage,
    stopGeneration,
    clearChat,
    regenerateResponse
  } = useChat(session, onSessionUpdate);

  const messagesEndRef = useRef<HTMLDivElement>(null);
  const messagesContainerRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [session.messages]);

  const handleSendMessage = async (message: string) => {
    await sendMessage(message);
  };

  const handleRegenerateResponse = (messageIndex: number) => {
    regenerateResponse(messageIndex);
  };

  return (
    <div className="h-full flex flex-col bg-gradient-to-br from-slate-50 via-white to-slate-50/50">
      {/* Messages Container - Takes remaining height */}
      <div
        ref={messagesContainerRef}
        className="flex-1 overflow-y-auto bg-white/40 backdrop-blur-sm"
      >
        {session.messages.length === 0 ? (
          <EmptyState onSendMessage={handleSendMessage} />
        ) : (
          <div className="max-w-5xl mx-auto w-full px-4 sm:px-6">
            {session.messages.map((message, index) => (
              <div 
                key={`${message.id}-${index}`} 
                className={`${message.role === 'assistant' ? 'bg-gradient-to-r from-blue-50/30 to-slate-50/30 backdrop-blur-sm border-y border-blue-100/20' : 'bg-transparent'}`}
              >
                <div className="max-w-4xl mx-auto px-4 md:px-6">
                  <MessageBubble
                    message={message}
                    onRegenerate={() => handleRegenerateResponse(index)}
                    showRegenerate={
                      message.role === 'assistant' &&
                      index === session.messages.length - 1 &&
                      !(message as any).isStreaming &&
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
        <div className="flex-shrink-0 mx-auto max-w-4xl w-full px-4 md:px-6 py-2">
          <div className="p-4 bg-gradient-to-r from-red-50 to-red-50/70 backdrop-blur-sm border border-red-200/50 rounded-2xl text-red-700 shadow-lg">
            <div className="flex items-center">
              <div className="w-8 h-8 bg-red-100 rounded-full flex items-center justify-center mr-3">
                <AlertTriangle className="w-4 h-4 text-red-600" />
              </div>
              <div>
                <p className="font-medium">Something went wrong</p>
                <p className="text-sm text-red-600 mt-1">Error: {error}</p>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Input area - Fixed at the bottom */}
      <div className="flex-shrink-0 border-t border-slate-200/50 bg-white/80 backdrop-blur-md shadow-2xl">
        <ChatInput
          onSendMessage={handleSendMessage}
          onStop={stopGeneration}
          isLoading={isLoading}
        />
      </div>
    </div>
  );
};
