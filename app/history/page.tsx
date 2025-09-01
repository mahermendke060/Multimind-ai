'use client';

import { useState, useEffect, useCallback, useMemo } from 'react';
import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme-context';
import { supabase } from '@/lib/supabase';
import { Sparkles, MessageSquare, Clock, Trash2, ArrowLeft, Star, StarOff, Search, Tag, Pencil, Download, X, Loader2 } from 'lucide-react';
import { cn } from '@/lib/utils';
import Link from 'next/link';

interface ChatSession {
  id: string;
  title: string;
  created_at: string;
  updated_at: string;
  message_count: number;
  tags?: string[];
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
  const { darkMode } = useTheme();
  const [sessions, setSessions] = useState<ChatSession[]>([]);
  const [selectedSession, setSelectedSession] = useState<ChatSession | null>(null);
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [query, setQuery] = useState('');
  const [favorites, setFavorites] = useState<Record<string, boolean>>({});
  const [editingTitleId, setEditingTitleId] = useState<string | null>(null);
  const [newTitle, setNewTitle] = useState('');
  const [addingTagId, setAddingTagId] = useState<string | null>(null);
  const [newTag, setNewTag] = useState('');
  const [limit, setLimit] = useState(20);
  const [exporting, setExporting] = useState<string | null>(null);


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
        .select('id, title, created_at, updated_at')
        .eq('user_id', user.id)
        .order('updated_at', { ascending: false })
        .limit(limit);

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

