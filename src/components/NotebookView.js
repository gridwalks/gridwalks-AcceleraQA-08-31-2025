import React, { memo, useMemo } from 'react';
import { combineMessagesIntoConversations } from '../utils/messageUtils';

const NotebookView = memo(({ 
  messages, // All messages including current session
  thirtyDayMessages, // Messages from last 30 days (from storage)
  selectedMessages, 
  setSelectedMessages, 
  generateStudyNotes, 
  isGeneratingNotes 
}) => {
  
  // Debug logging
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('=== NOTEBOOK VIEW DEBUG ===');
      console.log('Messages prop:', messages.length);
      console.log('ThirtyDayMessages prop:', thirtyDayMessages.length);
      console.log('ThirtyDayMessages sample:', thirtyDayMessages.slice(0, 3).map(m => ({
        id: m.id,
        type: m.type,
        isCurrent: m.isCurrent,
        isStored: m.isStored,
        content: m.content?.substring(0, 50) + '...'
      })));
    }
  }, [messages, thirtyDayMessages]);

  // Memoize conversations to prevent unnecessary recalculation
  // Use thirtyDayMessages directly (which should be the merged current + stored messages)
  const conversations = useMemo(() => {
    const result = combineMessagesIntoConversations(thirtyDayMessages).slice(-20); // Show last 20 conversations
    
    if (process.env.NODE_ENV === 'development') {
      console.log('=== CONVERSATIONS DEBUG ===');
      console.log('Total conversations:', result.length);
      console.log('Conversations sample:', result.slice(0, 3).map(c => ({
        id: c.id,
        userContent: c.userContent?.substring(0, 30) + '...',
        aiContent: c.aiContent?.substring(0, 30) + '...',
        isCurrent: c.isCurrent,
        isStored: c.isStored,
        timestamp: c.timestamp
      })));
    }
    
    return result;
  }, [thirtyDayMessages]);

  const selectAllConversations = () => {
    const allIds = new Set(conversations.map(conv => conv.id));
    setSelectedMessages(allIds);
  };

  const deselectAll = () => {
    setSelectedMessages(new Set());
  };

  const toggleMessageSelection = (messageId) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const handleGenerateStudyNotes = () => {
    if (selectedMessages.size === 0 || isGeneratingNotes) return;
    generateStudyNotes();
  };

  // Separate current session conversations from stored ones
  const currentSessionIds = useMemo(() => new Set(messages.map(msg => msg.id)), [messages]);
  
  const currentConversations = conversations.filter(conv => {
    // Check if any message in this conversation is from current session
    if (conv.originalUserMessage && currentSessionIds.has(conv.originalUserMessage.id)) return true;
    if (conv.originalAiMessage && currentSessionIds.has(conv.originalAiMessage.id)) return true;
    // Also check the isCurrent flag
    if (conv.isCurrent) return true;
    return false;
  });
  
  const storedConversations = conversations.filter(conv => {
    // Check if this conversation is NOT from current session
    if (conv.originalUserMessage && currentSessionIds.has(conv.originalUserMessage.id)) return false;
    if (conv.originalAiMessage && currentSessionIds.has(conv.originalAiMessage.id)) return false;
    // Also check the isCurrent flag
    if (conv.isCurrent) return false;
    return true;
  });

  // Debug the separation
  React.useEffect(() => {
    if (process.env.NODE_ENV === 'development') {
      console.log('=== CONVERSATION SEPARATION DEBUG ===');
      console.log('Current session message IDs:', Array.from(currentSessionIds));
      console.log('Current conversations:', currentConversations.length);
      console.log('Stored conversations:', storedConversations.length);
      console.log('Current conversations sample:', currentConversations.slice(0, 2).map(c => ({
        id: c.id,
        isCurrent: c.isCurrent,
        userContent: c.userContent?.substring(0, 30) + '...'
      })));
      console.log('Stored conversations sample:', storedConversations.slice(0, 2).map(c => ({
        id: c.id,
        isStored: c.isStored,
        userContent: c.userContent?.substring(0, 30) + '...'
      })));
    }
  }, [currentConversations, storedConversations, currentSessionIds]);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Notebook</h3>
          <p className="text-sm text-gray-500">
            {thirtyDayMessages.length} messages • {conversations.length} conversations
            {currentConversations.length > 0 && (
              <span className="ml-2 text-blue-600">
                ({currentConversations.length} current)
              </span>
            )}
            {storedConversations.length > 0 && (
              <span className="ml-2 text-gray-600">
                ({storedConversations.length} stored)
              </span>
            )}
          </p>
          
          {/* Debug info in development */}
          {process.env.NODE_ENV === 'development' && (
            <div className="text-xs text-gray-400 mt-1 font-mono">
              Raw: {thirtyDayMessages.length} | Conv: {conversations.length} | Cur: {currentConversations.length} | Stored: {storedConversations.length}
            </div>
          )}
        </div>
        
        <div className="flex items-center space-x-3">
          {selectedMessages.size > 0 && (
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
              {selectedMessages.size} selected
            </span>
          )}
          
          <div className="flex items-center space-x-2">
            <button
              onClick={selectedMessages.size > 0 ? deselectAll : selectAllConversations}
              className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={conversations.length === 0}
            >
              {selectedMessages.size > 0 ? 'Deselect All' : 'Select All'}
            </button>
            
            <button
              onClick={handleGenerateStudyNotes}
              disabled={selectedMessages.size === 0 || isGeneratingNotes}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors focus:outline-none focus:ring-2 ${
                selectedMessages.size > 0 && !isGeneratingNotes
                  ? 'bg-black text-white hover:bg-gray-800 focus:ring-gray-600' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed focus:ring-gray-300'
              }`}
              aria-label="Generate study notes from selected conversations"
            >
              {isGeneratingNotes ? (
                <span className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                  <span>Generating...</span>
                </span>
              ) : (
                'Study Notes'
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Conversations List */}
      <div className="space-y-3 overflow-y-auto h-[calc(100%-120px)]">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.991 8.991 0 01-4.7-1.299L3 21l2.3-5.7A7.991 7.991 0 1121 12z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h4>
            <p className="text-gray-600">
              Start chatting to see your conversation history here
            </p>
            {/* Debug info when no conversations */}
            {process.env.NODE_ENV === 'development' && (
              <div className="mt-4 text-xs text-gray-400 font-mono">
                Debug: {thirtyDayMessages.length} raw messages available
              </div>
            )}
          </div>
        ) : (
          <>
            {/* Current Session Conversations */}
            {currentConversations.length > 0 && (
              <>
                <div className="flex items-center space-x-2 mb-3">
                  <div className="h-px bg-blue-200 flex-1"></div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    Current Session ({currentConversations.length})
                  </span>
                  <div className="h-px bg-blue-200 flex-1"></div>
                </div>
                
                {currentConversations.map((conversation) => (
                  <ConversationCard
                    key={`current-${conversation.id}`}
                    conversation={conversation}
                    isSelected={selectedMessages.has(conversation.id)}
                    onToggleSelection={toggleMessageSelection}
                    isCurrentSession={true}
                  />
                ))}
              </>
            )}
            
            {/* Stored Conversations */}
            {storedConversations.length > 0 && (
              <>
                {currentConversations.length > 0 && (
                  <div className="flex items-center space-x-2 mb-3 mt-6">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                      Previous Conversations ({storedConversations.length})
                    </span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>
                )}
                
                {storedConversations.map((conversation) => (
                  <ConversationCard
                    key={`stored-${conversation.id}`}
                    conversation={conversation}
                    isSelected={selectedMessages.has(conversation.id)}
                    onToggleSelection={toggleMessageSelection}
                    isCurrentSession={false}
                  />
                ))}
              </>
            )}

            {/* Show all conversations if separation failed */}
            {currentConversations.length === 0 && storedConversations.length === 0 && conversations.length > 0 && (
              <>
                <div className="flex items-center space-x-2 mb-3">
                  <div className="h-px bg-gray-200 flex-1"></div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 bg-yellow-50 px-3 py-1 rounded-full">
                    All Conversations ({conversations.length}) - Debug Mode
                  </span>
                  <div className="h-px bg-gray-200 flex-1"></div>
                </div>
                
                {conversations.map((conversation) => (
                  <ConversationCard
                    key={`all-${conversation.id}`}
                    conversation={conversation}
                    isSelected={selectedMessages.has(conversation.id)}
                    onToggleSelection={toggleMessageSelection}
                    isCurrentSession={conversation.isCurrent || false}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
});

// Individual conversation card component
const ConversationCard = memo(({ conversation, isSelected, onToggleSelection, isCurrentSession }) => {
  const handleToggle = () => {
    onToggleSelection(conversation.id);
  };

  return (
    <div className={`p-4 rounded-lg border transition-all cursor-pointer ${
      isSelected 
        ? 'bg-blue-50 border-blue-300 shadow-sm' 
        : isCurrentSession
        ? 'bg-blue-25 border-blue-100 hover:border-blue-200 hover:shadow-sm'
        : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm'
    }`}>
      <div className="flex items-start space-x-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleToggle}
          className="mt-1 rounded border-gray-300 text-black focus:ring-black focus:ring-2"
          aria-label={`Select conversation from ${new Date(conversation.timestamp).toLocaleDateString()}`}
        />
        
        <div className="flex-1 min-w-0" onClick={handleToggle}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-semibold uppercase tracking-wide ${
                isCurrentSession ? 'text-blue-600' : 'text-purple-600'
              }`}>
                Conversation
              </span>
              {isCurrentSession && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium live-indicator">
                  Live
                </span>
              )}
              {/* Debug info in development */}
              {process.env.NODE_ENV === 'development' && (
                <span className="text-xs bg-gray-100 text-gray-600 px-1 py-0.5 rounded font-mono">
                  {conversation.isCurrent ? 'C' : ''}{conversation.isStored ? 'S' : ''}
                </span>
              )}
            </div>
            <time 
              className="text-xs text-gray-500"
              dateTime={conversation.timestamp}
            >
              {new Date(conversation.timestamp).toLocaleDateString()}
            </time>
          </div>
          
          {conversation.userContent && (
            <div className="mb-3">
              <div className="text-xs font-medium text-blue-600 mb-1">QUESTION:</div>
              <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 p-2 rounded line-clamp-3">
                {conversation.userContent}
              </p>
            </div>
          )}
          
          {conversation.aiContent && (
            <div className="mb-3">
              <div className="text-xs font-medium text-green-600 mb-1">RESPONSE:</div>
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-4 bg-green-50 p-2 rounded">
                {conversation.aiContent}
              </p>
            </div>
          )}
          
          {conversation.resources && conversation.resources.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-600 mb-2">
                LEARNING RESOURCES ({conversation.resources.length}):
              </div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {conversation.resources.slice(0, 3).map((resource, idx) => (
                  <div key={idx} className="text-xs">
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline block truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      • {resource.title} ({resource.type})
                    </a>
                  </div>
                ))}
                {conversation.resources.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{conversation.resources.length - 3} more resources
                  </div>
                )}
              </div>
            </div>
          )}
          
          {conversation.isStudyNotes && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                📚 Study Notes
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ConversationCard.displayName = 'ConversationCard';
NotebookView.displayName = 'NotebookView';

export default NotebookView;import React, { memo, useMemo } from 'react';
import { combineMessagesIntoConversations } from '../utils/messageUtils';

const NotebookView = memo(({ 
  messages, // All messages including current session
  thirtyDayMessages, // Messages from last 30 days (from storage)
  selectedMessages, 
  setSelectedMessages, 
  generateStudyNotes, 
  isGeneratingNotes 
}) => {
  // Memoize conversations to prevent unnecessary recalculation
  // Combine current session messages with stored messages, removing duplicates
  const allMessages = useMemo(() => {
    const messageMap = new Map();
    
    // Add thirty day messages first (from storage)
    thirtyDayMessages.forEach(msg => {
      messageMap.set(msg.id, msg);
    });
    
    // Add current session messages (will override any duplicates)
    messages.forEach(msg => {
      messageMap.set(msg.id, msg);
    });
    
    // Convert back to array and sort by timestamp
    return Array.from(messageMap.values())
      .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));
  }, [messages, thirtyDayMessages]);

  const conversations = useMemo(() => 
    combineMessagesIntoConversations(allMessages).slice(-20), // Show last 20 conversations
    [allMessages]
  );

  const selectAllConversations = () => {
    const allIds = new Set(conversations.map(conv => conv.id));
    setSelectedMessages(allIds);
  };

  const deselectAll = () => {
    setSelectedMessages(new Set());
  };

  const toggleMessageSelection = (messageId) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  const handleGenerateStudyNotes = () => {
    if (selectedMessages.size === 0 || isGeneratingNotes) return;
    generateStudyNotes();
  };

  // Separate current session conversations from stored ones
  const currentSessionIds = useMemo(() => new Set(messages.map(msg => msg.id)), [messages]);
  const currentConversations = conversations.filter(conv => {
    // Check if any message in this conversation is from current session
    if (conv.originalUserMessage && currentSessionIds.has(conv.originalUserMessage.id)) return true;
    if (conv.originalAiMessage && currentSessionIds.has(conv.originalAiMessage.id)) return true;
    return false;
  });
  
  const storedConversations = conversations.filter(conv => {
    // Check if this conversation is NOT from current session
    if (conv.originalUserMessage && currentSessionIds.has(conv.originalUserMessage.id)) return false;
    if (conv.originalAiMessage && currentSessionIds.has(conv.originalAiMessage.id)) return false;
    return true;
  });

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Notebook</h3>
          <p className="text-sm text-gray-500">
            {allMessages.length} messages • {conversations.length} conversations
            {currentConversations.length > 0 && (
              <span className="ml-2 text-blue-600">
                ({currentConversations.length} current)
              </span>
            )}
          </p>
        </div>
        
        <div className="flex items-center space-x-3">
          {selectedMessages.size > 0 && (
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded-full">
              {selectedMessages.size} selected
            </span>
          )}
          
          <div className="flex items-center space-x-2">
            <button
              onClick={selectedMessages.size > 0 ? deselectAll : selectAllConversations}
              className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:border-gray-400 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-500"
              disabled={conversations.length === 0}
            >
              {selectedMessages.size > 0 ? 'Deselect All' : 'Select All'}
            </button>
            
            <button
              onClick={handleGenerateStudyNotes}
              disabled={selectedMessages.size === 0 || isGeneratingNotes}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors focus:outline-none focus:ring-2 ${
                selectedMessages.size > 0 && !isGeneratingNotes
                  ? 'bg-black text-white hover:bg-gray-800 focus:ring-gray-600' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed focus:ring-gray-300'
              }`}
              aria-label="Generate study notes from selected conversations"
            >
              {isGeneratingNotes ? (
                <span className="flex items-center space-x-2">
                  <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                  <span>Generating...</span>
                </span>
              ) : (
                'Study Notes'
              )}
            </button>
          </div>
        </div>
      </div>
      
      {/* Conversations List */}
      <div className="space-y-3 overflow-y-auto h-[calc(100%-120px)]">
        {conversations.length === 0 ? (
          <div className="text-center py-12">
            <div className="text-gray-400 mb-4">
              <svg className="w-12 h-12 mx-auto" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-3.582 8-8 8a8.991 8.991 0 01-4.7-1.299L3 21l2.3-5.7A7.991 7.991 0 1121 12z" />
              </svg>
            </div>
            <h4 className="text-lg font-medium text-gray-900 mb-2">No conversations yet</h4>
            <p className="text-gray-600">
              Start chatting to see your conversation history here
            </p>
          </div>
        ) : (
          <>
            {/* Current Session Conversations */}
            {currentConversations.length > 0 && (
              <>
                <div className="flex items-center space-x-2 mb-3">
                  <div className="h-px bg-blue-200 flex-1"></div>
                  <span className="text-xs font-semibold uppercase tracking-wider text-blue-600 bg-blue-50 px-3 py-1 rounded-full">
                    Current Session
                  </span>
                  <div className="h-px bg-blue-200 flex-1"></div>
                </div>
                
                {currentConversations.map((conversation) => (
                  <ConversationCard
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedMessages.has(conversation.id)}
                    onToggleSelection={toggleMessageSelection}
                    isCurrentSession={true}
                  />
                ))}
              </>
            )}
            
            {/* Stored Conversations */}
            {storedConversations.length > 0 && (
              <>
                {currentConversations.length > 0 && (
                  <div className="flex items-center space-x-2 mb-3 mt-6">
                    <div className="h-px bg-gray-200 flex-1"></div>
                    <span className="text-xs font-semibold uppercase tracking-wider text-gray-500 bg-gray-50 px-3 py-1 rounded-full">
                      Previous Conversations
                    </span>
                    <div className="h-px bg-gray-200 flex-1"></div>
                  </div>
                )}
                
                {storedConversations.map((conversation) => (
                  <ConversationCard
                    key={conversation.id}
                    conversation={conversation}
                    isSelected={selectedMessages.has(conversation.id)}
                    onToggleSelection={toggleMessageSelection}
                    isCurrentSession={false}
                  />
                ))}
              </>
            )}
          </>
        )}
      </div>
    </div>
  );
});

// Individual conversation card component
const ConversationCard = memo(({ conversation, isSelected, onToggleSelection, isCurrentSession }) => {
  const handleToggle = () => {
    onToggleSelection(conversation.id);
  };

  return (
    <div className={`p-4 rounded-lg border transition-all cursor-pointer ${
      isSelected 
        ? 'bg-blue-50 border-blue-300 shadow-sm' 
        : isCurrentSession
        ? 'bg-blue-25 border-blue-100 hover:border-blue-200 hover:shadow-sm'
        : 'bg-gray-50 border-gray-200 hover:border-gray-300 hover:shadow-sm'
    }`}>
      <div className="flex items-start space-x-3">
        <input
          type="checkbox"
          checked={isSelected}
          onChange={handleToggle}
          className="mt-1 rounded border-gray-300 text-black focus:ring-black focus:ring-2"
          aria-label={`Select conversation from ${new Date(conversation.timestamp).toLocaleDateString()}`}
        />
        
        <div className="flex-1 min-w-0" onClick={handleToggle}>
          <div className="flex items-center justify-between mb-3">
            <div className="flex items-center space-x-2">
              <span className={`text-xs font-semibold uppercase tracking-wide ${
                isCurrentSession ? 'text-blue-600' : 'text-purple-600'
              }`}>
                Conversation
              </span>
              {isCurrentSession && (
                <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">
                  Live
                </span>
              )}
            </div>
            <time 
              className="text-xs text-gray-500"
              dateTime={conversation.timestamp}
            >
              {new Date(conversation.timestamp).toLocaleDateString()}
            </time>
          </div>
          
          {conversation.userContent && (
            <div className="mb-3">
              <div className="text-xs font-medium text-blue-600 mb-1">QUESTION:</div>
              <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 p-2 rounded line-clamp-3">
                {conversation.userContent}
              </p>
            </div>
          )}
          
          {conversation.aiContent && (
            <div className="mb-3">
              <div className="text-xs font-medium text-green-600 mb-1">RESPONSE:</div>
              <p className="text-sm text-gray-700 leading-relaxed line-clamp-4 bg-green-50 p-2 rounded">
                {conversation.aiContent}
              </p>
            </div>
          )}
          
          {conversation.resources && conversation.resources.length > 0 && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <div className="text-xs font-medium text-gray-600 mb-2">
                LEARNING RESOURCES ({conversation.resources.length}):
              </div>
              <div className="space-y-1 max-h-20 overflow-y-auto">
                {conversation.resources.slice(0, 3).map((resource, idx) => (
                  <div key={idx} className="text-xs">
                    <a 
                      href={resource.url} 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-blue-600 hover:text-blue-800 hover:underline block truncate"
                      onClick={(e) => e.stopPropagation()}
                    >
                      • {resource.title} ({resource.type})
                    </a>
                  </div>
                ))}
                {conversation.resources.length > 3 && (
                  <div className="text-xs text-gray-500">
                    +{conversation.resources.length - 3} more resources
                  </div>
                )}
              </div>
            </div>
          )}
          
          {conversation.isStudyNotes && (
            <div className="mt-3 pt-2 border-t border-gray-200">
              <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                📚 Study Notes
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  );
});

ConversationCard.displayName = 'ConversationCard';
NotebookView.displayName = 'NotebookView';

export default NotebookView;
