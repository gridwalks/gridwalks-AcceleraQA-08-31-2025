// src/components/Header.js - FIXED VERSION
import React, { memo, useMemo } from 'react';
import { Download, Clock, MessageSquare, LogOut, User, AlertTriangle, FileSearch, RefreshCw, Cloud, CloudOff, Shield } from 'lucide-react';
import { handleLogout } from '../services/authService';

const Header = memo(({ 
  user, 
  showNotebook, 
  setShowNotebook, 
  clearChat, 
  exportNotebook,
  clearAllConversations,
  isServerAvailable,
  onShowRAGConfig,
  isSaving = false,
  lastSaveTime = null,
  onRefresh,
  onShowAdmin // Make sure this prop is being passed
}) => {
  // Enhanced admin detection with debugging
  const isAdmin = useMemo(() => {
    if (!user || !user.roles) {
      console.log('Header: No user or roles found');
      return false;
    }
    
    console.log('Header: Checking admin roles:', user.roles);
    
    // Check for various admin role formats
    const adminRoles = ['admin', 'administrator', 'Admin', 'Administrator'];
    const hasAdminRole = adminRoles.some(role => 
      user.roles.includes(role)
    );
    
    console.log('Header: Has admin role:', hasAdminRole);
    return hasAdminRole;
  }, [user]);

  // Debug user object in development
  React.useEffect(() => {
    if (user && process.env.NODE_ENV === 'development') {
      console.log('=== HEADER USER DEBUG ===');
      console.log('Full user object:', user);
      console.log('User roles:', user.roles);
      console.log('User roles type:', typeof user.roles);
      console.log('Is array?:', Array.isArray(user.roles));
      console.log('Roles includes admin?:', user.roles?.includes('admin'));
      console.log('Roles includes administrator?:', user.roles?.includes('administrator'));
      console.log('isAdmin result:', isAdmin);
      console.log('=========================');
    }
  }, [user, isAdmin]);

  const handleToggleView = () => {
    setShowNotebook(!showNotebook);
  };

  const handleExportClick = () => {
    try {
      exportNotebook();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  const handleLogoutClick = async () => {
    try {
      await handleLogout();
    } catch (error) {
      console.error('Logout failed:', error);
    }
  };

  const handleRAGConfigClick = () => {
    if (onShowRAGConfig) {
      onShowRAGConfig();
    }
  };

  // Debug admin click handler
  const handleAdminClick = () => {
    console.log('Admin button clicked');
    console.log('onShowAdmin function:', typeof onShowAdmin);
    console.log('onShowAdmin exists:', !!onShowAdmin);
    
    if (onShowAdmin) {
      onShowAdmin();
    } else {
      console.error('onShowAdmin function not provided to Header component');
      alert('Admin function not available. Check console for details.');
    }
  };

  const handleClearAllConversations = async () => {
    if (!clearAllConversations) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to delete all your conversation history from cloud storage? This action cannot be undone.'
    );
    
    if (confirmed) {
      try {
        await clearAllConversations();
        alert('All conversations cleared from cloud storage successfully!');
      } catch (error) {
        console.error('Error clearing all conversations:', error);
        alert('Failed to clear conversations. Please try again.');
      }
    }
  };

  const handleRefreshClick = async () => {
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      }
    }
  };

  const formatLastSaveTime = (saveTime) => {
    if (!saveTime) return null;

    const now = new Date();
    const diffMs = now - saveTime;
    const diffMins = Math.floor(diffMs / 60000);
    
    if (diffMins < 1) return 'Just now';
    if (diffMins < 60) return `${diffMins}m ago`;
    
    const diffHours = Math.floor(diffMins / 60);
    if (diffHours < 24) return `${diffHours}h ago`;
    
    return saveTime.toLocaleDateString();
  };

  const displayName = user?.email || user?.name || 'User';
  const roleLabel = user?.roles?.length ? user.roles.join(', ') : null;

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
                {displayName}
                {roleLabel ? ` (${roleLabel})` : ''}
              </span>
            </div>

            {/* Debug info for development */}
            {process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-yellow-400 bg-yellow-900 bg-opacity-50 px-2 py-1 rounded">
                Admin: {isAdmin ? '✓' : '✗'} | Roles: {JSON.stringify(user?.roles)}
              </div>
            )}

            {/* Cloud Storage Status */}
            <div className="flex items-center space-x-2 text-sm">
              {isServerAvailable ? (
                <div className="flex items-center space-x-2 text-green-400" title="Connected to cloud storage">
                  <Cloud className="h-4 w-4" />
                  {isSaving ? (
                    <span className="flex items-center space-x-1">
                      <div className="animate-spin rounded-full h-3 w-3 border-b border-green-400"></div>
                      <span className="text-xs">Saving...</span>
                    </span>
                  ) : lastSaveTime ? (
                    <span className="text-xs">
                      Saved {formatLastSaveTime(lastSaveTime)}
                    </span>
                  ) : (
                    <span className="text-xs">Connected</span>
                  )}
                </div>
              ) : (
                <div className="flex items-center space-x-2 text-orange-400" title="Cloud storage unavailable - session only">
                  <CloudOff className="h-4 w-4" />
                  <span className="text-xs">Session only</span>
                </div>
              )}
            </div>

            {/* Refresh Conversations */}
            {isServerAvailable && (
              <button
                onClick={handleRefreshClick}
                className="flex items-center space-x-2 px-3 py-2 text-gray-300 hover:text-white transition-colors text-sm font-medium rounded"
                aria-label="Refresh conversations from cloud"
                title="Refresh conversations from cloud storage"
              >
                <RefreshCw className="h-4 w-4" />
                <span className="hidden sm:block">Refresh</span>
              </button>
            )}

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

            {/* Enhanced Admin Button */}
            {isAdmin && (
              <div className="relative group">
                <button
                  onClick={handleAdminClick}
                  className="flex items-center space-x-2 px-4 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500 relative"
                  aria-label="Access admin panel"
                  title="Administrative controls and system monitoring"
                >
                  <Shield className="h-4 w-4" />
                  <span className="hidden sm:block">Admin</span>
                  {/* Admin indicator badge */}
                  <div className="absolute -top-1 -right-1 w-3 h-3 bg-yellow-400 rounded-full border-2 border-white animate-pulse"></div>
                </button>
                
                {/* Debug tooltip in development */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap z-10">
                    Admin Button (Roles: {JSON.stringify(user.roles)})
                  </div>
                )}
              </div>
            )}

            {/* Debug info for non-admin users in development */}
            {!isAdmin && user && process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-red-400 bg-red-900 bg-opacity-50 px-2 py-1 rounded">
                No Admin Role
              </div>
            )}

            {/* Clear Chat */}
            <button
              onClick={clearChat}
              className="px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm font-medium"
              aria-label="Clear current chat"
              title="Clear current conversation (saves to cloud first)"
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
              title="Export conversations to CSV file"
            >
              <Download className="h-4 w-4" />
              <span>Export</span>
            </button>

            {/* Clear All Conversations */}
            {isServerAvailable && (
              <button
                onClick={handleClearAllConversations}
                className="flex items-center space-x-2 px-4 py-2 text-red-400 hover:text-red-300 transition-colors focus:outline-none focus:ring-2 focus:ring-red-600 rounded"
                aria-label="Clear all conversations from cloud storage"
                title="Delete all conversation history from cloud storage"
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
