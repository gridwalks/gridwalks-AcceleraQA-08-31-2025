import React, { useState, useEffect, useRef } from 'react';
import { Send, BookOpen, Download, Clock, MessageSquare, Search, FileText, ChevronRight, LogOut, User } from 'lucide-react';

// Initialize Netlify Identity
let netlifyIdentity = null;
if (typeof window !== 'undefined' && window.netlifyIdentity) {
  netlifyIdentity = window.netlifyIdentity;
}

// Mock ChatGPT responses for build safety
const mockChatGPTResponse = async (message) => {
  await new Promise(resolve => setTimeout(resolve, 1500));
  
  const responses = {
    gmp: {
      answer: "Good Manufacturing Practice (GMP) is a system for ensuring that products are consistently produced and controlled according to quality standards. It's designed to minimize risks involved in pharmaceutical production that cannot be eliminated through testing the final product alone.",
      resources: [
        { title: "FDA GMP Guidelines", type: "Regulation", url: "https://www.fda.gov/drugs/pharmaceutical-quality-resources/current-good-manufacturing-practice-cgmp-regulations" },
        { title: "ICH Q7 Good Manufacturing Practice Guide", type: "Guideline", url: "https://database.ich.org/sites/default/files/Q7%20Guideline.pdf" }
      ]
    },
    default: {
      answer: "I can help you with pharmaceutical quality and compliance topics including GMP, validation, CAPA, regulatory requirements, and quality risk management.",
      resources: [
        { title: "FDA Quality System Regulation", type: "Regulation", url: "https://www.fda.gov/drugs/pharmaceutical-quality-resources/quality-system-regulation" },
        { title: "ICH Quality Guidelines Overview", type: "Guideline", url: "https://www.ich.org/page/quality-guidelines" }
      ]
    }
  };

  const lowerMessage = message.toLowerCase();
  return lowerMessage.includes('gmp') ? responses.gmp : responses.default;
};

