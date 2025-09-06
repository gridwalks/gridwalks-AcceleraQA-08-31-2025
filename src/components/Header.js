// src/components/Header.js - UPDATED VERSION with cloud status and clear all button removed
import React, { memo, useMemo } from 'react';
import { LogOut, User, Shield } from 'lucide-react';
import { handleLogout } from '../services/authService';
import { hasAdminRole } from '../utils/auth';

const Header = memo(({ 
  user,
  isSaving = false,
  lastSaveTime = null,
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

  const displayName = user?.email || user?.name || 'User';
  const roleLabel = user?.roles?.length ? user.roles.join(', ') : null;

  return (
    <header className="bg-gray-50 border-b border-gray-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center h-16">
          <div className="flex-shrink-0">
            <img
              src="/AceleraQA_logo.png"
              alt="AcceleraQA logo"
              width="180"
              height="20"
            />
          </div>

          <div className="flex-1 px-4">
            <input
              type="text"
              placeholder="Search policies, SOPs, modules"
              className="w-full max-w-md mx-auto block px-4 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-blue-500"
            />
          </div>

          <div className="flex items-center space-x-4">
            {/* User Info */}
            <div className="flex items-center space-x-2 text-sm text-gray-700">
              <User className="h-4 w-4 text-gray-500" />
              <span className="hidden sm:block max-w-40 truncate">
                {displayName}
                {roleLabel ? ` (${roleLabel})` : ''}
              </span>
            </div>

            {/* Admin Button */}
            {isAdmin && (
              <button
                onClick={handleAdminClick}
                className="flex items-center space-x-2 px-3 py-2 bg-red-600 text-white rounded hover:bg-red-700 transition-colors focus:outline-none focus:ring-2 focus:ring-red-500"
                aria-label="Access admin panel"
                title="Administrative controls and system monitoring"
              >
                <Shield className="h-4 w-4" />
                <span className="hidden sm:block">Admin</span>
              </button>
            )}

            {/* Open Notebook */}
            <button
              onClick={onOpenNotebook}
              className="hidden sm:flex items-center space-x-2 px-3 py-2 bg-gray-200 rounded hover:bg-gray-300 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 text-gray-700"
              aria-label="Open notebook"
            >
              <svg className="h-4 w-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6.253v13m0-13C10.832 5.477 9.246 5 7.5 5S4.168 5.477 3 6.253v13C4.168 18.477 5.754 18 7.5 18s3.332.477 4.5 1.253m0-13C13.168 5.477 14.754 5 16.5 5c1.746 0 3.332.477 4.5 1.253v13C19.832 18.477 18.246 18 16.5 18c-1.746 0-3.332.477-4.5 1.253" />
              </svg>
              <span>Open Notebook</span>
            </button>

            {/* Logout */}
            <button
              onClick={handleLogoutClick}
              className="flex items-center space-x-2 px-3 py-2 text-gray-700 hover:text-gray-900 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300 rounded"
              aria-label="Sign out of AcceleraQA"
            >
              <LogOut className="h-4 w-4" />
              <span className="hidden sm:block">Sign Out</span>
            </button>
          </div>
        </div>
      </div>
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
