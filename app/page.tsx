'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Plus, Moon, Sun, Image, Paperclip, Mic, Sparkles as SparklesIcon, X, History, LogOut, User, ChevronLeft, ChevronRight, Menu } from 'lucide-react';

// Custom SVG Logo Components
const GPTLogo = ({ className = "w-8 h-8", darkMode = false }: { className?: string; darkMode?: boolean }) => (
  <div 
    className={className}
    style={{
      backgroundImage: `url(/svg-logos/${darkMode ? 'chatgpt-white.svg' : 'gpt-5.svg'})`,
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
  icon: React.ReactNode | ((darkMode: boolean) => React.ReactNode);
  color: string;
  bgColor: string;
}

interface Message {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: Date;
  modelId?: string;
  isBest?: boolean;
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
    icon: (darkMode: boolean) => <GPTLogo className="w-8 h-8" darkMode={darkMode} />,
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
  const [isMobile, setIsMobile] = useState(false);
  const [showSettings, setShowSettings] = useState(false);
  const [showUserDropdown, setShowUserDropdown] = useState(false);
  const [recentSessions, setRecentSessions] = useState<{id: string, title: string, firstMessage: string, date: string}[]>([]);
  
  // State for file attachments
  const [attachedFiles, setAttachedFiles] = useState<File[]>([]);
  const [showPhotoOptions, setShowPhotoOptions] = useState(false);
  const [showFilePicker, setShowFilePicker] = useState(false);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const imageInputRef = useRef<HTMLInputElement>(null);
  
  // Check for mobile screen size and collapse sidebar by default
  useEffect(() => {
    const handleResize = () => {
      const mobile = window.innerWidth < 768; // Standard mobile breakpoint
      setIsMobile(mobile);
      if (mobile) {
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

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (showUserDropdown) {
        const target = event.target as Element;
        if (!target.closest('[data-dropdown="user-menu"]')) {
          setShowUserDropdown(false);
        }
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, [showUserDropdown]);
  
  // Load recent chat sessions
  useEffect(() => {
    if (user) {
      loadRecentSessions();
    }
  }, [user]);
  
  // Function to load recent chat sessions
  const loadRecentSessions = async () => {
    if (!user) return;
    
    try {
      const { data, error } = await supabase
        .from('chat_sessions')
        .select('id, title, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(10); // Increased to show more chats like ChatGPT
      
      if (error) throw error;
      
      if (data) {
        // For each session, get the first message
        const sessionsWithFirstMessage = await Promise.all(
          data.map(async (session) => {
            const { data: messageData } = await supabase
              .from('chat_messages')
              .select('content')
              .eq('session_id', session.id)
              .eq('role', 'user')
              .order('created_at', { ascending: true })
              .limit(1)
              .single();
            
            // Format the date to show in the UI
            const updatedAt = new Date(session.updated_at);
            const today = new Date();
            const yesterday = new Date(today);
            yesterday.setDate(yesterday.getDate() - 1);
            
            let dateDisplay = '';
            if (updatedAt.toDateString() === today.toDateString()) {
              dateDisplay = 'Today';
            } else if (updatedAt.toDateString() === yesterday.toDateString()) {
              dateDisplay = 'Yesterday';
            } else {
              dateDisplay = updatedAt.toLocaleDateString('en-US', { month: 'short', day: 'numeric' });
            }
            
            return {
              id: session.id,
              title: session.title,
              firstMessage: messageData?.content || 'New conversation',
              date: dateDisplay
            };
          })
        );
        
        setRecentSessions(sessionsWithFirstMessage);
      }
    } catch (error) {
      console.error('Error loading recent sessions:', error);
    }
  };
  
  // Function to load a specific chat session
  const loadChatSession = async (sessionId: string) => {
    if (!user) return;
    
    try {
      // Validate session ID
      if (!sessionId) {
        throw new Error('Invalid session ID');
      }
      
      // Set current session ID
      setCurrentSessionId(sessionId);
      
      // Clear current messages and responses
      setMessages([]);
      setResponses([]);
      
      // Load messages for this session
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('id, content, role, timestamp')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
      
      if (messagesError) {
        console.log('Error fetching messages:', messagesError);
        throw new Error(`Failed to fetch messages: ${messagesError.message}`);
      }
      
      if (!messagesData) {
        throw new Error('No message data returned from database');
      }
      
      if (messagesData) {
        // Load all model responses for all user messages
        const userMessages = messagesData.filter(msg => msg.role === 'user');
        const allResponses = new Map();
        
        // For each user message, load its model responses
        for (const userMsg of userMessages) {
          if (userMsg.id) {
            const { data: responsesData, error: responsesError } = await supabase
              .from('model_responses')
              .select('model_id, content, is_best')
              .eq('message_id', userMsg.id);
            
            if (!responsesError && responsesData) {
              allResponses.set(userMsg.id, responsesData);
            }
          }
        }
        
        // Create proper conversational flow: user → AI responses → user → AI responses
        const formattedMessages = [];
        
        // Get only user messages and sort them chronologically
        const userMessagesOnly = messagesData.filter(msg => msg.role === 'user')
          .sort((a, b) => new Date(a.timestamp).getTime() - new Date(b.timestamp).getTime());
        
        for (const userMsg of userMessagesOnly) {
          // Add user message
          formattedMessages.push({
            id: userMsg.id,
            content: userMsg.content,
            role: 'user' as const,
            timestamp: new Date(userMsg.timestamp)
          });
          
          // Add AI responses for this user message
          if (allResponses.has(userMsg.id)) {
            const responses = allResponses.get(userMsg.id);
            for (const response of responses as Array<{model_id: string, content: string, is_best?: boolean}>) {
              formattedMessages.push({
                id: `${userMsg.id}-${response.model_id}`,
                content: response.content,
                role: 'assistant' as const,
                timestamp: new Date(userMsg.timestamp),
                modelId: response.model_id,
                isBest: response.is_best
              });
            }
          }
        }
        
        setMessages(formattedMessages);
        
        // Set responses for the last user message (for current interaction)
        if (userMessages.length > 0) {
          const lastUserMessage = userMessages[userMessages.length - 1];
          if (lastUserMessage && allResponses.has(lastUserMessage.id)) {
            const lastResponses = allResponses.get(lastUserMessage.id);
            const formattedResponses = lastResponses.map((resp: {model_id: string, content: string, is_best?: boolean}) => ({
              modelId: resp.model_id,
              content: resp.content,
              isLoading: false,
              isBest: resp.is_best
            }));
            
            setResponses(formattedResponses);
            
            // Update selected models based on responses
            const modelIds = lastResponses.map((resp: {model_id: string, content: string, is_best?: boolean}) => resp.model_id);
            setSelectedModels(modelIds);
          }
        }
      }
    } catch (error) {
      // Improved error logging with more details
      const errorMessage = error instanceof Error ? error.message : 'Unknown error';
      const errorDetails = error instanceof Error ? (error.stack || '') : JSON.stringify(error);
      console.error(`Error loading chat session: ${errorMessage}`, { error, details: errorDetails });
      
      // Show a user-friendly message
      alert('Failed to load chat session. Please try again.');
    }
  };

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
    setSelectedModels(AI_MODELS.map(m => m.id));
    setCurrentSessionId(null);
    
    // Refresh recent sessions list
    loadRecentSessions();
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
          
        // Refresh recent sessions list
        loadRecentSessions();
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
      setShowPhotoOptions(false);
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
  
  // Handle photo options
  const handleTakePhoto = () => {
    // TODO: Implement camera functionality
    setShowPhotoOptions(false);
  };
  
  const handleSelectPhoto = () => {
    imageInputRef.current?.click();
    setShowPhotoOptions(false);
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
      {/* Mobile Hamburger Menu */}
      {isMobile && (
        <button
          onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
          className={cn(
            "fixed top-4 left-4 z-50 p-2 rounded-lg transition-all duration-200",
            darkMode 
              ? "bg-slate-800/90 text-white hover:bg-slate-700" 
              : "bg-white/90 text-gray-900 hover:bg-gray-100",
            "shadow-lg backdrop-blur-sm"
          )}
        >
          <Menu className="w-6 h-6" />
        </button>
      )}

      {/* Sidebar */}
      <div className={cn(
        "fixed left-0 top-0 h-full backdrop-blur-xl transition-all duration-300 z-40",
        darkMode 
          ? "bg-slate-800/80 border-r border-slate-600" 
          : "bg-white/90 border-r border-slate-300",
        sidebarCollapsed ? "w-16" : "w-64",
        isMobile && sidebarCollapsed ? "-translate-x-full" : "translate-x-0"
      )}>
        <div className={cn(
          "h-full transition-all duration-300 overflow-hidden", 
          sidebarCollapsed ? "p-3" : "pl-6 pr-0 py-6"
        )}>
        {/* Logo and Dark Mode Toggle */}
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
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
          
          {/* Dark Mode Toggle */}
          {!sidebarCollapsed && (
            <button
              onClick={toggleDarkMode}
              className={cn(
                "p-2 rounded-lg transition-colors mr-2",
                darkMode 
                  ? "text-gray-400 hover:text-white hover:bg-slate-700/50" 
                  : "text-gray-600 hover:text-slate-800 hover:bg-slate-200/50"
              )}
              title={darkMode ? "Light Mode" : "Dark Mode"}
            >
              {darkMode ? <Sun className="w-5 h-5" /> : <Moon className="w-5 h-5" />}
            </button>
          )}
        </div>

          {/* User Info section removed */}

        {/* New Chat Button */}
        {/* New Chat and History Buttons */}
        <div className={cn(
          "flex gap-2 mb-6",
          sidebarCollapsed ? "flex-col" : "flex-row mr-2"
        )}>
          <button 
            onClick={handleNewChat}
            className={cn(
              "bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-lg py-2 flex items-center justify-center gap-2 hover:from-violet-700 hover:to-purple-800 transition-all duration-200 shadow-lg",
              sidebarCollapsed ? "w-full px-2" : "flex-1 px-4"
            )}>
            <Plus className="w-4 h-4" />
            {!sidebarCollapsed && <span>New Chat</span>}
          </button>
          
          <Link
            href="/history"
            className={cn(
              "bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-lg py-2 flex items-center justify-center gap-2 hover:from-violet-700 hover:to-purple-800 transition-all duration-200 shadow-lg",
              sidebarCollapsed ? "w-full px-2" : "flex-1 px-4"
            )}
          >
            <History className="w-4 h-4" />
            {!sidebarCollapsed && <span>History</span>}
          </Link>
        </div>



          {/* Recent Chats */}
          {!sidebarCollapsed && (
            <div className="mb-6 flex flex-col" style={{ height: 'calc(100vh - 300px)' }}>
              <h3 className={cn(
                "text-sm font-medium mb-3 flex-shrink-0 px-3",
                darkMode ? "text-gray-300" : "text-gray-700"
              )}>Recent Chats</h3>
              <div className="flex-1 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50 pr-6">
                <div className="space-y-1">
                  {recentSessions.length > 0 ? (
                    <div>
                      {recentSessions.map((session) => (
                        <div 
                          key={session.id} 
                          className={cn(
                            "py-3 px-3 cursor-pointer transition-colors border-l-2 flex flex-col",
                            darkMode 
                              ? currentSessionId === session.id
                                ? "bg-gray-700 border-l-white"
                                : "hover:bg-gray-800 border-l-transparent" 
                              : currentSessionId === session.id
                                ? "bg-gray-100 border-l-gray-800"
                                : "hover:bg-gray-50 border-l-transparent"
                          )}
                          onClick={() => loadChatSession(session.id)}
                        >
                          <div className="flex justify-between items-center mb-1">
                            <span className={cn(
                              "text-sm font-medium truncate flex-1",
                              darkMode ? "text-gray-200" : "text-gray-800"
                            )}>{session.title}</span>
                            <span className={cn(
                              "text-xs",
                              darkMode ? "text-gray-400" : "text-gray-500"
                            )}>{session.date}</span>
                          </div>
                          <p className={cn(
                            "text-xs truncate",
                            darkMode ? "text-gray-400" : "text-gray-500"
                          )}>
                            {session.firstMessage}
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
            </div>
          )}

          {/* Settings Section */}
          <div className={cn(
            "absolute bottom-6 transition-all duration-300",
            sidebarCollapsed ? "left-3 right-3" : "left-6 right-6"
          )}>
            <div className="space-y-3">
              
              {/* User Dropdown Button */}
              <div className="flex items-center gap-2 relative" data-dropdown="user-menu">
                <button
                  onClick={() => setShowUserDropdown(!showUserDropdown)}
                  className={cn(
                    "flex items-center gap-2 py-3 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-lg hover:from-violet-700 hover:to-purple-800 transition-all duration-200 shadow-lg flex-grow",
                    sidebarCollapsed ? "justify-center px-2" : "px-4"
                  )}
                  title={user?.email || "User Menu"}
                >
                  <User className="w-4 h-4" />
                  {!sidebarCollapsed && <span className="text-sm">{user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}</span>}
                </button>

                {/* User Dropdown Menu */}
                {showUserDropdown && (
                  <div className={cn(
                    "absolute bottom-full mb-2 bg-slate-800/95 backdrop-blur-sm border border-slate-600/50 rounded-xl shadow-2xl z-50 min-w-[240px] overflow-hidden",
                    sidebarCollapsed ? "left-0" : "left-0"
                  )}>
                    {/* Email ID Header */}
                    <div className="flex items-center gap-3 px-4 py-3 bg-slate-700/50 border-b border-slate-600/50">
                      <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-full flex items-center justify-center">
                        <User className="w-4 h-4 text-white" />
                      </div>
                      <div className="flex-1 min-w-0">
                        <div className="text-sm font-medium text-white truncate">
                          {user?.user_metadata?.full_name || user?.email?.split('@')[0] || 'User'}
                        </div>
                        <div className="text-xs text-gray-400 truncate">
                          {user?.email || 'user@example.com'}
                        </div>
                      </div>
                    </div>
                    
                    <div className="py-2">
                      {/* Settings */}
                      <button
                        onClick={() => {
                          setShowSettings(true);
                          setShowUserDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-gray-300 hover:bg-slate-700/50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                        </svg>
                        <span>Settings</span>
                      </button>
                      
                      {/* Logout */}
                      <button
                        onClick={() => {
                          signOut();
                          setShowUserDropdown(false);
                        }}
                        className="w-full flex items-center gap-3 px-4 py-3 text-sm text-red-400 hover:bg-slate-700/50 transition-colors"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                        </svg>
                        <span>Log out</span>
                      </button>
                    </div>
                  </div>
                )}
                
                {!sidebarCollapsed && (
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className={cn(
                      "py-3 px-2 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-lg hover:from-violet-700 hover:to-purple-800 transition-all duration-200 shadow-lg"
                    )}
                    title="Collapse Sidebar"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                )}
              </div>
              
              {/* Collapse Button - Now below the human button when sidebar is collapsed */}
              {sidebarCollapsed && (
                <button
                  onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                  className={cn(
                    "w-full py-3 px-2 bg-gradient-to-r from-violet-600 to-purple-700 text-white rounded-lg hover:from-violet-700 hover:to-purple-800 transition-all duration-200 shadow-lg flex justify-center mt-3"
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
        "transition-all duration-300", 
        isMobile ? "ml-0 p-0" : sidebarCollapsed ? "ml-16 p-6" : "ml-64 p-6"
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
            {/* Header/Partition with Menu - Mobile Only */}
            {isMobile && (
              <div className={cn(
                "fixed top-0 left-0 right-0 z-30 backdrop-blur-xl border-b transition-all duration-300",
                darkMode 
                  ? "bg-slate-900/90 border-slate-700" 
                  : "bg-white/90 border-slate-200"
              )}>
                <div className="flex items-center justify-between px-6 py-4">
                  <button
                    onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
                    className={cn(
                      "p-2 rounded-lg transition-all duration-200",
                      darkMode 
                        ? "text-white hover:bg-slate-700/60" 
                        : "text-gray-900 hover:bg-gray-100"
                    )}
                  >
                    <Menu className="w-6 h-6" />
                  </button>
                  <div className={cn(
                    "text-lg font-semibold",
                    darkMode ? "text-white" : "text-gray-900"
                  )}>
                    MultiMind Chat
                  </div>
                  <div className="w-8 h-8 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
                    <SparklesIcon className="w-5 h-5 text-white" />
                  </div>
                </div>
              </div>
            )}

            {/* Chat Columns */}
            <div className={cn(
              "overflow-x-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50",
              isMobile ? "h-screen pt-16 pb-24" : "h-[calc(100vh-70px)] pb-20"
            )}>
              <div className="flex h-full">
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
                          ? isMobile 
                            ? "bg-slate-800 border-slate-600 shadow-xl hover:shadow-2xl w-[90vw] h-full" 
                            : "bg-slate-800 border-slate-600 shadow-xl hover:shadow-2xl w-[600px] h-full"
                          : isMobile 
                            ? "bg-white border-slate-300 shadow-xl hover:shadow-2xl w-[90vw] h-full"
                            : "bg-white border-slate-300 shadow-xl hover:shadow-2xl w-[600px] h-full"
                        : darkMode 
                          ? isMobile 
                            ? "bg-black border-gray-800 p-0 w-[60px]" 
                            : "bg-black border-gray-800 p-0 w-[40px]"
                          : isMobile 
                            ? "bg-white/50 border-slate-300/50 p-0 w-[60px]"
                            : "bg-white/50 border-slate-300/50 p-0 w-[40px]"
                    )}
                  >
                    {/* Model Header */}
                    <div className={cn(
                      "mb-6",
                      isSelected ? "" : "flex flex-col items-center justify-start pt-4 h-full"
                    )}>
                      {isSelected ? (
                        <div className={cn(
                          "flex items-center justify-between w-full transition-all duration-300 px-4 py-3",
                          darkMode 
                            ? "bg-slate-700 border-b border-slate-600"
                            : "bg-white border-b border-gray-200"
                        )}>
                          <div className="flex items-center gap-3">
                            <div className="flex items-center justify-center w-12 h-12 -ml-2">
                              {typeof model?.icon === 'function' ? model.icon(darkMode) : model?.icon}
                            </div>
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
                          </div>
                          
                          {/* Toggle Switch - Deselect Model */}
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
                        </div>
                      ) : (
                        <div className="flex flex-col items-center justify-center gap-4 h-full">
                          <div className="flex items-center justify-center w-8 h-8">
                            {typeof model?.icon === 'function' ? model.icon(darkMode) : model?.icon}
                          </div>
                          <button 
                            onClick={() => handleModelToggle(modelId)}
                            className="w-6 h-6 flex items-center justify-center"
                            title="Select Model"
                          >
                            <svg className="w-4 h-4 text-gray-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M7 17L17 7M17 7H7M17 7V17" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    {/* Chat Content */}
                    <div className={cn(
                      "flex-1 transition-opacity duration-300 overflow-y-auto scrollbar-thin scrollbar-thumb-slate-600 scrollbar-track-slate-800/50",
                      isSelected ? "" : "hidden"
                    )}>
                      <div className="space-y-4 px-8 py-4">
                      {hasMessages && isSelected && (
                        <div className="space-y-6">
                          {/* Display messages filtered for this specific model */}
                          {messages.filter(message => 
                            message.role === 'user' || message.modelId === modelId
                          ).map((message, index) => (
                            <div key={message.id || index}>
                              {message.role === 'user' ? (
                                /* User Message */
                                <div className="flex items-start gap-4 mb-6">
                                  <div className="w-8 h-8 bg-gray-600 rounded-full flex items-center justify-center flex-shrink-0 mt-1">
                                    <User className="w-4 h-4 text-white" />
                                  </div>
                                  <div className="flex-1">
                                    <p className={cn(
                                      "text-base leading-relaxed",
                                      darkMode ? "text-white" : "text-gray-900"
                                    )}>{message.content}</p>
                                  </div>
                                </div>
                              ) : (
                                /* AI Response Message - Only for this specific model */
                                <div className="flex items-start gap-4 mb-6">
                                  <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                                    {typeof model?.icon === 'function' ? model.icon(darkMode) : model?.icon}
                                  </div>
                                  <div className="flex-1">
                                    <div className="prose prose-sm max-w-none">
                                      <p className={cn(
                                        "text-base leading-relaxed whitespace-pre-wrap",
                                        darkMode ? "text-white" : "text-gray-900"
                                      )}>{message.content}</p>
                                    </div>
                                  </div>
                                </div>
                              )}
                            </div>
                          ))}

                          {/* Current AI Response (for the latest user message) */}
                          {messages.length > 0 && messages[messages.length - 1]?.role === 'user' && (
                            <div className="flex items-start gap-4">
                              <div className="w-8 h-8 flex items-center justify-center flex-shrink-0 mt-1">
                                {typeof model?.icon === 'function' ? model.icon(darkMode) : model?.icon}
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
                          )}
                        </div>
                      )}

                      {!hasMessages && (
                        <div className="flex flex-col items-center justify-center py-16">
                          <div className={cn(
                            "w-16 h-16 mb-6 flex items-center justify-center transition-all duration-300",
                            isSelected 
                              ? "opacity-100"
                              : "opacity-40"
                          )}>
                            {typeof model?.icon === 'function' ? model.icon(darkMode) : model?.icon}
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


                  </div>
                );
              })}
              </div>
            </div>

            {/* Bottom Message Input */}
            <div className={cn(
              "fixed backdrop-blur-xl shadow-2xl transition-all duration-300 border-2 z-10 max-w-4xl mx-auto",
              darkMode 
                ? "bg-slate-800/90 border-slate-600" 
                : "bg-white/95 border-slate-300",
              isMobile 
                ? "bottom-0 left-0 right-0 rounded-t-2xl" 
                : sidebarCollapsed ? "bottom-8 left-20 right-6 rounded-2xl" : "bottom-8 left-72 right-6 rounded-2xl"
            )}>
              <div className="flex items-center p-2">
                {/* Left Action Buttons */}
                <div className="flex items-center gap-1 mr-2">
                  <div className="relative">
                    <button 
                      onClick={() => setShowPhotoOptions(!showPhotoOptions)}
                      className={cn(
                        "p-2 transition-all duration-200 rounded-lg hover:scale-105",
                        darkMode 
                          ? "text-white hover:bg-slate-700/60" 
                          : "text-slate-700 hover:bg-slate-200/80"
                      )}
                      title="Add Photo"
                    >
                      <Plus className="w-5 h-5" />
                    </button>
                    
                    {/* Photo Options Dropdown */}
                    {showPhotoOptions && (
                      <div className={cn(
                        "absolute bottom-full mb-2 left-0 rounded-lg shadow-lg border min-w-[140px] z-50",
                        darkMode 
                          ? "bg-slate-800 border-slate-600" 
                          : "bg-white border-slate-200"
                      )}>
                        <button
                          onClick={handleTakePhoto}
                          className={cn(
                            "w-full px-4 py-2 text-left hover:bg-opacity-80 transition-colors rounded-t-lg flex items-center gap-2",
                            darkMode 
                              ? "text-white hover:bg-slate-700" 
                              : "text-gray-900 hover:bg-slate-100"
                          )}
                        >
                           Take Photo
                        </button>
                        <button
                          onClick={handleSelectPhoto}
                          className={cn(
                            "w-full px-4 py-2 text-left hover:bg-opacity-80 transition-colors rounded-b-lg flex items-center gap-2",
                            darkMode 
                              ? "text-white hover:bg-slate-700" 
                              : "text-gray-900 hover:bg-slate-100"
                          )}
                        >
                          Select Photo
                        </button>
                      </div>
                    )}
                  </div>
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
