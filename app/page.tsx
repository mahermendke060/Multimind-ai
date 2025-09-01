'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Bot, Sparkles, Plus, Search, Moon, Image, Paperclip, Mic, Sparkles as SparklesIcon, X, History, LogOut, User, ChevronLeft, ChevronRight } from 'lucide-react';
import { cn } from '@/lib/utils';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { supabase } from '@/lib/supabase';
import Link from 'next/link';

interface AIModel {
  id: string;
  name: string;
  provider: string;
  description: string;
  icon: React.ReactNode;
  color: string;
  bgColor: string;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
}

interface ModelResponse {
  modelId: string;
  content: string;
  isLoading: boolean;
  error?: string;
  isBest?: boolean;
}

const AI_MODELS: AIModel[] = [
  {
    id: 'gpt-5',
    name: 'GPT-5',
    provider: 'OpenAI',
    description: 'Latest GPT model with advanced reasoning',
    icon: <Sparkles className="w-5 h-5" />,
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-500/10'
  },
  {
    id: 'claude-4-sonnet',
    name: 'Claude 4 Sonnet',
    provider: 'Anthropic',
    description: 'Fast and efficient reasoning model',
    icon: <Bot className="w-5 h-5" />,
    color: 'from-cyan-500 to-blue-600',
    bgColor: 'bg-cyan-500/10'
  },
  {
    id: 'gemini-2.5',
    name: 'Gemini 2.5',
    provider: 'Google',
    description: 'Multimodal reasoning capabilities',
    icon: <MessageSquare className="w-5 h-5" />,
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-500/10'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    provider: 'DeepSeek',
    description: 'Advanced reasoning and coding',
    icon: <Bot className="w-5 h-5" />,
    color: 'from-rose-500 to-pink-600',
    bgColor: 'bg-rose-500/10'
  }
];

