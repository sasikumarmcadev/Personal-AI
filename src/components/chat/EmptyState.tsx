import React from 'react';
import { MessageCircle, ChevronRight, Sparkles, Zap, Brain, Coffee } from 'lucide-react';

interface EmptyStateProps {
  onSendMessage?: (message: string) => void;
}

const EmptyState: React.FC<EmptyStateProps> = ({ onSendMessage }) => {
  const suggestions = [
    {
      text: "Explain quantum computing",
      icon: Brain,
      gradient: "from-purple-500 to-pink-500"
    },
    {
      text: "Write a haiku about coding", 
      icon: Coffee,
      gradient: "from-emerald-500 to-teal-500"
    },
    {
      text: "Best practices for React",
      icon: Zap,
      gradient: "from-blue-500 to-cyan-500"
    },
    {
      text: "Who Invented you",
      icon: Sparkles,
      gradient: "from-orange-500 to-red-500"
    }
  ];

  const handleSendMessage = (message: string) => {
    if (onSendMessage) {
      onSendMessage(message);
    } else {
      console.log('Message:', message);
    }
  };

  return (
    <div className="min-h-screen w-full flex flex-col items-center justify-center p-4 sm:p-6 lg:p-8 text-center bg-gradient-to-br from-white via-blue-50/50 to-purple-50/30">
      <div className="w-full max-w-4xl mx-auto">
        {/* Logo Section */}
        <div className="relative mb-6 sm:mb-8 lg:mb-12">
          
        </div>
        
        {/* Heading */}
        <h1 className="text-2xl sm:text-3xl lg:text-4xl font-bold bg-gradient-to-r from-slate-800 via-slate-700 to-slate-800 bg-clip-text text-transparent mb-2 sm:mb-3">
          How can I help you today?
        </h1>
        
        <p className="text-slate-600 mb-6 sm:mb-8 lg:mb-12 text-base sm:text-lg lg:text-xl font-medium">
          Ask me anything, or try one of these examples
        </p>
        
        {/* Example Prompts - Enhanced Grid */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 sm:gap-4 lg:gap-6 mb-6 sm:mb-8 lg:mb-12 w-full max-w-3xl mx-auto">
          {suggestions.map((suggestion, index) => {
            const IconComponent = suggestion.icon;
            return (
              <button
                key={index}
                onClick={() => handleSendMessage(suggestion.text)}
                className="bg-white/70 backdrop-blur-sm hover:bg-white/90 p-3 sm:p-4 lg:p-6 rounded-xl sm:rounded-2xl border border-slate-200/50 text-slate-700 text-left transition-all duration-300 hover:border-slate-300/60 group shadow-lg hover:shadow-xl hover:scale-[1.02] sm:hover:scale-105"
              >
                <div className="flex items-center justify-between">
                  <div className="flex items-center space-x-2 sm:space-x-3">
                    <div className={`w-8 h-8 sm:w-10 sm:h-10 bg-gradient-to-r ${suggestion.gradient} rounded-lg sm:rounded-xl flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-200`}>
                      <IconComponent size={16} className="text-white sm:w-5 sm:h-5" />
                    </div>
                    <span className="text-xs sm:text-sm lg:text-base font-semibold pr-1 sm:pr-2 leading-tight">{suggestion.text}</span>
                  </div>
                  <ChevronRight className="text-slate-400 group-hover:text-slate-600 transition-colors flex-shrink-0 group-hover:translate-x-1 transition-transform duration-200" size={16} />
                </div>
              </button>
            );
          })}
        </div>

        {/* Features Section */}
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-2 sm:gap-4 w-full max-w-2xl mx-auto text-xs sm:text-sm text-slate-500">
          <div className="flex items-center justify-center space-x-2 p-2 sm:p-3 bg-white/40 backdrop-blur-sm rounded-lg sm:rounded-xl border border-slate-200/30">
            <Zap size={14} className="text-blue-500 sm:w-4 sm:h-4" />
            <span>Lightning fast</span>
          </div>
          <div className="flex items-center justify-center space-x-2 p-2 sm:p-3 bg-white/40 backdrop-blur-sm rounded-lg sm:rounded-xl border border-slate-200/30">
            <Brain size={14} className="text-purple-500 sm:w-4 sm:h-4" />
            <span>Always learning</span>
          </div>
          <div className="flex items-center justify-center space-x-2 p-2 sm:p-3 bg-white/40 backdrop-blur-sm rounded-lg sm:rounded-xl border border-slate-200/30">
            <Sparkles size={14} className="text-pink-500 sm:w-4 sm:h-4" />
            <span>Creative solutions</span>
          </div>
        </div>
      </div>
    </div>
  );
};

export default EmptyState;