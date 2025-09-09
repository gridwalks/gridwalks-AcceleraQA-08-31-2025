// src/App.js - ADD THESE UPDATES TO YOUR EXISTING APP.JS

import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
// ... other imports
import learningSuggestionsService from './services/learningSuggestionsService';

function App() {
  // ... existing state
  const [learningSuggestions, setLearningSuggestions] = useState([]);
  const [messagesSinceLastRefresh, setMessagesSinceLastRefresh] = useState(0);
  const [learningConfig, setLearningConfig] = useState({
    learningChatCount: 5,
    enableAISuggestions: true,
    autoRefresh: true
  });

  // ... existing useEffect and functions

  /**
   * Load learning suggestions on user login
   */
  const loadLearningSuggestions = async (userId) => {
    if (!learningConfig.enableAISuggestions) return;

    try {
      console.log('🎓 Loading learning suggestions for user:', userId);
      const suggestions = await learningSuggestionsService.getLearningSuggestions(
        userId, 
        learningConfig.learningChatCount
      );
      setLearningSuggestions(suggestions);
      console.log(`✅ Loaded ${suggestions.length} learning suggestions`);
    } catch (error) {
      console.error('Error loading learning suggestions:', error);
      setLearningSuggestions([]);
    }
  };

  /**
   * Refresh learning suggestions manually
   */
  const refreshLearningSuggestions = async () => {
    if (!isAuthenticated || !user) return;

    try {
      const suggestions = await learningSuggestionsService.refreshSuggestions(
        user.sub, 
        learningConfig.learningChatCount
      );
      setLearningSuggestions(suggestions);
      setMessagesSinceLastRefresh(0);
      return suggestions;
    } catch (error) {
      console.error('Error refreshing learning suggestions:', error);
      return [];
    }
  };

  /**
   * Auto-refresh suggestions based on conversation activity
   */
  const checkAutoRefreshSuggestions = async () => {
    if (!learningConfig.autoRefresh || !learningConfig.enableAISuggestions) return;
    if (!isAuthenticated || !user) return;

    // Refresh suggestions every 4 messages (2 conversation pairs)
    if (messagesSinceLastRefresh >= 4) {
      console.log('🔄 Auto-refreshing learning suggestions based on conversation activity');
      await refreshLearningSuggestions();
    }
  };

  /**
   * Load learning configuration
   */
  const loadLearningConfig = async () => {
    try {
      const config = await learningSuggestionsService.getAdminConfig();
      setLearningConfig(prev => ({ ...prev, ...config }));
    } catch (error) {
      console.error('Error loading learning config:', error);
    }
  };

  // Enhanced useEffect for user authentication
  useEffect(() => {
    if (isAuthenticated && user) {
      console.log('🔐 User authenticated, loading learning system...');
      
      // Load learning configuration first
      loadLearningConfig().then(() => {
        // Then load suggestions
        loadLearningSuggestions(user.sub);
      });

      // Set user for RAG system
      if (window.ragSystem) {
        window.ragSystem.setUser(user);
      }

      // Load conversations
      loadConversations();
    } else {
      // Clear learning suggestions on logout
      setLearningSuggestions([]);
      setMessagesSinceLastRefresh(0);
    }
  }, [isAuthenticated, user]);

  // Enhanced sendMessage function with learning suggestions tracking
  const sendMessage = async (messageContent, isNewConversation = false, useRag = ragEnabled) => {
    if (!messageContent.trim()) return;

    setIsLoading(true);
    setShowTypingIndicator(true);

    try {
      // ... existing message sending logic

      // After successful message send, increment counter for auto-refresh
      if (learningConfig.autoRefresh && learningConfig.enableAISuggestions) {
        const newCount = messagesSinceLastRefresh + 1;
        setMessagesSinceLastRefresh(newCount);
        
        // Check if we should auto-refresh suggestions
        setTimeout(() => {
          checkAutoRefreshSuggestions();
        }, 1000); // Small delay to ensure message is saved
      }

      // ... rest of existing logic

    } catch (error) {
      console.error('Error sending message:', error);
      // ... existing error handling
    } finally {
      setIsLoading(false);
      setShowTypingIndicator(false);
    }
  };

  // Enhanced sidebar props
  const sidebarProps = {
    conversations,
    currentConversation,
    onConversationSelect: handleConversationSelect,
    onNewConversation: handleNewConversation,
    onDeleteConversation: handleDeleteConversation,
    onRenameConversation: handleRenameConversation,
    learningSuggestions,
    onRefreshSuggestions: refreshLearningSuggestions,
    ragEnabled,
    onToggleRag: setRagEnabled,
    // ... other existing props
  };

  // Updated ResourcesView component props
  const resourcesViewProps = {
    learningSuggestions,
    onRefreshSuggestions: refreshLearningSuggestions,
    // ... other props
  };

  // Add learning suggestions info to the main view
  const renderLearningInfo = () => {
    if (!learningConfig.enableAISuggestions || !isAuthenticated) return null;

    return (
      <div className="mb-4 p-3 bg-gradient-to-r from-purple-50 to-blue-50 border border-purple-200 rounded-lg">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Brain className="h-4 w-4 text-purple-600" />
            <span className="text-sm font-medium text-purple-900">
              AI Learning Suggestions Active
            </span>
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

  // Enhanced admin screen props
  const adminScreenProps = {
    onClose: () => setShowAdminScreen(false),
    onConfigUpdate: (newConfig) => {
      setLearningConfig(prev => ({ ...prev, ...newConfig }));
      // Refresh suggestions if chat count changed
      if (newConfig.learningChatCount !== learningConfig.learningChatCount) {
        refreshLearningSuggestions();
      }
    }
  };

  return (
    <div className="flex h-screen bg-gray-50">
      {/* Sidebar */}
      <div className={`${sidebarOpen ? 'w-80' : 'w-0'} transition-all duration-300 overflow-hidden border-r border-gray-200 bg-white flex-shrink-0`}>
        <Sidebar {...sidebarProps} />
      </div>

      {/* Main Content */}
      <div className="flex-1 flex flex-col">
        {/* Header */}
        <Header 
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onShowAdminScreen={() => setShowAdminScreen(true)}
          // ... other props
        />

        {/* Main Chat Area */}
        <div className="flex-1 flex">
          {/* Chat Section */}
          <div className={`${showResources ? 'flex-1' : 'w-full'} flex flex-col`}>
            {/* Learning Info Banner */}
            <div className="p-4 border-b bg-white">
              {renderLearningInfo()}
            </div>

            {/* Chat Messages */}
            <ChatInterface 
              messages={messages}
              onSendMessage={sendMessage}
              isLoading={isLoading}
              showTypingIndicator={showTypingIndicator}
              ragEnabled={ragEnabled}
              setRagEnabled={setRagEnabled}
              // ... other props
            />
          </div>

          {/* Resources Panel */}
          {showResources && (
            <div className="w-96 border-l border-gray-200 bg-white flex-shrink-0">
              <div className="h-full flex flex-col">
                <div className="p-4 border-b">
                  <div className="flex items-center justify-between">
                    <h2 className="text-lg font-semibold text-gray-900">Learning Center</h2>
                    <button
                      onClick={() => setShowResources(false)}
                      className="text-gray-400 hover:text-gray-600"
                    >
                      ×
                    </button>
                  </div>
                </div>
                <div className="flex-1 overflow-hidden">
                  <ResourcesView {...resourcesViewProps} />
                </div>
              </div>
            </div>
          )}
        </div>
      </div>

      {/* Admin Screen Modal */}
      {showAdminScreen && <AdminScreen {...adminScreenProps} />}
    </div>
  );
}

export default App;

// Additional helper functions to add to your App.js:

/**
 * Enhanced conversation loading with learning suggestions trigger
 */
const loadConversations = async () => {
  if (!isAuthenticated || !user) return;

  try {
    setIsLoading(true);
    const token = await getAccessTokenSilently();
    
    const response = await fetch('/.netlify/functions/neon-db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: 'get_conversations',
        userId: user.sub
      })
    });

    if (response.ok) {
      const result = await response.json();
      setConversations(result.conversations || []);
      
      // If user has conversations but no learning suggestions, generate them
      if (result.conversations?.length > 0 && learningSuggestions.length === 0) {
        setTimeout(() => {
          loadLearningSuggestions(user.sub);
        }, 1000);
      }
    }
  } catch (error) {
    console.error('Error loading conversations:', error);
  } finally {
    setIsLoading(false);
  }
};

/**
 * Enhanced save conversation with learning suggestions tracking
 */
const saveConversation = async (messages, conversationId = null, isNewConversation = false) => {
  if (!isAuthenticated || !user || messages.length === 0) return null;

  try {
    const token = await getAccessTokenSilently();
    
    const conversationData = {
      messages,
      metadata: {
        ragEnabled,
        lastUpdated: new Date().toISOString(),
        messageCount: messages.length,
        learningContext: {
          suggestionsGenerated: learningSuggestions.length > 0,
          lastSuggestionRefresh: messagesSinceLastRefresh === 0 ? new Date().toISOString() : null
        }
      }
    };

    const response = await fetch('/.netlify/functions/neon-db', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${token}`
      },
      body: JSON.stringify({
        action: conversationId ? 'update_conversation' : 'save_conversation',
        userId: user.sub,
        conversationId,
        data: conversationData
      })
    });

    if (response.ok) {
      const result = await response.json();
      console.log('✅ Conversation saved with learning context');
      
      // Reload conversations to reflect changes
      await loadConversations();
      
      return result.conversationId || conversationId;
    }
  } catch (error) {
    console.error('Error saving conversation:', error);
  }
  
  return null;
};
