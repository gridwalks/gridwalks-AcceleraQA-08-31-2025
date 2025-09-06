// src/App.js - FIXED VERSION with proper admin function passing
import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// Components
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import Sidebar from './components/Sidebar';
import LearningPanel from './components/LearningPanel';
import NotebookOverlay from './components/NotebookOverlay';
import AuthScreen from './components/AuthScreen';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import AdminScreen from './components/AdminScreen';

// Services
import openaiService from './services/openaiService';
import neonService, { 
  initializeNeonService,
  autoSaveConversation,
  loadConversations
} from './services/neonService';
import ragService from './services/ragService';
import { initializeAuth } from './services/authService';

// Utils
import { exportNotebook } from './utils/exportUtils';
import {
  getMessagesByDays,
  createMessage,
  combineMessagesIntoConversations,
  mergeCurrentAndStoredMessages
} from './utils/messageUtils';
import { hasAdminRole } from './utils/auth';
import { validateEnvironment, DEFAULT_RESOURCES } from './config/constants';

const AcceleraQA = () => {
  // State management
  const [messages, setMessages] = useState([]);
  const [storedMessages, setStoredMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResources, setCurrentResources] = useState([]);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isServerAvailable, setIsServerAvailable] = useState(true);
  const [showAdmin, setShowAdmin] = useState(false); // ADMIN STATE
  const [ragEnabled, setRAGEnabled] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);
  const [showNotebook, setShowNotebook] = useState(false);
  
  const messagesEndRef = useRef(null);

  const isAdmin = hasAdminRole(user);

  // Debug admin state
  useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('=== ADMIN DEBUG ===');
      console.log('User:', user);
      console.log('User roles:', user?.roles);
      console.log('isAdmin:', isAdmin);
      console.log('showAdmin state:', showAdmin);
      console.log('==================');
    }
  }, [user, isAdmin, showAdmin]);

  // Memoized values
  const allMessages = useMemo(() => 
    mergeCurrentAndStoredMessages(messages, storedMessages), 
    [messages, storedMessages]
  );

  const thirtyDayMessages = useMemo(() => 
    getMessagesByDays(allMessages), 
    [allMessages]
  );

  // FIXED: Admin handlers with better debugging
  const handleShowAdmin = useCallback(() => {
    console.log('=== HANDLE SHOW ADMIN CALLED ===');
    console.log('User:', user);
    console.log('isAdmin:', isAdmin);
    console.log('hasAdminRole result:', hasAdminRole(user));
    
    if (!user) {
      console.error('No user - admin access denied');
      alert('Please sign in to access admin features');
      return;
    }

    if (!hasAdminRole(user)) {
      console.error('User does not have admin role - access denied');
      console.error('User roles:', user.roles);
      alert('Admin access denied. You need administrator privileges.');
      return;
    }

    console.log('✅ Admin access granted - showing admin screen');
    setShowAdmin(true);
  }, [user, isAdmin]);

  const handleCloseAdmin = useCallback(() => {
    console.log('Closing admin screen');
    setShowAdmin(false);
  }, []);

  const handleOpenNotebook = useCallback(() => {
    setShowNotebook(true);
  }, []);

  const handleCloseNotebook = useCallback(() => {
    setShowNotebook(false);
  }, []);

  // Initialize authentication and Neon service
  useEffect(() => {
    const initialize = async () => {
      try {
        if (!validateEnvironment()) {
          setError('Application configuration is incomplete. Please check environment variables.');
          setIsLoadingAuth(false);
          return;
        }

        await initializeAuth(setUser, setIsLoadingAuth, () => {
          // Don't initialize welcome message here - let the conversation loading effect handle it
        });
      } catch (error) {
        console.error('Initialization failed:', error);
        setError('Failed to initialize application. Please refresh the page.');
        setIsLoadingAuth(false);
      }
    };

    initialize();
  }, []);

  // Initialize Neon service when user is authenticated
  useEffect(() => {
    const initializeConversations = async () => {
      if (!user || isInitialized) return;

      try {
        console.log('Initializing Neon service for user:', user.sub);
        
        await initializeNeonService(user);
        
        const serviceAvailable = await neonService.isServiceAvailable();
        setIsServerAvailable(serviceAvailable);
        
        if (!serviceAvailable) {
          console.warn('Neon database not available, using session-only mode');
          initializeWelcomeMessage();
          setIsInitialized(true);
          return;
        }
        
        console.log('Loading conversations from Neon database...');
        const loadedMessages = await loadConversations();
        
        if (loadedMessages && loadedMessages.length > 0) {
          console.log(`Successfully loaded ${loadedMessages.length} messages from Neon database`);
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
          console.log('No stored conversations found in Neon, initializing welcome message');
          initializeWelcomeMessage();
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error initializing conversations:', error);
        setIsServerAvailable(false);
        initializeWelcomeMessage();
        setIsInitialized(true);
      }
    };

    if (user && !isInitialized) {
      initializeConversations();
    }
  }, [user, isInitialized]);

  // Auto-save conversation when messages change
  useEffect(() => {
    const performAutoSave = async () => {
      if (!user || !isInitialized || !isServerAvailable || messages.length === 0) return;
      
      if (messages.length === 1 && messages[0].content.includes('Welcome to AcceleraQA')) {
        return;
      }
      
      const nonWelcomeMessages = messages.filter(msg => 
        !(msg.type === 'ai' && msg.content.includes('Welcome to AcceleraQA'))
      );
      
      if (nonWelcomeMessages.length < 2) return;

      try {
        setIsSaving(true);
        console.log('Auto-saving conversation to Neon...', { messageCount: messages.length });
        
        const metadata = {
          sessionId: Date.now().toString(),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          ragEnabled: ragEnabled,
          autoSave: true
        };
        
        await autoSaveConversation(messages, metadata);
        setLastSaveTime(new Date());
        console.log('Conversation auto-saved successfully to Neon');
      } catch (error) {
        console.error('Failed to auto-save conversation to Neon:', error);
      } finally {
        setIsSaving(false);
      }
    };

    const timeoutId = setTimeout(performAutoSave, 2000);
    return () => clearTimeout(timeoutId);
  }, [messages, user, isInitialized, isServerAvailable, ragEnabled]);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize welcome message
  const initializeWelcomeMessage = useCallback(() => {
    const welcomeMessage = createMessage(
      'ai',
      'Welcome to AcceleraQA! I\'m your pharmaceutical quality and compliance AI assistant. I specialize in GMP, validation, CAPA, regulatory requirements, and quality risk management. \n\n💡 **New Feature**: RAG Search is now available with Neon PostgreSQL! Upload your documents using the "RAG Config" button to search and get answers directly from your own documents with persistent, scalable storage.\n\nHow can I help you today?',
      DEFAULT_RESOURCES
    );
    
    setMessages([welcomeMessage]);
    setCurrentResources(DEFAULT_RESOURCES);
  }, []);

  // Enhanced message handling with RAG
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = createMessage('user', inputMessage);
    const currentInput = inputMessage.trim();

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      let response;
      
      if (ragEnabled) {
        try {
          const searchResults = await ragService.searchDocuments(currentInput, {
            limit: 5,
            threshold: 0.4
          });

          if (searchResults.results && searchResults.results.length > 0) {
            response = await ragService.generateRAGResponse(currentInput, searchResults.results);
          } else {
            response = await openaiService.getChatResponse(currentInput);
          }
        } catch (ragError) {
          console.warn('RAG search failed, falling back to standard response:', ragError);
          response = await openaiService.getChatResponse(currentInput);
        }
      } else {
        response = await openaiService.getChatResponse(currentInput);
      }
      
      const aiMessage = createMessage(
        'ai',
        response.answer,
        response.resources
      );

      if (response.sources) {
        aiMessage.sources = response.sources;
      }

      setMessages(prev => [...prev, aiMessage]);
      setCurrentResources(response.resources);

    } catch (error) {
      console.error('Error getting AI response:', error);
      
      const errorMessage = createMessage(
        'ai',
        error.message,
        [
          { title: "OpenAI API Documentation", type: "Documentation", url: "https://platform.openai.com/docs/api-reference" },
          { title: "OpenAI API Key Management", type: "Dashboard", url: "https://platform.openai.com/account/api-keys" },
          { title: "OpenAI Usage Dashboard", type: "Dashboard", url: "https://platform.openai.com/account/usage" }
        ]
      );
      
      setMessages(prev => [...prev, errorMessage]);
      setCurrentResources(errorMessage.resources);
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, isLoading, ragEnabled]);

  // Handle input key press
  const handleKeyPress = useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Clear chat history
  const clearChat = useCallback(async () => {
    try {
      console.log('Clearing current chat...');
      
      if (messages.length > 1 && isServerAvailable) {
        const nonWelcomeMessages = messages.filter(msg => 
          !(msg.type === 'ai' && msg.content.includes('Welcome to AcceleraQA'))
        );
        
        if (nonWelcomeMessages.length > 0) {
          try {
            setIsSaving(true);
            await autoSaveConversation(messages, {
              clearedAt: new Date().toISOString(),
              reason: 'user_initiated_clear'
            });
            console.log('Current conversation saved before clearing');
          } catch (saveError) {
            console.warn('Failed to save conversation before clearing:', saveError);
          } finally {
            setIsSaving(false);
          }
        }
      }
      
      setMessages([]);
      setCurrentResources([]);
      setSelectedMessages(new Set());
      setError(null);
      
      setTimeout(() => {
        initializeWelcomeMessage();
      }, 100);
      
      console.log('Chat cleared successfully');
    } catch (error) {
      console.error('Error clearing chat:', error);
      setMessages([]);
      setCurrentResources([]);
      setSelectedMessages(new Set());
      setError(null);
      initializeWelcomeMessage();
    }
  }, [messages, isServerAvailable, initializeWelcomeMessage]);

  // Generate study notes
  const generateStudyNotes = useCallback(async () => {
    if (selectedMessages.size === 0 || isGeneratingNotes) return;

    setIsGeneratingNotes(true);
    setError(null);

    try {
      const selectedConversationData = allMessages.filter(msg => {
        if (selectedMessages.has(msg.id)) return true;
        const combinedId = `${msg.id}-combined`;
        if (selectedMessages.has(combinedId)) return true;
        return false;
      });

      const allConversations = combineMessagesIntoConversations(allMessages);
      const selectedCombinedConversations = allConversations.filter(conv => 
        selectedMessages.has(conv.id)
      );

      const messagesFromCombined = selectedCombinedConversations.flatMap(conv => {
        const messages = [];
        if (conv.originalUserMessage) messages.push(conv.originalUserMessage);
        if (conv.originalAiMessage) messages.push(conv.originalAiMessage);
        return messages;
      });

      const allSelectedMessages = [...selectedConversationData, ...messagesFromCombined];

      const uniqueSelectedMessages = allSelectedMessages.reduce((acc, msg) => {
        if (!acc.find(existing => existing.id === msg.id)) {
          acc.push(msg);
        }
        return acc;
      }, []);

      if (uniqueSelectedMessages.length === 0) {
        throw new Error('No valid messages found in selection. Please ensure you have selected conversations from the notebook.');
      }

      const response = await openaiService.generateStudyNotes(uniqueSelectedMessages);
      
      const studyNotesMessage = createMessage(
        'ai',
        `📚 **Study Notes Generated**\n\nBased on your selected conversations, here are comprehensive study notes:\n\n${response.answer}\n\n---\n*Study notes generated from ${selectedMessages.size} selected conversation items on ${new Date().toLocaleDateString()}*`,
        response.resources,
        true
      );

      studyNotesMessage.studyNotesData = {
        content: response.answer,
        selectedTopics: uniqueSelectedMessages
          .filter(msg => msg.content && msg.type === 'user')
          .map(msg => msg.content.substring(0, 50) + '...')
          .join(', '),
        resourceCount: response.resources.length,
        generatedDate: new Date().toLocaleDateString()
      };

      setMessages(prev => [...prev, studyNotesMessage]);
      setCurrentResources(response.resources);
      setSelectedMessages(new Set());
      setShowNotebook(false);

    } catch (error) {
      console.error('Error generating study notes:', error);
      
      const errorMessage = createMessage(
        'ai',
        error.message || 'Failed to generate study notes. Please try again.'
      );
      
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGeneratingNotes(false);
    }
  }, [selectedMessages, allMessages, isGeneratingNotes]);

  // Handle export
  const handleExport = useCallback(() => {
    try {
      exportNotebook(allMessages);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export notebook. Please try again.');
    }
  }, [allMessages]);


  // Loading screen
  if (isLoadingAuth) {
    return <LoadingScreen />;
  }

  // Error screen
  if (error) {
    return (
      <div className="min-h-screen bg-red-50 flex items-center justify-center p-6">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <div className="text-red-600 mb-4">
            <svg className="w-16 h-16 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-2.5L13.732 4c-.77-.833-1.964-.833-2.732 0L3.732 16.5c-.77.833.192 2.5 1.732 2.5z" />
            </svg>
          </div>
          <h2 className="text-xl font-semibold text-gray-900 mb-2">Application Error</h2>
          <p className="text-gray-600 mb-6">{error}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 transition-colors"
          >
            Reload Application
          </button>
        </div>
      </div>
    );
  }

  if (showNotebook) {
    return (
      <NotebookOverlay
        messages={messages}
        thirtyDayMessages={thirtyDayMessages}
        selectedMessages={selectedMessages}
        setSelectedMessages={setSelectedMessages}
        generateStudyNotes={generateStudyNotes}
        isGeneratingNotes={isGeneratingNotes}
        storedMessageCount={storedMessages.length}
        isServerAvailable={isServerAvailable}
        exportNotebook={handleExport}
        onClose={handleCloseNotebook}
      />
    );
  }

  // Authentication required screen
  if (!user) {
    return <AuthScreen />;
  }

  // FIXED: Admin interface with proper state check
  if (showAdmin && isAdmin) {
    return <AdminScreen user={user} onBack={handleCloseAdmin} />;
  }

  // Main authenticated interface
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
          <Header
            user={user}
            onShowAdmin={handleShowAdmin} // FIXED: Properly passing the function
            isSaving={isSaving}
            lastSaveTime={lastSaveTime}
            onOpenNotebook={handleOpenNotebook}
          />

        <div className="max-w-7xl mx-auto px-6 py-8 h-[calc(100vh-64px)]">
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 h-full min-h-0">
            <Sidebar currentResources={currentResources} className="lg:col-span-3" />
            <ChatArea
              messages={messages}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              isLoading={isLoading}
              handleSendMessage={handleSendMessage}
              handleKeyPress={handleKeyPress}
              messagesEndRef={messagesEndRef}
              ragEnabled={ragEnabled}
              setRAGEnabled={setRAGEnabled}
              clearChat={clearChat}
              isSaving={isSaving}
            />
            <LearningPanel />
          </div>
        </div>

        {/* Save Status Indicator */}
        {isSaving && (
          <div className="fixed bottom-4 right-4 bg-blue-600 text-white px-4 py-2 rounded-lg shadow-lg flex items-center space-x-2 z-50">
            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white"></div>
            <span className="text-sm">Saving to Neon...</span>
          </div>
        )}

        {/* Last Save Indicator */}
        {lastSaveTime && !isSaving && (
          <div className="fixed bottom-4 right-4 bg-green-600 text-white px-4 py-2 rounded-lg shadow-lg text-sm z-50 animate-fadeIn">
            Saved {lastSaveTime.toLocaleTimeString()}
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default AcceleraQA;
