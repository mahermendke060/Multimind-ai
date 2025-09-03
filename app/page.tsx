'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, MessageSquare, Bot, Sparkles, Plus, Search, Moon, Image, Paperclip, Mic, Sparkles as SparklesIcon, X, History, LogOut, User, ChevronLeft, ChevronRight } from 'lucide-react';
import NextImage from 'next/image';

// Custom SVG Logo Components
const GPTLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div 
    className={className}
    style={{
      backgroundImage: 'url(/svg-logos/gpt-5.svg)',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      minWidth: '32px',
      minHeight: '32px'
    }}
  />
);

const ClaudeLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div 
    className={className}
    style={{
      backgroundImage: 'url(/svg-logos/claude.svg)',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      minWidth: '32px',
      minHeight: '32px'
    }}
  />
);

const GeminiLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div 
    className={className}
    style={{
      backgroundImage: 'url(/svg-logos/gemini.svg)',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      minWidth: '32px',
      minHeight: '32px'
    }}
  />
);

const DeepSeekLogo = ({ className = "w-8 h-8" }: { className?: string }) => (
  <div 
    className={className}
    style={{
      backgroundImage: 'url(/svg-logos/deepseek.svg)',
      backgroundSize: 'contain',
      backgroundRepeat: 'no-repeat',
      backgroundPosition: 'center',
      minWidth: '32px',
      minHeight: '32px'
    }}
  />
);
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
    name: 'OpenAI',
    provider: 'Chatgpt',
    description: 'Latest GPT model with advanced reasoning',
    icon: <GPTLogo className="w-8 h-8" />,
    color: 'from-violet-500 to-purple-600',
    bgColor: 'bg-violet-500/10'
  },
  {
    id: 'claude-4-sonnet',
    name: 'Anthropic',
    provider: 'Claude ai',
    description: 'Fast and efficient reasoning model',
    icon: <ClaudeLogo className="w-8 h-8" />,
    color: 'from-cyan-500 to-blue-600',
    bgColor: 'bg-cyan-500/10'
  },
  {
    id: 'gemini-2.5',
    name: 'Google',
    provider: 'Gemini',
    description: 'Multimodal reasoning capabilities',
    icon: <GeminiLogo className="w-8 h-8" />,
    color: 'from-emerald-500 to-teal-600',
    bgColor: 'bg-emerald-500/10'
  },
  {
    id: 'deepseek',
    name: 'DeepSeek',
    provider: 'DeepSeek',
    description: 'Advanced reasoning and coding',
    icon: <DeepSeekLogo className="w-8 h-8" />,
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
  
  // State for file attachments
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showImagePicker, setShowImagePicker] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Check for mobile screen size and collapse sidebar by default
  useEffect(() => {
    const handleResize = () => {
      if (window.innerWidth < 768) { // Standard mobile breakpoint
        setSidebarCollapsed(true);
      }
    };
    
    // Set initial state
    handleResize();
    
    // Add event listener for window resize
    window.addEventListener('resize', handleResize);
    
    // Cleanup
    return () => window.removeEventListener('resize', handleResize);
  }, []);
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
    if ((!currentInput.trim() && attachedFiles.length === 0) || selectedModels.length === 0 || !user) return;

    // Create message content - include file information if files are attached
    let messageContent = currentInput;
    if (attachedFiles.length > 0) {
      const fileNames = attachedFiles.map(file => file.name).join(', ');
      messageContent += `\n[Attached: ${fileNames}]`;
    }

    const userMessage: Message = {
      id: Date.now().toString(),
      content: messageContent,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setAttachedFiles([]);
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
      // Note: In a real implementation, you would need to handle file uploads
      // This would typically involve FormData and multipart/form-data
      const response = await fetch('/api/chat', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          message: currentInput,
          models: selectedModels,
          // In a real implementation, you would upload files and include references
          attachedFiles: attachedFiles.length > 0 ? attachedFiles.map(file => ({
            name: file.name,
            type: file.type,
            size: file.size
          })) : []
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
  
  // Handle file attachment
  const handleFileAttachment = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
      setShowFilePicker(false);
    }
  };
  
  // Handle image upload
  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (e.target.files) {
      const newFiles = Array.from(e.target.files);
      setAttachedFiles(prev => [...prev, ...newFiles]);
      setShowImagePicker(false);
    }
  };
  
  // Remove attached file
  const removeAttachedFile = (index: number) => {
    setAttachedFiles(prev => prev.filter((_, i) => i !== index));
  };
  
  // Trigger file input click
  const openFilePicker = () => {
    fileInputRef.current?.click();
  };
  
  // Trigger image input click
  const openImagePicker = () => {
    imageInputRef.current?.click();
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
      darkMode ? "bg-[#202124] text-white" : "bg-[#FBF9F6] text-gray-900"
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
              <div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
            MultiMind
          </h1>
                <p className={cn(
                  "text-sm",
                  darkMode ? "text-slate-400" : "text-slate-600"
                )}>
                  Compare AI models in real-time
                </p>
              </div>
            )}
          </div>

          {/* User Info section removed */}

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

              {/* Settings Button */}
              <div className="flex items-center gap-2">
                <button
                  onClick={() => setShowSettings(true)}
                  className={cn(
                    "flex items-center gap-2 p-2 transition-colors rounded-lg flex-grow",
                    darkMode 
                      ? "text-gray-400 hover:text-white hover:bg-slate-700/50" 
                      : "text-gray-600 hover:text-slate-800 hover:bg-slate-200/50",
                    sidebarCollapsed ? "justify-center" : ""
                  )}
                  title="Settings"
                >
                  <User className="w-5 h-5" />
                  {!sidebarCollapsed && <span className="text-sm">Settings</span>}
                </button>
                {!sidebarCollapsed && (
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className={cn(
                      "p-2 transition-colors rounded-lg",
                      darkMode 
                        ? "text-gray-400 hover:text-white hover:bg-slate-700/50" 
                        : "text-gray-600 hover:text-slate-800 hover:bg-slate-200/50"
                    )}
                    title="Collapse Sidebar"
                  >
                    <ChevronLeft className="w-5 h-5" />
                  </button>
                )}
              </div>
              
              {/* Collapse Button - Now below the human button when sidebar is collapsed */}
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={cn(
                    "w-full p-2 transition-colors rounded-lg flex justify-center mt-3",
                    darkMode 
                      ? "text-gray-400 hover:text-white hover:bg-slate-700/50" 
                      : "text-gray-600 hover:text-slate-800 hover:bg-slate-200/50"
                  )}
                  title="Expand Sidebar"
                >
                  <ChevronRight className="w-5 h-5" />
                </button>
              )}


            </div>
          </div>
        </div>
      </div>

      {/* Main Content */}
      <div className={cn(
        "transition-all duration-300 p-6", 
        sidebarCollapsed ? "ml-16" : "ml-64"
      )}>


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


            {/* Chat Columns */}
            <div className="overflow-x-auto overflow-y-auto pb-20 scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50 h-[calc(100vh-160px)]">
              <div className="flex min-h-full">
              {AI_MODELS.map((model) => {
                const modelId = model.id;
                const isSelected = selectedModels.includes(modelId);
                const response = responses.find(r => r.modelId === modelId);
                const hasMessages = messages.length > 0;
                
                return (
                  <div
                    key={modelId}
                    className={cn(
                      "rounded-md border flex flex-col backdrop-blur-sm transition-all duration-300",
                      isSelected 
                        ? darkMode 
                          ? "bg-slate-800 border-slate-600 shadow-xl hover:shadow-2xl p-8 w-[600px] min-h-[calc(100vh-170px)]" 
                          : "bg-white border-slate-300 shadow-xl hover:shadow-2xl p-8 w-[600px] min-h-[calc(100vh-170px)]"
                        : darkMode 
                          ? "bg-black border-gray-800 p-0 w-[40px]" 
                          : "bg-white/50 border-slate-300/50 p-0 w-[40px]"
                    )}
                  >
                    {/* Model Header */}
                    <div className={cn(
                      "mb-6",
                      isSelected ? "-mx-6 -mt-6" : ""
                    )}>
                      <div className={cn(
                        "flex items-center justify-between w-full transition-all duration-300",
                        isSelected
                          ? "px-4 py-3"
                          : "p-1",
                        isSelected
                          ? darkMode 
                            ? "bg-slate-700 border-b border-slate-600"
                            : "bg-white border-b border-gray-200"
                          : darkMode
                            ? "bg-black"
                            : "bg-white/50"
                      )}>
                                                <div className="flex items-center gap-3">
                          <div className={cn(
                            "flex items-center justify-center",
                            isSelected ? "w-12 h-12 -ml-2" : "w-6 h-6"
                          )}>
                            {model?.icon}
                          </div>
                        {isSelected && (
                          <div>
                            <h3 className={cn(
                                "font-bold text-lg transition-colors duration-300",
                                darkMode ? "text-white" : "text-gray-900"
                            )}>{model?.name}</h3>
                            <p className={cn(
                                "text-sm transition-colors duration-300",
                                darkMode ? "text-gray-300" : "text-gray-600"
                            )}>{model?.provider}</p>
                          </div>
                        )}
                        </div>
                        
                        {/* Toggle Switch - Select/Deselect Model */}
                        {isSelected ? (
                          <button 
                            onClick={() => handleModelToggle(modelId)}
                            className={cn(
                              "relative inline-flex h-6 w-11 items-center rounded-full transition-colors duration-200 focus:outline-none focus:ring-2 focus:ring-violet-500/50 bg-black border border-slate-700",
                            )}
                            title="Deselect Model"
                          >
                            <span
                              className="inline-block h-5 w-5 transform rounded-full bg-white shadow-lg transition-transform duration-200 translate-x-6"
                            />
                          </button>
                        ) : (
                          <button 
                            onClick={() => handleModelToggle(modelId)}
                            className="w-6 h-6 flex items-center justify-center"
                            title="Select Model"
                          >
                            <ChevronRight className="w-4 h-4 text-gray-400" />
                          </button>
                        )}
                      </div>
                    </div>

                    {/* Chat Content */}
                    <div className={cn(
                      "flex-1 space-y-4 transition-opacity duration-300 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50 max-h-[calc(100vh-250px)]",
                      isSelected ? "" : "hidden"
                    )}>
                      {hasMessages && isSelected && (
                        <>
                          {/* User Message - Left Side */}
                          <div className="flex items-start gap-4 mb-6">
                            <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                              <User className="w-4 h-4 text-white" />
                            </div>
                            <div className="flex-1">
                              <p className={cn(
                                "text-base leading-relaxed",
                                darkMode ? "text-white" : "text-gray-900"
                              )}>{messages[messages.length - 1]?.content}</p>
                            </div>
                          </div>

                          {/* AI Response - Left Side */}
                          <div className="flex items-start gap-4">
                            <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                              {model?.icon}
                            </div>
                            <div className="flex-1">
                              {response?.isLoading ? (
                            <div className={cn(
                                  "flex items-center gap-2",
                                  darkMode ? "text-gray-300" : "text-gray-600"
                            )}>
                                  <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-gray-400"></div>
                                  <span className="text-sm">Thinking...</span>
                                </div>
                              ) : response?.error ? (
                                <p className="text-red-600 text-sm">{response.error}</p>
                              ) : response?.content ? (
                                <div className="prose prose-sm max-w-none">
                                  <p className={cn(
                                    "text-base leading-relaxed whitespace-pre-wrap",
                                    darkMode ? "text-white" : "text-gray-900"
                                  )}>{response.content}</p>
                                </div>
                              ) : (
                                <p className={cn(
                                  "text-sm",
                                  darkMode ? "text-gray-400" : "text-gray-500"
                                )}>Ready to respond...</p>
                              )}
                            </div>
                          </div>
                        </>
                      )}

                      {!hasMessages && (
                        <div className="flex flex-col items-center justify-center py-16">
                          <div className={cn(
                            "w-16 h-16 mb-6 flex items-center justify-center transition-all duration-300",
                            isSelected 
                              ? "opacity-100"
                              : "opacity-40"
                          )}>
                            {model?.icon}
                          </div>
                          <h3 className={cn(
                            "text-2xl font-semibold mb-3 transition-colors duration-300",
                            isSelected
                              ? darkMode ? "text-white" : "text-gray-900"
                              : "text-gray-400"
                          )}>
                            {model?.name === "GPT-5" && "Hi, I'm GPT-5."}
                            {model?.name === "Claude Sonnet 4" && "Hi maher, how are you?"}
                            {model?.name === "Gemini" && "Hello, Maherunnisa"}
                            {model?.name === "DeepSeek" && "Hi, I'm DeepSeek."}
                          </h3>
                          <p className={cn(
                            "text-base text-center max-w-md transition-colors duration-300",
                            isSelected
                              ? darkMode ? "text-gray-300" : "text-gray-600"
                              : "text-gray-400"
                          )}>
                            {isSelected ? "How can I help you today?" : "Model disabled"}
                          </p>
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
              "fixed bottom-8 rounded-2xl backdrop-blur-xl shadow-2xl transition-all duration-300 border-2 z-10 max-w-4xl mx-auto",
              darkMode 
                ? "bg-slate-800/90 border-slate-600" 
                : "bg-white/95 border-slate-300",
              sidebarCollapsed ? "left-20 right-6" : "left-72 right-6"
            )}>
              <div className="flex items-center p-2">
                {/* Left Action Buttons */}
                <div className="flex items-center gap-1 mr-2">
                  <button 
                    onClick={openImagePicker}
                    className={cn(
                      "p-2 transition-all duration-200 rounded-lg hover:scale-105",
                      darkMode 
                        ? "text-white hover:bg-slate-700/60" 
                        : "text-slate-700 hover:bg-slate-200/80"
                    )}
                    title="Upload Images"
                  >
                    <Image className="w-5 h-5" />
                  </button>
                  <button 
                    onClick={openFilePicker}
                    className={cn(
                      "p-2 transition-all duration-200 rounded-lg hover:scale-105",
                      darkMode 
                        ? "text-white hover:bg-slate-700/60" 
                        : "text-slate-700 hover:bg-slate-200/80"
                    )}
                    title="Attach Files"
                  >
                    <Paperclip className="w-5 h-5" />
                  </button>
                  
                  {/* Hidden file inputs */}
                  <input 
                    type="file" 
                    ref={fileInputRef} 
                    onChange={handleFileAttachment}
                    className="hidden" 
                    multiple 
                    accept=".pdf,.doc,.docx,.txt,.rtf,.csv,.xlsx,.xls,.ppt,.pptx"
                  />
                  <input 
                    type="file" 
                    ref={imageInputRef} 
                    onChange={handleImageUpload}
                    className="hidden" 
                    multiple 
                    accept="image/*"
                  />
                </div>

                {/* Attached Files Display */}
                {attachedFiles.length > 0 && (
                  <div className={cn(
                    "flex flex-wrap gap-2 mb-2 max-w-full overflow-x-auto py-2",
                    darkMode ? "bg-slate-700/60" : "bg-slate-100",
                    "rounded-lg px-2"
                  )}>
                    {attachedFiles.map((file, index) => (
                      <div 
                        key={index} 
                        className={cn(
                          "flex items-center gap-1 py-1 px-2 rounded-md",
                          darkMode ? "bg-slate-600" : "bg-white border border-slate-200"
                        )}
                      >
                        {file.type.startsWith('image/') ? (
                          <div className="w-5 h-5 flex-shrink-0">
                            <Image className="w-full h-full" />
                          </div>
                        ) : (
                          <div className="w-5 h-5 flex-shrink-0">
                            <Paperclip className="w-full h-full" />
                          </div>
                        )}
                        <span className={cn(
                          "text-xs truncate max-w-[100px]",
                          darkMode ? "text-white" : "text-slate-700"
                        )}>
                          {file.name}
                        </span>
                        <button
                          onClick={() => removeAttachedFile(index)}
                          className={cn(
                            "p-1 rounded-full hover:bg-opacity-80",
                            darkMode ? "hover:bg-slate-500" : "hover:bg-slate-200"
                          )}
                        >
                          <X className="w-3 h-3" />
                        </button>
                      </div>
                    ))}
                  </div>
                )}
                
                {/* Main Input Field */}
                <div className="relative flex-grow">
                  <input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything..."
                    className={cn(
                      "w-full rounded-xl px-4 py-3 text-sm focus:outline-none focus:ring-2 focus:ring-violet-500/50 border-2 transition-all duration-200",
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
                <div className="flex items-center gap-1 ml-2">
                  <button 
                    className={cn(
                      "p-2 transition-all duration-200 rounded-lg hover:scale-105",
                      darkMode 
                        ? "text-white hover:bg-slate-700/60" 
                        : "text-slate-700 hover:bg-slate-200/80"
                    )}
                    title="Voice Input"
                  >
                    <Mic className="w-5 h-5" />
                  </button>
                  <button 
                    className={cn(
                      "p-2 transition-all duration-200 rounded-lg hover:scale-105",
                      darkMode 
                        ? "text-white hover:bg-slate-700/60" 
                        : "text-slate-700 hover:bg-slate-200/80"
                    )}
                    title="AI Suggestions"
                  >
                    <SparklesIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!currentInput.trim() || selectedModels.length === 0 || isLoading}
                    className={cn(
                      "p-2.5 transition-all duration-200 rounded-lg shadow-lg hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:hover:scale-100",
                      currentInput.trim() && selectedModels.length > 0 && !isLoading
                        ? "bg-green-500 text-white hover:bg-green-600"
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
              
              {/* Sign Out Button */}
              <div className="mt-6 pt-6 border-t border-slate-600">
                <button
                  onClick={() => {
                    signOut();
                    setShowSettings(false);
                  }}
                  className="w-full flex items-center justify-center gap-2 p-3 bg-slate-700 hover:bg-slate-600 text-white rounded-lg transition-colors"
                >
                  <LogOut className="w-5 h-5" />
                  Sign Out
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
