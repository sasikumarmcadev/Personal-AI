
// components/chat/CodeBlock.tsx
import React, { useState } from 'react';
import { Copy, Check, ChevronDown, ChevronUp, Maximize2, Minimize2, Code2 } from 'lucide-react';

interface CodeBlockProps {
  content: string;
  isExpanded?: boolean;
  onToggleExpand?: () => void;
}

export const CodeBlock: React.FC<CodeBlockProps> = ({ 
  content, 
  isExpanded = false, 
  onToggleExpand 
}) => {
  const [copied, setCopied] = useState(false);
  const [isFullscreen, setIsFullscreen] = useState(false);

  const extractCode = (text: string): string => {
    const match = text.match(/```(?:\w+)?\s*([\s\S]*?)```/);
    return match ? match[1].trim() : text;
  };

  const detectLanguage = (text: string): string => {
    const match = text.match(/```(\w+)/);
    return match ? match[1] : 'text';
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

  const handleCopy = async () => {
    const code = extractCode(content);
    const success = await copyToClipboard(code);
    if (success) {
      setCopied(true);
      setTimeout(() => setCopied(false), 2000);
    }
  };

  const toggleFullscreen = () => {
    setIsFullscreen(!isFullscreen);
  };

  const code = extractCode(content);
  const language = detectLanguage(content);
  const lines = code.split('\n');
  const shouldTruncate = lines.length > 10 && !isExpanded;

  // Split content into text and code parts for mixed content
  const parts = content.split(/(```[\s\S]*?```)/);
  const hasOnlyCode = parts.length === 1 && content.includes('```');
  const hasMixedContent = parts.length > 1;

  if (hasMixedContent) {
    return (
      <div className="space-y-4">
        {parts.map((part, index) => {
          if (part.startsWith('```')) {
            return (
              <CodeBlock 
                key={index} 
                content={part} 
                isExpanded={isExpanded}
                onToggleExpand={onToggleExpand}
              />
            );
          } else if (part.trim()) {
            return (
              <div key={index} className="whitespace-pre-wrap text-sm md:text-base leading-relaxed text-slate-700">
                {part}
              </div>
            );
          }
          return null;
        })}
      </div>
    );
  }

  return (
    <>
      <div className={`relative bg-gradient-to-br from-slate-900 to-slate-800 rounded-2xl overflow-hidden my-4 shadow-2xl border border-slate-700/50 ${isFullscreen ? 'fixed inset-4 z-50 max-w-none' : ''}`}>
        {/* Header */}
        <div className="flex items-center justify-between px-4 md:px-6 py-3 md:py-4 bg-gradient-to-r from-slate-800 to-slate-700 border-b border-slate-600/50 backdrop-blur-sm">
          <div className="flex items-center space-x-3 min-w-0 flex-1">
            <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
              <Code2 size={16} className="text-white" />
            </div>
            <div className="flex flex-col">
              <span className="text-sm md:text-base text-slate-200 font-semibold capitalize">
                {language}
              </span>
              <span className="text-xs text-slate-400">
                {lines.length} lines • {code.length} characters
              </span>
            </div>
          </div>
          
          <div className="flex items-center space-x-1 md:space-x-2 flex-shrink-0">
            {/* Mobile: Show fewer buttons */}
            <div className="flex md:hidden space-x-1">
              <button
                onClick={handleCopy}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-600/50 rounded-xl transition-all duration-200 hover:scale-105"
                title="Copy code"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
              
              {lines.length > 10 && onToggleExpand && (
                <button
                  onClick={onToggleExpand}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-600/50 rounded-xl transition-all duration-200 hover:scale-105"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              )}
            </div>

            {/* Desktop: Show all buttons */}
            <div className="hidden md:flex items-center space-x-2">
              <button
                onClick={toggleFullscreen}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-600/50 rounded-xl transition-all duration-200 hover:scale-105"
                title={isFullscreen ? "Exit fullscreen" : "Fullscreen"}
              >
                {isFullscreen ? <Minimize2 size={16} /> : <Maximize2 size={16} />}
              </button>
              
              {lines.length > 10 && onToggleExpand && (
                <button
                  onClick={onToggleExpand}
                  className="p-2 text-slate-300 hover:text-white hover:bg-slate-600/50 rounded-xl transition-all duration-200 hover:scale-105"
                  title={isExpanded ? "Collapse" : "Expand"}
                >
                  {isExpanded ? <ChevronUp size={16} /> : <ChevronDown size={16} />}
                </button>
              )}
              
              <button
                onClick={handleCopy}
                className="p-2 text-slate-300 hover:text-white hover:bg-slate-600/50 rounded-xl transition-all duration-200 hover:scale-105"
                title="Copy code"
              >
                {copied ? <Check size={16} className="text-green-400" /> : <Copy size={16} />}
              </button>
            </div>
          </div>
        </div>

        {/* Code Content */}
        <div className={`
          ${isFullscreen ? 'h-full' : shouldTruncate ? 'max-h-80 md:max-h-96' : 'max-h-[32rem] md:max-h-[40rem]'}
          overflow-auto bg-gradient-to-br from-slate-900 to-slate-800
        `}>
          <pre className="p-4 md:p-6">
            <code className="text-sm md:text-base text-slate-100 font-mono block leading-relaxed selection:bg-blue-500/20">
              {shouldTruncate 
                ? lines.slice(0, 10).join('\n') + '\n...'
                : code
              }
            </code>
          </pre>
        </div>

        {/* Expand/Collapse footer for mobile */}
        {lines.length > 10 && onToggleExpand && (
          <div className="md:hidden bg-gradient-to-r from-slate-800 to-slate-700 border-t border-slate-600/50 px-4 py-3">
            <button
              onClick={onToggleExpand}
              className="w-full text-sm text-slate-300 hover:text-white py-2 flex items-center justify-center space-x-2 hover:bg-slate-600/30 rounded-xl transition-all duration-200"
            >
              <span>{isExpanded ? 'Show less' : `Show ${lines.length - 10} more lines`}</span>
              {isExpanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
            </button>
          </div>
        )}

        {/* Close fullscreen overlay */}
        {isFullscreen && (
          <button
            onClick={toggleFullscreen}
            className="absolute top-4 right-4 p-2 bg-slate-700/80 hover:bg-slate-600 rounded-xl text-white z-10 backdrop-blur-sm border border-slate-600/50"
            title="Exit fullscreen"
          >
            <Minimize2 size={18} />
          </button>
        )}
      </div>

      {/* Fullscreen backdrop */}
      {isFullscreen && (
        <div 
          className="fixed inset-0 bg-black/80 backdrop-blur-sm z-40"
          onClick={toggleFullscreen}
        />
      )}
    </>
  );
};