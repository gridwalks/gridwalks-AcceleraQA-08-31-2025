import React, { useState, useEffect, useRef } from 'react';
import { Send, BookOpen, Download, Clock, MessageSquare, Search, FileText, ChevronRight, LogOut, User } from 'lucide-react';

//import React, { useState, useEffect, useRef } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
//import { Send, BookOpen, Download, Clock, MessageSquare, Search, FileText, ExternalLink, ChevronRight, LogOut, User } from 'lucide-react';

// Mock ChatGPT responses
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
    validation: {
      answer: "Process validation is establishing documented evidence that provides a high degree of assurance that a specific process will consistently produce a product meeting its pre-determined specifications and quality characteristics.",
      resources: [
        { title: "FDA Process Validation Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/process-validation-general-principles-and-practices" },
        { title: "ICH Q8-Q12 Implementation Strategy", type: "Guideline", url: "https://database.ich.org/sites/default/files/ICH_Q8-Q12_Guideline_Step4_2019_1119.pdf" }
      ]
    },
    capa: {
      answer: "Corrective and Preventive Actions (CAPA) is a systematic approach to investigation, corrective action, and preventive action in response to complaints, product non-conformances, and other quality issues.",
      resources: [
        { title: "FDA CAPA System Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/quality-systems-approach-pharmaceutical-cgmp-regulations" },
        { title: "Root Cause Analysis in CAPA", type: "Training", url: "https://www.ispe.org/pharmaceutical-engineering/root-cause-analysis-capa" }
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
  let response = responses.default;
  
  if (lowerMessage.includes('gmp') || lowerMessage.includes('manufacturing')) {
    response = responses.gmp;
  } else if (lowerMessage.includes('validation') || lowerMessage.includes('qualify')) {
    response = responses.validation;
  } else if (lowerMessage.includes('capa') || lowerMessage.includes('corrective')) {
    response = responses.capa;
  }

  return response;
};

const AcceleraQA = () => {
  const { user, isLoading: auth0Loading, isAuthenticated, loginWithRedirect, logout } = useAuth0();
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResources, setCurrentResources] = useState([]);
  const [showNotebook, setShowNotebook] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const messagesEndRef = useRef(null);

  // Initialize welcome message when user logs in
  useEffect(() => {
    if (isAuthenticated && messages.length === 0) {
      initializeWelcomeMessage();
    }
  }, [isAuthenticated, messages.length]);

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
      content: 'Welcome to AcceleraQA! I specialize in pharmaceutical quality and compliance topics including GMP, validation, CAPA, regulatory requirements, and quality risk management.',
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
    loginWithRedirect();
  };

  const handleLogout = () => {
    logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
    setMessages([]);
    setCurrentResources([]);
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
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMessages = messages.filter(msg => 
      new Date(msg.timestamp) >= thirtyDaysAgo
    );

    const csvContent = [
      ['Timestamp', 'Type', 'Message', 'Resources'],
      ...recentMessages.map(msg => [
        msg.timestamp,
        msg.type,
        msg.content.replace(/,/g, ';').replace(/\n/g, ' '),
        msg.resources ? msg.resources.map(r => `${r.title}: ${r.url}`).join(' | ') : ''
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

  const getThirtyDayMessages = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return messages.filter(msg => new Date(msg.timestamp) >= thirtyDaysAgo);
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentResources([]);
  };

  const selectAllConversations = () => {
    const allIds = new Set(getThirtyDayMessages().map(msg => msg.id));
    setSelectedMessages(allIds);
  };

  const deselectAll = () => {
    setSelectedMessages(new Set());
  };

  const toggleMessageSelection = (messageId) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const generateStudyNotes = async () => {
    if (selectedMessages.size === 0) return;

    setIsGeneratingNotes(true);
    const selectedMessageData = messages.filter(msg => selectedMessages.has(msg.id));
    
    try {
      const response = await mockChatGPTResponse('Generate study notes');
      
      const studyNotesMessage = {
        id: Date.now(),
        type: 'ai',
        content: `📚 **Study Notes Generated**\n\nBased on your selected conversations:\n\n${response.answer}\n\n*Study notes generated from ${selectedMessages.size} selected conversation items.*`,
        timestamp: new Date().toISOString(),
        resources: response.resources,
        isStudyNotes: true
      };

      setMessages(prev => [...prev, studyNotesMessage]);
      setCurrentResources(response.resources);
      setSelectedMessages(new Set());
      setShowNotebook(false);
    } catch (error) {
      console.error('Error generating study notes:', error);
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Loading screen
  if (auth0Loading) {
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
  if (!isAuthenticated) {
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
              Accelerating innovation in regulatory excellence through intelligent automation.
            </p>

            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 rounded-lg mb-16">
              <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
              <p className="text-lg text-blue-100 mb-6">
                Access AcceleraQA's advanced pharmaceutical AI assistant with personalized learning resources, 
                conversation history, and study note generation.
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

            {/* Features Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-gray-900 rounded-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mx-auto mb-6 flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Intelligent Responses</h3>
                <p className="text-gray-400">
                  Advanced AI understanding of pharmaceutical regulations, GMP standards, and compliance requirements
                </p>
              </div>
              
              <div className="text-center p-6 bg-gray-900 rounded-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg mx-auto mb-6 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Curated Learning</h3>
                <p className="text-gray-400">
                  Dynamic resource recommendations from FDA, ICH, and industry leaders for continuous professional development
                </p>
              </div>
              
              <div className="text-center p-6 bg-gray-900 rounded-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-600 to-red-600 rounded-lg mx-auto mb-6 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Export & Analyze</h3>
                <p className="text-gray-400">
                  Generate comprehensive study materials and export conversation data for team collaboration
                </p>
              </div>
            </div>
          </div>
        </div>

        <footer className="border-t border-gray-800 mt-20">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="text-center text-gray-500">
              Built for pharmaceutical quality and compliance professionals worldwide
            </div>
          </div>
        </footer>
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
                <span>{user?.email || user?.name}</span>
              </div>
              <button
                onClick={clearChat}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm"
              >
                Clear
              </button>
              <button
                onClick={() => setShowNotebook(!showNotebook)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
              >
                {showNotebook ? (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    <span>Chat</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>Notebook</span>
                  </>
                )}
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
                  <div className="flex flex-wrap justify-center gap-3">
                    <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full font-medium">GMP</span>
                    <span className="px-4 py-2 bg-purple-50 text-purple-700 rounded-full font-medium">Validation</span>
                    <span className="px-4 py-2 bg-green-50 text-green-700 rounded-full font-medium">CAPA</span>
                    <span className="px-4 py-2 bg-orange-50 text-orange-700 rounded-full font-medium">Regulatory</span>
                  </div>
                </div>
              )}

              {messages.map((message) => (
                <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
                  <div className={`max-w-3xl px-6 py-4 rounded-lg ${
                    message.type === 'user' 
                      ? 'bg-black text-white' 
                      : message.isStudyNotes
                        ? 'bg-gradient-to-r from-green-50 to-blue-50 border border-green-200'
                        : 'bg-gray-50 border border-gray-200'
                  }`}>
                    <p className="whitespace-pre-wrap text-base leading-relaxed">{message.content}</p>
                    <div className={`flex items-center justify-between mt-3 pt-3 border-t ${
                      message.type === 'user' ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-500'
                    }`}>
                      <p className="text-xs">
                        {new Date(message.timestamp).toLocaleString()}
                        {message.isStudyNotes && <span className="ml-2 text-green-600">📚 Study Notes</span>}
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
            {showNotebook ? (
              <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
                <div className="flex items-center justify-between mb-6">
                  <div>
                    <h3 className="text-lg font-bold text-gray-900">Notebook</h3>
                    <p className="text-sm text-gray-500">{getThirtyDayMessages().length} conversations</p>
                  </div>
                  <div className="flex items-center space-x-3">
                    {selectedMessages.size > 0 && (
                      <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
                        {selectedMessages.size} selected
                      </span>
                    )}
                    <div className="flex items-center space-x-2">
                      <button
                        onClick={selectedMessages.size > 0 ? deselectAll : selectAllConversations}
                        className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:border-gray-400 transition-colors"
                      >
                        {selectedMessages.size > 0 ? 'Deselect All' : 'Select All'}
                      </button>
                      <button
                        onClick={generateStudyNotes}
                        disabled={selectedMessages.size === 0 || isGeneratingNotes}
                        className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                          selectedMessages.size > 0 
                            ? 'bg-black text-white hover:bg-gray-800' 
                            : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                        }`}
                      >
                        {isGeneratingNotes ? 'Generating...' : 'Study Notes'}
                      </button>
                    </div>
                  </div>
                </div>
                <div className="space-y-3 overflow-y-auto h-[calc(100%-100px)]">
                  {getThirtyDayMessages().slice(-20).map((message) => (
                    <div key={message.id} className={`p-4 rounded-lg border transition-all ${
                      selectedMessages.has(message.id) 
                        ? 'bg-blue-50 border-blue-300' 
                        : 'bg-gray-50 border-gray-200 hover:border-gray-300'
                    }`}>
                      <div className="flex items-start space-x-3">
                        <input
                          type="checkbox"
                          checked={selectedMessages.has(message.id)}
                          onChange={() => toggleMessageSelection(message.id)}
                          className="mt-1 rounded border-gray-300 text-black focus:ring-black"
                        />
                        <div className="flex-1 min-w-0">
                          <div className="flex items-center justify-between mb-2">
                            <span className={`text-xs font-semibold uppercase tracking-wide ${
                              message.type === 'user' ? 'text-blue-600' : 'text-purple-600'
                            }`}>
                              {message.type === 'user' ? 'Question' : 'Response'}
                            </span>
                            <span className="text-xs text-gray-500">
                              {new Date(message.timestamp).toLocaleDateString()}
                            </span>
                          </div>
                          <p className="text-sm text-gray-700 line-clamp-3 leading-relaxed">
                            {message.content}
                          </p>
                          {message.resources && message.resources.length > 0 && (
                            <div className="mt-3 pt-2 border-t border-gray-200">
                              <span className="text-xs text-gray-500 font-medium">
                                {message.resources.length} learning resources
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Further Learning</h3>
                  <p
