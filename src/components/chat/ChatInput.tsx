import React, { useState, useRef, useCallback } from 'react';
import { Send, Square, Paperclip, X, Sparkles } from 'lucide-react';

interface ChatInputProps {
  onSendMessage: (message: string) => void;
  onStop?: () => void;
  isLoading: boolean;
  disabled?: boolean;
}

const ChatInput: React.FC<ChatInputProps> = ({
  onSendMessage,  
  onStop,
  isLoading,
  disabled = false
}) => {
  const [message, setMessage] = useState('');
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  const handleSubmit = useCallback((e: React.FormEvent) => {
    e.preventDefault();
    if (message.trim() && !isLoading && !disabled) {
      const messageToSend = message.trim();
      onSendMessage(messageToSend);
      // Clear the message immediately after sending
      setMessage('');
      // Reset textarea height
      if (textareaRef.current) {
        textareaRef.current.style.height = '28px';
      }
    }
  }, [message, isLoading, disabled, onSendMessage]);

  const handleKeyDown = useCallback((e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSubmit(e as any);
    }
  }, [handleSubmit]);

  const adjustTextareaHeight = useCallback(() => {
    const textarea = textareaRef.current;
    if (textarea) {
      textarea.style.height = '28px';
      textarea.style.height = Math.min(textarea.scrollHeight, 140) + 'px';
    }
  }, []);

  const handleInputChange = useCallback((e: React.ChangeEvent<HTMLTextAreaElement>) => {
    setMessage(e.target.value);
    adjustTextareaHeight();
  }, [adjustTextareaHeight]);

  const clearInput = useCallback(() => {
    setMessage('');
    if (textareaRef.current) {
      textareaRef.current.style.height = '28px';
    }
  }, []);

  return (
    <div className="bg-white/95 backdrop-blur-md p-4 md:p-6">
      <div className="max-w-4xl mx-auto">
        <div className="relative flex items-end space-x-3 bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 p-3 md:p-4 shadow-lg hover:shadow-xl transition-all duration-300 hover:border-blue-300/50">
          {/* Attach button - hidden on mobile */}
          <button
            type="button"
            className="hidden sm:flex flex-shrink-0 p-2.5 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-105"
            title="Attach file"
          >
            <Paperclip size={20} />
          </button>
          
          <div className="flex-1 relative">
            <textarea
              ref={textareaRef}
              value={message}
              onChange={handleInputChange}
              onKeyDown={handleKeyDown}
              placeholder={isLoading ? "Sasi AI is thinking..." : "Type your message..."}
              disabled={isLoading || disabled}
              className="
                w-full px-0 py-3 text-slate-800 placeholder-slate-400 text-base md:text-lg
                bg-transparent border-0 resize-none font-medium
                focus:outline-none focus:ring-0
                disabled:opacity-50 disabled:cursor-not-allowed
                max-h-32 overflow-y-auto leading-relaxed
              "
              rows={1}
              style={{ minHeight: '28px' }}
            />
          </div>
          
          <div className="flex items-center space-x-2">
            {message && !isLoading && (
              <button
                type="button"
                onClick={clearInput}
                className="p-2 text-slate-400 hover:text-slate-600 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-105"
                title="Clear input"
              >
                <X size={16} />
              </button>
            )}
            
            {isLoading ? (
              <button
                type="button"
                onClick={onStop}
                className="p-3 text-white bg-gradient-to-r from-red-500 to-red-600 hover:from-red-600 hover:to-red-700 rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105"
                title="Stop generation"
              >
                <Square size={18} />
              </button>
            ) : (
              <button
                type="submit"
                onClick={handleSubmit}
                disabled={!message.trim() || disabled}
                className="
                  p-3 text-white bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 
                  rounded-2xl disabled:opacity-40 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-400
                  transition-all duration-200 flex items-center justify-center shadow-lg hover:shadow-xl hover:scale-105
                  disabled:hover:scale-100 disabled:hover:shadow-lg
                "
                title="Send message"
              >
                <Send size={18} />
              </button>
            )}
          </div>
        </div>
        
        <div className="mt-3 text-xs text-slate-500 text-center px-2 flex items-center justify-center space-x-1">
          <Sparkles size={12} className="text-blue-400" />
          <span>Development process going on by Sasikumar</span>
        </div>
      </div>
    </div>
  );
};

export default ChatInput;
