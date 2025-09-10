import React, { useState, useEffect, useCallback } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Brain, AlertCircle } from 'lucide-react';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatInterface from './components/ChatArea';
import AdminScreen from './components/AdminScreen';
import ResourcesView from './components/ResourcesView';
import AuthScreen from './components/AuthScreen';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';

// Services
import learningSuggestionsService from './services/learningSuggestionsService';
import neonService, { initializeNeonService } from './services/neonService';
import authService from './services/authService';

// Utils
import { hasAdminRole } from './utils/auth';

function App() {
  const { isAuthenticated, user, getAccessTokenSilently, isLoading: authLoading } = useAuth0();

  // System state
  const [isInitializing, setIsInitializing] = useState(true);
  const [initializationError, setInitializationError] = useState(null);
  const [isSystemReady, setIsSystemReady] = useState(false);

  // Conversation state
  const [messages, setMessages] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [showTypingIndicator, setShowTypingIndicator] = useState(false);
  const [ragEnabled, setRagEnabled] = useState(false);
  const [conversations, setConversations] = useState([]);
  const [currentConversation, setCurrentConversation] = useState(null);

  // UI state
  const [sidebarOpen, setSidebarOpen] = useState(true);
  const [showResources, setShowResources] = useState(false);
  const [showAdminScreen, setShowAdminScreen] = useState(false);

  // Learning suggestions
  const [learningSuggestions, setLearningSuggestions] = useState([]);
  const [messagesSinceLastRefresh, setMessagesSinceLastRefresh] = useState(0);
  const [learningConfig, setLearningConfig] = useState({
    learningChatCount: 5,
    enableAISuggestions: true,
    autoRefresh: true
  });

  // Enhanced service initialization
  const initializeServices = useCallback(async (userData) => {
    try {
      console.log('🚀 Starting service initialization for user:', userData.sub);
      setInitializationError(null);

      // Step 1: Initialize Auth0 service
      console.log('📡 Initializing Auth0 service...');
      await authService.initialize();
      
      // Step 2: Set up token provider for learning suggestions
      console.log('🧠 Setting up learning suggestions token provider...');
      learningSuggestionsService.setTokenProvider(getAccessTokenSilently);
      
      // Step 3: Initialize Neon service
      console.log('🗄️ Initializing Neon database service...');
      await initializeNeonService(userData);

      // Step 4: Test authentication by making a simple request
      console.log('🔐 Testing authentication...');
      const authTest = await neonService.makeAuthenticatedRequest('/.netlify/functions/neon-db', {
        method: 'POST',
        body: JSON.stringify({ action: 'health_check' })
      });
      console.log('✅ Authentication test passed:', authTest);

      console.log('✅ All services initialized successfully');
      setIsSystemReady(true);

    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      setInitializationError(error.message);
      
      // Don't block the UI entirely, but show warning
      setIsSystemReady(true);
    }
  }, [getAccessTokenSilently]);

  // Load learning configuration
  const loadLearningConfig = useCallback(async () => {
    if (!isSystemReady || !user) return;
    
    try {
      const config = await learningSuggestionsService.getAdminConfig(user.sub);
      setLearningConfig((prev) => ({ ...prev, ...config }));
    } catch (err) {
      console.error('Error loading learning config:', err);
    }
  }, [isSystemReady, user]);

  // Load learning suggestions
  const loadLearningSuggestions = useCallback(async (userId) => {
    if (!learningConfig.enableAISuggestions || !isSystemReady) return;
    
    try {
      const suggestions = await learningSuggestionsService.getLearningSuggestions(
        userId,
        learningConfig.learningChatCount
      );
      setLearningSuggestions(suggestions);
    } catch (err) {
      console.error('Error loading learning suggestions:', err);
      setLearningSuggestions([]);
    }
  }, [learningConfig.enableAISuggestions, learningConfig.learningChatCount, isSystemReady]);

  // Refresh suggestions
  const refreshLearningSuggestions = useCallback(async () => {
    if (!isAuthenticated || !user || !isSystemReady) return;
    
    try {
      const suggestions = await learningSuggestionsService.refreshSuggestions(
        user.sub,
        learningConfig.learningChatCount
      );
      setLearningSuggestions(suggestions);
      setMessagesSinceLastRefresh(0);
      return suggestions;
    } catch (err) {
      console.error('Error refreshing learning suggestions:', err);
      return [];
    }
  }, [isAuthenticated, user, isSystemReady, learningConfig.learningChatCount]);

  // Auto refresh checker
  const checkAutoRefreshSuggestions = useCallback(async () => {
    if (!learningConfig.autoRefresh || !learningConfig.enableAISuggestions) return;
    if (!isAuthenticated || !user || !isSystemReady) return;
    if (messagesSinceLastRefresh >= 4) {
      await refreshLearningSuggestions();
    }
  }, [learningConfig.autoRefresh, learningConfig.enableAISuggestions, isAuthenticated, user, isSystemReady, messagesSinceLastRefresh, refreshLearningSuggestions]);

  // Load conversations
  const loadConversations = useCallback(async () => {
    if (!isAuthenticated || !user || !isSystemReady) return;
    
    try {
      const result = await neonService.loadConversations();
      setConversations(result || []);
      
      if (result?.length > 0 && learningSuggestions.length === 0) {
        setTimeout(() => loadLearningSuggestions(user.sub), 1000);
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  }, [isAuthenticated, user, isSystemReady, learningSuggestions.length, loadLearningSuggestions]);

  // Save conversation
  const saveConversation = useCallback(async (msgs, conversationId = null, isNewConversation = false) => {
    if (!isAuthenticated || !user || msgs.length === 0 || !isSystemReady) return null;
    
    try {
      await neonService.saveConversation(msgs, { 
        ragEnabled, 
        lastUpdated: new Date().toISOString() 
      });
      await loadConversations();
    } catch (err) {
      console.error('Error saving conversation:', err);
    }
  }, [isAuthenticated, user, isSystemReady, ragEnabled, loadConversations]);

  // Main initialization effect
  useEffect(() => {
    let isMounted = true;

    const initialize = async () => {
      try {
        setIsInitializing(true);
        setInitializationError(null);

        if (isAuthenticated && user) {
          console.log('🔄 User authenticated, initializing services...');
          await initializeServices(user);
          
          if (isMounted) {
            // Load initial data after services are ready
            await Promise.all([
              loadLearningConfig(),
              loadConversations()
            ]);
            
            // Load learning suggestions after config is loaded
            if (user.sub) {
              setTimeout(() => loadLearningSuggestions(user.sub), 500);
            }
          }
        } else {
          console.log('👤 User not authenticated, clearing state');
          // Reset state when not authenticated
          setLearningSuggestions([]);
          setMessages([]);
          setConversations([]);
          setMessagesSinceLastRefresh(0);
          setIsSystemReady(false);
        }
      } catch (error) {
        console.error('❌ Initialization failed:', error);
        if (isMounted) {
          setInitializationError(error.message);
          setIsSystemReady(true); // Allow UI to show with error state
        }
      } finally {
        if (isMounted) {
          setIsInitializing(false);
        }
      }
    };

    initialize();

    return () => {
      isMounted = false;
    };
  }, [isAuthenticated, user, initializeServices, loadLearningConfig, loadConversations, loadLearningSuggestions]);

  // Send message handler
  const sendMessage = useCallback(async (content) => {
    if (!content.trim() || !isSystemReady) return;
    
    const userMessage = { 
      id: Date.now(), 
      role: 'user', 
      content,
      timestamp: new Date().toISOString()
    };
    
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setShowTypingIndicator(true);
    
    try {
      const assistantMessage = { 
        id: Date.now() + 1, 
        role: 'assistant', 
        content: '...',
        timestamp: new Date().toISOString()
      };
      
      setMessages((prev) => [...prev, assistantMessage]);
      
      const newCount = messagesSinceLastRefresh + 1;
      setMessagesSinceLastRefresh(newCount);
      
      setTimeout(() => checkAutoRefreshSuggestions(), 1000);
      
      await saveConversation([...messages, userMessage, assistantMessage], currentConversation?.id, !currentConversation);
    } finally {
      setIsLoading(false);
      setShowTypingIndicator(false);
    }
  }, [isSystemReady, messages, messagesSinceLastRefresh, checkAutoRefreshSuggestions, saveConversation, currentConversation]);

  // Conversation helpers
  const handleConversationSelect = useCallback((conv) => {
    setCurrentConversation(conv);
    setMessages(conv?.messages || []);
  }, []);

  const handleNewConversation = useCallback(() => {
    setCurrentConversation(null);
    setMessages([]);
  }, []);

  const handleDeleteConversation = useCallback(async (id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  }, []);

  const handleRenameConversation = useCallback((id, title) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  }, []);

  // Error display component
  const ErrorDisplay = ({ error, onRetry }) => (
    <div className="mb-4 p-4 bg-red-50 border border-red-200 rounded-lg">
      <div className="flex items-start space-x-3">
        <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
        <div className="flex-1">
          <h3 className="text-sm font-medium text-red-800">Initialization Warning</h3>
          <p className="text-sm text-red-700 mt-1">{error}</p>
          <button
            onClick={onRetry}
            className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
          >
            Retry initialization
          </button>
        </div>
      </div>
    </div>
  );

  // Learning info banner
  const renderLearningInfo = () => {
    if (!learningConfig.enableAISuggestions || !isAuthenticated || !isSystemReady) return null;
    
    return (
      <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">AI Learning Suggestions Active</span>
            {learningSuggestions.length > 0 && (
              <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
                {learningSuggestions.length} personalized
              </span>
            )}
          </div>
          <div className="text-xs text-purple-700">
            Analyzing last {learningConfig.learningChatCount} conversations
          </div>
        </div>
        {messagesSinceLastRefresh > 0 && learningConfig.autoRefresh && (
          <div className="mt-2 text-xs text-purple-600">
            {4 - messagesSinceLastRefresh} more messages until suggestions refresh
          </div>
        )}
      </div>
    );
  };

  // Show loading screen while Auth0 is loading
  if (authLoading) {
    return <LoadingScreen />;
  }

  // Show auth screen if not authenticated
  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  // Show loading screen while initializing services
  if (isInitializing) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-blue-600 mx-auto mb-4"></div>
          <h2 className="text-lg font-semibold text-gray-900 mb-2">Initializing AcceleraQA</h2>
          <p className="text-gray-600">Setting up secure services and authentication...</p>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="flex h-screen bg-gray-50">
        <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 bg-white flex-shrink-0`}>
          <Sidebar
            conversations={conversations}
            currentConversation={currentConversation}
            onConversationSelect={handleConversationSelect}
            onNewConversation={handleNewConversation}
            onDeleteConversation={handleDeleteConversation}
            onRenameConversation={handleRenameConversation}
            learningSuggestions={learningSuggestions}
            onRefreshSuggestions={refreshLearningSuggestions}
            ragEnabled={ragEnabled}
            onToggleRag={setRagEnabled}
          />
        </div>

        <div className="flex-1 flex flex-col">
          <Header
            user={user}
            onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
            onShowAdmin={() => setShowAdminScreen(true)}
            onOpenNotebook={() => setShowResources(!showResources)}
            onLogout={() => window.location.reload()}
          />

          <div className="flex-1 flex">
            <div className={`${showResources ? 'flex-1' : 'w-full'} flex flex-col`}>
              <div className="p-4 border-b bg-white">
                {initializationError && (
                  <ErrorDisplay 
                    error={initializationError} 
                    onRetry={() => initializeServices(user)}
                  />
                )}
                {renderLearningInfo()}
              </div>
              <ChatInterface
                messages={messages}
                onSendMessage={sendMessage}
                isLoading={isLoading}
                showTypingIndicator={showTypingIndicator}
                ragEnabled={ragEnabled}
                setRagEnabled={setRagEnabled}
              />
            </div>

            {showResources && (
              <div className="w-96 border-l border-gray-200 bg-white flex-shrink-0">
                <div className="h-full flex flex-col">
                  <div className="p-4 border-b">
                    <div className="flex items-center justify-between">
                      <h2 className="text-lg font-semibold text-gray-900">Learning Center</h2>
                      <button onClick={() => setShowResources(false)} className="text-gray-400 hover:text-gray-600">
                        ×
                      </button>
                    </div>
                  </div>
                  <div className="flex-1 overflow-hidden">
                    <ResourcesView
                      learningSuggestions={learningSuggestions}
                      onRefreshSuggestions={refreshLearningSuggestions}
                    />
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {showAdminScreen && hasAdminRole(user) && (
          <AdminScreen
            onClose={() => setShowAdminScreen(false)}
            onConfigUpdate={(newConfig) => {
              setLearningConfig((prev) => ({ ...prev, ...newConfig }));
              if (newConfig.learningChatCount !== learningConfig.learningChatCount) {
                refreshLearningSuggestions();
              }
            }}
          />
        )}
      </div>
    </ErrorBoundary>
  );
}

export default App;
