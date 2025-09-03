import React, { memo, useState, useEffect } from 'react';
import { Download, Clock, MessageSquare, LogOut, User, Database, AlertTriangle, CheckCircle } from 'lucide-react';
import { handleLogout } from '../services/authService';
import { getStorageStats, getStorageHealthReport, performStorageMaintenance, clearStorageData } from '../utils/storageUtils';

const Header = memo(({ 
  user, 
  showNotebook, 
  setShowNotebook, 
  clearChat, 
  exportNotebook 
}) => {
  const [storageInfo, setStorageInfo] = useState(null);
  const [showStorageMenu, setShowStorageMenu] = useState(false);
  const [isPerformingMaintenance, setIsPerformingMaintenance] = useState(false);

  // Load storage info on mount and periodically
  useEffect(() => {
    const updateStorageInfo = () => {
      try {
        const stats = getStorageStats();
        const health = getStorageHealthReport();
        setStorageInfo({ stats, health });
      } catch (error) {
        console.error('Error loading storage info:', error);
      }
    };

    updateStorageInfo();
    
    // Update storage info every 30 seconds
    const interval = setInterval(updateStorageInfo, 30000);
    return () => clearInterval(interval);
  }, []);

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

  const handleClearStorage = async () => {
    if (!user) return;
    
    const confirmed = window.confirm(
      'Are you sure you want to clear all stored conversations? This action cannot be undone.'
    );
    
    if (confirmed) {
      try {
        await clearStorageData(user.sub || user.email);
        await clearChat(); // Also clear the current state
        
        // Update storage info
        const stats = getStorageStats();
        const health = getStorageHealthReport();
        setStorageInfo({ stats, health });
        
        alert('Storage cleared successfully!');
      } catch (error) {
        console.error('Error clearing storage:', error);
        alert('Failed to clear storage. Please try again.');
      }
    }
    
    setShowStorageMenu(false);
  };

  const handleStorageMaintenance = async () => {
    if (!user || isPerformingMaintenance) return;
    
    setIsPerformingMaintenance(true);
    
    try {
      const results = await performStorageMaintenance(user.sub || user.email);
      console.log('Maintenance results:', results);
      
      // Update storage info
      const stats = getStorageStats();
      const health = getStorageHealthReport();
      setStorageInfo({ stats, health });
      
      alert(`Maintenance completed! Cleaned ${results.cleaned} user data entries.`);
    } catch (error) {
      console.error('Error during maintenance:', error);
      alert('Maintenance failed. Please try again.');
    } finally {
      setIsPerformingMaintenance(false);
      setShowStorageMenu(false);
    }
  };

  const getStorageStatusIcon = () => {
    if (!storageInfo) {
      return <Database className="h-4 w-4 text-gray-400" />;
    }

    const { health } = storageInfo;
    
    if (!health.isHealthy) {
      return <AlertTriangle className="h-4 w-4 text-red-400" />;
    }
    
    if (health.issues.length > 0) {
      return <AlertTriangle className="h-4 w-4 text-yellow-400" />;
    }
    
    return <CheckCircle className="h-4 w-4 text-green-400" />;
  };

  const getStorageStatusText = () => {
    if (!storageInfo) return 'Loading...';
    
    const { stats, health } = storageInfo;
    const usagePercent = Math.round(stats.usage.percentage);
    
    if (!health.isHealthy) {
      return `Storage Issues (${usagePercent}% used)`;
    }
    
    return `${stats.totalMessages} messages (${usagePercent}% used)`;
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
            <div className="hidden md:block text-sm text-primary-light/70">
             
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

            {/* Storage Status Dropdown */}
            <div className="relative">
              <button
                onClick={() => setShowStorageMenu(!showStorageMenu)}
                className="flex items-center space-x-2 px-3 py-2 text-sm text-gray-300 hover:text-white transition-colors rounded"
                aria-label="Storage status and management"
                title={`Storage: ${getStorageStatusText()}`}
              >
                {getStorageStatusIcon()}
                <span className="hidden sm:block">{storageInfo?.stats.totalMessages || 0}</span>
              </button>

              {/* Storage Menu Dropdown */}
              {showStorageMenu && (
                <div className="absolute right-0 top-full mt-2 w-80 bg-white text-black rounded-lg shadow-lg border border-gray-200 z-50">
                  <div className="p-4">
                    <h3 className="font-semibold text-gray-900 mb-3 flex items-center space-x-2">
                      <Database className="h-4 w-4" />
                      <span>Storage Management</span>
                    </h3>
                    
                    {storageInfo && (
                      <div className="space-y-3">
                        {/* Storage Stats */}
                        <div className="bg-gray-50 p-3 rounded">
                          <div className="grid grid-cols-2 gap-2 text-sm">
                            <div>
                              <span className="text-gray-600">Messages:</span>
                              <span className="ml-2 font-medium">{storageInfo.stats.totalMessages}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Storage Used:</span>
                              <span className="ml-2 font-medium">{Math.round(storageInfo.stats.usage.percentage)}%</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Users:</span>
                              <span className="ml-2 font-medium">{storageInfo.stats.totalUsers}</span>
                            </div>
                            <div>
                              <span className="text-gray-600">Health:</span>
                              <span className={`ml-2 font-medium ${
                                storageInfo.health.isHealthy ? 'text-green-600' : 'text-red-600'
                              }`}>
                                {storageInfo.health.isHealthy ? 'Good' : 'Issues'}
                              </span>
                            </div>
                          </div>

                          {/* Storage Usage Bar */}
                          <div className="mt-3">
                            <div className="flex justify-between text-xs text-gray-600 mb-1">
                              <span>Storage Usage</span>
                              <span>{Math.round(storageInfo.stats.usage.percentage)}%</span>
                            </div>
                            <div className="w-full bg-gray-200 rounded-full h-2">
                              <div
                                className={`h-2 rounded-full ${
                                  storageInfo.stats.usage.percentage > 90 
                                    ? 'bg-red-500' 
                                    : storageInfo.stats.usage.percentage > 70 
                                    ? 'bg-yellow-500' 
                                    : 'bg-green-500'
                                }`}
                                style={{ width: `${Math.min(storageInfo.stats.usage.percentage, 100)}%` }}
                              />
                            </div>
                          </div>
                        </div>

                        {/* Health Issues */}
                        {storageInfo.health.issues.length > 0 && (
                          <div className="bg-yellow-50 border border-yellow-200 p-3 rounded">
                            <h4 className="font-medium text-yellow-800 text-sm mb-2 flex items-center">
                              <AlertTriangle className="h-3 w-3 mr-1" />
                              Storage Issues
                            </h4>
                            <ul className="text-xs text-yellow-700 space-y-1">
                              {storageInfo.health.issues.map((issue, index) => (
                                <li key={index}>• {issue}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Recommendations */}
                        {storageInfo.health.recommendations.length > 0 && (
                          <div className="bg-blue-50 border border-blue-200 p-3 rounded">
                            <h4 className="font-medium text-blue-800 text-sm mb-2">Recommendations</h4>
                            <ul className="text-xs text-blue-700 space-y-1">
                              {storageInfo.health.recommendations.slice(0, 2).map((rec, index) => (
                                <li key={index}>• {rec}</li>
                              ))}
                            </ul>
                          </div>
                        )}

                        {/* Action Buttons */}
                        <div className="flex flex-col space-y-2 pt-2 border-t border-gray-200">
                          <button
                            onClick={handleStorageMaintenance}
                            disabled={isPerformingMaintenance}
                            className="flex items-center justify-center space-x-2 px-3 py-2 bg-blue-600 text-white text-sm rounded hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
                          >
                            {isPerformingMaintenance ? (
                              <>
                                <div className="animate-spin rounded-full h-3 w-3 border-b-2 border-white" />
                                <span>Optimizing...</span>
                              </>
                            ) : (
                              <>
                                <CheckCircle className="h-3 w-3" />
                                <span>Optimize Storage</span>
                              </>
                            )}
                          </button>

                          <button
                            onClick={handleClearStorage}
                            className="flex items-center justify-center space-x-2 px-3 py-2 bg-red-600 text-white text-sm rounded hover:bg-red-700 transition-colors"
                          >
                            <AlertTriangle className="h-3 w-3" />
                            <span>Clear All Data</span>
                          </button>
                        </div>
                      </div>
                    )}

                    {!storageInfo && (
                      <div className="text-center py-4">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-gray-600 mx-auto mb-2" />
                        <span className="text-sm text-gray-600">Loading storage info...</span>
                      </div>
                    )}
                  </div>
                </div>
              )}
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

      {/* Click outside to close storage menu */}
      {showStorageMenu && (
        <div
          className="fixed inset-0 z-40"
          onClick={() => setShowStorageMenu(false)}
        />
      )}
    </header>
  );
});

Header.displayName = 'Header';

export default Header;
