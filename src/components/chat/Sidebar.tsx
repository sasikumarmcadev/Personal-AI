import React, { useState, useEffect } from 'react';
import { X, Plus, MessageCircle, User, LogIn, Trash2, MoreVertical, Calendar, BarChart3, Settings, Sparkles, Crown, Zap } from 'lucide-react';
import { ChatSession } from '../../types/chat';
import { useAuth } from './AuthContext';
import { getUserStats } from '../../lib/firestoreService';

interface SidebarProps {
  isOpen: boolean;
  onClose: () => void;
  sessions: ChatSession[];
  onNewChat: () => void;
  onSelectSession: (sessionId: string) => void;
  onDeleteSession: (sessionId: string) => void;
  currentSessionId: string;
}

interface UserStats {
  sessionCount: number;
  totalMessages: number;
  avgMessagesPerSession: number;
}

const Sidebar: React.FC<SidebarProps> = ({ 
  isOpen, 
  onClose, 
  sessions,
  onNewChat, 
  onSelectSession,
  onDeleteSession,
  currentSessionId
}) => {
  const { currentUser, signInWithGoogle, signInWithEmail, logout } = useAuth();
  const [showLoginForm, setShowLoginForm] = useState(false);
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [authError, setAuthError] = useState<string>('');
  const [authLoading, setAuthLoading] = useState(false);
  const [sessionMenuOpen, setSessionMenuOpen] = useState<string | null>(null);
  const [userStats, setUserStats] = useState<UserStats | null>(null);
  const [showUserProfile, setShowUserProfile] = useState(false);
  const [loadingStats, setLoadingStats] = useState(false);

  // Load user statistics when user is authenticated
  useEffect(() => {
    const loadUserStats = async () => {
      if (currentUser && !loadingStats) {
        setLoadingStats(true);
        try {
          const stats = await getUserStats(currentUser.uid);
          setUserStats(stats);
        } catch (error) {
          console.error('Error loading user stats:', error);
        } finally {
          setLoadingStats(false);
        }
      }
    };

    loadUserStats();
  }, [currentUser, sessions.length]); // Re-load when sessions change

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffTime = Math.abs(now.getTime() - date.getTime());
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    
    if (diffDays === 1) return 'Today';
    if (diffDays === 2) return 'Yesterday';
    if (diffDays <= 7) return `${diffDays} days ago`;
    return date.toLocaleDateString();
  };

  const formatJoinDate = (user: any) => {
    if (user.metadata?.creationTime) {
      const joinDate = new Date(user.metadata.creationTime);
      return joinDate.toLocaleDateString('en-US', { 
        year: 'numeric', 
        month: 'long', 
        day: 'numeric' 
      });
    }
    return 'Recently joined';
  };

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setAuthError('');
    setAuthLoading(true);
    
    try {
      await signInWithEmail(loginForm.email, loginForm.password);
      setShowLoginForm(false);
      setLoginForm({ email: '', password: '' });
    } catch (error: any) {
      setAuthError(error.message || 'Login failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleGoogleSignIn = async () => {
    setAuthError('');
    setAuthLoading(true);
    
    try {
      await signInWithGoogle();
      setShowLoginForm(false);
    } catch (error: any) {
      setAuthError(error.message || 'Google sign-in failed. Please try again.');
    } finally {
      setAuthLoading(false);
    }
  };

  const handleLogout = async () => {
    try {
      await logout();
      setUserStats(null);
      setShowUserProfile(false);
    } catch (error: any) {
      console.error('Logout error:', error);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const { name, value } = e.target;
    setLoginForm(prev => ({ ...prev, [name]: value }));
  };

  const handleDeleteSession = async (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    
    if (window.confirm('Are you sure you want to delete this conversation? This action cannot be undone.')) {
      try {
        await onDeleteSession(sessionId);
        setSessionMenuOpen(null);
      } catch (error) {
        console.error('Error deleting session:', error);
      }
    }
  };

  const toggleSessionMenu = (sessionId: string, e: React.MouseEvent) => {
    e.stopPropagation();
    setSessionMenuOpen(sessionMenuOpen === sessionId ? null : sessionId);
  };

  const getDisplayName = (user: any) => {
    return user?.displayName || user?.email?.split('@')[0] || 'User';
  };

  const getAvatarUrl = (user: any) => {
    return user?.photoURL;
  };

  const groupSessionsByDate = (sessions: ChatSession[]) => {
    const groups: { [key: string]: ChatSession[] } = {};
    
    sessions.forEach(session => {
      const date = new Date(session.createdAt);
      const now = new Date();
      const diffDays = Math.ceil((now.getTime() - date.getTime()) / (1000 * 60 * 60 * 24));
      
      let groupKey;
      if (diffDays <= 1) groupKey = 'Today';
      else if (diffDays <= 2) groupKey = 'Yesterday';
      else if (diffDays <= 7) groupKey = 'Previous 7 days';
      else if (diffDays <= 30) groupKey = 'Previous 30 days';
      else groupKey = 'Older';
      
      if (!groups[groupKey]) groups[groupKey] = [];
      groups[groupKey].push(session);
    });
    
    return groups;
  };

  const sessionGroups = groupSessionsByDate(sessions);

  return (
    <>
      {/* Mobile Overlay */}
      {isOpen && (
        <div 
          className="fixed inset-0 bg-black/60 backdrop-blur-sm z-40 lg:hidden"
          onClick={onClose}
        />
      )}

      {/* Sidebar */}
      <div className={`
        fixed lg:static inset-y-0 left-0 z-50 w-80 bg-white/95 backdrop-blur-md
        transform transition-transform duration-300 ease-in-out
        ${isOpen ? 'translate-x-0' : '-translate-x-full lg:translate-x-0'}
        flex flex-col h-full border-r border-slate-200/50 shadow-2xl lg:shadow-none
      `}>
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-slate-200/60 bg-gradient-to-r from-blue-50/50 to-purple-50/50">
          <div className="flex items-center space-x-3">
            <div className="w-10 h-10 bg-gradient-to-br from-blue-600 to-purple-600 rounded-2xl flex items-center justify-center shadow-lg">
              <Sparkles className="text-white" size={20} />
            </div>
            <div>
              <h2 className="text-slate-800 font-bold text-xl">AI Assist</h2>
              <p className="text-xs text-slate-500">Smart conversations</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="lg:hidden p-2 text-slate-600 hover:text-slate-900 hover:bg-slate-100 rounded-xl transition-colors"
          >
            <X size={20} />
          </button>
        </div>

        {/* New Chat Button */}
        <div className="p-4">
          <button 
            onClick={onNewChat}
            className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-blue-600 to-blue-700 hover:from-blue-700 hover:to-blue-800 text-white rounded-2xl transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 font-medium"
          >
            <Plus size={20} />
            <span>New Conversation</span>
          </button>
        </div>

        {/* Chat History */}
        <div className="flex-1 overflow-y-auto px-4">
          {/* User Profile Panel (when expanded) */}
          {showUserProfile && currentUser && (
            <div className="mb-6 p-5 bg-gradient-to-br from-blue-50 to-indigo-50 rounded-2xl border border-blue-200/50 backdrop-blur-sm">
              <div className="flex items-center space-x-4 mb-4">
                <div className="w-14 h-14 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg">
                  {getAvatarUrl(currentUser) ? (
                    <img 
                      src={getAvatarUrl(currentUser)} 
                      alt="User Avatar" 
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    <User size={28} className="text-white" />
                  )}
                </div>
                <div className="flex-1">
                  <h3 className="font-bold text-slate-800 text-lg">
                    {getDisplayName(currentUser)}
                  </h3>
                  <p className="text-sm text-slate-600">{currentUser.email}</p>
                  <div className="flex items-center text-xs text-slate-500 mt-1">
                    <Calendar size={12} className="mr-1" />
                    <span>Joined {formatJoinDate(currentUser)}</span>
                  </div>
                </div>
                <button
                  onClick={() => setShowUserProfile(false)}
                  className="p-1.5 hover:bg-blue-100 rounded-xl transition-colors"
                >
                  <X size={16} />
                </button>
              </div>
              
              {/* User Statistics */}
              {userStats && (
                <div className="grid grid-cols-2 gap-3 text-sm">
                  <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-blue-200/30 shadow-sm">
                    <div className="flex items-center space-x-2 mb-1">
                      <MessageCircle size={14} className="text-blue-600" />
                      <span className="text-slate-600 font-medium">Chats</span>
                    </div>
                    <p className="font-bold text-slate-800 text-lg">{userStats.sessionCount}</p>
                  </div>
                  <div className="bg-white/80 backdrop-blur-sm p-3 rounded-xl border border-blue-200/30 shadow-sm">
                    <div className="flex items-center space-x-2 mb-1">
                      <BarChart3 size={14} className="text-green-600" />
                      <span className="text-slate-600 font-medium">Messages</span>
                    </div>
                    <p className="font-bold text-slate-800 text-lg">{userStats.totalMessages}</p>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Session Groups */}
          <div className="space-y-1 relative">
            {Object.entries(sessionGroups).map(([groupKey, groupSessions]) => (
              <div key={groupKey} className="mb-6">
                <div className="flex items-center px-3 py-2 text-xs font-semibold text-slate-500 uppercase tracking-wider">
                  <span>{groupKey}</span>
                  <div className="ml-2 w-4 h-4 bg-slate-200 rounded-full flex items-center justify-center">
                    <span className="text-xs text-slate-600">{groupSessions.length}</span>
                  </div>
                </div>
                <div className="space-y-1">
                  {groupSessions.map((session) => (
                    <div key={session.id} className="relative">
                      <button
                        onClick={() => onSelectSession(session.id)}
                        className={`w-full text-left p-4 rounded-2xl transition-all duration-200 group relative ${
                          session.id === currentSessionId
                            ? 'bg-gradient-to-r from-blue-50 to-blue-100 text-blue-800 border border-blue-200 shadow-md'
                            : 'text-slate-700 hover:bg-white/80 hover:text-slate-900 hover:shadow-md border border-transparent hover:border-slate-200'
                        }`}
                      >
                        <div className="flex items-start justify-between">
                          <div className="flex items-start space-x-3 flex-1 min-w-0">
                            <div className={`w-2 h-2 rounded-full mt-2 flex-shrink-0 ${
                              session.id === currentSessionId ? 'bg-blue-500' : 'bg-slate-300'
                            }`}></div>
                            <div className="flex-1 min-w-0">
                              <p className="text-sm font-semibold truncate mb-1">
                                {session.title}
                              </p>
                              <div className="flex items-center justify-between text-xs text-slate-500">
                                <span>{formatDate(session.createdAt)}</span>
                                <div className="flex items-center space-x-2">
                                  <span className="bg-slate-200 px-2 py-1 rounded-full text-xs font-medium">
                                    {session.messageCount || 0}
                                  </span>
                                </div>
                              </div>
                            </div>
                          </div>
                          
                          {/* Session Menu Button */}
                          <button
                            onClick={(e) => toggleSessionMenu(session.id, e)}
                            className="opacity-0 group-hover:opacity-100 p-1.5 hover:bg-slate-200 rounded-lg transition-all ml-2"
                          >
                            <MoreVertical size={14} />
                          </button>
                        </div>
                      </button>

                      {/* Session Menu Dropdown */}
                      {sessionMenuOpen === session.id && (
                        <div className="absolute right-3 top-14 bg-white border border-slate-200 rounded-xl shadow-xl py-2 z-50 backdrop-blur-sm">
                          <button
                            onClick={(e) => handleDeleteSession(session.id, e)}
                            className="w-full px-4 py-2 text-left text-sm text-red-600 hover:bg-red-50 flex items-center space-x-3 transition-colors"
                          >
                            <Trash2 size={16} />
                            <span>Delete</span>
                          </button>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ))}
          </div>

          {/* Empty state for sessions */}
          {sessions.length === 0 && currentUser && (
            <div className="text-center py-12 text-slate-500">
              <div className="w-16 h-16 bg-slate-100 rounded-2xl flex items-center justify-center mx-auto mb-4">
                <MessageCircle size={32} className="opacity-50" />
              </div>
              <p className="text-lg font-medium mb-1">No conversations yet</p>
              <p className="text-sm">Start a new chat to begin</p>
            </div>
          )}
        </div>

        {/* Click outside to close session menu */}
        {sessionMenuOpen && (
          <div 
            className="fixed inset-0 z-40" 
            onClick={() => setSessionMenuOpen(null)}
          />
        )}

        {/* User Section */}
        <div className="p-4 border-t border-slate-200/60 bg-gradient-to-r from-slate-50/50 to-blue-50/30">
          {currentUser ? (
            <div className="space-y-3">
              {/* Main User Card */}
              <div 
                className="flex items-center justify-between p-4 bg-white/80 backdrop-blur-sm rounded-2xl cursor-pointer hover:bg-white/90 transition-all duration-200 border border-slate-200/50 shadow-sm hover:shadow-md"
                onClick={() => setShowUserProfile(!showUserProfile)}
              >
                <div className="flex items-center space-x-3">
                  <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-purple-600 rounded-2xl flex items-center justify-center overflow-hidden shadow-lg">
                    {getAvatarUrl(currentUser) ? (
                      <img 
                        src={getAvatarUrl(currentUser)} 
                        alt="User Avatar" 
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      <User size={20} className="text-white" />
                    )}
                  </div>
                  <div className="flex-1 min-w-0">
                    <p className="text-slate-800 text-sm font-semibold truncate">
                      {getDisplayName(currentUser)}
                    </p>
                    <div className="flex items-center space-x-2">
                      <Crown size={12} className="text-amber-500" />
                      <p className="text-slate-500 text-xs">Premium</p>
                    </div>
                  </div>
                </div>
                <div className="flex items-center space-x-2">
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      setShowUserProfile(!showUserProfile);
                    }}
                    className="text-sm text-slate-400 hover:text-slate-600 p-1.5 rounded-xl hover:bg-slate-100 transition-colors"
                    title="View Profile"
                  >
                    <Settings size={16} />
                  </button>
                  <button 
                    onClick={(e) => {
                      e.stopPropagation();
                      handleLogout();
                    }}
                    className="text-sm text-slate-600 hover:text-slate-900 px-3 py-1.5 rounded-xl hover:bg-slate-100 transition-colors font-medium"
                  >
                    Logout
                  </button>
                </div>
              </div>

              {/* Quick Stats (collapsed view) */}
              {!showUserProfile && userStats && (
                <div className="flex justify-between text-xs text-slate-600 px-2">
                  <div className="flex items-center space-x-1">
                    <MessageCircle size={12} />
                    <span>{userStats.sessionCount} chats</span>
                  </div>
                  <div className="flex items-center space-x-1">
                    <Zap size={12} />
                    <span>{userStats.totalMessages} messages</span>
                  </div>
                </div>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {showLoginForm ? (
                <div className="space-y-4">
                  {/* Error Message */}
                  {authError && (
                    <div className="p-3 bg-red-50 border border-red-200 rounded-xl backdrop-blur-sm">
                      <p className="text-red-600 text-sm">{authError}</p>
                    </div>
                  )}

                  {/* Google Sign In Button */}
                  <button
                    onClick={handleGoogleSignIn}
                    disabled={authLoading}
                    className={`w-full flex items-center justify-center space-x-3 px-4 py-3 bg-white hover:bg-gray-50 text-gray-800 rounded-2xl transition-all duration-200 border border-gray-300 shadow-sm hover:shadow-md ${
                      authLoading ? 'opacity-50 cursor-not-allowed' : ''
                    }`}
                  >
                    <svg className="w-5 h-5" viewBox="0 0 24 24">
                      <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                      <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                      <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                      <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                    </svg>
                    <span>{authLoading ? 'Signing in...' : 'Continue with Google'}</span>
                  </button>

                  <div className="flex items-center my-4">
                    <div className="flex-1 border-t border-slate-300"></div>
                    <span className="px-3 text-slate-600 text-sm">or</span>
                    <div className="flex-1 border-t border-slate-300"></div>
                  </div>

                  {/* Email/Password Form */}
                  <form onSubmit={handleLogin} className="bg-slate-50/50 backdrop-blur-sm p-4 rounded-2xl space-y-3 border border-slate-200/50">
                    <input
                      type="email"
                      name="email"
                      placeholder="Email address"
                      value={loginForm.email}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                    <input
                      type="password"
                      name="password"
                      placeholder="Password"
                      value={loginForm.password}
                      onChange={handleInputChange}
                      className="w-full px-4 py-3 border border-slate-300 rounded-xl text-sm focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                      required
                    />
                    <div className="flex space-x-2">
                      <button
                        type="submit"
                        disabled={authLoading}
                        className={`flex-1 bg-gradient-to-r from-blue-600 to-blue-700 text-white py-3 rounded-xl text-sm font-medium hover:from-blue-700 hover:to-blue-800 transition-all duration-200 ${
                          authLoading ? 'opacity-50 cursor-not-allowed' : ''
                        }`}
                      >
                        {authLoading ? 'Signing in...' : 'Sign In'}
                      </button>
                      <button
                        type="button"
                        onClick={() => {
                          setShowLoginForm(false);
                          setAuthError('');
                        }}
                        disabled={authLoading}
                        className="flex-1 bg-slate-200 text-slate-700 py-3 rounded-xl text-sm font-medium hover:bg-slate-300 transition-all duration-200"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              ) : (
                <button
                  onClick={() => setShowLoginForm(true)}
                  className="w-full flex items-center justify-center space-x-3 px-6 py-4 bg-gradient-to-r from-slate-100 to-slate-200 hover:from-slate-200 hover:to-slate-300 text-slate-800 rounded-2xl transition-all duration-200 border border-slate-300/50 shadow-sm hover:shadow-md font-medium"
                >
                  <LogIn size={20} />
                  <span>Sign In</span>
                </button>
              )}
            </div>
          )}
        </div>
      </div>
    </>
  );
};

export default Sidebar;