const AcceleraQA = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResources, setCurrentResources] = useState([]);
  const [showNotebook, setShowNotebook] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const messagesEndRef = useRef(null);

  // Initialize authentication
  useEffect(() => {
    if (netlifyIdentity) {
      netlifyIdentity.init();
      
      const currentUser = netlifyIdentity.currentUser();
      setUser(currentUser);
      setIsLoadingAuth(false);

      netlifyIdentity.on('login', (user) => {
        setUser(user);
        netlifyIdentity.close();
        initializeWelcomeMessage();
      });

      netlifyIdentity.on('logout', () => {
        setUser(null);
        setMessages([]);
        setCurrentResources([]);
      });
    } else {
      setIsLoadingAuth(false);
    }
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  const initializeWelcomeMessage = () => {
    const welcomeMessage = {
      id: Date.now(),
      type: 'ai',
      content: 'Welcome to AcceleraQA! I specialize in pharmaceutical quality and compliance topics.',
      timestamp: new Date().toISOString(),
      resources: [
        { title: "FDA Quality System Regulation", type: "Regulation", url: "https://www.fda.gov/drugs/pharmaceutical-quality-resources/quality-system-regulation" },
        { title: "ICH Quality Guidelines Overview", type: "Guideline", url: "https://www.ich.org/page/quality-guidelines" }
      ]
    };
    setMessages([welcomeMessage]);
    setCurrentResources(welcomeMessage.resources);
  };

  const handleLogin = () => {
    if (netlifyIdentity) {
      netlifyIdentity.open();
    }
  };

  const handleLogout = () => {
    if (netlifyIdentity) {
      netlifyIdentity.logout();
    }
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await mockChatGPTResponse(inputMessage);
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.answer,
        timestamp: new Date().toISOString(),
        resources: response.resources
      };

      setMessages(prev => [...prev, aiMessage]);
      setCurrentResources(response.resources);
    } catch (error) {
      console.error('Error getting AI response:', error);
      const errorMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: 'Sorry, I encountered an error. Please try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  const exportNotebook = () => {
    const csvContent = [
      ['Timestamp', 'Type', 'Message'],
      ...messages.map(msg => [
        msg.timestamp,
        msg.type,
        msg.content.replace(/,/g, ';').replace(/\n/g, ' ')
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'acceleraqa-notebook.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentResources([]);
  };

  // Loading screen
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading AcceleraQA...</p>
        </div>
      </div>
    );
  }

  // Authentication required screen
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        <header className="border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold tracking-tight">AcceleraQA</div>
              <button
                onClick={handleLogin}
                className="px-6 py-2 bg-white text-black font-medium rounded hover:bg-gray-100 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </header>

        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-4xl">
            <h1 className="text-6xl lg:text-8xl font-bold mb-8 leading-tight">
              The Future of
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Pharmaceutical QA
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-gray-300 mb-12 leading-relaxed max-w-3xl">
              AI-powered learning assistant for pharmaceutical quality and compliance professionals.
            </p>

            <button
              onClick={handleLogin}
              className="group inline-flex items-center space-x-3 bg-white text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300"
            >
              <User className="h-5 w-5" />
              <span>Sign In to Continue</span>
              <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Authenticated user interface
  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-black text-white border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold tracking-tight">AcceleraQA</div>
              <div className="hidden md:block text-sm text-gray-400">
                Pharmaceutical Quality & Compliance AI
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <button
                onClick={clearChat}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm"
              >
                Clear
              </button>
              <button
                onClick={exportNotebook}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-black rounded hover:bg-gray-100 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-160px)]">
          <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 flex flex-col">
            <div className="flex-1 p-8 overflow-y-auto space-y-6">
              {messages.length === 0 && (
                <div className="text-center py-16">
                  <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mx-auto mb-6 flex items-center justify-center">
                    <MessageSquare className="h-8 w-8 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900 mb-4">Welcome to AcceleraQA</h3>
                  <p className="text-gray-600 mb-8 text-lg">
                    Ask questions about pharmaceutical quality and compliance topics
                  </p>
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl px-6 py-4 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-black text-white' 
                      : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <p className="whitespace-pre-wrap text-base leading-relaxed">{message.content}</p>
                    <div className={`flex items-center justify-between mt-3 pt-3 border-t ${
                      message.type === 'user' ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-500'
                    }`}>
                      <p className="text-xs">
                        {new Date(message.timestamp).toLocaleString()}
                      </p>
                    </div>
                  </div>
                </div>
              ))}

              {isLoading && (
                <div className="flex justify-start">
                  <div className="bg-gray-50 border border-gray-200 px-6 py-4 rounded-lg">
                    <div className="flex items-center space-x-3">
                      <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                      <span className="text-gray-700">Analyzing your question...</span>
                    </div>
                  </div>
                </div>
              )}

              <div ref={messagesEndRef} />
            </div>

            <div className="p-8 border-t border-gray-200">
              <div className="flex space-x-4">
                <input
                  type="text"
                  value={inputMessage}
                  onChange={(e) => setInputMessage(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
                  placeholder="Ask about GMP, validation, CAPA, regulations..."
                  className="flex-1 px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-base"
                  disabled={isLoading}
                />
                <button
                  onClick={handleSendMessage}
                  disabled={isLoading || !inputMessage.trim()}
                  className="px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                >
                  <Send className="h-5 w-5" />
                </button>
              </div>
            </div>
          </div>

          <div className="lg:col-span-1">
            <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
              <div className="mb-6">
                <h3 className="text-lg font-bold text-gray-900 mb-2">Further Learning</h3>
                <p className="text-sm text-gray-500">Curated resources for your query</p>
              </div>
              
              {currentResources.length > 0 ? (
                <div className="space-y-4 overflow-y-auto h-[calc(100%-100px)]">
                  {currentResources.map((resource, index) => (
                    <div key={index} className="group border border-gray-200 rounded-lg hover:border-gray-400 transition-all duration-300">
                      <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block p-4">
                        <div className="flex items-start justify-between">
                          <div className="flex-1">
                            <div className="flex items-center space-x-2 mb-2">
                              <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                {resource.type}
                              </span>
                            </div>
                            <h4 className="font-semibold text-gray-900 group-hover:text-black mb-2 leading-snug">
                              {resource.title}
                            </h4>
                          </div>
                          <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all ml-3 flex-shrink-0" />
                        </div>
                      </a>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="text-center py-12">
                  <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                    <Search className="h-6 w-6 text-gray-400" />
                  </div>
                  <p className="text-gray-500">Ask a question to see relevant learning resources</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceleraQA;
