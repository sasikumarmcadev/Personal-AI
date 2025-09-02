import React, { useState } from 'react';
import { Copy, RotateCcw, Check, AlertCircle, ThumbsUp, ThumbsDown, User, Bot, Sparkles } from 'lucide-react';
import { Message } from '../../types/chat';

interface MessageBubbleProps {
  message: Message;
  onRegenerate?: () => void;
  showRegenerate?: boolean;
}

const MessageBubble: React.FC<MessageBubbleProps> = ({ 
  message, 
  onRegenerate,
  showRegenerate = false 
}) => {
  const [copied, setCopied] = useState(false);
  const [feedback, setFeedback] = useState<'like' | 'dislike' | null>(null);
  const [expandedCodeBlock, setExpandedCodeBlock] = useState(false);
  const isUser = message.role === 'user';
  
  const detectCodeBlocks = (text: string): boolean => {
    return /```[\s\S]*?```/.test(text);
  };

  const copyToClipboard = async (text: string): Promise<boolean> => {
    try {
      await navigator.clipboard.writeText(text);
      return true;
    } catch (err) {
      console.error('Failed to copy text: ', err);
      return false;
    }
  };

  const formatTimestamp = (timestamp: string | Date): string => {
    const date = typeof timestamp === 'string' ? new Date(timestamp) : timestamp;
    return new Intl.DateTimeFormat('en-US', {
      hour: '2-digit',
      minute: '2-digit'
    }).format(date);
  };

  const hasCode = detectCodeBlocks(message.content);

  const handleCopy = async () => {
    const success = await copyToClipboard(message.content);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const handleToggleCodeExpand = () => {
    setExpandedCodeBlock(!expandedCodeBlock);
  };

  const renderContent = () => {
    if (hasCode) {
      const CodeBlock = ({ content }: { content: string }) => {
        const extractCode = (text: string): string => {
          const match = text.match(/```(?:\w+)?\s*([\s\S]*?)```/);
          return match ? match[1].trim() : text;
        };

        const detectLanguage = (text: string): string => {
          const match = text.match(/```(\w+)/);
          return match ? match[1] : 'text';
        };

        const code = extractCode(content);
        const language = detectLanguage(content);

        return (
          <div className="relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden my-4 shadow-lg border border-slate-700/50">
            <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600/50">
              <div className="flex items-center space-x-2">
                <div className="w-6 h-6 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center">
                  <span className="text-white text-xs font-bold">{language.slice(0, 2).toUpperCase()}</span>
                </div>
                <span className="text-sm text-slate-200 font-medium capitalize">{language}</span>
              </div>
              <button
                onClick={() => copyToClipboard(code)}
                className="text-slate-300 hover:text-white p-2 rounded-lg hover:bg-slate-600/50 transition-all duration-200"
                title="Copy code"
              >
                <Copy size={16} />
              </button>
            </div>
            <pre className="p-4 overflow-x-auto text-sm bg-gradient-to-br from-slate-900 to-slate-800">
              <code className="text-slate-100 font-mono block leading-relaxed selection:bg-blue-500/20">
                {code}
              </code>
            </pre>
          </div>
        );
      };
      
      return (
        <CodeBlock content={message.content} />
      );
    }

    return (
      <div className="whitespace-pre-wrap text-sm md:text-base leading-relaxed">
        {message.content}
        {message.isStreaming && (
          <span className="inline-flex items-center ml-2">
            <div className="flex space-x-1">
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce"></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.1s' }}></div>
              <div className="w-2 h-2 bg-blue-500 rounded-full animate-bounce" style={{ animationDelay: '0.2s' }}></div>
            </div>
          </span>
        )}
      </div>
    );
  };

  return (
    <div className={`group flex w-full py-4 md:py-6 ${isUser ? 'justify-end' : 'justify-start'}`}>
      <div className={`flex max-w-[90%] sm:max-w-[85%] md:max-w-[75%] ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
        {/* Avatar */}
        <div className={`flex-shrink-0 ${isUser ? 'ml-3 md:ml-4' : 'mr-3 md:mr-4'}`}>
          <div className={`w-8 h-8 md:w-10 md:h-10 rounded-2xl flex items-center justify-center text-white shadow-lg border-2 border-white/20 ${
            isUser 
              ? 'bg-gradient-to-br from-blue-600 to-blue-700' 
              : 'bg-gradient-to-br from-purple-600 to-purple-700'
          }`}>
            {isUser ? (
              <User size={16} className="md:w-5 md:h-5" />
            ) : (
              <Bot size={16} className="md:w-5 md:h-5" />
            )}
          </div>
        </div>
        
        {/* Message Content */}
        <div className="flex-1 min-w-0">
          <div
            className={`
              px-4 md:px-6 py-3 md:py-4 rounded-2xl md:rounded-3xl shadow-lg backdrop-blur-sm transition-all duration-200
              ${isUser 
                ? 'bg-gradient-to-br from-blue-600 to-blue-700 text-white ml-auto border border-blue-500/20' 
                : 'bg-white/90 text-slate-800 border border-slate-200/50 hover:bg-white/95'
              }
              ${message.error ? 'border-red-300 bg-gradient-to-br from-red-50 to-red-100' : ''}
            `}
          >
            {message.error && (
              <div className="flex items-center text-red-600 mb-3 p-3 bg-red-50/50 rounded-xl border border-red-200/50">
                <div className="w-6 h-6 bg-red-100 rounded-full flex items-center justify-center mr-3">
                  <AlertCircle size={14} className="text-red-600" />
                </div>
                <div>
                  <p className="text-sm font-medium">Error occurred</p>
                  <p className="text-xs text-red-500 mt-1">{message.error}</p>
                </div>
              </div>
            )}
            
            {renderContent()}
          </div>
          
          {/* Action buttons - only show for assistant messages */}
          {!isUser && (
            <div className="flex items-center mt-3 space-x-1 md:space-x-2 opacity-0 group-hover:opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-all duration-300">
              <button
                onClick={handleCopy}
                className={`p-2 md:p-2.5 rounded-xl transition-all duration-200 hover:scale-105 shadow-sm ${
                  copied
                    ? 'text-green-600 bg-green-50 border border-green-200'
                    : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200'
                }`}
                title="Copy message"
              >
                {copied ? <Check size={16} /> : <Copy size={16} />}
              </button>
              
              {!message.error && (
                <>
                  <button
                    onClick={() => setFeedback(feedback === 'like' ? null : 'like')}
                    className={`p-2 md:p-2.5 rounded-xl transition-all duration-200 hover:scale-105 shadow-sm ${
                      feedback === 'like' 
                        ? 'text-green-600 bg-green-50 border border-green-200' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                    title="Good response"
                  >
                    <ThumbsUp size={16} />
                  </button>
                  
                  <button
                    onClick={() => setFeedback(feedback === 'dislike' ? null : 'dislike')}
                    className={`p-2 md:p-2.5 rounded-xl transition-all duration-200 hover:scale-105 shadow-sm ${
                      feedback === 'dislike' 
                        ? 'text-red-600 bg-red-50 border border-red-200' 
                        : 'text-slate-500 hover:text-slate-700 hover:bg-slate-100 border border-slate-200'
                    }`}
                    title="Bad response"
                  >
                    <ThumbsDown size={16} />
                  </button>
                  
                  {showRegenerate && onRegenerate && (
                    <button
                      onClick={onRegenerate}
                      className="p-2 md:p-2.5 text-slate-500 hover:text-slate-700 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-105 border border-slate-200 shadow-sm"
                      title="Regenerate response"
                    >
                      <RotateCcw size={16} />
                    </button>
                  )}
                </>
              )}
            </div>
          )}
          
          {/* Timestamp - Enhanced visibility */}
          <div className={`flex items-center mt-2 text-xs text-slate-400 ${isUser ? 'justify-end' : 'justify-start'}`}>
            <span>{formatTimestamp(message.timestamp)}</span>
            {!isUser && !message.error && (
              <div className="flex items-center ml-2">
                <Sparkles size={10} className="text-purple-400 mr-1" />
                <span>AI</span>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>    
  );
};

export default MessageBubble;