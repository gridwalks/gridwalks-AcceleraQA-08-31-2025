import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// Components
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import Sidebar from './components/Sidebar';
import AuthScreen from './components/AuthScreen';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';

// Services
import openaiService from './services/openaiService';
import { initializeAuth } from './services/authService';

// Utils
import { exportNotebook } from './utils/exportUtils';
import { getMessagesByDays, createMessage, combineMessagesIntoConversations } from './utils/messageUtils';
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
  const [messages, setMessages] = useState([]);
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

  // Memoized values
  const thirtyDayMessages = useMemo(() => 
    getMessagesByDays(messages), 
    [messages]
  );

  // Load messages from storage when component mounts and user is authenticated
  useEffect(() => {
    const loadStoredMessages = async () => {
      if (!user || isInitialized) return;

      try {
        console.log('Loading stored messages for user:', user.email || user.sub);
        
        // Load messages from storage
        const storedMessages = await loadMessagesFromStorage(user.sub || user.email);
        
        if (storedMessages && storedMessages.length > 0) {
          console.log(`Loaded ${storedMessages.length} messages from storage`);
          setMessages(storedMessages);
          
          // Set current resources from the last AI message
          const lastAiMessage = storedMessages
            .filter(msg => msg.type === 'ai' && msg.resources && msg.resources.length > 0)
            .pop();
          
          if (lastAiMessage) {
            setCurrentResources(lastAiMessage.resources);
          } else {
            setCurrentResources(DEFAULT_RESOURCES);
          }
        } else {
          // No stored messages, initialize with welcome message
          initializeWelcomeMessage();
        }
        
        setIsInitialized(true);
      } catch (error) {
        console.error('Error loading stored messages:', error);
        // If loading fails, initialize with welcome message
        initializeWelcomeMessage();
        setIsInitialized(true);
      }
    };

    if (user && !isInitialized) {
      loadStoredMessages();
    }
  }, [user, isInitialized]);

  // Save messages to storage whenever messages change
  useEffect(() => {
    const saveMessages = async () => {
      if (!user || !isInitialized || messages.length === 0) return;

      try {
        await saveMessagesToStorage(user.sub || user.email, messages);
        console.log(`Saved ${messages.length} messages to storage`);
      } catch (error) {
        console.error('Error saving messages to storage:', error);
        // Don't show error to user for storage failures, just log it
      }
    };

    // Debounce saves to avoid excessive writes
    const timeoutId = setTimeout(saveMessages, 500);
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
    const welcomeMessage = createMessage(
      'ai',
      'Welcome to AcceleraQA! I\'m your pharmaceutical quality and compliance AI assistant. I specialize in GMP, validation, CAPA, regulatory requirements, and quality risk management. How can I help you today?',
      DEFAULT_RESOURCES
    );
    
    setMessages([welcomeMessage]);
    setCurrentResources(DEFAULT_RESOURCES);
  }, []);

  // Handle sending messages
  const handleSendMessage = useCallback(async () => {
    if (!inputMessage.trim() || isLoading) return;

    const userMessage = createMessage('user', inputMessage);
    const currentInput = inputMessage.trim();

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
      // Clear from storage if user is authenticated
      if (user) {
        await clearStorageData(user.sub || user.email);
        console.log('Cleared storage data for user');
      }
      
      // Clear local state
      setMessages([]);
      setCurrentResources([]);
      setSelectedMessages(new Set());
      setError(null);
      
      // Initialize with welcome message
      setTimeout(() => {
        initializeWelcomeMessage();
      }, 100);
    } catch (error) {
      console.error('Error clearing chat history:', error);
      // Still clear local state even if storage clear fails
      setMessages([]);
      setCurrentResources([]);
      setSelectedMessages(new Set());
      setError(null);
      initializeWelcomeMessage();
    }
  }, [user, initializeWelcomeMessage]);

  // Generate study notes from selected messages - FIXED VERSION
  const generateStudyNotes = useCallback(async () => {
    if (selectedMessages.size === 0 || isGeneratingNotes) return;

    setIsGeneratingNotes(true);
    setError(null);

    try {
      // Get selected conversation data from thirtyDayMessages based on selected IDs
      const selectedConversationData = thirtyDayMessages.filter(msg => {
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
      const thirtyDayConversations = combineMessagesIntoConversations(thirtyDayMessages);
      const selectedCombinedConversations = thirtyDayConversations.filter(conv => 
        selectedMessages.has(conv.id)
      );

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

      console.log('Selected messages for study notes:', uniqueSelectedMessages);
      
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
  }, [selectedMessages, thirtyDayMessages, isGeneratingNotes]);

  // Handle export
  const handleExport = useCallback(() => {
    try {
      exportNotebook(messages);
    } catch (error) {
      console.error('Export failed:', error);
      setError('Failed to export notebook. Please try again.');
    }
  }, [messages]);

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

        {/* Storage status indicator for development */}
        {process.env.NODE_ENV === 'development' && user && (
          <div className="fixed bottom-4 left-4 bg-black text-white px-3 py-1 rounded text-xs">
            Storage: {messages.length} messages saved
          </div>
        )}
      </div>
    </ErrorBoundary>
  );
};

export default AcceleraQA;
