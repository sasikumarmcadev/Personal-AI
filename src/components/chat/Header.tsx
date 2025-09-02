import React from 'react';
import { Menu, Plus, Sparkles } from 'lucide-react';

interface MobileHeaderProps {
  onMenuClick: () => void;
  onNewChat: () => void;
}

const MobileHeader: React.FC<MobileHeaderProps> = ({ onMenuClick, onNewChat }) => {
  return (
    <div className="lg:hidden flex items-center justify-between p-4 bg-white/90 backdrop-blur-md border-b border-slate-200/60 shadow-sm">
      <button
        onClick={onMenuClick}
        className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-105"
      >
        <Menu size={22} />
      </button>
      
      <div className="flex items-center space-x-2">
        <div className="w-8 h-8 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg flex items-center justify-center shadow-lg">
          <Sparkles size={16} className="text-white" />
        </div>
        <h1 className="text-xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent">
          Sasi AI Assist
        </h1>
      </div>
      
      <button
        onClick={onNewChat}
        className="p-2.5 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-all duration-200 hover:scale-105"
      >
        <Plus size={22} />
      </button>
    </div>
  );
};

export default MobileHeader;