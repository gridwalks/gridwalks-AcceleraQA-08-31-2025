// src/components/AdminScreen.js - Comprehensive Admin Dashboard
import React, { useState, useEffect, useCallback } from 'react';
import { 
  ArrowLeft, 
  Users, 
  Database, 
  Activity, 
  Settings, 
  FileText, 
  BarChart3, 
  Shield, 
  AlertTriangle,
  CheckCircle,
  Clock,
  Download,
  Trash2,
  RefreshCw,
  Eye,
  Server,
  Cloud,
  HardDrive,
  Zap,
  Bug,
  Monitor
} from 'lucide-react';

// Import services
import neonService from '../services/neonService';
import ragService from '../services/ragService';
import { getToken, getTokenInfo } from '../services/authService';
import { hasAdminRole } from '../utils/auth';

export const checkStorageHealth = async () => {
  // Check browser storage capacity
  try {
    if (typeof navigator === 'undefined' || !navigator.storage) {
      return {
        status: 'unknown',
        message: 'Storage info unavailable',
        quota: null
      };
    }

    const usage = await navigator.storage.estimate();
    const usagePercent = (usage.usage / usage.quota * 100).toFixed(1);

    return {
      status: usage.usage / usage.quota < 0.8 ? 'healthy' : 'warning',
      message: `Storage ${usagePercent}% used`,
      quota: `${(usage.quota / 1024 / 1024).toFixed(0)}MB`
    };
  } catch (error) {
    return {
      status: 'unknown',
      message: 'Storage info unavailable',
      quota: null
    };
  }
};

