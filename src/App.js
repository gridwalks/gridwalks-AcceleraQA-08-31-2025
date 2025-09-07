// src/App.js - Updated to integrate learning suggestions
import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// Components
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import Sidebar from './components/Sidebar';
import AuthScreen from './components/AuthScreen';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import RAGConfigurationPage from './components/RAGConfigurationPage';
import AdminScreen from './components/AdminScreen';
import NotebookOverlay from './components/NotebookOverlay';

// Utility
import { v4 as uuidv4 } from 'uuid';
import authService, { initializeAuth } from './services/authService';
import ragService from './services/ragService';
import openaiService from './services/openaiService';

import { initializeNeonService, loadConversations as loadNeonConversations, saveConversation as saveNeonConversation } from './services/neonService';
//import { initializeNeonService, loadConversations as loadNeonConversations, saveConversation as saveNeonConversation } from './services/neonService';
//import { initializeNeonService, loadConversations as loadNeonConversations } from './services/neonService';

import learningSuggestionsService from './services/learningSuggestionsService';

function App() {
  // Authentication state
  const [isAuthenticated, setIsAuthenticated] = useState(false);
  const [loading, setLoading] = useState(true);
  const [user, setUser] = useState(null);

  // UI state
  const [showRAGConfig, setShowRAGConfig] = useState(false);
  const [showAdmin, setShowAdmin] = useState(false);
  const [showNotebook, setShowNotebook] = useState(false);
  const [isServerAvailable] = useState(true);

  // Conversation state
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [ragEnabled, setRAGEnabled] = useState(false);

  // Learning suggestions state
  const [learningSuggestions, setLearningSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);

  // Save status
  const [isSaving, setIsSaving] = useState(false);
  const [lastSaveTime, setLastSaveTime] = useState(null);

  // Sidebar state
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [thirtyDayMessages, setThirtyDayMessages] = useState([]);
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);

  const messagesEndRef = useRef(null);
  const isAdmin = useMemo(() => user?.roles?.includes('admin'), [user]);

  // Initialize authentication on mount
  useEffect(() => {
    const initAuth = async () => {
      setLoading(true);
      await initializeAuth(
        (authUser) => setUser(authUser),
        () => {}
      );
      const authStatus = await authService.isAuthenticated();
      setIsAuthenticated(authStatus);
      if (!authStatus) {
        setUser(null);
      }
      setLoading(false);
    };

    initAuth();
  }, []);

  // Initialize backend services when user is available
  useEffect(() => {
    if (user) {
      initializeNeonService(user);
      loadInitialLearningSuggestions();
    }
  }, [user]);

  // Load conversations from Neon when user is available or refresh requested
  useEffect(() => {
    const fetchConversations = async () => {
      if (!user) return;
      try {
        const loaded = await loadNeonConversations();
        setThirtyDayMessages(loaded);
      } catch (error) {
        console.error('Error loading conversations from Neon:', error);
      }
    };

    fetchConversations();
  }, [user, lastSaveTime, setThirtyDayMessages, loadNeonConversations]);

  // Load learning suggestions when user logs in
  const loadInitialLearningSuggestions = useCallback(async () => {
    if (!user?.sub) return;

    setIsLoadingSuggestions(true);
    try {
      console.log('Loading initial learning suggestions for user:', user.sub);
      const suggestions = await learningSuggestionsService.getLearningSuggestions(user.sub);
      setLearningSuggestions(suggestions);
      console.log('Loaded learning suggestions:', suggestions.length);
    } catch (error) {
      console.error('Error loading initial learning suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  }, [user]);

  // Refresh learning suggestions after new conversations
  const refreshLearningSuggestions = useCallback(async () => {
    if (!user?.sub) return;

    try {
      console.log('Refreshing learning suggestions...');
      const suggestions = await learningSuggestionsService.refreshSuggestions(user.sub);
      setLearningSuggestions(suggestions);
    } catch (error) {
      console.error('Error refreshing learning suggestions:', error);
    }
  }, [user]);

  // Auto-scroll messages
  useEffect(() => {
    if (messagesEndRef.current) {
      messagesEndRef.current.scrollIntoView({ behavior: 'smooth' });
    }
  }, [messages]);

  // Save conversation to Neon after assistant responses
  useEffect(() => {
    if (!user || messages.length < 2) return;

    const last = messages[messages.length - 1];
    if (last.role !== 'assistant') return;

    const messagesWithType = messages.map(msg => ({
      ...msg,
      type: msg.type || msg.role,
    }));

    const save = async () => {
      setIsSaving(true);
      try {
        await saveNeonConversation(messagesWithType);
        setLastSaveTime(new Date().toISOString());
      } catch (error) {
        console.error('Error saving conversation to Neon:', error);
      } finally {
        setIsSaving(false);
      }
    };

    save();
  }, [messages, user]);

  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim()) return;

    setIsLoading(true);

    const userMessage = {
      id: uuidv4(),
      role: 'user',
      type: 'user',
      content: inputMessage,
      timestamp: Date.now(),
    };

    // Add user's message immediately
    setMessages((prev) => [...prev, userMessage]);
    setInputMessage('');

    try {
      const response = ragEnabled
        ? await ragService.search(inputMessage)
        : await openaiService.getChatResponse(inputMessage);

      const assistantMessage = {
        id: uuidv4(),
        role: 'assistant',
        type: 'ai',
        content: response.answer,
        timestamp: Date.now(),
        sources: response.sources || [],
      };

      setMessages((prev) => [...prev, assistantMessage]);

      // Refresh learning suggestions after every few messages
      const totalMessages = messages.length + 2; // +2 for the new messages we just added
      if (totalMessages % 4 === 0) { // Every 4 messages (2 conversation pairs)
        setTimeout(() => {
          refreshLearningSuggestions();
        }, 1000); // Small delay to let the conversation save first
      }

    } catch (error) {
      const errorMessage = {
        id: uuidv4(),
        role: 'assistant',
        type: 'ai',
        content: error.message || 'An error occurred while fetching the response.',
        timestamp: Date.now(),
        sources: [],
      };
      setMessages((prev) => [...prev, errorMessage]);
    } finally {
      setIsLoading(false);
    }
  }, [inputMessage, ragEnabled, messages.length, refreshLearningSuggestions]);

  const handleKeyPress = useCallback(
    (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        handleSendMessage();
      }
    },
    [handleSendMessage]
  );

  const handleRefreshConversations = useCallback(async () => {
    console.log('Refreshing conversations');
    try {
      const loaded = await loadNeonConversations(false);
      setThirtyDayMessages(loaded);
    } catch (error) {
      console.error('Error refreshing conversations from Neon:', error);
    }
    setLastSaveTime(new Date().toISOString());
    // Also refresh learning suggestions when conversations are refreshed
    refreshLearningSuggestions();
  }, [refreshLearningSuggestions, setThirtyDayMessages, loadNeonConversations]);

  const clearChat = useCallback(() => {
    setMessages([]);
    // Refresh suggestions when chat is cleared (might reveal different patterns)
    setTimeout(() => {
      refreshLearningSuggestions();
    }, 500);
  }, [refreshLearningSuggestions]);

  const clearAllConversations = useCallback(() => {
    setMessages([]);
    setSelectedMessages(new Set());
    setThirtyDayMessages([]);
    // Clear learning suggestions cache when all conversations are cleared
    if (user?.sub) {
      learningSuggestionsService.clearCache(user.sub);
      setLearningSuggestions([]);
    }
  }, [user]);

  const handleExport = useCallback(() => {
    console.log('Exporting conversation', messages);
  }, [messages]);

  const handleExportSelected = useCallback(() => {
    console.log('Exporting selected messages', Array.from(selectedMessages));
  }, [selectedMessages]);

  const clearSelectedMessages = useCallback(() => setSelectedMessages(new Set()), []);

  const generateStudyNotes = useCallback(() => {
    if (selectedMessages.size === 0) return;
    setIsGeneratingNotes(true);
    try {
      console.log('Generating study notes', Array.from(selectedMessages));
    } finally {
      setIsGeneratingNotes(false);
    }
  }, [selectedMessages]);

  // Handle learning suggestions updates
  const handleSuggestionsUpdate = useCallback((suggestions) => {
    console.log('Learning suggestions updated:', suggestions.length);
    // Could trigger additional UI updates or analytics here
  }, []);

  const handleShowRAGConfig = useCallback(() => setShowRAGConfig(true), []);
  const handleCloseRAGConfig = useCallback(() => setShowRAGConfig(false), []);
  const handleShowAdmin = useCallback(() => setShowAdmin(true), []);
  const handleCloseAdmin = useCallback(() => setShowAdmin(false), []);

  const handleLogoutComplete = useCallback(() => {
    setIsAuthenticated(false);
    setUser(null);
    setLearningSuggestions([]); // Clear suggestions on logout
  }, []);

  return (
    <ErrorBoundary>
      {!isAuthenticated ? (
        <AuthScreen />
      ) : loading ? (
        <LoadingScreen />
      ) : showRAGConfig ? (
        <RAGConfigurationPage onClose={handleCloseRAGConfig} user={user} />
      ) : showAdmin ? (
        <AdminScreen onBack={handleCloseAdmin} user={user} />
      ) : (
        <>
          <div className="min-h-screen bg-gray-50">
            {/* Header remains the same */}
            <Header
              user={user}
              isSaving={isSaving}
              lastSaveTime={lastSaveTime}
              onShowAdmin={handleShowAdmin}
              onOpenNotebook={() => setShowNotebook(true)}
              onLogout={handleLogoutComplete}
            />

            {/* Main Layout */}
            <div className="h-[calc(100vh-64px)]">
              {/* Mobile Layout (stacked vertically) */}
              <div className="lg:hidden h-full flex flex-col">
                {/* Chat takes most space on mobile */}
                <div className="flex-1 min-h-0 p-4">
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
                    isSaving={isSaving}
                  />
                </div>

                {/* Sidebar is collapsible on mobile */}
                <div className="flex-shrink-0 border-t bg-white max-h-60 overflow-hidden">
                  <Sidebar
                    showNotebook={showNotebook}
                    messages={messages}
                    thirtyDayMessages={thirtyDayMessages}
                    selectedMessages={selectedMessages}
                    setSelectedMessages={setSelectedMessages}
                    exportSelected={handleExportSelected}
                    clearSelected={clearSelectedMessages}
                    clearAllConversations={clearAllConversations}
                    isServerAvailable={isServerAvailable}
                    onRefresh={handleRefreshConversations}
                    // Enhanced props for learning suggestions
                    user={user}
                    learningSuggestions={learningSuggestions}
                    isLoadingSuggestions={isLoadingSuggestions}
                    onSuggestionsUpdate={handleSuggestionsUpdate}
                  />
                </div>
              </div>

              {/* Desktop Layout (side by side) */}
              <div className="hidden lg:flex h-full">
                {/* Chat Area - Takes majority of space */}
                <div className="flex-1 min-w-0 p-6">
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
                    isSaving={isSaving}
                  />
                </div>

                {/* Sidebar - Fixed optimal width with enhanced learning features */}
                <div className="w-80 xl:w-96 flex-shrink-0 border-l bg-white p-6">
                  <Sidebar
                    showNotebook={showNotebook}
                    messages={messages}
                    thirtyDayMessages={thirtyDayMessages}
                    selectedMessages={selectedMessages}
                    setSelectedMessages={setSelectedMessages}
                    exportSelected={handleExportSelected}
                    clearSelected={clearSelectedMessages}
                    clearAllConversations={clearAllConversations}
                    isServerAvailable={isServerAvailable}
                    onRefresh={handleRefreshConversations}
                    // Enhanced props for learning suggestions
                    user={user}
                    learningSuggestions={learningSuggestions}
                    isLoadingSuggestions={isLoadingSuggestions}
                    onSuggestionsUpdate={handleSuggestionsUpdate}
                  />
                </div>
              </div>
            </div>
          </div>

          {/* Notebook Overlay */}
          {showNotebook && (
            <NotebookOverlay
              messages={messages}
              thirtyDayMessages={thirtyDayMessages}
              selectedMessages={selectedMessages}
              setSelectedMessages={setSelectedMessages}
              generateStudyNotes={generateStudyNotes}
              isGeneratingNotes={isGeneratingNotes}
              storedMessageCount={messages.length}
              isServerAvailable={isServerAvailable}
              exportNotebook={handleExport}
              onClose={() => setShowNotebook(false)}
            />
          )}
        </>
      )}
    </ErrorBoundary>
  );
}

export default App;
