// src/components/Header.js - UPDATED VERSION with cloud status and clear all button removed
import React, { memo, useMemo } from 'react';
import { Download, LogOut, User, RefreshCw, Shield } from 'lucide-react';
import { handleLogout } from '../services/authService';
import { hasAdminRole } from '../utils/auth';

const Header = memo(({ 
  user,
  clearChat,
  exportNotebook,
  isServerAvailable,
  isSaving = false,
  lastSaveTime = null,
  onRefresh,
  onShowAdmin,
  onOpenNotebook
}) => {
  // Enhanced admin detection with debugging
  const isAdmin = useMemo(() => hasAdminRole(user), [user]);

  // Debug user object in development
  React.useEffect(() => {
    if (user && process.env.NODE_ENV === 'development') {
      console.log('=== HEADER USER DEBUG ===');
      console.log('Full user object:', user);
      console.log('User roles:', user.roles);
      console.log('User roles type:', typeof user.roles);
      console.log('Is array?:', Array.isArray(user.roles));
      console.log('Has admin role:', hasAdminRole(user));
      console.log('isAdmin result:', isAdmin);
      console.log('=========================');
    }
  }, [user, isAdmin]);

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

  const handleRefreshClick = async () => {
    if (onRefresh) {
      try {
        await onRefresh();
      } catch (error) {
        console.error('Refresh failed:', error);
      }
    }
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

            {/* Open Notebook */}
            <button
              onClick={onOpenNotebook}
              className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-600"
              aria-label="Open notebook"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Open Notebook</span>
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
