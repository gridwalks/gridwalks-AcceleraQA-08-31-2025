// src/components/Sidebar.js - Improved responsive sidebar

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
  onRefresh
}) => {
  return (
    <div className="h-full flex flex-col bg-white rounded-lg shadow-sm border border-gray-200 lg:min-h-0">
      {/* Sidebar Header */}
      <div className="flex-shrink-0 px-4 py-3 border-b border-gray-200 bg-gray-50 rounded-t-lg">
        <h3 className="text-base sm:text-lg font-semibold text-gray-900">
          {showNotebook ? 'Conversation History' : 'Learning Resources'}
        </h3>
        <p className="text-xs sm:text-sm text-gray-600 mt-1">
          {showNotebook 
            ? 'Review and export your conversations' 
            : 'Curated pharmaceutical quality resources'
          }
        </p>
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
          <ResourcesView />
        )}
      </div>

      {/* Optional Footer for Status/Actions */}
      <div className="flex-shrink-0 px-4 py-3 border-t border-gray-200 bg-gray-50 rounded-b-lg">
        <div className="flex items-center justify-between text-xs text-gray-500">
          <span>
            {showNotebook 
              ? `${thirtyDayMessages?.length || 0} conversations`
              : 'Industry resources'
            }
          </span>
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
  );
};

export default Sidebar;
