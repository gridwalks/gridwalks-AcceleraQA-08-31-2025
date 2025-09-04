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
          .filter(msg => msg.content && msg.type ===
