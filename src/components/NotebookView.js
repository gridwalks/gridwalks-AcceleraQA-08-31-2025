import React, { memo, useMemo } from 'react';
import { combineMessagesIntoConversations } from '../utils/messageUtils';

const NotebookView = memo(({ 
  messages,
  thirtyDayMessages, 
  selectedMessages, 
  setSelectedMessages, 
  generateStudyNotes, 
  isGeneratingNotes 
}) => {
  // Memoize conversations to prevent unnecessary recalculation
  const conversations = useMemo(() => 
    combineMessagesIntoConversations(thirtyDayMessages).slice(-10),
    [thirtyDayMessages]
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full shadow-sm">
      {/* Header */}
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Notebook</h3>
          <p className="text-sm text-gray-500">
            {thirtyDayMessages.length} messages • {conversations.length} conversations
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
          conversations.map((conversation) => (
            <ConversationCard
              key={conversation.id}
              conversation={conversation}
              isSelected={selectedMessages.has(conversation.id)}
              onToggleSelection={toggleMessageSelection}
            />
          ))
        )}
      </div>
    </div>
  );
});

// Individual conversation card component
const ConversationCard = memo(({ conversation, isSelected, onToggleSelection }) => {
  const handleToggle = () => {
    onToggleSelection(conversation.id);
  };

  return (
    <div className={`p-4 rounded-lg border transition-all cursor-pointer ${
      isSelected 
        ? 'bg-blue-50 border-blue-300 shadow-sm' 
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
            <span className="text-xs font-semibold uppercase tracking-wide text-purple-600">
              Conversation
            </span>
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
