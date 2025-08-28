'use client';

import { useState, useRef, useEffect } from 'react';
import { Send, Copy, Star, MessageSquare, Bot, Sparkles, Plus, Search, Moon, Image, Paperclip, Mic, Sparkles as SparklesIcon, X } from 'lucide-react';
import { cn } from '@/lib/utils';

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
  const [selectedModels, setSelectedModels] = useState<string[]>([]);
  const [messages, setMessages] = useState<Message[]>([]);
  const [currentInput, setCurrentInput] = useState('');
  const [responses, setResponses] = useState<ModelResponse[]>([]);
  const [isLoading, setIsLoading] = useState(false);
  const [darkMode, setDarkMode] = useState(true);
  const [showModelSelector, setShowModelSelector] = useState(true);
  const messagesEndRef = useRef<HTMLDivElement>(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, responses]);

  const handleModelToggle = (modelId: string) => {
    setSelectedModels(prev => 
      prev.includes(modelId) 
        ? prev.filter(id => id !== modelId)
        : [...prev, modelId]
    );
  };

  const handleNewChat = () => {
    setMessages([]);
    setResponses([]);
    setCurrentInput('');
    setSelectedModels([]);
    setShowModelSelector(true);
  };

  const handleSendMessage = async () => {
    if (!currentInput.trim() || selectedModels.length === 0) return;

    const userMessage: Message = {
      id: Date.now().toString(),
      content: currentInput,
      role: 'user',
      timestamp: new Date()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentInput('');
    setIsLoading(true);

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

  const handleCopyResponse = async (content: string) => {
    try {
      await navigator.clipboard.writeText(content);
      // You could add a toast notification here
    } catch (error) {
      console.error('Failed to copy:', error);
    }
  };

  const handleMarkBest = (modelId: string) => {
    setResponses(prev => prev.map(r => ({
      ...r,
      isBest: r.modelId === modelId
    })));
  };

  const handleKeyPress = (e: React.KeyboardEvent) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  return (
    <div className={cn(
      "min-h-screen transition-colors duration-300",
      darkMode ? "bg-slate-900 text-white" : "bg-slate-50 text-slate-900"
    )}>
      {/* Sidebar */}
      <div className="fixed left-0 top-0 h-full w-64 bg-slate-800/80 border-r border-slate-700/50 p-6 backdrop-blur-xl">
        {/* Logo */}
        <div className="flex items-center gap-3 mb-8">
          <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-lg flex items-center justify-center">
            <SparklesIcon className="w-6 h-6 text-white" />
          </div>
          <h1 className="text-xl font-bold bg-gradient-to-r from-violet-400 to-purple-500 bg-clip-text text-transparent">
            AI Flista
          </h1>
        </div>

        {/* New Chat Button */}
        <button 
          onClick={handleNewChat}
          className="w-full bg-black text-white rounded-lg py-3 px-4 flex items-center justify-center gap-2 mb-6 hover:bg-gray-800 transition-colors">
          <Plus className="w-4 h-4" />
          New Chat
        </button>

        {/* Search */}
        <div className="relative mb-6">
          <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 w-4 h-4 text-gray-400" />
          <input
            type="text"
            placeholder="Search chats..."
            className="w-full bg-gray-700 text-white rounded-lg py-2 pl-10 pr-4 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-emerald-500"
          />
        </div>

        {/* Projects */}
        <div className="mb-6">
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-sm font-medium text-gray-300">Projects</h3>
            <Plus className="w-4 h-4 text-gray-400 cursor-pointer hover:text-white" />
          </div>
        </div>

        {/* Chats - Updated to show actual conversations */}
        <div className="mb-6">
          <h3 className="text-sm font-medium text-gray-300 mb-3">Chats</h3>
          <div className="space-y-2">
            {messages.length > 0 && (
              <div className="space-y-2">
                {messages.map((message, index) => (
                  <div key={message.id} className="bg-gray-700 rounded-lg p-3 cursor-pointer hover:bg-gray-600 transition-colors">
                    <div className="flex items-center gap-2 mb-1">
                      <div className="w-4 h-4 bg-gray-600 rounded-full flex items-center justify-center">
                        <span className="text-xs font-medium text-white">U</span>
                      </div>
                      <span className="text-xs text-gray-400">You</span>
                    </div>
                    <p className="text-sm text-gray-200 truncate">
                      {message.content}
                    </p>
                    {responses[index] && (
                      <div className="mt-2 pt-2 border-t border-gray-600">
                        <div className="flex items-center gap-2 mb-1">
                          <div className="w-4 h-4 bg-gradient-to-r from-emerald-400 to-teal-500 rounded-full flex items-center justify-center">
                            <Sparkles className="w-3 h-3 text-white" />
                          </div>
                          <span className="text-xs text-gray-400">AI Response</span>
                        </div>
                        <p className="text-sm text-gray-300 truncate">
                          {responses[index]?.content || 'Generating...'}
                        </p>
                      </div>
                    )}
                  </div>
                ))}
              </div>
            )}
            {messages.length === 0 && (
              <div className="text-center text-gray-400 py-4">
                <p className="text-sm">No conversations yet</p>
                <p className="text-xs">Start chatting to see history here</p>
              </div>
            )}
          </div>
        </div>

        {/* Bottom Actions */}
        <div className="absolute bottom-6 left-6 right-6 flex items-center justify-between">
          <button
            onClick={() => setDarkMode(!darkMode)}
            className="p-2 text-gray-400 hover:text-white transition-colors"
          >
            <Moon className="w-5 h-5" />
          </button>

        </div>
      </div>

      {/* Main Content */}
      <div className="ml-64 p-6">
        {/* Top Header Bar */}
        <div className="bg-slate-800/80 rounded-2xl p-6 mb-6 backdrop-blur-xl border border-slate-700/50">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 bg-gradient-to-r from-violet-500 to-purple-600 rounded-xl flex items-center justify-center">
                <SparklesIcon className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">AI Flista</h1>
                <p className="text-slate-400">Compare AI models in real-time</p>
              </div>
            </div>
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <span className="text-slate-400">Models</span>
                <span className="bg-slate-700 px-3 py-1 rounded-lg text-white font-medium">
                  ({selectedModels.length}/4)
                </span>
              </div>

              <button 
                onClick={() => setSelectedModels([])}
                className="px-3 py-1 text-slate-400 hover:text-white transition-colors"
              >
                Clear
              </button>
              <button 
                onClick={() => setSelectedModels(AI_MODELS.map(m => m.id))}
                className="px-3 py-1 text-slate-400 hover:text-white transition-colors"
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
            <h2 className="text-4xl font-bold text-white mb-4">Welcome to AI Flista</h2>
            <p className="text-slate-400 text-lg mb-8">Click "All" above to start comparing all AI models</p>
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
                <span className="text-slate-400">Models ({selectedModels.length}/4)</span>
              </div>
              <div className="flex items-center gap-4">
                {AI_MODELS.map((model) => {
                  const isSelected = selectedModels.includes(model.id);
                  return (
                    <button
                      key={model.id}
                      onClick={() => handleModelToggle(model.id)}
                      className={cn(
                        "flex items-center gap-2 px-4 py-2 rounded-xl border-2 transition-all duration-200 cursor-pointer",
                        isSelected 
                          ? `bg-gradient-to-r ${model.color} border-transparent text-white shadow-lg` 
                          : "bg-slate-800/50 border-slate-700/50 text-slate-400 hover:border-slate-600/50 hover:bg-slate-700/50"
                      )}
                    >
                      {model.icon}
                      <span className="font-medium">{model.name}</span>
                      {isSelected && (
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleModelToggle(model.id);
                          }}
                          className="ml-2 hover:bg-white/20 rounded-full p-1 transition-colors"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Chat Columns */}
            <div className="grid gap-6 mb-8" style={{ gridTemplateColumns: `repeat(${selectedModels.length}, 1fr)` }}>
              {selectedModels.map((modelId) => {
                const model = AI_MODELS.find(m => m.id === modelId);
                const response = responses.find(r => r.modelId === modelId);
                const hasMessages = messages.length > 0;
                
                return (
                  <div
                    key={modelId}
                    className={cn(
                      "bg-slate-800/50 rounded-2xl border border-slate-700/50 p-6 min-h-[500px] flex flex-col",
                      "backdrop-blur-sm shadow-xl hover:shadow-2xl transition-all duration-300",
                      model?.bgColor
                    )}
                  >
                    {/* Model Header */}
                    <div className="flex items-center gap-3 mb-6">
                      <div className={cn(
                        "w-12 h-12 rounded-2xl flex items-center justify-center shadow-lg",
                        `bg-gradient-to-r ${model?.color}`
                      )}>
                        {model?.icon}
                      </div>
                      <div>
                        <h3 className="font-bold text-white text-lg">{model?.name}</h3>
                        <p className="text-sm text-slate-400">{model?.provider}</p>
                      </div>
                    </div>

                    {/* Chat Content */}
                    <div className="flex-1 space-y-4">
                      {hasMessages && (
                        <>
                          {/* User Message */}
                          <div className="flex items-start gap-3">
                            <div className="w-8 h-8 bg-slate-600 rounded-full flex items-center justify-center flex-shrink-0">
                              <span className="text-sm font-medium text-white">U</span>
                            </div>
                            <div className="bg-slate-700/50 rounded-2xl p-4 flex-1 border border-slate-600/30">
                              <p className="text-white">{messages[messages.length - 1]?.content}</p>
                            </div>
                          </div>

                          {/* AI Response */}
                          <div className="flex items-start gap-3">
                            <div className={cn(
                              "w-8 h-8 rounded-2xl flex items-center justify-center flex-shrink-0 shadow-lg",
                              `bg-gradient-to-r ${model?.color}`
                            )}>
                              {model?.icon}
                            </div>
                            <div className="bg-slate-700/50 rounded-2xl p-4 flex-1 border border-slate-600/30">
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
                          <p className="text-lg font-medium mb-2">Ready to chat with {model?.name}</p>
                          <p className="text-sm">Type a message below to get started</p>
                        </div>
                      )}
                    </div>

                    {/* Response Actions */}
                    {response?.content && (
                      <div className="flex items-center justify-between mt-6 pt-4 border-t border-slate-600/30">
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => handleCopyResponse(response.content)}
                            className="p-2 text-slate-400 hover:text-white transition-colors hover:bg-slate-700/50 rounded-lg"
                            title="Copy response"
                          >
                            <Copy className="w-4 h-4" />
                          </button>
                          <button
                            onClick={() => handleMarkBest(modelId)}
                            className={cn(
                              "p-2 transition-colors hover:bg-slate-700/50 rounded-lg",
                              response.isBest ? "text-yellow-400" : "text-slate-400 hover:text-yellow-400"
                            )}
                            title="Mark as best response"
                          >
                            <Star className="w-4 h-4" fill={response.isBest ? "currentColor" : "none"} />
                          </button>
                        </div>
                        <span className="text-xs text-slate-500">Share feedback</span>
                      </div>
                    )}
                  </div>
                );
              })}
            </div>

            {/* Bottom Message Input */}
            <div className="fixed bottom-6 left-64 right-6 bg-slate-800/80 rounded-2xl border border-slate-700/50 p-4 backdrop-blur-xl shadow-2xl">
              <div className="flex items-center gap-4">
                {/* Left Buttons */}
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-slate-700/50">
                    <Image className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-slate-700/50">
                    <Paperclip className="w-5 h-5" />
                  </button>
                </div>

                {/* Input Field */}
                <div className="flex-1">
                  <input
                    value={currentInput}
                    onChange={(e) => setCurrentInput(e.target.value)}
                    onKeyPress={handleKeyPress}
                    placeholder="Ask me anything..."
                    className="w-full bg-slate-700/50 text-white rounded-xl px-4 py-3 placeholder-slate-400 focus:outline-none focus:ring-2 focus:ring-violet-500 border border-slate-600/50 backdrop-blur-sm"
                    disabled={selectedModels.length === 0 || isLoading}
                  />
                </div>

                {/* Right Buttons */}
                <div className="flex items-center gap-2">
                  <button className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-slate-700/50">
                    <Mic className="w-5 h-5" />
                  </button>
                  <button className="p-2 text-slate-400 hover:text-white transition-colors rounded-xl hover:bg-slate-700/50">
                    <SparklesIcon className="w-5 h-5" />
                  </button>
                  <button
                    onClick={handleSendMessage}
                    disabled={!currentInput.trim() || selectedModels.length === 0 || isLoading}
                    className="p-3 bg-gradient-to-r from-violet-500 to-purple-600 text-white rounded-xl hover:from-violet-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-200 shadow-lg"
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
    </div>
  );
}