const AdminScreen = ({ user, onBack }) => {
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [systemStats, setSystemStats] = useState(null);
  const [ragStats, setRAGStats] = useState(null);
  const [authStats, setAuthStats] = useState(null);
  const [systemHealth, setSystemHealth] = useState(null);
  const [error, setError] = useState(null);

  // Check if user has admin role
  const isAdmin = hasAdminRole(user);

  // Load admin data on component mount
  useEffect(() => {
    if (isAdmin) {
      loadAdminData();
    }
  }, [isAdmin]);

  const loadAdminData = useCallback(async () => {
    setIsLoading(true);
    setError(null);

    try {
      const [stats, ragData, health, auth] = await Promise.allSettled([
        getSystemStats(),
        getRAGStats(),
        getSystemHealth(),
        getAuthStats()
      ]);

      if (stats.status === 'fulfilled') setSystemStats(stats.value);
      if (ragData.status === 'fulfilled') setRAGStats(ragData.value);
      if (health.status === 'fulfilled') setSystemHealth(health.value);
      if (auth.status === 'fulfilled') setAuthStats(auth.value);

      // Log any failures
      [stats, ragData, health, auth].forEach((result, index) => {
        if (result.status === 'rejected') {
          console.warn(`Admin data load failed for index ${index}:`, result.reason);
        }
      });

    } catch (error) {
      console.error('Error loading admin data:', error);
      setError(error.message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  // System statistics
  const getSystemStats = async () => {
    try {
      const [conversationStats, ragStats] = await Promise.all([
        neonService.getConversationStats(),
        ragService.getStats()
      ]);

      return {
        conversations: conversationStats,
        rag: ragStats,
        timestamp: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting system stats:', error);
      return {
        conversations: { totalConversations: 0, totalMessages: 0, ragConversations: 0 },
        rag: { totalDocuments: 0, totalChunks: 0 },
        timestamp: new Date().toISOString(),
        error: error.message
      };
    }
  };

  // RAG system statistics
  const getRAGStats = async () => {
    try {
      const diagnostics = await ragService.runDiagnostics();
      return {
        ...diagnostics,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting RAG stats:', error);
      return {
        health: { score: 0, status: 'error', error: error.message },
        lastCheck: new Date().toISOString()
      };
    }
  };

  // Authentication statistics
  const getAuthStats = async () => {
    try {
      const tokenInfo = getTokenInfo();
      const token = await getToken();
      
      return {
        tokenInfo,
        hasValidToken: !!token,
        tokenLength: token?.length || 0,
        checkTime: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error getting auth stats:', error);
      return {
        hasValidToken: false,
        error: error.message,
        checkTime: new Date().toISOString()
      };
    }
  };

  // System health check
  const getSystemHealth = async () => {
    try {
      const checks = {
        database: await checkDatabaseHealth(),
        rag: await checkRAGHealth(),
        authentication: await checkAuthHealth(),
        storage: await checkStorageHealth()
      };

      const allHealthy = Object.values(checks).every(check => check.status === 'healthy');
      
      return {
        overall: allHealthy ? 'healthy' : 'degraded',
        checks,
        lastCheck: new Date().toISOString()
      };
    } catch (error) {
      console.error('Error checking system health:', error);
      return {
        overall: 'error',
        error: error.message,
        lastCheck: new Date().toISOString()
      };
    }
  };

  const checkDatabaseHealth = async () => {
    try {
      const isAvailable = await neonService.isServiceAvailable();
      return {
        status: isAvailable ? 'healthy' : 'unhealthy',
        message: isAvailable ? 'Database connection active' : 'Database unavailable',
        responseTime: '< 100ms' // Placeholder
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        responseTime: null
      };
    }
  };

  const checkRAGHealth = async () => {
    try {
      const testResult = await ragService.testConnection();
      return {
        status: testResult.success ? 'healthy' : 'unhealthy',
        message: testResult.success ? 'RAG system operational' : `RAG error: ${testResult.error}`,
        features: testResult.data?.mode || 'unknown'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        features: null
      };
    }
  };

  const checkAuthHealth = async () => {
    try {
      const token = await getToken();
      const tokenInfo = getTokenInfo();
      
      return {
        status: token && !tokenInfo.isExpired ? 'healthy' : 'warning',
        message: token ? 'Authentication active' : 'No active token',
        expiresIn: tokenInfo.timeUntilExpiry ? `${Math.round(tokenInfo.timeUntilExpiry / 60)} minutes` : 'Unknown'
      };
    } catch (error) {
      return {
        status: 'error',
        message: error.message,
        expiresIn: null
      };
    }
  };

  // Refresh data
  const handleRefresh = () => {
    loadAdminData();
  };

  // Export system data
  const handleExportData = async () => {
    try {
      const exportData = {
        timestamp: new Date().toISOString(),
        systemStats,
        ragStats,
        authStats,
        systemHealth,
        exportedBy: user.email || user.name || 'Admin'
      };

      const blob = new Blob([JSON.stringify(exportData, null, 2)], { type: 'application/json' });
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `acceleraqa-admin-export-${Date.now()}.json`;
      document.body.appendChild(a);
      a.click();
      document.body.removeChild(a);
      URL.revokeObjectURL(url);
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  // Test system components
  const runSystemTests = async () => {
    setIsLoading(true);
    try {
      const testResults = await Promise.allSettled([
        ragService.testUpload(),
        ragService.testSearch(),
        neonService.isServiceAvailable()
      ]);

      const results = {
        ragUpload: testResults[0],
        ragSearch: testResults[1],
        database: testResults[2],
        timestamp: new Date().toISOString()
      };

      console.log('System test results:', results);
      alert('System tests completed. Check console for detailed results.');
    } catch (error) {
      console.error('System tests failed:', error);
      alert(`System tests failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // Don't render if user is not admin
  if (!isAdmin) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center p-8">
        <div className="max-w-md w-full bg-white rounded-lg shadow-lg p-8 text-center">
          <Shield className="h-16 w-16 text-red-500 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Access Denied</h2>
          <p className="text-gray-600 mb-6">
            You need administrator privileges to access this area.
          </p>
          <button
            onClick={onBack}
            className="px-6 py-2 bg-gray-600 text-white rounded hover:bg-gray-700 transition-colors"
          >
            Return to App
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <button
                onClick={onBack}
                className="flex items-center space-x-2 px-4 py-2 text-gray-600 hover:text-gray-800 transition-colors"
              >
                <ArrowLeft className="h-4 w-4" />
                <span>Back to App</span>
              </button>
              <div className="h-6 w-px bg-gray-300" />
              <div>
                <h1 className="text-2xl font-bold text-gray-900 flex items-center space-x-2">
                  <Shield className="h-6 w-6 text-blue-600" />
                  <span>Admin Dashboard</span>
                </h1>
                <p className="text-sm text-gray-500">AcceleraQA System Administration</p>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <button
                onClick={handleRefresh}
                disabled={isLoading}
                className="flex items-center space-x-2 px-4 py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 transition-colors"
              >
                <RefreshCw className={`h-4 w-4 ${isLoading ? 'animate-spin' : ''}`} />
                <span>Refresh</span>
              </button>
              
              <button
                onClick={handleExportData}
                className="flex items-center space-x-2 px-4 py-2 bg-green-600 text-white rounded hover:bg-green-700 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      {/* Admin User Info */}
      <div className="max-w-7xl mx-auto px-6 py-4">
        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4 mb-6">
          <div className="flex items-center space-x-3">
            <div className="w-2 h-2 bg-green-500 rounded-full animate-pulse"></div>
            <span className="text-sm text-blue-800">
              Logged in as <strong>{user.email || user.name}</strong> with Administrator privileges
            </span>
            <span className="text-xs text-blue-600 bg-blue-100 px-2 py-1 rounded">
              Admin Session Active
            </span>
          </div>
        </div>

        {/* Error Display */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-lg p-4 mb-6">
            <div className="flex items-start space-x-3">
              <AlertTriangle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <h3 className="font-medium text-red-800">Error Loading Admin Data</h3>
                <p className="text-red-700 text-sm mt-1">{error}</p>
              </div>
            </div>
          </div>
        )}

        {/* Tab Navigation */}
        <div className="border-b border-gray-200 mb-6">
          <nav className="flex space-x-8">
            {[
              { id: 'overview', label: 'Overview', icon: Monitor },
              { id: 'users', label: 'Users & Auth', icon: Users },
              { id: 'database', label: 'Database', icon: Database },
              { id: 'rag', label: 'RAG System', icon: FileText },
              { id: 'system', label: 'System Health', icon: Activity },
              { id: 'tools', label: 'Admin Tools', icon: Settings }
            ].map(tab => {
              const Icon = tab.icon;
              return (
                <button
                  key={tab.id}
                  onClick={() => setActiveTab(tab.id)}
                  className={`flex items-center space-x-2 py-4 px-1 border-b-2 font-medium text-sm ${
                    activeTab === tab.id
                      ? 'border-blue-500 text-blue-600'
                      : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                  }`}
                >
                  <Icon className="h-4 w-4" />
                  <span>{tab.label}</span>
                </button>
              );
            })}
          </nav>
        </div>

        {/* Tab Content */}
        <div className="space-y-6">
          {/* Overview Tab */}
          {activeTab === 'overview' && (
            <div className="space-y-6">
              {/* System Health Cards */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6">
                <SystemHealthCard
                  title="Database"
                  status={systemHealth?.checks?.database?.status || 'unknown'}
                  message={systemHealth?.checks?.database?.message || 'Checking...'}
                  icon={Database}
                />
                <SystemHealthCard
                  title="RAG System"
                  status={systemHealth?.checks?.rag?.status || 'unknown'}
                  message={systemHealth?.checks?.rag?.message || 'Checking...'}
                  icon={FileText}
                />
                <SystemHealthCard
                  title="Authentication"
                  status={systemHealth?.checks?.authentication?.status || 'unknown'}
                  message={systemHealth?.checks?.authentication?.message || 'Checking...'}
                  icon={Shield}
                />
                <SystemHealthCard
                  title="Storage"
                  status={systemHealth?.checks?.storage?.status || 'unknown'}
                  message={systemHealth?.checks?.storage?.message || 'Checking...'}
                  icon={HardDrive}
                />
              </div>

              {/* System Statistics */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <BarChart3 className="h-5 w-5 mr-2 text-blue-600" />
                    System Statistics
                  </h3>
                  <div className="space-y-4">
                    <StatItem
                      label="Total Conversations"
                      value={systemStats?.conversations?.totalConversations || 0}
                      description="Across all users"
                    />
                    <StatItem
                      label="Total Messages"
                      value={systemStats?.conversations?.totalMessages || 0}
                      description="User and AI responses"
                    />
                    <StatItem
                      label="RAG Usage"
                      value={`${systemStats?.conversations?.ragUsagePercentage || 0}%`}
                      description="Conversations using document search"
                    />
                    <StatItem
                      label="Documents Uploaded"
                      value={systemStats?.rag?.totalDocuments || 0}
                      description="Across all users"
                    />
                  </div>
                </div>

                <div className="bg-white rounded-lg shadow p-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center">
                    <Activity className="h-5 w-5 mr-2 text-green-600" />
                    System Performance
                  </h3>
                  <div className="space-y-4">
                    <StatItem
                      label="RAG Health Score"
                      value={`${ragStats?.health?.score || 0}%`}
                      description={ragStats?.health?.status || 'Unknown'}
                      status={ragStats?.health?.score >= 80 ? 'good' : ragStats?.health?.score >= 50 ? 'warning' : 'error'}
                    />
                    <StatItem
                      label="Database Status"
                      value={systemHealth?.checks?.database?.status || 'Unknown'}
                      description={systemHealth?.checks?.database?.responseTime || 'Checking...'}
                      status={systemHealth?.checks?.database?.status === 'healthy' ? 'good' : 'warning'}
                    />
                    <StatItem
                      label="Auth Token"
                      value={authStats?.hasValidToken ? 'Valid' : 'Invalid'}
                      description={authStats?.tokenInfo?.timeUntilExpiry ? `Expires in ${Math.round(authStats.tokenInfo.timeUntilExpiry / 60)}m` : 'No expiry info'}
                      status={authStats?.hasValidToken ? 'good' : 'error'}
                    />
                    <StatItem
                      label="Last Health Check"
                      value={systemHealth?.lastCheck ? new Date(systemHealth.lastCheck).toLocaleTimeString() : 'Never'}
                      description="Automatic system monitoring"
                    />
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Users & Auth Tab */}
          {activeTab === 'users' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Authentication Status</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">Current Session</h4>
                      <div className="mt-2 space-y-2 text-sm">
                        <div>User: <span className="font-mono">{user.sub}</span></div>
                        <div>Email: <span className="font-mono">{user.email}</span></div>
                        <div>Roles: <span className="font-mono">{user.roles?.join(', ') || 'None'}</span></div>
                      </div>
                    </div>
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900">Token Information</h4>
                      <div className="mt-2 space-y-2 text-sm">
                        <div>Valid: <span className={authStats?.hasValidToken ? 'text-green-600' : 'text-red-600'}>{authStats?.hasValidToken ? 'Yes' : 'No'}</span></div>
                        <div>Length: {authStats?.tokenLength || 0} characters</div>
                        <div>Cached: <span className={authStats?.tokenInfo?.hasCachedToken ? 'text-green-600' : 'text-gray-600'}>{authStats?.tokenInfo?.hasCachedToken ? 'Yes' : 'No'}</span></div>
                        <div>Expires: {authStats?.tokenInfo?.timeUntilExpiry ? `${Math.round(authStats.tokenInfo.timeUntilExpiry / 60)} minutes` : 'Unknown'}</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Database Tab */}
          {activeTab === 'database' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Neon PostgreSQL Database</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <div className="p-4 bg-blue-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-blue-900">Conversations</h4>
                          <p className="text-2xl font-bold text-blue-600">{systemStats?.conversations?.totalConversations || 0}</p>
                        </div>
                        <Database className="h-8 w-8 text-blue-500" />
                      </div>
                    </div>
                    <div className="p-4 bg-green-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-green-900">Messages</h4>
                          <p className="text-2xl font-bold text-green-600">{systemStats?.conversations?.totalMessages || 0}</p>
                        </div>
                        <FileText className="h-8 w-8 text-green-500" />
                      </div>
                    </div>
                    <div className="p-4 bg-purple-50 rounded-lg">
                      <div className="flex items-center justify-between">
                        <div>
                          <h4 className="font-medium text-purple-900">RAG Conversations</h4>
                          <p className="text-2xl font-bold text-purple-600">{systemStats?.conversations?.ragConversations || 0}</p>
                        </div>
                        <Zap className="h-8 w-8 text-purple-500" />
                      </div>
                    </div>
                  </div>
                  
                  <div className="p-4 bg-gray-50 rounded-lg">
                    <h4 className="font-medium text-gray-900 mb-2">Database Health</h4>
                    <div className="space-y-2 text-sm">
                      <div className="flex justify-between">
                        <span>Connection Status:</span>
                        <span className={`font-medium ${systemHealth?.checks?.database?.status === 'healthy' ? 'text-green-600' : 'text-red-600'}`}>
                          {systemHealth?.checks?.database?.status || 'Unknown'}
                        </span>
                      </div>
                      <div className="flex justify-between">
                        <span>Response Time:</span>
                        <span className="font-medium">{systemHealth?.checks?.database?.responseTime || 'Unknown'}</span>
                      </div>
                      <div className="flex justify-between">
                        <span>Last Check:</span>
                        <span className="font-medium">{systemHealth?.lastCheck ? new Date(systemHealth.lastCheck).toLocaleString() : 'Never'}</span>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* RAG System Tab */}
          {activeTab === 'rag' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">RAG System Status</h3>
                <div className="space-y-4">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">System Health</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span>Health Score:</span>
                          <span className="font-bold text-lg">{ragStats?.health?.score || 0}%</span>
                        </div>
                        <div className="flex justify-between">
                          <span>Status:</span>
                          <span className={`font-medium ${
                            ragStats?.health?.status === 'healthy' ? 'text-green-600' : 
                            ragStats?.health?.status === 'partial' ? 'text-yellow-600' : 'text-red-600'
                          }`}>
                            {ragStats?.health?.status || 'Unknown'}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span>Mode:</span>
                          <span className="font-medium">{ragStats?.mode || 'Unknown'}</span>
                        </div>
                      </div>
                    </div>
                    
                    <div className="p-4 bg-gray-50 rounded-lg">
                      <h4 className="font-medium text-gray-900 mb-3">Features</h4>
                      <div className="space-y-1 text-sm">
                        {ragStats?.health?.features ? Object.entries(ragStats.health.features).map(([feature, enabled]) => (
                          <div key={feature} className="flex items-center justify-between">
                            <span className="capitalize">{feature.replace(/([A-Z])/g, ' $1').toLowerCase()}:</span>
                            <span className={`font-medium ${enabled ? 'text-green-600' : 'text-gray-400'}`}>
                              {enabled ? 'Enabled' : 'Disabled'}
                            </span>
                          </div>
                        )) : (
                          <div className="text-gray-500">Feature information unavailable</div>
                        )}
                      </div>
                    </div>
                  </div>

                  {ragStats?.health?.recommendations && ragStats.health.recommendations.length > 0 && (
                    <div className="p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                      <h4 className="font-medium text-yellow-900 mb-2">Recommendations</h4>
                      <ul className="space-y-1 text-sm text-yellow-800">
                        {ragStats.health.recommendations.map((rec, index) => (
                          <li key={index}>• {rec}</li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* System Health Tab */}
          {activeTab === 'system' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">System Health Overview</h3>
                <div className="space-y-6">
                  {systemHealth?.checks && Object.entries(systemHealth.checks).map(([component, health]) => (
                    <div key={component} className="border rounded-lg p-4">
                      <div className="flex items-center justify-between mb-3">
                        <h4 className="font-medium text-gray-900 capitalize">{component}</h4>
                        <StatusBadge status={health.status} />
                      </div>
                      <p className="text-sm text-gray-600 mb-2">{health.message}</p>
                      <div className="text-xs text-gray-500 space-y-1">
                        {health.responseTime && <div>Response Time: {health.responseTime}</div>}
                        {health.expiresIn && <div>Expires In: {health.expiresIn}</div>}
                        {health.quota && <div>Storage Quota: {health.quota}</div>}
                        {health.features && <div>Features: {health.features}</div>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Admin Tools Tab */}
          {activeTab === 'tools' && (
            <div className="space-y-6">
              <div className="bg-white rounded-lg shadow p-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Administrative Tools</h3>
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                  
                  <AdminToolCard
                    title="Run System Tests"
                    description="Execute comprehensive system tests"
                    icon={Bug}
                    onClick={runSystemTests}
                    loading={isLoading}
                    color="blue"
                  />
                  
                  <AdminToolCard
                    title="Refresh All Data"
                    description="Reload all admin dashboard data"
                    icon={RefreshCw}
                    onClick={handleRefresh}
                    loading={isLoading}
                    color="green"
                  />
                  
                  <AdminToolCard
                    title="Export System Data"
                    description="Download complete system information"
                    icon={Download}
                    onClick={handleExportData}
                    color="purple"
                  />
                  
                  <AdminToolCard
                    title="View System Logs"
                    description="Access detailed system logs"
                    icon={Eye}
                    onClick={() => window.open('/.netlify/functions/admin-logs', '_blank')}
                    color="orange"
                  />
                  
                  <AdminToolCard
                    title="Database Console"
                    description="Access database management tools"
                    icon={Database}
                    onClick={() => window.open('/.netlify/functions/admin-db', '_blank')}
                    color="indigo"
                  />
                  
                  <AdminToolCard
                    title="System Monitor"
                    description="Real-time system monitoring"
                    icon={Monitor}
                    onClick={() => alert('System monitoring dashboard - Feature coming soon')}
                    color="teal"
                    disabled
                  />
                  
                </div>
              </div>

              {/* Danger Zone */}
              <div className="bg-white rounded-lg shadow p-6 border-l-4 border-red-500">
                <h3 className="text-lg font-semibold text-red-900 mb-4 flex items-center">
                  <AlertTriangle className="h-5 w-5 mr-2" />
                  Danger Zone
                </h3>
                <p className="text-sm text-red-700 mb-4">
                  These actions are irreversible and can affect all users. Use with extreme caution.
                </p>
                <div className="space-y-3">
                  <button
                    onClick={() => {
                      if (window.confirm('Are you sure you want to clear all system caches? This may temporarily impact performance.')) {
                        alert('Cache clearing functionality would be implemented here');
                      }
                    }}
                    className="flex items-center space-x-2 px-4 py-2 bg-red-100 text-red-700 rounded hover:bg-red-200 transition-colors"
                  >
                    <Trash2 className="h-4 w-4" />
                    <span>Clear System Caches</span>
                  </button>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// Helper Components
const SystemHealthCard = ({ title, status, message, icon: Icon }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'healthy': return 'text-green-600 bg-green-50 border-green-200';
      case 'warning': return 'text-yellow-600 bg-yellow-50 border-yellow-200';
      case 'error': 
      case 'unhealthy': return 'text-red-600 bg-red-50 border-red-200';
      default: return 'text-gray-600 bg-gray-50 border-gray-200';
    }
  };

  const getStatusIcon = (status) => {
    switch (status) {
      case 'healthy': return <CheckCircle className="h-5 w-5 text-green-500" />;
      case 'warning': return <AlertTriangle className="h-5 w-5 text-yellow-500" />;
      case 'error':
      case 'unhealthy': return <AlertTriangle className="h-5 w-5 text-red-500" />;
      default: return <Clock className="h-5 w-5 text-gray-500" />;
    }
  };

  return (
    <div className={`border rounded-lg p-4 ${getStatusColor(status)}`}>
      <div className="flex items-center justify-between mb-2">
        <div className="flex items-center space-x-2">
          <Icon className="h-5 w-5" />
          <h3 className="font-medium">{title}</h3>
        </div>
        {getStatusIcon(status)}
      </div>
      <p className="text-sm">{message}</p>
    </div>
  );
};

const StatItem = ({ label, value, description, status }) => {
  const getStatusColor = (status) => {
    switch (status) {
      case 'good': return 'text-green-600';
      case 'warning': return 'text-yellow-600';
      case 'error': return 'text-red-600';
      default: return 'text-gray-900';
    }
  };

  return (
    <div className="flex items-center justify-between py-2 border-b border-gray-100 last:border-b-0">
      <div>
        <div className="font-medium text-gray-900">{label}</div>
        <div className="text-sm text-gray-500">{description}</div>
      </div>
      <div className={`text-lg font-bold ${getStatusColor(status)}`}>
        {value}
      </div>
    </div>
  );
};

const StatusBadge = ({ status }) => {
  const getStatusStyle = (status) => {
    switch (status) {
      case 'healthy': return 'bg-green-100 text-green-800 border-green-200';
      case 'warning': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'error':
      case 'unhealthy': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  return (
    <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border ${getStatusStyle(status)}`}>
      {status || 'unknown'}
    </span>
  );
};

const AdminToolCard = ({ title, description, icon: Icon, onClick, loading, color = 'blue', disabled = false }) => {
  const getColorClasses = (color) => {
    const colors = {
      blue: 'bg-blue-50 border-blue-200 hover:bg-blue-100 text-blue-900',
      green: 'bg-green-50 border-green-200 hover:bg-green-100 text-green-900',
      purple: 'bg-purple-50 border-purple-200 hover:bg-purple-100 text-purple-900',
      orange: 'bg-orange-50 border-orange-200 hover:bg-orange-100 text-orange-900',
      indigo: 'bg-indigo-50 border-indigo-200 hover:bg-indigo-100 text-indigo-900',
      teal: 'bg-teal-50 border-teal-200 hover:bg-teal-100 text-teal-900',
      red: 'bg-red-50 border-red-200 hover:bg-red-100 text-red-900'
    };
    return colors[color] || colors.blue;
  };

  return (
    <button
      onClick={onClick}
      disabled={loading || disabled}
      className={`p-4 border rounded-lg text-left transition-colors ${
        disabled 
          ? 'bg-gray-50 border-gray-200 text-gray-400 cursor-not-allowed'
          : getColorClasses(color)
      } ${loading ? 'opacity-50' : ''}`}
    >
      <div className="flex items-center space-x-3 mb-2">
        {loading ? (
          <RefreshCw className="h-5 w-5 animate-spin" />
        ) : (
          <Icon className="h-5 w-5" />
        )}
        <h4 className="font-medium">{title}</h4>
      </div>
      <p className="text-sm opacity-75">{description}</p>
      {disabled && (
        <div className="mt-2">
          <span className="text-xs bg-gray-200 text-gray-600 px-2 py-1 rounded">
            Coming Soon
          </span>
        </div>
      )}
    </button>
  );
};

export default AdminScreen;
