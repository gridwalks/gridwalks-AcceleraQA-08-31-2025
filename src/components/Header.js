// src/components/Header.js - Fixed version without duplicate React import
import React, { memo, useState, useEffect } from 'react';
import { Download, Clock, MessageSquare, LogOut, User, Database, AlertTriangle, CheckCircle, FileSearch } from 'lucide-react';
import { handleLogout } from '../services/authService';

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
  const [showStorageMenu, setShowStorageMenu] = useState(false);

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

  const handleClearAllConversations = async () => {
    if (!clearAllConversations) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete all your conversation history? This action cannot be undone.'
    );
    
    if (confirmed) {
      try {
        await clearAllConversations();
        alert('All conversations cleared successfully!');
      } catch (error) {
        console.error('Error clearing all conversations:', error);
        alert('Failed to clear conversations. Please try again.');
      }
    }
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

            {/* Storage Status Indicator (Simplified) */}
            <div className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-300">
              <Database className="h-4 w-4" />
              <span className="hidden sm:block">Storage</span>
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

            {/* Clear All Conversations */}
            {isServerAvailable && (
              <button
                onClick={handleClearAllConversations}
                className="flex items-center space-x-2 px-4 py-2 text-red-400 hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 rounded"
                aria-label="Clear all conversations"
                title="Delete all conversation history"
              >
                <AlertTriangle className="h-4 w-4" />
                <span className="hidden sm:block">Clear All</span>
              </button>
            )}
            
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
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