export default function Home() {
  const { user, signOut } = useAuth();
  const { darkMode, toggleDarkMode, mounted } = useTheme();
  const [selectedModels, setSelectedModels] = useState<string[]>(AI_MODELS.map(m => m.id));
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);

  const [currentSessionId, setCurrentSessionId] = useState<string | null>(null);
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [passwordChange, setPasswordChange] = useState({ current: '', new: '', confirm: '' });
  const [passwordLoading, setPasswordLoading] = useState(false);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, responses]);

  // Don't render until theme is mounted to prevent hydration issues
  if (!mounted) {
    return <div className="min-h-screen bg-white dark:bg-gray-900"></div>;
  }

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const createNewSession = async () => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .insert({
          user_id: user.id,
          title: 'New Chat'
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error creating session:', error);
      return null;
    }
  };

  const saveMessageToDatabase = async (message: Message, sessionId: string) => {
    if (!user) return null;
    
    try {
      const { data, error } = await supabase
        .from('chat_messages')
        .insert({
          session_id: sessionId,
          user_id: user.id,
          content: message.content,
          role: message.role
        })
        .select()
        .single();

      if (error) throw error;
      return data.id;
    } catch (error) {
      console.error('Error saving message:', error);
      return null;
    }
  };

  const saveModelResponseToDatabase = async (messageId: string, modelId: string, content: string, isBest: boolean = false) => {
    try {
      const { error } = await supabase
        .from('model_responses')
        .insert({
          message_id: messageId,
          model_id: modelId,
          content,
          is_best: isBest
        });

      if (error) throw error;
    } catch (error) {
      console.error('Error saving model response:', error);
    }
  };

  const handleNewChat = async () => {
    setMessages([]);
    setResponses([]);
    setCurrentInput('');
    setSelectedModels([]);
    setCurrentSessionId(null);
  };

  const handlePasswordChange = async () => {
    if (passwordChange.new !== passwordChange.confirm) {
      alert('New passwords do not match');
      return;
    }
    
    if (passwordChange.new.length < 6) {
      alert('New password must be at least 6 characters');
      return;
    }

    setPasswordLoading(true);
    try {
      const { error } = await supabase.auth.updateUser({
        password: passwordChange.new
      });

      if (error) throw error;
      
      alert('Password updated successfully!');
      setPasswordChange({ current: '', new: '', confirm: '' });
      setShowSettings(false);
    } catch (error) {
      console.error('Error updating password:', error);
      alert('Failed to update password. Please try again.');
    } finally {
      setPasswordLoading(false);
    }
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || selectedModels.length === 0 || !user) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentInput,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsLoading(true);

    // Create or get session
    let sessionId = currentSessionId;
    if (!sessionId) {
      sessionId = await createNewSession();
      setCurrentSessionId(sessionId);
    }

    // Save user message to database
    let messageId: string | null = null;
    if (sessionId) {
      messageId = await saveMessageToDatabase(userMessage, sessionId);
    }

    // Initialize responses for selected models
    const initialResponses: ModelResponse[] = selectedModels.map(modelId => ({
      modelId,
      content: '',
      isLoading: true
    }));
    setResponses(initialResponses);

    try {
      // Make API call to our backend which will call OpenRouter
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          models: selectedModels
        })
      });

      if (!response.ok) {
        throw new Error(`API request failed: ${response.statusText}`);
      }

      const data = await response.json();
      
      if (data.error) {
        throw new Error(data.error);
      }

      // Map the API responses to our local format
      const results: ModelResponse[] = data.responses.map((resp: { modelId: string; content?: string; error?: string }) => ({
        modelId: resp.modelId,
        content: resp.content || '',
        isLoading: false,
        error: resp.error
      }));

      setResponses(results);

      // Save model responses to database
      if (messageId && sessionId) {
        for (const result of results) {
          if (result.content && !result.error) {
            await saveModelResponseToDatabase(messageId, result.modelId, result.content, result.isBest);
          }
        }
      }

      // Update session title if it's the first message
      if (sessionId && messages.length === 0) {
        const title = currentInput.length > 50 ? currentInput.substring(0, 50) + '...' : currentInput;
        await supabase
          .from('chat_sessions')
          .update({ title, updated_at: new Date().toISOString() })
          .eq('id', sessionId);
      }

    } catch (error) {
      console.error('Error getting responses:', error);
      setResponses(prev => prev.map(r => ({ 
        ...r, 
        error: error instanceof Error ? error.message : 'Failed to get response', 
        isLoading: false 
      })));
    } finally {
      setIsLoading(false);
    }
  };

  // Removed unused functions: handleCopyResponse and handleMarkBest

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Show auth form if not logged in
  if (!user) {
    return (
      <div className={cn(
        "min-h-screen flex items-center justify-center p-6 transition-colors duration-300",
        darkMode ? "bg-slate-900" : "bg-white"
      )}>
        <div className="w-full max-w-md">
          {/* Logo */}
          <div className="text-center mb-8">
            <div className="w-16 h-16 bg-gradient-to-r from-violet-500 to-purple-600 rounded-2xl flex items-center justify-center mx-auto mb-4">
              <SparklesIcon className="w-8 h-8 text-white" />
            </div>
            <h1 className={cn(
              "text-3xl font-bold mb-2",
              darkMode ? "text-white" : "text-slate-900"
            )}>MultiMind</h1>
            <p className={cn(
              darkMode ? "text-slate-400" : "text-slate-600"
            )}>Sign in to continue</p>
          </div>

          {/* Auth Form */}
          <div className={cn(
            "rounded-2xl p-8 backdrop-blur-xl border transition-colors duration-300",
            darkMode 
              ? "bg-slate-800/80 border-slate-700/50" 
              : "bg-white/90 border-slate-200/50"
          )}>
            <div className="text-center">
              <p className={cn(
                "mb-6",
                darkMode ? "text-slate-400" : "text-slate-600"
              )}>Please sign in to use MultiMind</p>
              <Link
                href="/auth"
                className="inline-block bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-xl py-3 px-6 font-medium hover:from-violet-700 hover:to-purple-800 transition-all duration-200"
              >
                Sign In / Sign Up
              </Link>
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      darkMode ? "bg-slate-900 text-white" : "bg-white text-slate-900"
    )}>
      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full backdrop-blur-xl transition-all duration-300",
        darkMode 
          ? "bg-slate-800/80 border-r border-slate-600" 
          : "bg-white/90 border-r border-slate-300",
        sidebarCollapsed ? "w-16" : "w-64"
      )}>
        <div className={cn(
          "h-full transition-all duration-300 overflow-hidden", 
          sidebarCollapsed ? "p-3" : "p-6"
        )}>
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
            {!sidebarCollapsed && (
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
            MultiMind
          </h1>
            )}
          </div>

          {/* User Info */}
          <div className={cn(
            "rounded-xl p-4 mb-6 border",
            darkMode ? "bg-slate-700/50 border-slate-600" : "bg-slate-100/80 border-slate-300"
          )}>
            <div className="flex items-center gap-3 mb-3">
              <div className={cn(
                "w-8 h-8 rounded-full flex items-center justify-center",
                darkMode ? "bg-slate-600" : "bg-slate-300"
              )}>
                <User className={cn("w-4 h-4", darkMode ? "text-white" : "text-slate-700")} />
              </div>
              {!sidebarCollapsed && (
                <div className="flex-1 min-w-0">
                  <p className={cn(
                    "text-sm font-medium truncate",
                    darkMode ? "text-white" : "text-slate-800"
                  )}>
                    {user.email}
                  </p>
                </div>
              )}
            </div>
            {!sidebarCollapsed && (
              <button
                onClick={() => signOut()}
                className={cn(
                  "w-full flex items-center justify-center gap-2 transition-colors text-sm",
                  darkMode 
                    ? "text-slate-400 hover:text-white" 
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            )}
        </div>

        {/* New Chat Button */}
        <button 
          onClick={handleNewChat}
            className={cn(
              "w-full bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-lg py-3 flex items-center justify-center gap-2 mb-6 hover:from-violet-700 hover:to-purple-800 transition-all duration-200 shadow-lg",
              sidebarCollapsed ? "px-2" : "px-4"
            )}>
          <Plus className="w-4 h-4" />
            {!sidebarCollapsed && <span>New Chat</span>}
        </button>

          {/* Navigation */}
          <div className="space-y-2 mb-6">
            <Link
              href="/history"
              className={cn(
                "flex items-center gap-3 p-3 rounded-lg transition-colors",
                darkMode 
                  ? "text-slate-400 hover:text-white hover:bg-slate-700/50" 
                  : "text-slate-600 hover:text-slate-800 hover:bg-slate-200/50",
                sidebarCollapsed ? "justify-center" : ""
              )}
            >
              <History className="w-5 h-5" />
              {!sidebarCollapsed && <span>Chat History</span>}
            </Link>
          </div>

        {/* Search */}
          {!sidebarCollapsed && (
        <div className="relative mb-6">
              <Search className={cn(
                "absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4",
                darkMode ? "text-gray-400" : "text-gray-500"
              )} />
          <input
            type="text"
            placeholder="Search chats..."
                className={cn(
                  "w-full rounded-lg py-2 pl-10 pr-4 focus:outline-none focus:ring-2 focus:ring-violet-500 border",
                  darkMode 
                    ? "bg-gray-700 text-white placeholder-gray-400 border-slate-600/50" 
                    : "bg-gray-100 text-slate-800 placeholder-gray-500 border-slate-300/50"
                )}
          />
        </div>
          )}

          {/* Recent Chats */}
          {!sidebarCollapsed && (
        <div className="mb-6">
              <h3 className={cn(
                "text-sm font-medium mb-3",
                darkMode ? "text-gray-300" : "text-gray-700"
              )}>Recent Chats</h3>
              <div className="space-y-2">
                {messages.length > 0 ? (
                  <div className="space-y-2">
                    {messages.slice(-3).map((message) => (
                      <div key={message.id} className={cn(
                        "rounded-lg p-3 cursor-pointer transition-colors",
                        darkMode 
                          ? "bg-gray-700 hover:bg-gray-600" 
                          : "bg-gray-100 hover:bg-gray-200"
                      )}>
                        <div className="flex items-center gap-2 mb-1">
                          <div className={cn(
                            "w-4 h-4 rounded-full flex items-center justify-center",
                            darkMode ? "bg-gray-600" : "bg-gray-300"
                          )}>
                            <span className={cn(
                              "text-xs font-medium",
                              darkMode ? "text-white" : "text-gray-700"
                            )}>U</span>
                          </div>
                          <span className={cn(
                            "text-xs",
                            darkMode ? "text-gray-400" : "text-gray-600"
                          )}>You</span>
                        </div>
                        <p className={cn(
                          "text-sm truncate",
                          darkMode ? "text-gray-200" : "text-gray-800"
                        )}>
                          {message.content}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className={cn(
                    "text-center py-4",
                    darkMode ? "text-gray-400" : "text-gray-500"
                  )}>
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs">Start chatting to see history here</p>
              </div>
            )}
          </div>
        </div>
          )}

          {/* Settings Section */}
          <div className={cn(
            "absolute bottom-6 transition-all duration-300",
            sidebarCollapsed ? "left-3 right-3" : "left-6 right-6"
          )}>
            <div className="space-y-3">
              {/* Settings Button */}
              <button
                onClick={() => setShowSettings(true)}
                className={cn(
                  "flex items-center gap-2 p-2 transition-colors rounded-lg",
                  darkMode 
                    ? "text-gray-400 hover:text-white hover:bg-slate-700/50" 
                    : "text-gray-600 hover:text-slate-800 hover:bg-slate-200/50",
                  sidebarCollapsed ? "w-full justify-center" : "w-full"
                )}
                title="Settings"
              >
                <User className="w-5 h-5" />
                {!sidebarCollapsed && <span className="text-sm">Settings</span>}
              </button>

              {/* Dark Mode Toggle */}
          <button
            onClick={toggleDarkMode}
                className={cn(
                  "flex items-center gap-2 p-2 transition-colors rounded-lg",
                  darkMode 
                    ? "text-gray-400 hover:text-white hover:bg-slate-700/50" 
                    : "text-gray-600 hover:text-slate-800 hover:bg-slate-200/50",
                  sidebarCollapsed ? "w-full justify-center" : "w-full"
                )}
                title={darkMode ? "Light Mode" : "Dark Mode"}
          >
            <Moon className="w-5 h-5" />
                {!sidebarCollapsed && <span className="text-sm">{darkMode ? "Light" : "Dark"}</span>}
              </button>

              {/* Sidebar Collapse Toggle */}
              <button
                onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                className={cn(
                  "flex items-center gap-2 p-2 transition-colors rounded-lg",
                  darkMode 
                    ? "text-gray-400 hover:text-white hover:bg-slate-700/50" 
                    : "text-gray-600 hover:text-slate-800 hover:bg-slate-200/50",
                  sidebarCollapsed ? "w-full justify-center" : "w-full"
                )}
                title={sidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
              >
                {sidebarCollapsed ? (
                  <ChevronRight className="w-5 h-5" />
                ) : (
                  <ChevronLeft className="w-5 h-5" />
                )}
                {!sidebarCollapsed && <span className="text-sm">Collapse</span>}
          </button>


            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300 p-6", 
        sidebarCollapsed ? "ml-16" : "ml-64"
      )}>
        {/* Top Header Bar */}
        <div className={cn(
          "rounded-2xl p-6 mb-6 backdrop-blur-xl border-2",
          darkMode 
            ? "bg-slate-800/80 border-slate-600" 
            : "bg-white/80 border-slate-300"
        )}>
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={cn(
                  "text-2xl font-bold",
                  darkMode ? "text-white" : "text-slate-900"
                )}>MultiMind</h1>
                <p className={cn(
                  darkMode ? "text-slate-400" : "text-slate-600"
                )}>Compare AI models in real-time</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className={cn(
                  darkMode ? "text-slate-400" : "text-slate-600"
                )}>Models</span>
                <span className={cn(
                  "px-3 py-1 rounded-lg font-medium",
                  darkMode 
                    ? "bg-slate-700 text-white" 
                    : "bg-slate-200 text-slate-800"
                )}>
                  ({selectedModels.length}/7)
                </span>
              </div>

              <button 
                onClick={() => setSelectedModels([])}
                className={cn(
                  "px-3 py-1 transition-colors",
                  darkMode 
                    ? "text-slate-400 hover:text-white" 
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                Clear
              </button>
              <button 
                onClick={() => setSelectedModels(AI_MODELS.map(m => m.id))}
                className={cn(
                  "px-3 py-1 transition-colors",
                  darkMode 
                    ? "text-slate-400 hover:text-white" 
                    : "text-slate-600 hover:text-slate-800"
                )}
              >
                All
              </button>
            </div>
          </div>
        </div>

        {selectedModels.length === 0 ? (
          /* Welcome Screen */
          <div className="text-center py-20">
            <div className="w-24 h-24 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center mx-auto mb-6 shadow-2xl">
              <SparklesIcon className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-4xl font-bold text-white mb-4">Welcome to MultiMind</h2>
            <p className="text-slate-400 text-lg mb-8">Click &quot;All&quot; above to start comparing all AI models</p>
            <button 
              onClick={() => setSelectedModels(AI_MODELS.map(m => m.id))}
              className="px-8 py-3 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-xl hover:from-violet-700 hover:to-purple-800 transition-all duration-200 shadow-lg hover:shadow-xl"
            >
              Start with All Models
            </button>
          </div>
        ) : (
          /* Chat Interface */
          <>
            {/* Header with Model Selectors */}
            <div className="mb-8">
              <div className="flex items-center gap-4 mb-4">
                <span className={cn(
                  darkMode ? "text-slate-400" : "text-slate-600"
                )}>Models ({selectedModels.length}/7)</span>
              </div>
              <div className="flex items-center gap-4 overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50">
                <div className="flex items-center gap-4 min-w-max">
                  {AI_MODELS.map((model) => {
                    const isSelected = selectedModels.includes(model.id);
                    return (
                      <button
                        key={model.id}
                        onClick={() => handleModelToggle(model.id)}
                        className={cn(
                          "flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all duration-200 cursor-pointer flex-shrink-0",
                          isSelected 
                            ? `bg-gradient-to-r ${model.color} border-transparent text-white shadow-lg` 
                            : darkMode
                              ? "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600/50 hover:bg-slate-700/50"
                              : "bg-slate-100 border-slate-300 text-slate-600 hover:border-slate-400 hover:bg-slate-200"
                        )}
                      >
                        {model.icon}
                        <span className="font-medium">{model.name}</span>
                        {isSelected && (
                          <div
                            onClick={(e) => {
                              e.stopPropagation();
                              handleModelToggle(model.id);
                            }}
                            className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors cursor-pointer"
                          >
                            <X className="w-3 h-3" />
                          </div>
                        )}
                      </button>
                    );
                  })}
                </div>
              </div>
            </div>

            {/* Chat Columns */}
            <div className="overflow-x-auto pb-4 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50">
              <div className="grid gap-6 mb-8 min-w-max" style={{ gridTemplateColumns: `repeat(${selectedModels.length}, 400px)` }}>
              {selectedModels.map((modelId) => {
                const model = AI_MODELS.find(m => m.id === modelId);
                const response = responses.find(r => r.modelId === modelId);
                const hasMessages = messages.length > 0;
                
                return (
                  <div
                    key={modelId}
                    className={cn(
                      "bg-slate-800/50 rounded-2xl border-2 border-slate-600 p-6 min-h-[500px] flex flex-col",
                      "backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300",
                      model?.bgColor
                    )}
                  >
                    {/* Model Header */}
                    <div className="mb-6">
                      <div className={cn(
                        "flex items-center gap-3 px-4 py-3 rounded-xl shadow-lg border w-full",
                        darkMode 
                          ? `bg-gradient-to-r ${model?.color} border-white/20`
                          : `bg-gradient-to-r ${model?.color} border-slate-200/50 shadow-md`
                      )}>
                        <div className={cn(
                          "w-8 h-8 rounded-lg flex items-center justify-center backdrop-blur-sm",
                          darkMode 
                            ? "bg-white/20" 
                            : "bg-white/90"
                        )}>
                          {model?.icon}
                        </div>
                        <div>
                          <h3 className={cn(
                            "font-bold text-lg",
                            darkMode ? "text-white" : "text-white drop-shadow-sm"
                          )}>{model?.name}</h3>
                          <p className={cn(
                            "text-sm",
                            darkMode ? "text-white/80" : "text-white/90 drop-shadow-sm"
                          )}>{model?.provider}</p>
                        </div>
                      </div>
                    </div>

                    {/* Chat Content */}
                    <div className="flex-1 space-y-4">
                      {hasMessages && (
                        <>
                          {/* User Message - Right Side */}
                          <div className="flex items-start gap-3 justify-end">
                            <div className="bg-slate-600/80 rounded-2xl p-4 flex-1 border-2 border-slate-500/50 max-w-[80%] shadow-lg">
                              <p className="text-white font-medium">{messages[messages.length - 1]?.content}</p>
                            </div>
                            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg">
                              <span className="text-sm font-medium text-white">U</span>
                            </div>
                          </div>

                          {/* AI Response - Left Side */}
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg",
                              `bg-gradient-to-r ${model?.color}`
                            )}>
                              {model?.icon}
                            </div>
                            <div className={cn(
                              "rounded-2xl p-4 flex-1 border-2 shadow-lg",
                              `bg-gradient-to-r ${model?.color} opacity-80`
                            )}>
                              {response?.isLoading ? (
                                <div className="flex items-center gap-3 text-slate-300">
                                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-violet-500"></div>
                                  <span className="text-sm">Thinking...</span>
                                </div>
                              ) : response?.error ? (
                                <p className="text-rose-400 text-sm">{response.error}</p>
                              ) : response?.content ? (
                                <p className="text-white leading-relaxed">{response.content}</p>
                              ) : (
                                <p className="text-slate-400 text-sm">Ready to respond...</p>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {!hasMessages && (
                        <div className="text-center text-slate-400 py-12">
                          <div className={cn(
                            "w-20 h-20 mx-auto mb-4 rounded-2xl flex items-center justify-center",
                            `bg-gradient-to-r ${model?.color}`
                          )}>
                            {model?.icon}
                          </div>
                        </div>
                      )}
                    </div>


                  </div>
                );
              })}
              </div>
            </div>

            {/* Bottom Message Input */}
            <div className={cn(
              "fixed bottom-6 rounded-2xl backdrop-blur-xl shadow-2xl transition-all duration-300 border-2",
              darkMode 
                ? "bg-slate-800/90 border-slate-600" 
                : "bg-white/95 border-slate-300",
              sidebarCollapsed ? "left-20 right-6" : "left-72 right-6"
            )}>
              <div className="flex items-center gap-3 p-4">
                {/* Left Action Buttons */}
                <div className="flex items-center gap-1">
                  <button 
                    className={cn(
                      "p-2.5 transition-all duration-200 rounded-xl hover:scale-105",
                      darkMode 
                        ? "text-slate-400 hover:text-white hover:bg-slate-700/60" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/80"
                    )}
                    title="Upload Image"
                  >
                    {/* eslint-disable-next-line jsx-a11y/alt-text */}
                    <Image className="w-5 h-5" />
                  </button>
                  <button 
                    className={cn(
                      "p-2.5 transition-all duration-200 rounded-xl hover:scale-105",
                      darkMode 
                        ? "text-slate-400 hover:text-white hover:bg-slate-700/60" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/80"
                    )}
                    title="Attach File"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>

                {/* Main Input Field */}
                <div className="flex-1 relative">
                  <input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything..."
                    className={cn(
                      "w-full rounded-xl px-4 py-3.5 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 border-2 transition-all duration-200",
                      darkMode 
                        ? "bg-slate-700/60 text-white placeholder-slate-400 border-slate-600 focus:border-violet-500" 
                        : "bg-slate-50 text-slate-800 placeholder-slate-500 border-slate-300 focus:border-violet-500"
                    )}
                    disabled={selectedModels.length === 0 || isLoading}
                  />
                  {selectedModels.length === 0 && (
                    <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                      <span className={cn(
                        "text-xs px-2 py-1 rounded-full",
                        darkMode ? "text-slate-500 bg-slate-600/30" : "text-slate-400 bg-slate-200/50"
                      )}>
                        Select at least one model
                      </span>
                    </div>
                  )}
                </div>

                {/* Right Action Buttons */}
                <div className="flex items-center gap-1">
                  <button 
                    className={cn(
                      "p-2.5 transition-all duration-200 rounded-xl hover:scale-105",
                      darkMode 
                        ? "text-slate-400 hover:text-white hover:bg-slate-700/60" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/80"
                    )}
                    title="Voice Input"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <button 
                    className={cn(
                      "p-2.5 transition-all duration-200 rounded-xl hover:scale-105",
                      darkMode 
                        ? "text-slate-400 hover:text-white hover:bg-slate-700/60" 
                        : "text-slate-500 hover:text-slate-700 hover:bg-slate-100/80"
                    )}
                    title="AI Suggestions"
                  >
                    <SparklesIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!currentInput.trim() || selectedModels.length === 0 || isLoading}
                    className={cn(
                      "p-3 transition-all duration-200 rounded-xl shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                      currentInput.trim() && selectedModels.length > 0 && !isLoading
                        ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white hover:from-violet-600 hover:to-purple-700"
                        : "bg-slate-600/50 text-slate-400"
                    )}
                    title="Send Message"
                  >
                    <Send className="w-5 h-5" />
                  </button>
                </div>
              </div>
            </div>
          </>
        )}
      </div>

      <div ref={messagesEndRef} />



      {/* Settings Modal */}
      {showSettings && (
        <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50">
          <div className="bg-slate-800 rounded-2xl p-6 w-full max-w-md mx-4 border-2 border-slate-600">
            <div className="flex items-center justify-between mb-6">
              <h2 className="text-xl font-bold text-white">Settings</h2>
              <button
                onClick={() => setShowSettings(false)}
                className="p-2 text-slate-400 hover:text-white transition-colors rounded-lg hover:bg-slate-700/50"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Password Change Section */}
            <div className="space-y-4">
              <h3 className="text-lg font-medium text-white">Change Password</h3>
              
              <div className="space-y-3">
                <input
                  type="password"
                  placeholder="Current Password"
                  value={passwordChange.current}
                  onChange={(e) => setPasswordChange(prev => ({ ...prev, current: e.target.value }))}
                  className="w-full bg-slate-700/50 text-white rounded-lg px-4 py-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 border-2 border-slate-600"
                />
                
                <input
                  type="password"
                  placeholder="New Password"
                  value={passwordChange.new}
                  onChange={(e) => setPasswordChange(prev => ({ ...prev, new: e.target.value }))}
                  className="w-full bg-slate-700/50 text-white rounded-lg px-4 py-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 border-2 border-slate-600"
                />
                
                <input
                  type="password"
                  placeholder="Confirm New Password"
                  value={passwordChange.confirm}
                  onChange={(e) => setPasswordChange(prev => ({ ...prev, confirm: e.target.value }))}
                  className="w-full bg-slate-700/50 text-white rounded-lg px-4 py-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 border-2 border-slate-600"
                />
              </div>

              <button
                onClick={handlePasswordChange}
                disabled={passwordLoading || !passwordChange.current || !passwordChange.new || !passwordChange.confirm}
                className="w-full bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-lg py-3 px-4 font-medium hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200"
              >
                {passwordLoading ? 'Updating...' : 'Update Password'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
