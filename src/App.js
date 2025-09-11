// src/App.js - COMPLETE VERSION WITH DEFAULT EXPORT

import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';
import { X, Settings, FileText, Users, BarChart3, HelpCircle, User, LogOut, RefreshCw } from 'lucide-react';
import ChatArea from './components/ChatArea';
import Sidebar from './components/Sidebar';
import AdminScreen from './components/AdminScreen';
import EvaluationModal from './components/EvaluationModal';
import openaiService from './services/openaiService';
import neonService from './services/neonService';
import { initializeAuth, logout, validateEnvironment, getUser } from './services/authService';
import { hasAdminRole } from './utils/auth';
import { mergeCurrentAndStoredMessages, validateAndRepairMessages } from './utils/messageUtils';

// Default resources that appear when no conversation history
const DEFAULT_RESOURCES = [
  {
    title: "FDA Guidance Documents",
    url: "https://www.fda.gov/drugs/guidance-compliance-regulatory-information/guidances-drugs",
    description: "Current FDA guidance documents for pharmaceutical development and manufacturing"
  },
  {
    title: "ICH Guidelines",
    url: "https://www.ich.org/page/ich-guidelines",
    description: "International Council for Harmonisation guidelines for quality, safety and efficacy"
  },
  {
    title: "USP Chapters",
    url: "https://www.usp.org/harmonization-standards/usp-nf",
    description: "United States Pharmacopeia standards and test procedures"
  }
];

