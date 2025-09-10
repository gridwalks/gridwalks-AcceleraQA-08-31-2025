import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { Brain } from 'lucide-react';

// Components
import Sidebar from './components/Sidebar';
import Header from './components/Header';
import ChatInterface from './components/ChatArea';
import AdminScreen from './components/AdminScreen';
import ResourcesView from './components/ResourcesView';
import AuthScreen from './components/AuthScreen';

// Services
import learningSuggestionsService from './services/learningSuggestionsService';

function App() {
  const { isAuthenticated, user, getAccessTokenSilently } = useAuth0();

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

  // Helper: load learning suggestions
  const loadLearningSuggestions = async (userId) => {
    if (!learningConfig.enableAISuggestions) return;
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
  };

  // Helper: refresh suggestions
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
    } catch (err) {
      console.error('Error refreshing learning suggestions:', err);
      return [];
    }
  };

  // Auto refresh checker
  const checkAutoRefreshSuggestions = async () => {
    if (!learningConfig.autoRefresh || !learningConfig.enableAISuggestions) return;
    if (!isAuthenticated || !user) return;
    if (messagesSinceLastRefresh >= 4) {
      await refreshLearningSuggestions();
    }
  };

  // Load learning configuration
  const loadLearningConfig = async () => {
    try {
      const config = await learningSuggestionsService.getAdminConfig();
      setLearningConfig((prev) => ({ ...prev, ...config }));
    } catch (err) {
      console.error('Error loading learning config:', err);
    }
  };

  // Load conversations for user
  const loadConversations = async () => {
    if (!isAuthenticated || !user) return;
    try {
      const token = await getAccessTokenSilently();
      const res = await fetch('/.netlify/functions/neon-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: 'get_conversations',
          userId: user.sub
        })
      });
      if (res.ok) {
        const result = await res.json();
        setConversations(result.conversations || []);
        if (result.conversations?.length > 0 && learningSuggestions.length === 0) {
          setTimeout(() => loadLearningSuggestions(user.sub), 1000);
        }
      }
    } catch (err) {
      console.error('Error loading conversations:', err);
    }
  };

  // Save conversation
  const saveConversation = async (msgs, conversationId = null, isNewConversation = false) => {
    if (!isAuthenticated || !user || msgs.length === 0) return null;
    try {
      const token = await getAccessTokenSilently();
      const response = await fetch('/.netlify/functions/neon-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`
        },
        body: JSON.stringify({
          action: conversationId ? 'update_conversation' : 'save_conversation',
          userId: user.sub,
          conversationId,
          data: { messages: msgs, metadata: { ragEnabled, lastUpdated: new Date().toISOString() } }
        })
      });
      if (response.ok) {
        await loadConversations();
      }
    } catch (err) {
      console.error('Error saving conversation:', err);
    }
  };

  // Sync on authentication
  useEffect(() => {
    if (isAuthenticated && user) {
      loadLearningConfig().then(() => loadLearningSuggestions(user.sub));
      loadConversations();
    } else {
      setLearningSuggestions([]);
      setMessages([]);
      setConversations([]);
      setMessagesSinceLastRefresh(0);
    }
  }, [isAuthenticated, user]);

  // Send message handler
  const sendMessage = async (content) => {
    if (!content.trim()) return;
    const userMessage = { id: Date.now(), role: 'user', content };
    setMessages((prev) => [...prev, userMessage]);
    setIsLoading(true);
    setShowTypingIndicator(true);
    try {
      const assistantMessage = { id: Date.now() + 1, role: 'assistant', content: '...' };
      setMessages((prev) => [...prev, assistantMessage]);
      const newCount = messagesSinceLastRefresh + 1;
      setMessagesSinceLastRefresh(newCount);
      setTimeout(checkAutoRefreshSuggestions, 1000);
      await saveConversation([...messages, userMessage, assistantMessage], currentConversation?.id, !currentConversation);
    } finally {
      setIsLoading(false);
      setShowTypingIndicator(false);
    }
  };

  // Conversation helpers
  const handleConversationSelect = (conv) => {
    setCurrentConversation(conv);
    setMessages(conv?.messages || []);
  };

  const handleNewConversation = () => {
    setCurrentConversation(null);
    setMessages([]);
  };

  const handleDeleteConversation = async (id) => {
    setConversations((prev) => prev.filter((c) => c.id !== id));
  };

  const handleRenameConversation = (id, title) => {
    setConversations((prev) => prev.map((c) => (c.id === id ? { ...c, title } : c)));
  };

  // Banner with Brain icon
  const renderLearningInfo = () => {
    if (!learningConfig.enableAISuggestions || !isAuthenticated) return null;
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

  if (!isAuthenticated) {
    return <AuthScreen />;
  }

  return (
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
          onToggleSidebar={() => setSidebarOpen(!sidebarOpen)}
          onShowAdminScreen={() => setShowAdminScreen(true)}
        />

        <div className="flex-1 flex">
          <div className={`${showResources ? 'flex-1' : 'w-full'} flex flex-col`}>
            <div className="p-4 border-b bg-white">{renderLearningInfo()}</div>
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

      {showAdminScreen && (
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
  );
}

export default App;

