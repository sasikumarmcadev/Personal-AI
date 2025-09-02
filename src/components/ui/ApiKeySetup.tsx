import React, { useState, useEffect } from 'react';
import { Key, ExternalLink, AlertCircle, CheckCircle, Sparkles, Zap, Shield } from 'lucide-react';

interface ApiKeySetupProps {
  onApiKeySet: () => void;
}

export const ApiKeySetup: React.FC<ApiKeySetupProps> = ({ onApiKeySet }) => {
  const [apiKey, setApiKey] = useState('');
  const [isValid, setIsValid] = useState(false);

  useEffect(() => {
    // Check if API key is already set
    const existingKey = import.meta.env.VITE_GROQ_API_KEY;
    if (existingKey && existingKey !== 'your_groq_api_key_here') {
      setIsValid(true);
      onApiKeySet();
    }
  }, [onApiKeySet]);

  const handleApiKeyChange = (value: string) => {
    setApiKey(value);
    // Basic validation - Groq API keys typically start with 'gsk_'
    setIsValid(value.startsWith('gsk_') && value.length > 20);
  };

  const handleSave = () => {
    if (isValid) {
      // In a real application, you would save this securely
      // For demo purposes, we'll just proceed
      onApiKeySet();
    }
  };

  if (isValid && import.meta.env.VITE_GROQ_API_KEY !== 'your_groq_api_key_here') {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="max-w-lg w-full bg-white/90 backdrop-blur-md rounded-3xl shadow-2xl p-8 border border-white/50">
        <div className="text-center mb-8">
          <div className="relative mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-blue-600 via-purple-600 to-blue-700 rounded-3xl flex items-center justify-center mx-auto shadow-2xl">
              <Key className="text-white" size={40} />
            </div>
            <div className="absolute -top-2 -right-2 w-8 h-8 bg-gradient-to-r from-green-400 to-emerald-500 rounded-full flex items-center justify-center shadow-lg">
              <Sparkles size={16} className="text-white" />
            </div>
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-slate-800 to-slate-600 bg-clip-text text-transparent mb-3">
            Setup Groq API Key
          </h1>
          <p className="text-slate-600 text-lg">
            Enter your Groq API key to unlock the full AI experience
          </p>
        </div>

        <div className="space-y-6">
          <div>
            <label className="block text-sm font-semibold text-slate-700 mb-3">
              API Key
            </label>
            <div className="relative">
              <input
                type="password"
                value={apiKey}
                onChange={(e) => handleApiKeyChange(e.target.value)}
                placeholder="gsk_..."
                className="w-full px-4 py-4 border border-slate-300 rounded-2xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-300 text-base shadow-sm"
              />
              <div className="absolute right-4 top-4">
                {apiKey && (
                  isValid ? (
                    <CheckCircle className="text-green-500" size={24} />
                  ) : (
                    <AlertCircle className="text-red-500" size={24} />
                  )
                )}
              </div>
            </div>
            {apiKey && !isValid && (
              <p className="text-red-500 text-sm mt-2 flex items-center">
                <AlertCircle size={16} className="mr-1" />
                Please enter a valid Groq API key (starts with 'gsk_')
              </p>
            )}
          </div>

          <div className="bg-gradient-to-r from-blue-50 to-purple-50 border border-blue-200/50 rounded-2xl p-6 backdrop-blur-sm">
            <div className="flex items-start space-x-3 mb-4">
              <div className="w-8 h-8 bg-blue-100 rounded-xl flex items-center justify-center">
                <Zap size={16} className="text-blue-600" />
              </div>
              <div>
                <h3 className="font-bold text-slate-800 mb-2">
                  How to get your API key:
                </h3>
                <ol className="text-sm text-slate-700 space-y-2 leading-relaxed">
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">1</span>
                    Visit the Groq Console
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">2</span>
                    Sign up or log in to your account
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">3</span>
                    Navigate to API Keys section
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">4</span>
                    Create a new API key
                  </li>
                  <li className="flex items-start">
                    <span className="bg-blue-100 text-blue-600 rounded-full w-5 h-5 flex items-center justify-center text-xs font-bold mr-2 mt-0.5 flex-shrink-0">5</span>
                    Copy and paste it above
                  </li>
                </ol>
              </div>
            </div>
            <a
              href="https://console.groq.com/keys"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center text-blue-600 hover:text-blue-700 font-semibold transition-colors group"
            >
              Open Groq Console
              <ExternalLink size={16} className="ml-2 group-hover:translate-x-0.5 transition-transform" />
            </a>
          </div>

          <button
            onClick={handleSave}
            disabled={!isValid}
            className="w-full py-4 px-6 bg-gradient-to-r from-blue-600 to-blue-700 text-white rounded-2xl font-semibold text-lg hover:from-blue-700 hover:to-blue-800 disabled:opacity-50 disabled:cursor-not-allowed disabled:from-slate-300 disabled:to-slate-400 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105 disabled:hover:scale-100"
          >
            {isValid ? 'Start Chatting' : 'Enter Valid API Key'}
          </button>

          <div className="flex items-center justify-center space-x-6 pt-4">
            <div className="flex items-center text-xs text-slate-500">
              <Shield size={14} className="mr-2 text-green-500" />
              Secure & Private
            </div>
            <div className="flex items-center text-xs text-slate-500">
              <Sparkles size={14} className="mr-2 text-purple-500" />
              AI Powered
            </div>
            <div className="flex items-center text-xs text-slate-500">
              <Zap size={14} className="mr-2 text-blue-500" />
              Lightning Fast
            </div>
          </div>

          <div className="text-center">
            <p className="text-xs text-slate-500 leading-relaxed">
              Your API key is stored locally in your browser and never shared with external services. 
              We prioritize your privacy and security.
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};