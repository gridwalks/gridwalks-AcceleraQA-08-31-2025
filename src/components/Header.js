// src/components/Header.js - Updated to include RAG configuration button
import React, { memo, useState, useEffect } from 'react';
import { Download, Clock, MessageSquare, LogOut, User, Database, AlertTriangle, CheckCircle, FileSearch } from 'lucide-react';
import { handleLogout } from '../services/authService';
import { getStorageStats, getStorageHealthReport, performStorageMaintenance, clearStorageData } from '../utils/storageUtils';

const Header = memo(({ 
  user, 
  showNotebook, 
  setShowNotebook, 
  clearChat, 
  exportNotebook,
  clearAllConversations,
  isServerAvailable,
  onShowRAGConfig // New prop for showing RAG configuration
}) => {
  const [storageInfo, setStorageInfo] = useState(null);
  const [showStorageMenu, setShowStorageMenu] = useState(false);
  const [isPerformingMaintenance, setIsPerformingMaintenance] = useState(false);

  // Load storage info on mount and periodically
  useEffect(() => {
    const updateStorageInfo = () => {
      try {
        const stats = getStorageStats();
        const health = getStorageHealthReport();
        setStorageInfo({ stats, health });
      } catch (error) {
        console.error('Error loading storage info:', error);
      }
    };

    updateStorageInfo();
    
    // Update storage info every 30 seconds
    const interval = setInterval(updateStorageInfo, 30000);
    return () => clearInterval(interval);
  }, []);

  const handleToggleView = () => {
    setShowNotebook(!showNotebook);
  };

  const handleExportClick = () => {
    try {
      exportNotebook();
    } catch (error) {
      console.error('Export failed:', error);
      // Could show toast notification here
    }
  };

  const handleLogoutClick = async () => {
    try {
      await handleLogout();
    } catch (error) {
      console.error('Logout failed:', error);
      // Could show toast notification here
    }
  };

  const handleRAGConfigClick = () => {
    if (onShowRAGConfig) {
      onShowRAGConfig();
    }
  };

  const handleClearStorage = async () => {
    if (!user) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to clear all stored conversations? This action cannot be undone.'
    );
    
    if (confirmed) {
      try {
        await clearStorageData(user.sub || user.email);
        await clearChat(); // Also clear the current state
        
        // Update storage info
        const stats = getStorageStats();
        const health = getStorageHealthReport();
        setStorageInfo({ stats, health });
        
        alert('Storage cleared successfully!');
      } catch (error) {
        console.error('Error clearing storage:', error);
        alert('Failed to clear storage. Please try again.');
      }
    }
    
    setShowStorageMenu(false);
  };

  const handleStorageMaintenance = async () => {
    if (!user || isPerformingMaintenance) return;
    
    setIsPerformingMaintenance(true);
    
    try {
      const results = await performStorageMaintenance(user.sub || user.email);
      console.log('Maintenance results:', results);
      
      // Update storage info
      const stats = getStorageStats();
      const health = getStorageHealthReport();
      setStorageInfo({ stats, health });
      
      alert(`Maintenance completed! Cleaned ${results.cleaned} user data entries.`);
    } catch (error) {
      console.error('Error during maintenance:', error);
      alert('Maintenance failed. Please try again.');
    } finally {
      setIsPerformingMaintenance(false);
      setShowStorageMenu(false);
    }
  };

  const getStorageStatusIcon = () => {
    if (!storageInfo) {
      return <Database className="h-4 w-4 text-gray-400" />;
    }

    const { health } = storageInfo;
    
    if (!health.isHealthy) {
      return <AlertTriangle className="h-4 w-4 text-red-400" />;
    }
    
    if (health.issues.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    }
    
    return <CheckCircle className="h-4 w-4 text-green-400" />;
  };

  const getStorageStatusText = () => {
    if (!storageInfo) return 'Loading...';
    
    const { stats, health } = storageInfo;
    const usagePercent = Math.round(stats.usage.percentage);
    
    if (!health.isHealthy) {
      return `Storage Issues (${usagePercent}% used)`;
    }
    
    return `${stats.totalMessages} messages (${usagePercent}% used)`;
  };

  return (
    <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white border-b border-gray-800 shadow">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="flex items-center">
              <img
                src="/AceleraQA_logo.png"
                alt="AcceleraQA logo"
                width="180"
                height="20"
              />
            </div>
          </div>
          
          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="flex items-center space-x-2 text-sm text-gray-300">
              <User className="h-4 w-4" />
              <span className="max-w-40 truncate">
                {user?.email || user?.name || 'User'}
              </span>
            </div>

            {/* RAG Configuration Button */}
            <button
              onClick={handleRAGConfigClick}
              className="flex items-center space-x-2 px-4 py-2 bg-purple-600 rounded hover:bg-purple-700 transition-colors focus:outline-none focus:ring-2 focus:ring-purple-500"
              aria-label="Configure RAG search"
              title="Configure document search and RAG capabilities"
            >
              <FileSearch className="h-4 w-4" />
              <span className="hidden sm:block">RAG Config</span>
            </button>

            {/* Storage Status Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStorageMenu(!showStorageMenu)}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors rounded"
                aria-label="Storage status and management"
                title={`Storage: ${getStorageStatusText()}`}
              >
                {getStorageStatusIcon()}
                <span className="hidden sm:block">{storageInfo?.stats.totalMessages || 0}</span>
              </button>

              {/* Storage Menu Dropdown */}
              {showStorageMenu && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white text-black rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                      <Database className="h-4 w-4" />
                      <span>Storage Management</span>
                    </h3>
                    
                    {storageInfo && (
                      <div className="space-y-3">
                        {/* Storage Stats */}
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Messages:</span>
                              <span className="ml-2 font-medium">{storageInfo.stats.totalMessages}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Storage Used:</span>
                              <span className="ml-2 font-medium">{Math.round(storageInfo.stats.usage.percentage)}%</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Users:</span>
                              <span className="ml-2 font-medium">{storageInfo.stats.totalUsers}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Health:</span>
                              <span className={`ml-2 font-medium ${
                                storageInfo.health.isHealthy ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {storageInfo.health.isHealthy ? 'Good' : 'Issues'}
                              </span>
                            </div>
                          </div>

                          {/* Storage Usage Bar */}
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Storage Usage</span>
                              <span>{Math.round(storageInfo.stats.usage.percentage)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  storageInfo.stats.usage.percentage > 90 
                                    ? 'bg-red-500' 
                                    : storageInfo.stats.usage.percentage > 70 
                                    ? 'bg-yellow-500' 
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(storageInfo.stats.usage.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Health Issues */}
                        {storageInfo.health.issues.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                            <h4 className="font-medium text-yellow-800 text-sm mb-2 flex items-center">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Storage Issues
                            </h4>
                            <ul className="text-xs text-yellow-700 space-y-1">
                              {storageInfo.health.issues.map((issue, index) => (
                                <li key={index}>• {issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommendations */}
                        {storageInfo.health.recommendations.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                            <h4 className="font-medium text-blue-800 text-sm mb-2">Recommendations</h4>
                            <ul className="text-xs text-blue-700 space-y-1">
                              {storageInfo.health.recommendations.slice(0, 2).map((rec, index) => (
                                <li key={index}>• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2 pt-2 border-t border-gray-200">
                          <button
                            onClick={handleStorageMaintenance}
                            disabled={isPerformingMaintenance}
                            className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isPerformingMaintenance ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                                <span>Optimizing...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                <span>Optimize Storage</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={handleClearStorage}
                            className="flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span>Clear All Data</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {!storageInfo && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto mb-2" />
                        <span className="text-sm text-gray-600">Loading storage info...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
            
            {/* Clear Chat */}
            <button
              onClick={clearChat}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm font-medium"
              aria-label="Clear chat history"
            >
              Clear
            </button>
            
            {/* Toggle Notebook/Chat View */}
            <button
              onClick={handleToggleView}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
              aria-label={showNotebook ? 'Switch to chat view' : 'Switch to notebook view'}
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
            
            {/* Export */}
            <button
              onClick={handleExportClick}
              className="flex items-center space-x-2 px-4 py-2 bg-white text-black rounded hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
              aria-label="Export conversation history"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>
            
            {/* Logout */}
            <button
              onClick={handleLogoutClick}
              className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600 rounded"
              aria-label="Sign out of AcceleraQA"
            >
              <LogOut className="h-4 w-4" />
              <span>Sign Out</span>
            </button>
          </div>
        </div>
      </div>

      {/* Click outside to close storage menu */}
      {showStorageMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowStorageMenu(false)}
        />
      )}
    </header>
  );
});

Header.displayName = 'Header';

export default Header;

// ===========================================
// src/App.js - Updated to integrate RAG functionality
// ===========================================

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// Components
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import Sidebar from './components/Sidebar';
import AuthScreen from './components/AuthScreen';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import RAGConfigurationPage from './components/RAGConfigurationPage'; // New import

// Services
import openaiService from './services/openaiService';
import conversationService from './services/conversationService';
import ragService from './services/ragService'; // New import
import { initializeAuth } from './services/authService';

// Utils
import { exportNotebook } from './utils/exportUtils';
import { 
  getMessagesByDays, 
  createMessage, 
  combineMessagesIntoConversations,
  mergeCurrentAndStoredMessages 
} from './utils/messageUtils';
import { validateEnvironment, DEFAULT_RESOURCES } from './config/constants';

const AcceleraQA = () => {
  // State management
  const [messages, setMessages] = useState([]); // Current session messages
  const [storedMessages, setStoredMessages] = useState([]); // Messages from server
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResources, setCurrentResources] = useState([]);
  const [showNotebook, setShowNotebook] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const [error, setError] = useState(null);
  const [isInitialized, setIsInitialized] = useState(false);
  const [isServerAvailable, setIsServerAvailable] = useState(true);
  const [showRAGConfig, setShowRAGConfig] = useState(false); // New state for RAG config modal
  const [ragEnabled, setRAGEnabled] = useState(false); // New state for RAG toggle
  
  const messagesEndRef = useRef(null);

  // Memoized values - combine current and stored messages for notebook display
  const allMessages = useMemo(() => 
    mergeCurrentAndStoredMessages(messages, storedMessages), 
    [messages, storedMessages]
  );

  const thirtyDayMessages = useMemo(() => 
    getMessagesByDays(allMessages), 
    [allMessages]
  );

  // Load stored conversations when component mounts and user is authenticated
  useEffect(() => {
    const loadStoredConversations = async () => {
      if (!user || isInitialized) return;

      try {
        console.log('=== LOADING CONVERSATIONS FROM SERVER ===');
        console.log('User:', user.email || user.sub);
        
        // Check if server is available
        const serviceAvailable = await conversationService.isServiceAvailable();
        setIsServerAvailable(serviceAvailable);
        
        if (!serviceAvailable) {
          console.warn('Server-side conversation service not available, using session-only mode');
          initializeWelcomeMessage();
          setIsInitialized(true);
          return;
        }
        
        // Load conversations from server
        const loadedMessages = await conversationService.loadConversations();
        
        if (loadedMessages && loadedMessages.length > 0) {
          console.log(`Successfully loaded ${loadedMessages.length} messages from server`);
          setStoredMessages(loadedMessages);
          
          // Set current resources from the last AI message
          const lastAiMessage = loadedMessages
            .filter(msg => msg.type === 'ai' && msg.resources && msg.resources.length > 0)
            .pop();
          
          if (lastAiMessage) {
            setCurrentResources(lastAiMessage.resources);
          } else {
            setCurrentResources(DEFAULT_RESOURCES);
          }
        } else {
          console.log('No stored conversations found, initializing welcome message');
          initializeWelcomeMessage();
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading stored conversations:', error);
        setIsServerAvailable(false);
        // If loading fails, initialize with welcome message
        initializeWelcomeMessage();
        setIsInitialized(true);
      }
    };

    if (user && !isInitialized) {
      loadStoredConversations();
    }
  }, [user, isInitialized]);

  // Auto-save conversation to server when session ends or after multiple messages
  useEffect(() => {
    const saveConversationToServer = async () => {
      if (!user || !isInitialized || !isServerAvailable || messages.length === 0) return;
      
      // Only save if we have at least 2 messages (user + ai response)
      if (messages.length < 2) return;
      
      // Don't save if only welcome message
      const nonWelcomeMessages = messages.filter(msg => 
        !(msg.type === 'ai' && msg.content.includes('Welcome to AcceleraQA'))
      );
      
      if (nonWelcomeMessages.length === 0) return;

      try {
        console.log('Auto-saving conversation to server...', { messageCount: messages.length });
        
        const metadata = {
          sessionId: Date.now().toString(),
          userAgent: navigator.userAgent,
          timestamp: new Date().toISOString(),
          ragEnabled: ragEnabled
        };
        
        await conversationService.saveConversation(messages, metadata);
        console.log('Conversation auto-saved successfully');
      } catch (error) {
        console.error('Failed to auto-save conversation:', error);
        // Don't show error to user for background saves
      }
    };

    // Debounce saves to avoid excessive server calls
    const timeoutId = setTimeout(saveConversationToServer, 5000); // Save after 5 seconds of inactivity
    return () => clearTimeout(timeoutId);
  }, [messages, user, isInitialized, isServerAvailable, ragEnabled]);

  // Initialize environment and authentication
  useEffect(() => {
    const initialize = async () => {
      try {
        // Validate environment variables
        if (!validateEnvironment()) {
          setError('Application configuration is incomplete. Please check environment variables.');
          setIsLoadingAuth(false);
          return;
        }

        // Initialize authentication
        await initializeAuth(setUser, setIsLoadingAuth, () => {
          // Don't auto-initialize welcome message here
          // Let the conversation loading effect handle it
        });
      } catch (error) {
        console.error('Initialization failed:', error);
        setError('Failed to initialize application. Please refresh the page.');
        setIsLoadingAuth(false);
      }
    };

    initialize();
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  // Initialize welcome message for authenticated users
  const initializeWelcomeMessage = useCallback(() => {
    const welcomeMessage = createMessage(
      'ai',
      'Welcome to AcceleraQA! I\'m your pharmaceutical quality and compliance AI assistant. I specialize in GMP, validation, CAPA, regulatory requirements, and quality risk management. \n\n💡 **New Feature**: RAG Search is now available! Upload your documents using the "RAG Config" button to search and get answers directly from your own documents.\n\nHow can I help you today?',
      DEFAULT_RESOURCES
    );
    
    setMessages([welcomeMessage]);
    setCurrentResources(DEFAULT_RESOURCES);
  }, []);

  // Enhanced message handling with RAG capability
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
      
      // Check if RAG should be used for this query
      if (ragEnabled) {
        try {
          // Search for relevant documents
          const searchResults = await ragService.searchDocuments(currentInput, {
            limit: 5,
            threshold: 0.7
          });

          if (searchResults.results && searchResults.results.length > 0) {
            // Use RAG response with document context
            response = await ragService.generateRAGResponse(currentInput, searchResults.results);
          } else {
            // No relevant documents found, use standard response
            response = await openaiService.getChatResponse(currentInput);
          }
        } catch (ragError) {
          console.warn('RAG search failed, falling back to standard response:', ragError);
          response = await openaiService.getChatResponse(currentInput);
        }
      } else {
        // Standard OpenAI response
        response = await openaiService.getChatResponse(currentInput);
      }
      
      const aiMessage = createMessage(
        'ai',
        response.answer,
        response.resources
      );

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

  // Clear chat history with server cleanup
  const clearChat = useCallback(async () => {
    try {
      console.log('Clearing chat history...');
      
      // Save current conversation before clearing (if it has content)
      if (messages.length > 1 && isServerAvailable) {
        try {
          await conversationService.saveConversation(messages, {
            clearedAt: new Date().toISOString(),
            reason: 'user_initiated_clear'
          });
        } catch (saveError) {
          console.warn('Failed to save conversation before clearing:', saveError);
        }
      }
      
      // Clear local state
      setMessages([]);
      setStoredMessages([]);
      setCurrentResources([]);
      setSelectedMessages(new Set());
      setError(null);
      
      // Initialize with welcome message
      setTimeout(() => {
        initializeWelcomeMessage();
      }, 100);
    } catch (error) {
      console.error('Error clearing chat history:', error);
      // Still clear local state even if server operations fail
      setMessages([]);
      setStoredMessages([]);
      setCurrentResources([]);
      setSelectedMessages(new Set());
      setError(null);
      initializeWelcomeMessage();
    }
  }, [messages, isServerAvailable, initializeWelcomeMessage]);

  // Clear all conversations from server
  const clearAllConversations = useCallback(async () => {
    if (!isServerAvailable) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete all your conversation history from the server? This action cannot be undone.'
    );
    
    if (confirmed) {
      try {
        await conversationService.clearConversations();
        
        // Also clear local state
        setMessages([]);
        setStoredMessages([]);
        setCurrentResources([]);
        setSelectedMessages(new Set());
        
        // Initialize with welcome message
        initializeWelcomeMessage();
        
        alert('All conversations cleared successfully!');
      } catch (error) {
        console.error('Error clearing all conversations:', error);
        alert('Failed to clear conversations. Please try again.');
      }
    }
  }, [isServerAvailable, initializeWelcomeMessage]);

  // Generate study notes from selected messages
  const generateStudyNotes = useCallback(async () => {
    if (selectedMessages.size === 0 || isGeneratingNotes) return;

    setIsGeneratingNotes(true);
    setError(null);

    try {
      // Get selected conversation data from allMessages
      const selectedConversationData = allMessages.filter(msg => {
        if (selectedMessages.has(msg.id)) return true;
        const combinedId = `${msg.id}-combined`;
        if (selectedMessages.has(combinedId)) return true;
        return false;
      });

      // Also check for combined conversations from the notebook view
      const allConversations = combineMessagesIntoConversations(allMessages);
      const selectedCombinedConversations = allConversations.filter(conv => 
        selectedMessages.has(conv.id)
      );

      // Flatten combined conversations back to individual messages
      const messagesFromCombined = selectedCombinedConversations.flatMap(conv => {
        const messages = [];
        if (conv.originalUserMessage) messages.push(conv.originalUserMessage);
        if (conv.originalAiMessage) messages.push(conv.originalAiMessage);
        return messages;
      });

      // Combine all selected message data
      const allSelectedMessages = [...selectedConversationData, ...messagesFromCombined];

      // Remove duplicates based on message ID
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

      // Add study notes data for export
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

  // Handle showing RAG configuration
  const handleShowRAGConfig = useCallback(() => {
    setShowRAGConfig(true);
  }, []);

  // Handle closing RAG configuration
  const handleCloseRAGConfig = useCallback(() => {
    setShowRAGConfig(false);
  }, []);

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

  // Authentication required screen
  if (!user) {
    return <AuthScreen />;
  }

  // Main authenticated interface
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gray-50">
        <Header 
          user={user}
          showNotebook={showNotebook}
          setShowNotebook={setShowNotebook}
          clearChat={clearChat}
          exportNotebook={handleExport}
          clearAllConversations={clearAllConversations}
          isServerAvailable={isServerAvailable}
          onShowRAGConfig={handleShowRAGConfig} // Pass the handler
        />

        <div className="max-w-7xl mx-auto px-6 py-8 h-[calc(100vh-64px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-0">
            <ChatArea
              messages={messages}
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              isLoading={isLoading}
              handleSendMessage={handleSendMessage}
              handleKeyPress={handleKeyPress}
              messagesEndRef={messagesEndRef}
              ragEnabled={ragEnabled} // Pass RAG state
              setRAGEnabled={setRAGEnabled} // Pass RAG setter
            />
            
            <Sidebar 
              showNotebook={showNotebook}
              messages={messages}
              thirtyDayMessages={thirtyDayMessages}
              selectedMessages={selectedMessages}
              setSelectedMessages={setSelectedMessages}
              generateStudyNotes={generateStudyNotes}
              isGeneratingNotes={isGeneratingNotes}
              currentResources={currentResources}
            />
          </div>
        </div>

        {/* RAG Configuration Modal */}
        {showRAGConfig && (
          <RAGConfigurationPage
            user={user}
            onClose={handleCloseRAGConfig}
          />
        )}
      </div>
    </ErrorBoundary>
  );
};

export default AcceleraQA;

// ===========================================
// src/components/ChatArea.js - Updated to show RAG status
// ===========================================

import React, { memo } from 'react';
import { Send, MessageSquare, FileText, Database, Search } from 'lucide-react';
import { exportToWord } from '../utils/exportUtils';
import { sanitizeMessageContent } from '../utils/messageUtils';

const ChatArea = memo(({ 
  messages, 
  inputMessage, 
  setInputMessage, 
  isLoading, 
  handleSendMessage, 
  handleKeyPress, 
  messagesEndRef,
  ragEnabled,
  setRAGEnabled
}) => {
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleExportStudyNotes = (message) => {
    try {
      exportToWord(message);
    } catch (error) {
      console.error('Failed to export study notes:', error);
      // Could show toast notification here
    }
  };

  const toggleRAG = () => {
    setRAGEnabled(!ragEnabled);
  };

  return (
    <div className="lg:col-span-2 rounded-lg border border-gray-200 p-6 h-full shadow-sm bg-gray-900/60 backdrop-blur-sm flex flex-col text-gray-100">
      {/* RAG Status Indicator */}
      <div className="mb-4 flex items-center justify-between">
        <div className="flex items-center space-x-3">
          <button
            onClick={toggleRAG}
            className={`flex items-center space-x-2 px-3 py-2 rounded-full text-sm font-medium transition-colors ${
              ragEnabled 
                ? 'bg-green-100 text-green-800 hover:bg-green-200'
                : 'bg-gray-100 text-gray-600 hover:bg-gray-200'
            }`}
            title={ragEnabled ? 'RAG search enabled - responses will include your uploaded documents' : 'RAG search disabled - using general knowledge only'}
          >
            {ragEnabled ? <Database className="h-4 w-4" /> : <Search className="h-4 w-4" />}
            <span>{ragEnabled ? 'RAG Enabled' : 'RAG Disabled'}</span>
          </button>
          
          {ragEnabled && (
            <div className="text-xs text-green-600 bg-green-50 px-2 py-1 rounded-full">
              📄 Searching your documents
            </div>
          )}
        </div>
        
        <div className="text-xs text-gray-400">
          {messages.length} messages
        </div>
      </div>

      {/* Chat Messages - Scrollable window that grows with available space */}
      <div className="flex-1 h-full overflow-y-auto p-8 space-y-6 min-h-0 bg-white text-gray-900" style={{ scrollBehavior: 'smooth' }}>
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-light rounded-lg mx-auto mb-6 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Welcome to AcceleraQA</h3>
            <p className="text-gray-400 mb-8 text-lg">
              Ask questions about pharmaceutical quality and compliance topics
            </p>
            <div className="flex flex-wrap justify-center gap-3 mb-6">
              <span className="px-4 py-2 bg-primary/20 text-primary-light rounded-full font-medium">GMP</span>
              <span className="px-4 py-2 bg-primary/20 text-primary-light rounded-full font-medium">Validation</span>
              <span className="px-4 py-2 bg-primary/20 text-primary-light rounded-full font-medium">CAPA</span>
              <span className="px-4 py-2 bg-primary/20 text-primary-light rounded-full font-medium">Regulatory</span>
              <span className="px-4 py-2 bg-primary/20 text-primary-light rounded-full font-medium">Risk Management</span>
            </div>
            
            {/* RAG Info */}
            <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 max-w-md mx-auto">
              <div className="flex items-center justify-center space-x-2 mb-2">
                <Database className="h-5 w-5 text-blue-600" />
                <span className="font-medium text-blue-900">New: Document Search (RAG)</span>
              </div>
              <p className="text-sm text-blue-700">
                Upload your pharmaceutical documents and get answers directly from your own content. 
                Click "RAG Config" to get started!
              </p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl px-6 py-4 rounded-lg ${
                message.type === 'user'
                  ? 'bg-primary text-white'
                  : message.isStudyNotes
                    ? 'bg-gradient-to-r from-primary-dark to-primary border border-primary text-white'
                    : message.sources && message.sources.length > 0
                      ? 'bg-green-50 border border-green-200 text-gray-900'
                      : 'bg-gray-800 border border-gray-700 text-gray-100'
              }`}>
                <div 
                  className="whitespace-pre-wrap text-base leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeMessageContent(message.content)
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  }}
                />
                
                {message.type === 'ai' && (
                  <div className={`flex items-center justify-between mt-3 pt-3 border-t ${
                    message.isStudyNotes
                      ? 'border-primary text-gray-300'
                      : message.sources && message.sources.length > 0
                        ? 'border-green-300 text-green-700'
                        : 'border-gray-700 text-gray-400'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <time className="text-xs" dateTime={message.timestamp}>
                        {new Date(message.timestamp).toLocaleString()}
                      </time>
                      {message.isStudyNotes && (
                        <span className="text-xs text-primary-light font-medium">
                          📚 Study Notes
                        </span>
                      )}
                      {message.sources && message.sources.length > 0 && (
                        <span className="text-xs text-green-600 font-medium bg-green-100 px-2 py-1 rounded-full">
                          📄 RAG Response ({message.sources.length} sources)
                        </span>
                      )}
                    </div>

                    {message.isStudyNotes && (
                      <button
                        onClick={() => handleExportStudyNotes(message)}
                        className="ml-3 px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary-dark transition-colors flex items-center space-x-1 focus:outline-none focus:ring-2 focus:ring-primary-light"
                        aria-label="Export study notes to Word document"
                      >
                        <FileText className="h-3 w-3" />
                        <span>Export to Word</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-800 border border-gray-700 px-6 py-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-light" />
                <span className="text-gray-300">
                  {ragEnabled ? 'Searching documents and analyzing...' : 'Analyzing your question...'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Input Area - Always visible at bottom */}
      <div className="border-t border-gray-700 bg-gray-900 p-8 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder={ragEnabled ? "Ask about your documents or general pharma topics..." : "Ask about GMP, validation, CAPA, regulations..."}
              className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base text-gray-100 placeholder-gray-500 resize-none min-h-[60px] max-h-32"
              disabled={isLoading}
              rows={1}
              aria-label="Enter your pharmaceutical quality question"
            />
            
            {/* Character count for very long messages */}
            {inputMessage.length > 500 && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {inputMessage.length}/2000
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="px-8 py-4 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>

        {/* Quick action suggestions when no messages */}
        {messages.length === 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setInputMessage("What are the key requirements for GMP compliance?")}
              className="text-sm px-3 py-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-full hover:bg-gray-700 transition-colors"
              disabled={isLoading}
            >
              GMP compliance requirements
            </button>
            <button
              onClick={() => setInputMessage("How do I develop a validation master plan?")}
              className="text-sm px-3 py-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-full hover:bg-gray-700 transition-colors"
              disabled={isLoading}
            >
              Validation master plan
            </button>
            <button
              onClick={() => setInputMessage("What is the CAPA process?")}
              className="text-sm px-3 py-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-full hover:bg-gray-700 transition-colors"
              disabled={isLoading}
            >
              CAPA process
            </button>
            {ragEnabled && (
              <button
                onClick={() => setInputMessage("Search my uploaded documents for validation procedures")}
                className="text-sm px-3 py-1 bg-green-700 border border-green-600 text-green-100 rounded-full hover:bg-green-600 transition-colors"
                disabled={isLoading}
              >
                📄 Search my documents
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

ChatArea.displayName = 'ChatArea';

export default ChatArea;