      // hydrate tags from localStorage
      const storedTags = JSON.parse(localStorage.getItem('chat_tags') || '{}');
      const enhanced = sessionsWithCount.map(s => ({ ...s, tags: storedTags[s.id] || [] }));
      setSessions(enhanced);
    } catch (error) {
      console.error('Error loading chat sessions:', error);
    } finally {
      setLoading(false);
    }
  }, [user?.id, limit]);

  useEffect(() => {
    if (user) {
      loadChatSessions();
    }
  }, [user, loadChatSessions]);

  // Avoid early returns before hooks; theme will settle after mount

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

    if (diffInHours < 1) {
      const mins = Math.max(1, Math.floor(diffInHours * 60));
      return mins + 'm ago';
    } else if (diffInHours < 24) {
      const hrs = Math.floor(diffInHours);
      return hrs + 'h ago';
    } else if (diffInHours < 48) {
      return 'Yesterday';
    } else if (diffInHours < 168) {
      return date.toLocaleDateString([], { weekday: 'short' });
    }
    return date.toLocaleDateString([], { month: 'short', day: 'numeric' });
  };

  const groupedSessions = useMemo(() => {
    const groups: Record<string, ChatSession[]> = { 'Today': [], 'This Week': [], 'Older': [] };
    const now = new Date();
    const filtered = sessions.filter(s => {
      if (!query.trim()) return true;
      const q = query.toLowerCase();
      const tagHit = (s.tags || []).some(t => t.toLowerCase().includes(q));
      return s.title.toLowerCase().includes(q) || tagHit;
    });
    filtered.forEach(s => {
      const d = new Date(s.updated_at);
      const diff = (now.getTime() - d.getTime()) / (1000 * 60 * 60);
      if (diff < 24) groups['Today'].push(s);
      else if (diff < 168) groups['This Week'].push(s);
      else groups['Older'].push(s);
    });
    return groups;
  }, [sessions, query]);

  const toggleFavorite = (id: string) => {
    setFavorites(prev => {
      const next = { ...prev, [id]: !prev[id] };
      localStorage.setItem('chat_favorites', JSON.stringify(next));
      return next;
    });
  };

  useEffect(() => {
    try {
      const fav = JSON.parse(localStorage.getItem('chat_favorites') || '{}');
      setFavorites(fav);
    } catch {}
  }, []);

  const saveTitle = async (session: ChatSession) => {
    try {
      const titleToSave = newTitle.trim();
      if (!titleToSave || titleToSave === session.title) {
        setEditingTitleId(null);
        return;
      }
      await supabase.from('chat_sessions').update({ title: titleToSave }).eq('id', session.id);
      setSessions(prev => prev.map(s => s.id === session.id ? { ...s, title: titleToSave } : s));
    } finally {
      setEditingTitleId(null);
      setNewTitle('');
    }
  };

  const addTag = (session: ChatSession) => {
    const tag = newTag.trim();
    if (!tag) { setAddingTagId(null); return; }
    const updated = sessions.map(s => s.id === session.id ? { ...s, tags: Array.from(new Set([...(s.tags || []), tag])) } : s);
    setSessions(updated);
    const stored = JSON.parse(localStorage.getItem('chat_tags') || '{}');
    stored[session.id] = updated.find(s => s.id === session.id)?.tags || [];
    localStorage.setItem('chat_tags', JSON.stringify(stored));
    setAddingTagId(null);
    setNewTag('');
  };

  const removeTag = (session: ChatSession, tag: string) => {
    const updated = sessions.map(s => s.id === session.id ? { ...s, tags: (s.tags || []).filter(t => t !== tag) } : s);
    setSessions(updated);
    const stored = JSON.parse(localStorage.getItem('chat_tags') || '{}');
    stored[session.id] = updated.find(s => s.id === session.id)?.tags || [];
    localStorage.setItem('chat_tags', JSON.stringify(stored));
  };

  const exportConversation = async (sessionId: string) => {
    try {
      setExporting(sessionId);
      const { data: msgs } = await supabase
        .from('chat_messages')
        .select('*')
        .eq('session_id', sessionId)
        .order('timestamp', { ascending: true });
      const blob = new Blob([JSON.stringify(msgs || [], null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = 'conversation-' + sessionId + '.json';
      a.click();
      URL.revokeObjectURL(url);
    } finally {
      setExporting(null);
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
      darkMode ? "bg-gradient-to-br from-slate-900 via-slate-800 to-slate-900 text-white" : "bg-gradient-to-br from-blue-50 via-white to-purple-50 text-slate-900"
    )}>
      {/* Header */}
      <div className={cn(
        "border-b-2 p-6 backdrop-blur-xl transition-colors duration-300 shadow-sm",
        darkMode 
          ? "bg-slate-800/80 border-slate-600" 
          : "bg-white/95 border-slate-900 shadow-lg"
      )}>
        <div className="w-full flex items-center justify-between">
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
          
          <div className="flex items-center gap-4 w-full max-w-xl">
            <div className={cn(
              "flex-1 relative",
            )}>
              <Search className={cn("w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2", darkMode ? 'text-slate-400' : 'text-slate-500')} />
              <input
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search by title or tag"
                className={cn(
                  "w-full pl-9 pr-3 py-2 rounded-lg border outline-none transition-all",
                  darkMode ? "bg-slate-700/60 border-slate-600 text-white placeholder:text-slate-400 focus:ring-2 focus:ring-violet-500" : "bg-white border-slate-300 text-slate-900 placeholder:text-slate-500 focus:ring-2 focus:ring-violet-500"
                )}
              />
            </div>
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

      <div className="w-full pt-0 pb-6 pr-6 pl-0 lg:flex lg:gap-6">
        {/* Sidebar - Chat Sessions (left corner, fixed width) */}
        <div className="w-full lg:w-80 lg:shrink-0">
            <div className={cn(
              "rounded-b-2xl rounded-t-none p-6 backdrop-blur-xl border-2 border-t-0 transition-colors duration-300 shadow-lg lg:sticky lg:top-0",
              darkMode 
                ? "bg-gradient-to-br from-slate-800/90 to-slate-700/90 border-slate-600" 
                : "bg-gradient-to-br from-white/95 to-blue-50/95 border-slate-900 shadow-xl"
            )}>
              <h2 className={cn(
                "text-lg font-semibold mb-4",
                darkMode ? "text-white" : "text-slate-900"
              )}>Conversations</h2>
              {/* Grouped lists */}
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
                <div className="space-y-6">
                  {Object.entries(groupedSessions).map(([label, items]) => (
                    items.length === 0 ? null : (
                      <div key={label}>
                        <div className={cn("text-xs uppercase tracking-wider mb-2", darkMode ? 'text-slate-400' : 'text-slate-500')}>{label}</div>
                        <div className="space-y-3">
                  {items.map((session) => (
                    <div
                      key={session.id}
                      className={cn(
                        "p-4 rounded-xl cursor-pointer transition-all duration-200 border-2 shadow-sm group",
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
                        {editingTitleId === session.id ? (
                          <div className="flex-1 flex items-center gap-2">
                            <input
                              autoFocus
                              value={newTitle}
                              onChange={(e) => setNewTitle(e.target.value)}
                              onKeyDown={(e) => { if (e.key === 'Enter') { e.stopPropagation(); saveTitle(session); } if (e.key === 'Escape') setEditingTitleId(null); }}
                              className={cn("w-full px-2 py-1 rounded border", darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900')}
                            />
                            <button onClick={(e) => { e.stopPropagation(); saveTitle(session); }} className={cn("px-2 py-1 rounded text-sm", darkMode ? 'bg-violet-600 text-white' : 'bg-violet-600 text-white')}>Save</button>
                            <button onClick={(e) => { e.stopPropagation(); setEditingTitleId(null); }} className={cn("p-1 rounded", darkMode ? 'text-slate-300' : 'text-slate-600')}><X className="w-4 h-4"/></button>
                          </div>
                        ) : (
                          <h3 className={cn(
                            "font-medium truncate flex-1",
                            darkMode ? "text-white" : "text-slate-900"
                          )}>
                            {session.title}
                          </h3>
                        )}
                        <div className="flex items-center gap-1 opacity-0 group-hover:opacity-100 transition-opacity">
                          <button onClick={(e) => { e.stopPropagation(); toggleFavorite(session.id); }} className={cn("p-1 rounded", favorites[session.id] ? 'text-yellow-400' : darkMode ? 'text-slate-400 hover:text-yellow-400' : 'text-slate-600 hover:text-yellow-500')}>
                            {favorites[session.id] ? <Star className="w-4 h-4"/> : <StarOff className="w-4 h-4"/>}
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); setEditingTitleId(session.id); setNewTitle(session.title); }} className={cn("p-1 rounded", darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800')}>
                            <Pencil className="w-4 h-4"/>
                          </button>
                          <button onClick={(e) => { e.stopPropagation(); exportConversation(session.id); }} disabled={exporting===session.id} className={cn("p-1 rounded", darkMode ? 'text-slate-400 hover:text-slate-200' : 'text-slate-600 hover:text-slate-800')}>
                            {exporting===session.id ? <Loader2 className="w-4 h-4 animate-spin"/> : <Download className="w-4 h-4"/>}
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              deleteSession(session.id);
                            }}
                            disabled={deleting === session.id}
                            className={cn(
                              "p-1 transition-colors ml-1",
                              darkMode 
                                ? "text-slate-400 hover:text-red-400" 
                                : "text-slate-600 hover:text-red-400"
                            )}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
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
                        <div className="ml-auto flex items-center gap-2">
                          {(session.tags || []).slice(0, 3).map(tag => (
                            <span key={tag} className={cn("inline-flex items-center gap-1 px-2 py-0.5 text-xs rounded-full border", darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-700')}>
                              <Tag className="w-3 h-3"/> {tag}
                              <button onClick={(e)=>{e.stopPropagation(); removeTag(session, tag);}} className="ml-1">
                                <X className="w-3 h-3"/>
                              </button>
                            </span>
                          ))}
                          <button onClick={(e)=>{e.stopPropagation(); setAddingTagId(session.id);}} className={cn("px-2 py-0.5 text-xs rounded-full border", darkMode ? 'border-slate-600 text-slate-300' : 'border-slate-300 text-slate-700')}>+ tag</button>
                        </div>
                      </div>
                      {addingTagId === session.id && (
                        <div className="mt-2 flex items-center gap-2">
                          <input value={newTag} onChange={(e)=>setNewTag(e.target.value)} onKeyDown={(e)=>{if(e.key==='Enter'){e.stopPropagation(); addTag(session);} if(e.key==='Escape'){setAddingTagId(null);} }} className={cn("flex-1 px-2 py-1 rounded border", darkMode ? 'bg-slate-700 border-slate-600 text-white' : 'bg-white border-slate-300 text-slate-900')} placeholder="Add tag" />
                          <button onClick={(e)=>{e.stopPropagation(); addTag(session);}} className={cn("px-2 py-1 rounded text-sm", darkMode ? 'bg-violet-600 text-white' : 'bg-violet-600 text-white')}>Add</button>
                          <button onClick={(e)=>{e.stopPropagation(); setAddingTagId(null);}} className={cn("p-1 rounded", darkMode ? 'text-slate-300' : 'text-slate-600')}><X className="w-4 h-4"/></button>
                        </div>
                      )}
                    </div>
                  ))}
                        </div>
                      </div>
                    )
                  ))}
                  <div className="pt-2">
                    <button onClick={()=> setLimit(l => l + 20)} className={cn("w-full py-2 rounded-lg border text-sm", darkMode ? 'border-slate-600 text-slate-200 hover:bg-slate-700' : 'border-slate-300 text-slate-700 hover:bg-slate-50')}>Load more</button>
                  </div>
                </div>
              )}
            </div>
          </div>

          {/* Main Content - Chat Messages, covering remaining space */}
          <div className="flex-1 mt-6 lg:mt-0">
            {selectedSession ? (
                          <div className={cn(
              "rounded-2xl p-6 backdrop-blur-xl border-2 transition-colors duration-300 shadow-lg",
              darkMode 
                ? "bg-gradient-to-br from-slate-800/90 to-slate-700/90 border-slate-600" 
                : "bg-gradient-to-br from-white/95 to-purple-50/95 border-slate-900 shadow-xl"
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
                          darkMode ? "bg-gradient-to-r from-violet-500 to-purple-600" : "bg-gradient-to-r from-violet-500 to-purple-600"
                        )}>
                          <span className={cn(
                            "text-sm font-medium",
                            darkMode ? "text-white" : "text-white"
                          )}>U</span>
                        </div>
                        <div className={cn(
                          "rounded-2xl p-4 flex-1 border-2 shadow-lg",
                          darkMode 
                            ? "bg-gradient-to-r from-violet-500/30 to-purple-600/30 border-violet-500/50" 
                            : "bg-gradient-to-r from-violet-500/30 to-purple-600/30 border-violet-500/50"
                        )}>
                          <div className="mb-2">
                            <p className={cn(
                              darkMode ? "text-white" : "text-slate-900"
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
                                  // Support both internal IDs (e.g., 'gpt-5') and OpenRouter IDs (e.g., 'openai/gpt-5')
                                  const id = modelId.toLowerCase();

                                  if (id.includes('gpt-5')) {
                                    return { name: 'GPT-5', color: 'from-violet-500 to-purple-600', bgColor: 'bg-gradient-to-br from-violet-50 to-purple-100' };
                                  } else if (id.includes('claude') || id.includes('anthropic/claude-3.5-sonnet')) {
                                    return { name: 'Claude 3.5 Sonnet Anthropic', color: 'from-cyan-500 to-blue-600', bgColor: 'bg-gradient-to-br from-cyan-50 to-blue-100' };
                                  } else if (id.includes('gemini-2.5')) {
                                    return { name: 'Gemini 2.5 Pro Google', color: 'from-emerald-500 to-teal-600', bgColor: 'bg-gradient-to-br from-emerald-50 to-teal-100' };
                                  } else if (id.includes('deepseek')) {
                                    return { name: 'DeepSeek R1 DeepSeek', color: 'from-rose-500 to-pink-600', bgColor: 'bg-gradient-to-br from-rose-50 to-pink-100' };
                                  }
                                  return { name: modelId, color: 'from-gray-500 to-gray-600', bgColor: 'bg-gradient-to-br from-gray-50 to-gray-100' };
                                };

                                const modelInfo = getModelInfo(response.model_id);
                                
                                return (
                                  <div key={response.id} className={cn(
                                    "rounded-2xl p-4 border-2 transition-all duration-200 shadow-lg hover:shadow-xl hover:scale-105",
                                    darkMode 
                                      ? ("bg-gradient-to-br " + modelInfo.color.replace('500', '500/40').replace('600', '600/40')) 
                                      : ("bg-gradient-to-br " + modelInfo.color.replace('500', '500/30').replace('600', '600/30')),
                                    darkMode ? "border-slate-600/30" : "border-slate-300 hover:border-slate-400"
                                  )}>
                                    {/* Model Header */}
                                    <div className="mb-3">
                                      <div className={cn(
                                        "inline-flex items-center gap-2 px-3 py-2 rounded-lg shadow-lg border-2",
                                        ("bg-gradient-to-r " + modelInfo.color),
                                        darkMode ? "border-white/30" : "border-white/40"
                                      )}>
                                        <div className={cn(
                                          "w-6 h-6 rounded-md flex items-center justify-center backdrop-blur-sm",
                                          darkMode ? "bg-white/20" : "bg-white/30"
                                        )}>
                                          <Sparkles className="w-3 h-3 text-white" />
                                        </div>
                                        <div>
                                          <h4 className="text-sm font-semibold text-white drop-shadow-md">
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
                                        "leading-relaxed text-sm font-medium",
                                        darkMode ? "text-white drop-shadow-sm" : "text-slate-800"
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
  );
}
