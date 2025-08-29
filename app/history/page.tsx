'use client';

import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { supabase } from '@/lib/supabase';
import { Sparkles, MessageSquare, Clock, Trash2, ArrowLeft } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
}

interface ChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  model_id: string | null;
}

interface ModelResponse {
  id: string;
  message_id: string;
  model_id: string;
  content: string;
  is_best: boolean;
}

// Database response types
interface DatabaseChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
}

interface DatabaseChatMessage {
  id: string;
  content: string;
  role: 'user' | 'assistant';
  timestamp: string;
  model_id: string | null;
  responses?: ModelResponse[];
}

export default function HistoryPage() {
  const { user } = useAuth();
  const { darkMode, mounted } = useTheme();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);


  const loadChatSessions = useCallback(async () => {
    try {
      setLoading(true);
      
      if (!user?.id) {
        console.error('User ID not available');
        return;
      }
      
      // Get chat sessions with message count
      const { data: sessionsData, error: sessionsError } = await supabase
        .from('chat_sessions')
        .select(`
          id,
          title,
          created_at,
          updated_at
        `)
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false });

      if (sessionsError) throw sessionsError;
      if (!sessionsData) return;

             // Get message count for each session
       const sessionsWithCount = await Promise.all(
         (sessionsData as DatabaseChatSession[]).map(async (session: DatabaseChatSession) => {
          const { count } = await supabase
            .from('chat_messages')
            .select('*', { count: 'exact', head: true })
            .eq('session_id', session.id);
          
          return {
            ...session,
            message_count: count || 0
          };
        })
      );

      setSessions(sessionsWithCount);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id]);

  useEffect(() => {
    if (user) {
      loadChatSessions();
    }
  }, [user, loadChatSessions]);

  // Don't render until theme is mounted to prevent hydration issues
  if (!mounted) {
    return <div className="min-h-screen bg-white dark:bg-gray-900"></div>;
  }

  const loadChatMessages = async (sessionId: string) => {
    try {
      // Get messages
      const { data: messagesData, error: messagesError } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });

      if (messagesError) throw messagesError;
      if (!messagesData) return;

             // Get model responses for each message
       const messagesWithResponses = await Promise.all(
         (messagesData as DatabaseChatMessage[]).map(async (message: DatabaseChatMessage) => {
          if (message.role === 'user') {
            const { data: responsesData } = await supabase
              .from('model_responses')
              .select('*')
              .eq('message_id', message.id);
            
            return {
              ...message,
              responses: responsesData || []
            };
          }
          return message;
        })
      );

      setMessages(messagesData);
      setResponses(messagesWithResponses.flatMap(m => m.responses || []));
    } catch (error) {
      console.error('Error loading chat messages:', error);
    }
  };

  const deleteSession = async (sessionId: string) => {
    try {
      setDeleting(sessionId);
      
      const { error } = await supabase
        .from('chat_sessions')
        .delete()
        .eq('id', sessionId);

      if (error) throw error;

      // Remove from local state
      setSessions(prev => prev.filter(s => s.id !== sessionId));
      
      if (selectedSession?.id === sessionId) {
        setSelectedSession(null);
        setMessages([]);
        setResponses([]);
      }
    } catch (error) {
      console.error('Error deleting session:', error);
    } finally {
      setDeleting(null);
    }
  };

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    const now = new Date();
    const diffInHours = (now.getTime() - date.getTime()) / (1000 * 60 * 60);

    if (diffInHours < 24) {
      return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
    } else if (diffInHours < 168) { // 7 days
      return date.toLocaleDateString([], { weekday: 'short' });
    } else {
      return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
    }
  };

  if (!user) {
    return (
      <div className="min-h-screen bg-slate-900 flex items-center justify-center">
        <div className="text-center">
          <p className={cn(
          darkMode ? "text-white" : "text-slate-400"
        )}>Please sign in to view your chat history.</p>
        </div>
      </div>
    );
  }

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      darkMode ? "bg-slate-900 text-white" : "bg-gradient-to-br from-slate-50 via-white to-blue-50 text-slate-900"
    )}>
      {/* Header */}
      <div className={cn(
        "border-b-2 p-6 backdrop-blur-xl transition-colors duration-300 shadow-sm",
        darkMode 
          ? "bg-slate-800/80 border-slate-600" 
          : "bg-white/95 border-slate-900 shadow-lg"
      )}>
        <div className="max-w-7xl mx-auto flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Link 
              href="/"
              className={cn(
                "p-2 transition-colors rounded-lg",
                darkMode 
                  ? "text-white hover:bg-slate-700/50" 
                  : "text-slate-400 hover:text-white hover:bg-slate-700/50"
              )}
            >
              <ArrowLeft className="w-5 h-5" />
            </Link>
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <Sparkles className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className={cn(
                  "text-2xl font-bold",
                  darkMode ? "text-white" : "text-slate-900"
                )}>Chat History</h1>
                <p className={cn(
                  darkMode ? "text-slate-400" : "text-slate-600"
                )}>Your AI conversations</p>
              </div>
            </div>
          </div>
          
          <div className="flex items-center gap-4">
            <span className={cn(
              darkMode ? "text-slate-400" : "text-slate-600"
            )}>
              {sessions.length} conversation{sessions.length !== 1 ? 's' : ''}
            </span>
            <div className={cn(
              "w-8 h-8 rounded-full flex items-center justify-center",
              darkMode ? "bg-slate-700" : "bg-slate-300"
            )}>
              <span className={cn(
                "text-sm font-medium",
                darkMode ? "text-white" : "text-slate-700"
              )}>
                {user.email?.charAt(0).toUpperCase()}
              </span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Sidebar - Chat Sessions */}
          <div className="lg:col-span-1">
            <div className={cn(
              "rounded-2xl p-6 backdrop-blur-xl border-2 transition-colors duration-300 shadow-lg",
              darkMode 
                ? "bg-slate-800/80 border-slate-600" 
                : "bg-white/95 border-slate-900 shadow-xl"
            )}>
              <h2 className={cn(
                "text-lg font-semibold mb-4",
                darkMode ? "text-white" : "text-slate-900"
              )}>Conversations</h2>
              
              {loading ? (
                <div className="space-y-3">
                  {[...Array(5)].map((_, i) => (
                    <div key={i} className="animate-pulse">
                      <div className="h-16 bg-slate-700/50 rounded-lg"></div>
                    </div>
                  ))}
                </div>
              ) : sessions.length === 0 ? (
                <div className="text-center py-8">
                  <MessageSquare className={cn(
                    "w-12 h-12 mx-auto mb-3",
                    darkMode ? "text-slate-400" : "text-slate-500"
                  )} />
                  <p className={cn(
                    darkMode ? "text-slate-400" : "text-slate-600"
                  )}>No conversations yet</p>
                  <p className={cn(
                    "text-sm",
                    darkMode ? "text-slate-500" : "text-slate-500"
                  )}>Start chatting to see your history here</p>
                </div>
              ) : (
                <div className="space-y-3">
                  {sessions.map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        "p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 shadow-sm",
                        selectedSession?.id === session.id
                          ? "bg-gradient-to-r from-violet-500/20 to-purple-500/20 border-violet-500 shadow-md"
                          : darkMode
                            ? "bg-slate-700/50 border-slate-600 hover:bg-slate-700/70 hover:shadow-md"
                            : "bg-gradient-to-r from-white to-slate-50/50 border-slate-300 hover:bg-gradient-to-r hover:from-slate-50 hover:to-blue-50/50 hover:border-slate-400 hover:shadow-md"
                      )}
                      onClick={() => {
                        setSelectedSession(session);
                        loadChatMessages(session.id);
                      }}
                    >
                      <div className="flex items-start justify-between mb-2">
                        <h3 className={cn(
                          "font-medium truncate flex-1",
                          darkMode ? "text-white" : "text-slate-900"
                        )}>
                          {session.title}
                        </h3>
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            deleteSession(session.id);
                          }}
                          disabled={deleting === session.id}
                          className={cn(
                            "p-1 transition-colors ml-2",
                            darkMode 
                              ? "text-slate-400 hover:text-red-400" 
                              : "text-slate-600 hover:text-red-400"
                          )}
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                      
                      <div className={cn(
                        "flex items-center gap-3 text-sm",
                        darkMode ? "text-slate-400" : "text-slate-600"
                      )}>
                        <div className="flex items-center gap-1">
                          <MessageSquare className={cn(
                            "w-4 h-4",
                            darkMode ? "text-slate-400" : "text-slate-600"
                          )} />
                          <span>{session.message_count}</span>
                        </div>
                        <div className="flex items-center gap-1">
                          <Clock className={cn(
                            "w-4 h-4",
                            darkMode ? "text-slate-400" : "text-slate-600"
                          )} />
                          <span>{formatDate(session.updated_at)}</span>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Chat Messages */}
          <div className="lg:col-span-2">
            {selectedSession ? (
              <div className={cn(
                "rounded-2xl p-6 backdrop-blur-xl border-2 transition-colors duration-300 shadow-lg",
                darkMode 
                  ? "bg-slate-800/80 border-slate-600" 
                  : "bg-white/95 border-slate-900 shadow-xl"
              )}>
                {/* Back to Chat Button */}
                <div className="flex items-center gap-3 mb-6">
                  <Link 
                    href="/"
                    className={cn(
              "flex items-center gap-2 transition-colors",
              darkMode 
                ? "text-white hover:bg-slate-700/50" 
                : "text-slate-400 hover:text-white"
            )}
                  >
                    <ArrowLeft className="w-4 h-4" />
                    <span>Back to Chat</span>
                  </Link>
                </div>
                
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h2 className={cn(
                      "text-xl font-semibold",
                      darkMode ? "text-white" : "text-slate-900"
                    )}>{selectedSession.title}</h2>
                    <p className={cn(
                      "text-sm",
                      darkMode ? "text-slate-400" : "text-slate-600"
                    )}>View and manage your past conversations.</p>
                  </div>
                  <span className={cn(
                    "text-sm",
                    darkMode ? "text-slate-400" : "text-slate-600"
                  )}>
                    {new Date(selectedSession.created_at).toLocaleDateString()}
                  </span>
                </div>

                <div className="space-y-6">
                  {messages.map((message) => (
                    <div key={message.id} className="space-y-4">
                      {/* User Message */}
                      <div className="flex items-start gap-3">
                        <div className={cn(
                          "w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 shadow-lg",
                          darkMode ? "bg-slate-600" : "bg-slate-500"
                        )}>
                          <span className={cn(
                            "text-sm font-medium",
                            darkMode ? "text-white" : "text-white"
                          )}>U</span>
                        </div>
                        <div className={cn(
                          "rounded-2xl p-4 flex-1 border-2 shadow-lg",
                          darkMode 
                            ? "bg-slate-600/80 border-slate-500/50" 
                            : "bg-slate-500/80 border-slate-400/50"
                        )}>
                          <div className="mb-2">
                            <p className={cn(
                              darkMode ? "text-white" : "text-white"
                            )}>{message.content}</p>
                          </div>
                          <div className={cn(
                            "text-xs",
                            darkMode ? "text-slate-400" : "text-slate-500"
                          )}>
                            Created on {new Date(message.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </div>
                        </div>
                      </div>

                      {/* AI Responses in Horizontal Columns */}
                      {message.role === 'user' && (
                        <div className="ml-11">
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                            {responses
                              .filter(r => r.message_id === message.id)
                              .map((response) => {
                                // Get model info based on model_id
                                const getModelInfo = (modelId: string) => {
                                  if (modelId.includes('openai/gpt-5')) {
                                    return { name: 'GPT-5 OpenAI', color: 'from-violet-500 to-purple-600', bgColor: 'bg-gradient-to-br from-violet-50 to-purple-100' };
                                  } else if (modelId.includes('anthropic/claude-3.5-sonnet')) {
                                    return { name: 'Claude 3.5 Sonnet Anthropic', color: 'from-cyan-500 to-blue-600', bgColor: 'bg-gradient-to-br from-cyan-50 to-blue-100' };
                                  } else if (modelId.includes('google/gemini-2.5-pro')) {
                                    return { name: 'Gemini 2.5 Pro Google', color: 'from-emerald-500 to-teal-600', bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-100' };
                                  } else if (modelId.includes('deepseek/deepseek-r1-0528')) {
                                    return { name: 'DeepSeek R1 DeepSeek', color: 'from-rose-500 to-pink-600', bgColor: 'bg-gradient-to-br from-rose-50 to-pink-100' };
                                  }
                                  return { name: modelId, color: 'from-gray-500 to-gray-600', bgColor: 'bg-gradient-to-br from-gray-50 to-gray-100' };
                                };

                                const modelInfo = getModelInfo(response.model_id);
                                
                                return (
                                  <div key={response.id} className={cn(
                                    "rounded-2xl p-4 border-2 transition-all duration-200 shadow-sm hover:shadow-lg",
                                    darkMode ? modelInfo.bgColor.replace('50', '500/20').replace('100', '600/20') : modelInfo.bgColor,
                                    darkMode ? "border-slate-600/30" : "border-slate-300 hover:border-slate-400"
                                  )}>
                                    {/* Model Header */}
                                    <div className="mb-3">
                                      <div className={cn(
                                        "inline-flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border-2",
                                        `bg-gradient-to-r ${modelInfo.color}`,
                                        darkMode ? "border-white/20" : "border-white/30"
                                      )}>
                                        <div className={cn(
                                          "w-6 h-6 rounded-md flex items-center justify-center backdrop-blur-sm",
                                          darkMode ? "bg-white/20" : "bg-white/30"
                                        )}>
                                          <Sparkles className="w-3 h-3 text-white" />
                                        </div>
                                        <div>
                                          <h4 className="text-sm font-semibold text-white drop-shadow-sm">
                                            {modelInfo.name}
                                          </h4>
                                        </div>
                                        {response.is_best && (
                                          <span className={cn(
                                            "text-xs px-2 py-1 rounded-full font-medium",
                                            darkMode ? "bg-white/20 text-white" : "bg-white/30 text-white"
                                          )}>
                                            Best
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                    
                                    {/* Response Content */}
                                    <div className="space-y-2">
                                      <p className={cn(
                                        "leading-relaxed text-sm",
                                        darkMode ? "text-white" : "text-slate-800"
                                      )}>
                                        {response.content}
                                      </p>
                                    </div>
                                  </div>
                                );
                              })}
                          </div>
                        </div>
                      )}
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className={cn(
                "rounded-2xl p-12 backdrop-blur-xl text-center border-2 transition-colors duration-300 shadow-lg",
                darkMode 
                  ? "bg-slate-800/80 border-slate-600" 
                  : "bg-gradient-to-br from-white to-slate-50/50 border-slate-900 shadow-xl"
              )}>
                <MessageSquare className={cn(
                  "w-16 h-16 mx-auto mb-4",
                  darkMode ? "text-slate-400" : "text-slate-500"
                )} />
                <h3 className={cn(
                  "text-xl font-semibold mb-2",
                  darkMode ? "text-white" : "text-slate-900"
                )}>Select a conversation</h3>
                <p className={cn(
                  darkMode ? "text-slate-400" : "text-slate-600"
                )}>Choose a chat from the sidebar to view the messages</p>
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
}
