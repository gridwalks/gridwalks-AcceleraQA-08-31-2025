// src/components/Sidebar.js - Enhanced with learning suggestions integration

import React from 'react';
import NotebookView from './NotebookView';
import ResourcesView from './ResourcesView';

const Sidebar = ({
  showNotebook,
  messages,
  thirtyDayMessages,
  selectedMessages,
  setSelectedMessages,
  exportSelected,
  clearSelected,
  clearAllConversations,
  isServerAvailable,
  onRefresh,
  // Enhanced props for learning suggestions
  user,
  learningSuggestions = [],
  isLoadingSuggestions = false,
  onSuggestionsUpdate
}) => {
  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 lg:min-h-0">
      {/* Sidebar Header */}
        <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
          <h3 className="text-base sm:text-lg font-semibold text-gray-900">
            {showNotebook ? 'Conversation History' : 'Learning Center'}
          </h3>
          {showNotebook && (
            <p className="text-xs sm:text-sm text-gray-600 mt-1">
              Review and export your conversations
            </p>
          )}
        </div>

      {/* Sidebar Content */}
      <div className="flex-1 min-h-0 overflow-hidden">
        {showNotebook ? (
          <NotebookView
            messages={messages}
            thirtyDayMessages={thirtyDayMessages}
            selectedMessages={selectedMessages}
            setSelectedMessages={setSelectedMessages}
            exportSelected={exportSelected}
            clearSelected={clearSelected}
            clearAllConversations={clearAllConversations}
            isServerAvailable={isServerAvailable}
            onRefresh={onRefresh}
          />
        ) : (
          <ResourcesView
            // Pass current resources (from message resources if any)
            currentResources={extractResourcesFromMessages(messages)}
            // Enhanced learning suggestions props
            user={user}
            learningSuggestions={learningSuggestions}
            isLoadingSuggestions={isLoadingSuggestions}
            onSuggestionsUpdate={onSuggestionsUpdate}
          />
        )}
      </div>

      {/* Enhanced Footer with Learning Status */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {showNotebook 
              ? `${thirtyDayMessages?.length || 0} conversations`
              : `${learningSuggestions.length} AI suggestions`
            }
          </span>
          
          <div className="flex items-center space-x-2">
            {/* Learning Status Indicator */}
            {!showNotebook && (
              <>
                {isLoadingSuggestions ? (
                  <div className="flex items-center space-x-1 text-purple-600">
                    <div className="animate-spin rounded-full h-3 w-3 border border-purple-600 border-t-transparent"></div>
                    <span>Learning...</span>
                  </div>
                ) : learningSuggestions.length > 0 ? (
                  <div className="flex items-center space-x-1 text-green-600">
                    <div className="w-2 h-2 bg-green-500 rounded-full"></div>
                    <span>Personalized</span>
                  </div>
                ) : (
                  <span className="text-gray-400">Start chatting</span>
                )}
              </>
            )}
            
            {isServerAvailable && showNotebook && (
              <button
                onClick={onRefresh}
                className="text-blue-600 hover:text-blue-800 font-medium"
                title="Refresh from cloud"
              >
                Refresh
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

/**
 * Helper function to extract resources from messages for the current resources prop
 * @param {Array} messages - Array of messages
 * @returns {Array} - Array of unique resources
 */
const extractResourcesFromMessages = (messages) => {
  if (!messages || !Array.isArray(messages)) {
    return [];
  }

  const resourcesMap = new Map();
  
  messages.forEach(message => {
    if (message.resources && Array.isArray(message.resources)) {
      message.resources.forEach(resource => {
        if (resource.url && resource.title) {
          resourcesMap.set(resource.url, resource);
        }
      });
    }
  });

  return Array.from(resourcesMap.values());
};

export default Sidebar;
