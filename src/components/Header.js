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
    <header className="bg-black text-white border-b border-gray-800">
      <div className="max-w-7xl mx-auto px-6">
        <div className="flex justify-between items-center h-16">
          <div className="flex items-center space-x-4">
            <div className="text-2xl font-bold tracking-tight">AcceleraQA</div>
            <div className="hidden md:block text-sm text-gray-400">
              Pharmaceutical Quality & Compliance AI
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