function App() {
  // Authentication and user state
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [isAdmin, setIsAdmin] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);

  // Application state
  const [messages, setMessages] = useState([]);
  const [storedMessages, setStoredMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResources, setCurrentResources] = useState(DEFAULT_RESOURCES);
  const [showNotebook, setShowNotebook] = useState(false);
  const [ragEnabled, setRAGEnabled] = useState(false);
  const [showEvaluationModal, setShowEvaluationModal] = useState(false);
  const [error, setError] = useState(null);

  // Service state
  const [isServerAvailable, setIsServerAvailable] = useState(false);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);

  // Refs
  const messagesEndRef = useRef(null);
  const saveTimeoutRef = useRef(null);

  // Auto-scroll to bottom when messages change
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize welcome message
  const initializeWelcomeMessage = useCallback(() => {
    const welcomeMessage = {
      id: 'welcome',
      type: 'ai',
      content: `I'm your pharmaceutical quality and compliance AI assistant. I specialize in GMP, validation, CAPA, regulatory requirements, and quality risk management. \n\n💡 **New Feature**: RAG Search is now available with Neon PostgreSQL! Upload your documents using the "RAG Config" button to search and get answers directly from your own documents with persistent, scalable storage.\n\nHow can I help you today?`,
      timestamp: new Date().toISOString(),
      resources: DEFAULT_RESOURCES
    };

    setMessages([welcomeMessage]);
    setCurrentResources(DEFAULT_RESOURCES);
  }, []);

  // Merge current session messages with stored messages
  const allMessages = useMemo(() => {
    return mergeCurrentAndStoredMessages(messages, storedMessages);
  }, [messages, storedMessages]);

  // Auto-save function
  const performAutoSave = useCallback(async () => {
    if (!user || !isInitialized || !isServerAvailable || allMessages.length === 0) return;
    
    // Skip saving if only welcome message
    const nonWelcomeMessages = allMessages.filter(msg => 
      !msg.content.includes('Welcome to AcceleraQA') && 
      !msg.content.includes("I'm your pharmaceutical quality")
    );
    
    if (nonWelcomeMessages.length === 0) return;

    try {
      setIsSaving(true);
      console.log(`💾 Auto-saving ${nonWelcomeMessages.length} messages...`);
      
      await neonService.saveConversation(nonWelcomeMessages);
      setLastSaveTime(new Date());
      console.log('✅ Auto-save completed successfully');
      
    } catch (error) {
      console.error('❌ Auto-save failed:', error);
    } finally {
      setIsSaving(false);
    }
  }, [user, isInitialized, isServerAvailable, allMessages]);

  // Debounced auto-save
  useEffect(() => {
    if (saveTimeoutRef.current) {
      clearTimeout(saveTimeoutRef.current);
    }

    saveTimeoutRef.current = setTimeout(performAutoSave, 2000);

    return () => {
      if (saveTimeoutRef.current) {
        clearTimeout(saveTimeoutRef.current);
      }
    };
  }, [performAutoSave]);

  // Handle admin access
  const handleAdminClick = useCallback(() => {
    if (!isAdmin) {
      alert('You need administrator privileges.');
      return;
    }

    console.log('✅ Admin access granted - showing admin screen');
    setShowAdmin(true);
  }, [isAdmin]);

  const handleCloseAdmin = useCallback(() => {
    console.log('Closing admin screen');
    setShowAdmin(false);
  }, []);

  // Initialize authentication
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!validateEnvironment()) {
          setError('Application configuration is incomplete. Please check environment variables.');
          setIsLoadingAuth(false);
          return;
        }

        await initializeAuth(setUser, setIsLoadingAuth, () => {
          // Authentication successful callback
        });
      } catch (error) {
        console.error('Initialization failed:', error);
        setError('Failed to initialize application. Please refresh the page.');
        setIsLoadingAuth(false);
      }
    };

    initialize();
  }, []);

  // Initialize services when user is authenticated
  useEffect(() => {
    const initializeConversations = async () => {
      if (!user || isInitialized) return;

      console.log('🔄 User authenticated, initializing services...');

      try {
        console.log('🚀 Starting service initialization for user:', user.sub);
        
        // Initialize Neon service
        console.log('📡 Initializing Neon service...');
        await neonService.initialize(user);
        
        const serviceAvailable = await neonService.isServiceAvailable();
        setIsServerAvailable(serviceAvailable);
        
        if (!serviceAvailable) {
          console.warn('⚠️ Neon database not available, using session-only mode');
          initializeWelcomeMessage();
          setIsInitialized(true);
          return;
        }
        
        console.log('📥 Loading conversations from Neon database...');
        const loadedMessages = await neonService.loadConversations();
        
        if (loadedMessages && loadedMessages.length > 0) {
          console.log(`✅ Successfully loaded ${loadedMessages.length} messages from Neon database`);
          setStoredMessages(loadedMessages);
          
          const lastAiMessage = loadedMessages
            .filter(msg => msg.type === 'ai' && msg.resources && msg.resources.length > 0)
            .pop();
          
          if (lastAiMessage) {
            setCurrentResources(lastAiMessage.resources);
          } else {
            setCurrentResources(DEFAULT_RESOURCES);
          }
        } else {
          console.log('📝 No stored conversations found in Neon, initializing welcome message');
          initializeWelcomeMessage();
        }
        
        setIsInitialized(true);
        
      } catch (error) {
        console.error('❌ Service initialization failed:', error);
        setIsServerAvailable(false);
        initializeWelcomeMessage();
        setIsInitialized(true);
      }
    };

    if (user && !isInitialized) {
      initializeConversations();
    }
  }, [user, isInitialized, initializeWelcomeMessage]);

  // Check admin role
  useEffect(() => {
    const checkAdminRole = async () => {
      if (user) {
        const adminStatus = await hasAdminRole(user);
        setIsAdmin(adminStatus);
      }
    };

    checkAdminRole();
  }, [user]);

  // Handle sending messages
  const handleSendMessage = async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = {
      id: Date.now().toString(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    const tempMessages = [...messages, userMessage];
    setMessages(tempMessages);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await openaiService.sendMessage(
        inputMessage,
        allMessages,
        currentResources,
        ragEnabled
      );

      const aiMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: response.content,
        timestamp: new Date().toISOString(),
        resources: response.resources || currentResources
      };

      setMessages([...tempMessages, aiMessage]);
      
      if (response.resources && response.resources.length > 0) {
        setCurrentResources(response.resources);
      }

    } catch (error) {
      console.error('Error sending message:', error);
      const errorMessage = {
        id: (Date.now() + 1).toString(),
        type: 'ai',
        content: 'I apologize, but I encountered an error processing your request. Please try again.',
        timestamp: new Date().toISOString(),
        resources: currentResources
      };

      setMessages([...tempMessages, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  };

  // Handle key press
  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSendMessage();
    }
  };

  // Handle logout
  const handleLogout = async () => {
    try {
      await logout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  // Handle refresh
  const handleRefresh = async () => {
    if (!isServerAvailable || !user) return;

    try {
      setIsSaving(true);
      const loadedMessages = await neonService.loadConversations();
      
      if (loadedMessages && loadedMessages.length > 0) {
        setStoredMessages(loadedMessages);
        
        const lastAiMessage = loadedMessages
          .filter(msg => msg.type === 'ai' && msg.resources && msg.resources.length > 0)
          .pop();
        
        if (lastAiMessage) {
          setCurrentResources(lastAiMessage.resources);
        }
      }
    } catch (error) {
      console.error('Error refreshing conversations:', error);
    } finally {
      setIsSaving(false);
    }
  };

  // Loading screen
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading AcceleraQA...</p>
        </div>
      </div>
    );
  }

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center">
        <div className="text-center p-6 bg-white rounded-lg shadow-lg max-w-md">
          <h2 className="text-xl font-semibold text-red-600 mb-2">Application Error</h2>
          <p className="text-gray-600 mb-4">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700"
          >
            Refresh Page
          </button>
        </div>
      </div>
    );
  }

  // Login screen
  if (!user) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
        <div className="max-w-md w-full bg-white rounded-xl shadow-lg p-8">
          <div className="text-center">
            <h1 className="text-3xl font-bold text-gray-900 mb-2">AcceleraQA</h1>
            <p className="text-gray-600 mb-8">
              Your AI-powered pharmaceutical quality and compliance assistant
            </p>
            <button
              onClick={() => initializeAuth(setUser, setIsLoadingAuth)}
              className="w-full bg-blue-600 text-white py-3 px-6 rounded-lg hover:bg-blue-700 transition-colors font-medium"
            >
              Sign In to Continue
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Admin screen
  if (showAdmin) {
    return (
      <AdminScreen 
        user={user} 
        onBack={handleCloseAdmin}
      />
    );
  }

  // Main application
  return (
    <div className="h-screen bg-gray-100 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b border-gray-200 px-4 py-3">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-4">
            <h1 className="text-xl font-semibold text-gray-900">AcceleraQA</h1>
            {lastSaveTime && (
              <span className="text-sm text-gray-500">
                Last saved: {lastSaveTime.toLocaleTimeString()}
              </span>
            )}
          </div>
          
          <div className="flex items-center space-x-3">
            {isAdmin && (
              <button
                onClick={handleAdminClick}
                className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
                title="Admin Panel"
              >
                <Settings className="h-4 w-4" />
                <span className="hidden sm:inline">Admin</span>
              </button>
            )}
            
            <button
              onClick={() => setShowEvaluationModal(true)}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Feedback"
            >
              <HelpCircle className="h-4 w-4" />
              <span className="hidden sm:inline">Feedback</span>
            </button>
            
            <div className="flex items-center space-x-2 text-sm text-gray-600">
              <User className="h-4 w-4" />
              <span className="hidden sm:inline">{user.email || user.name}</span>
            </div>
            
            <button
              onClick={handleLogout}
              className="flex items-center space-x-2 px-3 py-2 text-gray-600 hover:text-gray-900 hover:bg-gray-100 rounded-lg transition-colors"
              title="Sign Out"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 flex overflow-hidden">
        {/* Mobile Layout */}
        <div className="lg:hidden flex flex-col h-full w-full">
          <div className="flex-1 p-4">
            <ChatArea
              messages={allMessages}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              isLoading={isLoading}
              handleSendMessage={handleSendMessage}
              handleKeyPress={handleKeyPress}
              messagesEndRef={messagesEndRef}
              ragEnabled={ragEnabled}
              setRAGEnabled={setRAGEnabled}
              isSaving={isSaving}
            />
          </div>
          
          <div className="border-t border-gray-200 bg-white">
            <Sidebar
              resources={currentResources}
              showNotebook={showNotebook}
              setShowNotebook={setShowNotebook}
              onRefresh={handleRefresh}
              isServerAvailable={isServerAvailable}
              conversations={[]}
              user={user}
              compact={true}
            />
          </div>
        </div>

        {/* Desktop Layout */}
        <div className="hidden lg:flex h-full w-full">
          <div className="flex-1 min-w-0 p-6">
            <ChatArea
              messages={allMessages}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              isLoading={isLoading}
              handleSendMessage={handleSendMessage}
              handleKeyPress={handleKeyPress}
              messagesEndRef={messagesEndRef}
              ragEnabled={ragEnabled}
              setRAGEnabled={setRAGEnabled}
              isSaving={isSaving}
            />
          </div>
          
          <div className="w-80 xl:w-96 flex-shrink-0 border-l border-gray-200 bg-white">
            <Sidebar
              resources={currentResources}
              showNotebook={showNotebook}
              setShowNotebook={setShowNotebook}
              onRefresh={handleRefresh}
              isServerAvailable={isServerAvailable}
              conversations={[]}
              user={user}
            />
          </div>
        </div>
      </div>

      {/* Evaluation Modal */}
      {showEvaluationModal && (
        <EvaluationModal onClose={() => setShowEvaluationModal(false)} />
      )}
    </div>
  );
}

export default App;
