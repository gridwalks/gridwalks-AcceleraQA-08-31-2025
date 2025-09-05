// src/components/Header.js - Updated with save status and refresh functionality
import React, { memo } from 'react';
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
  isAdmin = false,
  onShowAdmin
}) => {
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

  const handleAdminClick = () => {
    if (onShowAdmin) {
      onShowAdmin();
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

            {isAdmin && (
              <button
                onClick={handleAdminClick}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 rounded hover:bg-blue-700 transition-colors focus:outline-none focus:ring-2 focus:ring-blue-500"
                aria-label="Open admin panel"
                title="Access administrative controls"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:block">Admin</span>
              </button>
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

// Step 1: Debug the user object and roles
// Add this to your App.js or Header.js to see what's actually in the user object

useEffect(() => {
  if (user) {
    console.log('=== USER DEBUG INFO ===');
    console.log('Full user object:', user);
    console.log('User roles:', user.roles);
    console.log('User roles type:', typeof user.roles);
    console.log('Is array?:', Array.isArray(user.roles));
    console.log('Roles includes admin?:', user.roles?.includes('admin'));
    console.log('Roles includes administrator?:', user.roles?.includes('administrator'));
    console.log('Raw claims:', user);
    console.log('========================');
  }
}, [user]);

// Step 2: Check Auth0 configuration
// Verify that your Auth0 is properly setting up roles
// In your authService.js, update the getUser function to add more debugging:

async getUser() {
  if (!this.auth0Client) {
    return null;
  }

  try {
    const isAuth = await this.isAuthenticated();
    if (!isAuth) {
      return null;
    }
    
    const user = await this.auth0Client.getUser();
    const claims = await this.auth0Client.getIdTokenClaims();
    
    console.log('=== AUTH DEBUG ===');
    console.log('Raw user from Auth0:', user);
    console.log('Raw claims from Auth0:', claims);
    console.log('AUTH0_ROLES_CLAIM value:', AUTH0_CONFIG.ROLES_CLAIM);
    console.log('Roles from claims:', claims?.[AUTH0_CONFIG.ROLES_CLAIM]);
    console.log('==================');
    
    const roles = claims?.[AUTH0_CONFIG.ROLES_CLAIM] || [];

    return { ...user, roles };
  } catch (error) {
    console.error('Error getting user:', error);
    return null;
  }
}

// Step 3: Temporary debug version of isAdmin check
// Add this to your Header.js component to see what's happening

const DebugAdminCheck = ({ user }) => {
  const isAdmin = user?.roles?.includes('admin');
  const isAdministrator = user?.roles?.includes('administrator');
  
  console.log('=== ADMIN CHECK DEBUG ===');
  console.log('User object exists:', !!user);
  console.log('User roles:', user?.roles);
  console.log('isAdmin (admin role):', isAdmin);
  console.log('isAdministrator (administrator role):', isAdministrator);
  console.log('Final isAdmin result:', isAdmin || isAdministrator);
  console.log('==========================');
  
  return (
    <div className="fixed top-20 right-4 bg-black text-white p-4 rounded text-xs max-w-xs z-50">
      <div>User: {user ? '✓' : '✗'}</div>
      <div>Roles: {JSON.stringify(user?.roles)}</div>
      <div>isAdmin: {isAdmin ? '✓' : '✗'}</div>
      <div>isAdministrator: {isAdministrator ? '✓' : '✗'}</div>
    </div>
  );
};

// Step 4: Fixed Header.js with better role detection
// Update your Header.js with more robust admin detection:

const Header = ({ 
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
  // Enhanced admin detection
  const isAdmin = useMemo(() => {
    if (!user || !user.roles) {
      console.log('No user or roles found');
      return false;
    }
    
    console.log('Checking admin roles:', user.roles);
    
    // Check for various admin role formats
    const adminRoles = ['admin', 'administrator', 'Admin', 'Administrator'];
    const hasAdminRole = adminRoles.some(role => 
      user.roles.includes(role)
    );
    
    console.log('Has admin role:', hasAdminRole);
    return hasAdminRole;
  }, [user]);

  // Debug handler
  const handleAdminClick = () => {
    console.log('Admin button clicked');
    console.log('onShowAdmin function:', typeof onShowAdmin);
    if (onShowAdmin) {
      onShowAdmin();
    } else {
      console.error('onShowAdmin function not provided to Header component');
    }
  };

  // Rest of your header JSX...
  
  return (
    <header className="bg-gradient-to-r from-gray-900 via-gray-800 to-black text-white border-b border-gray-800 shadow">
      {/* Add debug component temporarily */}
      {process.env.NODE_ENV === 'development' && (
        <DebugAdminCheck user={user} />
      )}
      
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          {/* ... other header content ... */}
          
          <div className="flex items-center space-x-4">
            {/* ... other buttons ... */}
            
            {/* Enhanced Admin Button with debugging */}
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
                
                {/* Debug tooltip */}
                {process.env.NODE_ENV === 'development' && (
                  <div className="absolute bottom-full left-1/2 transform -translate-x-1/2 mb-2 px-3 py-1 bg-gray-900 text-white text-xs rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none whitespace-nowrap">
                    Admin Button (Debug: {JSON.stringify(user.roles)})
                  </div>
                )}
              </div>
            )}
            
            {/* Debug info for non-admin users */}
            {!isAdmin && user && process.env.NODE_ENV === 'development' && (
              <div className="text-xs text-red-400">
                No Admin Role (Roles: {JSON.stringify(user.roles)})
              </div>
            )}
          </div>
        </div>
      </div>
    </header>
  );
};

// Step 5: Check App.js to ensure onShowAdmin is properly passed
// In your App.js, make sure you're passing the handler to Header:

const App = () => {
  const [showAdmin, setShowAdmin] = useState(false);
  const [user, setUser] = useState(null);
  
  // ... other state and logic ...
  
  const handleShowAdmin = useCallback(() => {
    console.log('handleShowAdmin called');
    setShowAdmin(true);
  }, []);

  const handleCloseAdmin = useCallback(() => {
    console.log('handleCloseAdmin called');
    setShowAdmin(false);
  }, []);

  // Check if user is admin
  const isAdmin = useMemo(() => {
    if (!user?.roles) return false;
    return user.roles.includes('admin') || user.roles.includes('administrator');
  }, [user]);

  console.log('App.js - isAdmin:', isAdmin, 'showAdmin:', showAdmin);

  // Admin interface
  if (showAdmin && isAdmin) {
    return <AdminScreen user={user} onBack={handleCloseAdmin} />;
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <Header
        user={user}
        // ... other props ...
        onShowAdmin={handleShowAdmin} // Make sure this is included
        isAdmin={isAdmin}
      />
      
      {/* ... rest of your app ... */}
    </div>
  );
};

// Step 6: Check Auth0 Role Configuration
// In your Auth0 dashboard, make sure you have:

/*
1. Auth0 Dashboard > User Management > Users > [Your User] > Roles
   - Assign admin role to your user

2. Auth0 Dashboard > Actions > Flows > Login
   - Create an Action that adds roles to the token:

exports.onExecutePostLogin = async (event, api) => {
  const namespace = 'https://your-domain.com/';
  
  if (event.authorization) {
    api.idToken.setCustomClaim(`${namespace}roles`, event.authorization.roles);
    api.accessToken.setCustomClaim(`${namespace}roles`, event.authorization.roles);
  }
};

3. Make sure your REACT_APP_AUTH0_ROLES_CLAIM matches:
   REACT_APP_AUTH0_ROLES_CLAIM=https://your-domain.com/roles
*/

// Step 7: Manual role assignment for testing
// Temporarily add this to your authService.js for testing:

async getUser() {
  // ... existing code ...
  
  const user = await this.auth0Client.getUser();
  const claims = await this.auth0Client.getIdTokenClaims();
  const roles = claims?.[AUTH0_CONFIG.ROLES_CLAIM] || [];
  
  // TEMPORARY: Force admin role for testing
  // Remove this after confirming Auth0 role setup works
  const testUser = { 
    ...user, 
    roles: process.env.NODE_ENV === 'development' 
      ? [...roles, 'admin'] // Add admin role in development
      : roles 
  };
  
  console.log('Final user object:', testUser);
  return testUser;
}

Header.displayName = 'Header';

export default Header;
