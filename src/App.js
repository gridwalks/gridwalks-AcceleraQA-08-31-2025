import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// Components
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import Sidebar from './components/Sidebar';
import AuthScreen from './components/AuthScreen';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import StorageNotification, { useStorageNotifications } from './components/StorageNotification';

// Services
import openaiService from './services/openaiService';
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

// Storage utilities
import { 
  saveMessagesToStorage, 
  loadMessagesFromStorage, 
  clearStorageData,
  validateStorageData,
  migrateOldStorageFormat
} from './utils/storageUtils';

const AcceleraQA = () => {
  // State management
  const [messages, setMessages] = useState([]); // Current session messages
  const [storedMessages, setStoredMessages] = useState([]); // Messages from storage
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
  
  const messagesEndRef = useRef(null);

  // Storage notifications hook
  const { StorageWelcomeModal } = useStorageNotifications(user, messages.length);

  // Debug logging for stored messages - always show
  useEffect(() => {
    console.log('=== APP.JS DEBUG INFO ===');
    console.log('Current messages:', messages.length);
    console.log('Stored messages:', storedMessages.length);
    console.log('User:', user?.email || 'No user');
    console.log('Is initialized:', isInitialized);
    console.log('Current messages sample:', messages.slice(0, 2).map(m => ({
      id: m.id,
      type: m.type,
      content: m.content.substring(0, 50) + '...',
      isCurrent: m.isCurrent
    })));
  }, [messages, storedMessages, user, isInitialized]);

  // Memoized values - FIXED: Always ensure current messages are included
  const allMessages = useMemo(() => {
    const merged = mergeCurrentAndStoredMessages(messages, storedMessages);
    
    console.log('=== MERGED MESSAGES DEBUG ===');
    console.log('Current messages:', messages.length);
    console.log('Stored messages:', storedMessages.length);
    console.log('Merged result:', merged.length);
    console.log('Merged sample:', merged.slice(0, 3).map(m => ({
      id: m.id,
      type: m.type,
      content: m.content.substring(0, 50) + '...',
      isCurrent: m.isCurrent,
      isStored: m.isStored
    })));
    
    return merged;
  }, [messages, storedMessages]);

  // CRITICAL FIX: Use allMessages for notebook, not getMessagesByDays
  // The getMessagesByDays filter might be excluding recent messages
  const thirtyDayMessages = useMemo(() => {
    // For now, just use all messages to ensure current session shows up
    // We can add the 30-day filter back later once we confirm it's working
    console.log('=== THIRTY DAY MESSAGES DEBUG ===');
    console.log('Using all messages for notebook:', allMessages.length);
    return allMessages;
  }, [allMessages]);

  // Load stored messages when component mounts and user is authenticated
  useEffect(() => {
    const loadStoredMessagesEffect = async () => {
      if (!user || isInitialized) return;

      try {
        console.log('Loading stored messages for user:', user.email || user.sub);
        
        // Load messages from storage
        const loadedMessages = await loadMessagesFromStorage(user.sub || user.email);
        
        console.log('Raw loaded messages:', loadedMessages?.length || 0);
        
        if (loadedMessages && loadedMessages.length > 0) {
          console.log(`Successfully loaded ${loadedMessages.length} messages from storage`);
          
          // Mark loaded messages as stored and not current
          const markedStoredMessages = loadedMessages.map(msg => ({
            ...msg,
            isStored: true,
            isCurrent: false
          }));
          
          console.log('Marked stored messages:', markedStoredMessages.length);
          setStoredMessages(markedStoredMessages);
          
          // Set current resources from the last AI message
          const lastAiMessage = markedStoredMessages
            .filter(msg => msg.type === 'ai' && msg.resources && msg.resources.length > 0)
            .pop();
          
          if (lastAiMessage) {
            setCurrentResources(lastAiMessage.resources);
          } else {
            setCurrentResources(DEFAULT_RESOURCES);
          }
          
          console.log('Set resources from last AI message');
        } else {
          console.log('No stored messages found, initializing welcome message');
          // No stored messages, initialize with welcome message
          initializeWelcomeMessage();
        }
        
        setIsInitialized(true);
        console.log('Storage loading completed');
      } catch (error) {
        console.error('Error loading stored messages:', error);
        // If loading fails, initialize with welcome message
        initializeWelcomeMessage();
        setIsInitialized(true);
      }
    };

    if (user && !isInitialized) {
      console.log('Starting to load stored messages...');
      loadStoredMessagesEffect();
    }
  }, [user, isInitialized]);

  // Save current messages to storage whenever they change
  useEffect(() => {
    const saveMessages = async () => {
      if (!user || !isInitialized) return;
      
      // Only save if we have current session messages (don't save empty state)
      if (messages.length === 0) return;
      
      console.log('Preparing to save messages to storage...');
      console.log('Current messages to save:', messages.length);

      try {
        // Save only the current session messages
        await saveMessagesToStorage(user.sub || user.email, messages);
        console.log(`Successfully saved ${messages.length} current messages to storage`);
      } catch (error) {
        console.error('Error saving messages to storage:', error);
      }
    };

    // Debounce saves to avoid excessive writes
    const timeoutId = setTimeout(saveMessages, 1000);
    return () => clearTimeout(timeoutId);
  }, [messages, user, isInitialized]);

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
          // Don't auto-initialize welcome message here anymore
          // Let the storage loading effect handle it
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
    console.log('Initializing welcome message...');
    
    const welcomeMessage = createMessage(
      'ai',
      'Welcome to AcceleraQA! I\'m your pharmaceutical quality and compliance AI assistant. I specialize in GMP, validation, CAPA, regulatory requirements, and quality risk management. How can I help you today?',
      DEFAULT_RESOURCES
    );
    
    setMessages([welcomeMessage]);
    setCurrentResources(DEFAULT_RESOURCES);
    console.log('Welcome message initialized');
  }, []);

  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = createMessage('user', inputMessage);
    const currentInput = inputMessage.trim();

    console.log('Sending message:', { userMessage: userMessage.content });
    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);
    setError(null);

    try {
      const response = await openaiService.getChatResponse(currentInput);
      
      const aiMessage = createMessage(
        'ai',
        response.answer,
        response.resources
      );

      console.log('Received AI response:', { aiMessage: aiMessage.content.substring(0, 100) + '...' });
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
  }, [inputMessage, isLoading]);

  // Handle input key press
  const handleKeyPress = useCallback((event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleSendMessage();
    }
  }, [handleSendMessage]);

  // Clear chat history with storage cleanup
  const clearChat = useCallback(async () => {
    try {
      console.log('Clearing chat history...');
      
      // Clear from storage if user is authenticated
      if (user) {
        await clearStorageData(user.sub || user.email);
        console.log('Cleared storage data for user');
      }
      
      // Clear local state
      setMessages([]);
      setStoredMessages([]);
      setCurrentResources([]);
      setSelectedMessages(new Set());
      setError(null);
      
      console.log('Cleared all local state');
      
      // Initialize with welcome message
      setTimeout(() => {
        initializeWelcomeMessage();
      }, 100);
    } catch (error) {
      console.error('Error clearing chat history:', error);
      // Still clear local state even if storage clear fails
      setMessages([]);
      setStoredMessages([]);
      setCurrentResources([]);
      setSelectedMessages(new Set());
      setError(null);
      initializeWelcomeMessage();
    }
  }, [user, initializeWelcomeMessage]);

  // Generate study notes from selected messages
  const generateStudyNotes = useCallback(async () => {
    if (selectedMessages.size === 0 || isGeneratingNotes) return;

    console.log('Generating study notes from selected messages:', selectedMessages.size);
    setIsGeneratingNotes(true);
    setError(null);

    try {
      // Get selected conversation data from allMessages (current + stored) based on selected IDs
      const selectedConversationData = allMessages.filter(msg => {
        // Check if this message's ID is in selectedMessages
        if (selectedMessages.has(msg.id)) {
          return true;
        }
        
        // For combined conversations, check if the combined ID is selected
        const combinedId = `${msg.id}-combined`;
        if (selectedMessages.has(combinedId)) {
          return true;
        }
        
        return false;
      });

      // Also check for combined conversations from the notebook view
      const allConversations = combineMessagesIntoConversations(allMessages);
      const selectedCombinedConversations = allConversations.filter(conv => 
        selectedMessages.has(conv.id)
      );

      console.log('Selected combined conversations:', selectedCombinedConversations.length);

      // Flatten combined conversations back to individual messages
      const messagesFromCombined = selectedCombinedConversations.flatMap(conv => {
        const messages = [];
        if (conv.originalUserMessage) {
          messages.push(conv.originalUserMessage);
        }
        if (conv.originalAiMessage) {
          messages.push(conv.originalAiMessage);
        }
        return messages;
      });

      // Combine all selected message data
      const allSelectedMessages = [
        ...selectedConversationData,
        ...messagesFromCombined
      ];

      // Remove duplicates based on message ID
      const uniqueSelectedMessages = allSelectedMessages.reduce((acc, msg) => {
        if (!acc.find(existing => existing.id === msg.id)) {
          acc.push(msg);
        }
        return acc;
      }, []);

      console.log('Unique selected messages for study notes:', uniqueSelectedMessages.length);
      
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

      console.log('Study notes generated successfully');
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
      console.log('Exporting notebook with', allMessages.length, 'messages');
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

  // Authentication required screen
  if (!user) {
    return <AuthScreen />;
  }

  // CRITICAL DEBUG: Log what we're passing to Sidebar
  console.log('=== PASSING TO SIDEBAR ===');
  console.log('messages (current):', messages.length);
  console.log('thirtyDayMessages (for notebook):', thirtyDayMessages.length);

  // Main authenticated interface
  return (
    <ErrorBoundary>
      <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-gray-100">
        <Header
          user={user}
          showNotebook={showNotebook}
          setShowNotebook={setShowNotebook}
          clearChat={clearChat}
          exportNotebook={handleExport}
        />

        <div className="max-w-7xl mx-auto px-6 py-8 h-[calc(100vh-64px)]">
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-full min-h-0">
            <ChatArea
              messages={messages} // Only show current session in chat
              inputMessage={inputMessage}
              setInputMessage={setInputMessage}
              isLoading={isLoading}
              handleSendMessage={handleSendMessage}
              handleKeyPress={handleKeyPress}
              messagesEndRef={messagesEndRef}
            />
            
            <Sidebar 
              showNotebook={showNotebook}
              messages={messages} // Current session messages
              thirtyDayMessages={thirtyDayMessages} // All messages for notebook
              selectedMessages={selectedMessages}
              setSelectedMessages={setSelectedMessages}
              generateStudyNotes={generateStudyNotes}
              isGeneratingNotes={isGeneratingNotes}
              currentResources={currentResources}
            />
          </div>
        </div>

        {/* Enhanced storage status indicator */}
        <div className="fixed bottom-4 left-4 bg-black text-white px-3 py-1 rounded text-xs font-mono">
          <div>All: {allMessages.length} | Current: {messages.length} | Stored: {storedMessages.length}</div>
          <div>Notebook gets: {thirtyDayMessages.length} messages</div>
          <div>User: {user?.email?.substring(0, 15) || 'Unknown'} | Init: {isInitialized ? 'Yes' : 'No'}</div>
        </div>

        {/* Storage Notifications */}
        <StorageNotification user={user} messagesCount={allMessages.length} />
        <StorageWelcomeModal />
      </div>
    </ErrorBoundary>
  );
};

export default AcceleraQA;
