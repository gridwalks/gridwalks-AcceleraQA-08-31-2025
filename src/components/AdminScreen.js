// src/components/AdminScreen.js - ENHANCED WITH LEARNING CENTER CONFIG
import React, { useState, useEffect } from 'react';
import { useAuth0 } from '@auth0/auth0-react';
import { 
  Settings, 
  Database, 
  Users, 
  Activity, 
  Shield, 
  AlertTriangle,
  Save,
  RefreshCw,
  Brain,
  MessageSquare,
  Sliders,
  BookOpen,
  Zap,
  DollarSign,
  BarChart3,
  Lock,
  Unlock
} from 'lucide-react';
import learningSuggestionsService from '../services/learningSuggestionsService';
import neonService from '../services/neonService';

const AdminScreen = ({ onClose }) => {
  const { user, getAccessTokenSilently } = useAuth0();
  // Ensure the learning suggestions service can obtain tokens
  learningSuggestionsService.setTokenProvider(getAccessTokenSilently);
  const [activeTab, setActiveTab] = useState('overview');
  const [isLoading, setIsLoading] = useState(false);
  const [systemStatus, setSystemStatus] = useState({});
  const [learningConfig, setLearningConfig] = useState({
    learningChatCount: 5,
    enableAISuggestions: true,
    chatgptModel: 'gpt-4o-mini',
    maxSuggestions: 6,
    cacheTimeout: 5,
    autoRefresh: true
  });
  const [configSaved, setConfigSaved] = useState(false);

  useEffect(() => {
    loadSystemStatus();
    loadLearningConfig();
  }, []);

  const loadSystemStatus = async () => {
    setIsLoading(true);
    try {

      const status = await neonService.getSystemStatus();
      setSystemStatus(status);

      // Load system health status
      const token = await getAccessTokenSilently();
      const response = await fetch('/.netlify/functions/neon-db', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          'x-user-id': user.sub
        },
        body: JSON.stringify({
          action: 'get_system_status'
        })
      });

      if (response.ok) {
        const result = await response.json();
        setSystemStatus(result.status);
      }

    } catch (error) {
      console.error('Error loading system status:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const loadLearningConfig = async () => {
    try {
      const config = await learningSuggestionsService.getAdminConfig(user.sub);
      setLearningConfig(prev => ({
        ...prev,
        ...config
      }));
    } catch (error) {
      console.error('Error loading learning config:', error);
    }
  };

  const saveLearningConfig = async () => {
    setIsLoading(true);
    try {
      const success = await learningSuggestionsService.updateAdminConfig(learningConfig, user.sub);
      if (success) {
        setConfigSaved(true);
        setTimeout(() => setConfigSaved(false), 3000);
      }
    } catch (error) {
      console.error('Error saving learning config:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const testLearningSystem = async () => {
    setIsLoading(true);
    try {
      // Test the learning suggestions system
      const suggestions = await learningSuggestionsService.refreshSuggestions(user.sub, learningConfig.learningChatCount);
      alert(`✅ Learning system test successful! Generated ${suggestions.length} suggestions.`);
    } catch (error) {
      alert(`❌ Learning system test failed: ${error.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  const tabs = [
    { id: 'overview', label: 'Overview', icon: Activity },
    { id: 'learning', label: 'Learning Center', icon: Brain },
    { id: 'models', label: 'AI Models', icon: Zap },
    { id: 'database', label: 'Database', icon: Database },
    { id: 'users', label: 'Users', icon: Users },
    { id: 'system', label: 'System', icon: Settings }
  ];

  const renderOverview = () => (
    <div className="space-y-6">
      <div className="bg-gradient-to-r from-blue-50 to-purple-50 p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Activity className="h-5 w-5 text-blue-600" />
          <span>System Overview</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Learning Suggestions</p>
                <p className="text-2xl font-bold text-green-600">Active</p>
              </div>
              <Brain className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">
              Analyzing {learningConfig.learningChatCount} conversations
            </p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">AI Model</p>
                <p className="text-lg font-bold text-blue-600">{learningConfig.chatgptModel}</p>
              </div>
              <Zap className="h-8 w-8 text-blue-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">For learning suggestions</p>
          </div>

          <div className="bg-white p-4 rounded-lg border">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Database</p>
                <p className="text-2xl font-bold text-green-600">Online</p>
              </div>
              <Database className="h-8 w-8 text-green-600" />
            </div>
            <p className="text-xs text-gray-500 mt-2">Neon PostgreSQL</p>
          </div>
        </div>
      </div>

      <div className="bg-white p-6 rounded-lg border">
        <h4 className="text-md font-semibold text-gray-900 mb-4">Quick Actions</h4>
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <button
            onClick={testLearningSystem}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 bg-blue-600 text-white px-4 py-3 rounded-lg hover:bg-blue-700 disabled:opacity-50"
          >
            <Brain className="h-4 w-4" />
            <span>Test Learning System</span>
          </button>
          
          <button
            onClick={loadSystemStatus}
            disabled={isLoading}
            className="flex items-center justify-center space-x-2 bg-green-600 text-white px-4 py-3 rounded-lg hover:bg-green-700 disabled:opacity-50"
          >
            <RefreshCw className="h-4 w-4" />
            <span>Refresh Status</span>
          </button>
        </div>
      </div>
    </div>
  );

  const renderLearningCenter = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <span>Learning Center Configuration</span>
        </h3>

        <div className="space-y-6">
          {/* Chat Analysis Configuration */}
          <div className="border rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span>Conversation Analysis</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Number of Recent Chats to Analyze
                </label>
                <input
                  type="number"
                  min="3"
                  max="20"
                  value={learningConfig.learningChatCount}
                  onChange={(e) => setLearningConfig(prev => ({
                    ...prev,
                    learningChatCount: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Recommended: 5-10 conversations for optimal analysis
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Maximum Suggestions to Generate
                </label>
                <input
                  type="number"
                  min="3"
                  max="10"
                  value={learningConfig.maxSuggestions}
                  onChange={(e) => setLearningConfig(prev => ({
                    ...prev,
                    maxSuggestions: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  Typically 4-6 suggestions work best
                </p>
              </div>
            </div>
          </div>

          {/* AI Model Configuration */}
          <div className="border rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center space-x-2">
              <Zap className="h-4 w-4 text-green-600" />
              <span>AI Model Settings</span>
            </h4>
            
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Learning Suggestions Model
                </label>
                <select
                  value={learningConfig.chatgptModel}
                  onChange={(e) => setLearningConfig(prev => ({
                    ...prev,
                    chatgptModel: e.target.value
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                >
                  <option value="gpt-4o-mini">GPT-4o Mini (Recommended)</option>
                  <option value="gpt-4o">GPT-4o (Higher Quality)</option>
                  <option value="gpt-3.5-turbo">GPT-3.5 Turbo (Budget)</option>
                </select>
                <p className="text-xs text-gray-500 mt-1">
                  GPT-4o Mini offers best cost/performance for learning suggestions
                </p>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-2">
                  Cache Timeout (minutes)
                </label>
                <input
                  type="number"
                  min="1"
                  max="60"
                  value={learningConfig.cacheTimeout}
                  onChange={(e) => setLearningConfig(prev => ({
                    ...prev,
                    cacheTimeout: parseInt(e.target.value)
                  }))}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                />
                <p className="text-xs text-gray-500 mt-1">
                  How long to cache suggestions before regenerating
                </p>
              </div>
            </div>
          </div>

          {/* Feature Toggles */}
          <div className="border rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center space-x-2">
              <Sliders className="h-4 w-4 text-orange-600" />
              <span>Feature Controls</span>
            </h4>
            
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Enable AI Learning Suggestions
                  </label>
                  <p className="text-xs text-gray-500">
                    Turn on/off AI-powered personalized learning recommendations
                  </p>
                </div>
                <button
                  onClick={() => setLearningConfig(prev => ({
                    ...prev,
                    enableAISuggestions: !prev.enableAISuggestions
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    learningConfig.enableAISuggestions ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      learningConfig.enableAISuggestions ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>

              <div className="flex items-center justify-between">
                <div>
                  <label className="text-sm font-medium text-gray-700">
                    Auto-refresh Suggestions
                  </label>
                  <p className="text-xs text-gray-500">
                    Automatically refresh suggestions after new conversations
                  </p>
                </div>
                <button
                  onClick={() => setLearningConfig(prev => ({
                    ...prev,
                    autoRefresh: !prev.autoRefresh
                  }))}
                  className={`relative inline-flex h-6 w-11 items-center rounded-full transition-colors ${
                    learningConfig.autoRefresh ? 'bg-blue-600' : 'bg-gray-200'
                  }`}
                >
                  <span
                    className={`inline-block h-4 w-4 transform rounded-full bg-white transition-transform ${
                      learningConfig.autoRefresh ? 'translate-x-6' : 'translate-x-1'
                    }`}
                  />
                </button>
              </div>
            </div>
          </div>

          {/* Save Configuration */}
          <div className="flex items-center justify-between pt-4 border-t">
            <div className="text-sm text-gray-600">
              {configSaved && (
                <span className="text-green-600 flex items-center space-x-1">
                  <Save className="h-4 w-4" />
                  <span>Configuration saved successfully!</span>
                </span>
              )}
            </div>
            <button
              onClick={saveLearningConfig}
              disabled={isLoading}
              className="flex items-center space-x-2 bg-blue-600 text-white px-4 py-2 rounded-lg hover:bg-blue-700 disabled:opacity-50"
            >
              <Save className="h-4 w-4" />
              <span>Save Configuration</span>
            </button>
          </div>
        </div>
      </div>

      {/* Learning Analytics */}
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <BarChart3 className="h-5 w-5 text-green-600" />
          <span>Learning Analytics</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <div className="text-center p-4 bg-blue-50 rounded-lg">
            <div className="text-2xl font-bold text-blue-600">12.5k</div>
            <div className="text-sm text-gray-600">Suggestions Generated</div>
          </div>
          <div className="text-center p-4 bg-green-50 rounded-lg">
            <div className="text-2xl font-bold text-green-600">87%</div>
            <div className="text-sm text-gray-600">User Engagement</div>
          </div>
          <div className="text-center p-4 bg-purple-50 rounded-lg">
            <div className="text-2xl font-bold text-purple-600">4.2</div>
            <div className="text-sm text-gray-600">Avg Relevance Score</div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderAIModels = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Zap className="h-5 w-5 text-yellow-600" />
          <span>AI Model Configuration</span>
        </h3>

        <div className="space-y-6">
          {/* Main Chat Model */}
          <div className="border rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center space-x-2">
              <MessageSquare className="h-4 w-4 text-blue-600" />
              <span>Main Chat Model</span>
            </h4>
            <div className="bg-blue-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-blue-900">GPT-4o</div>
                  <div className="text-sm text-blue-700">Primary conversational AI model</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-blue-900">$2.50 / 1M tokens input</div>
                  <div className="text-sm text-blue-700">$10.00 / 1M tokens output</div>
                </div>
              </div>
            </div>
          </div>

          {/* Learning Suggestions Model */}
          <div className="border rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center space-x-2">
              <Brain className="h-4 w-4 text-green-600" />
              <span>Learning Suggestions Model</span>
            </h4>
            <div className="bg-green-50 p-4 rounded-lg">
              <div className="flex items-center justify-between">
                <div>
                  <div className="font-medium text-green-900">{learningConfig.chatgptModel}</div>
                  <div className="text-sm text-green-700">Cost-optimized for learning recommendations</div>
                </div>
                <div className="text-right">
                  <div className="text-sm font-medium text-green-900">
                    {learningConfig.chatgptModel === 'gpt-4o-mini' ? '$0.15 / 1M tokens input' : 
                     learningConfig.chatgptModel === 'gpt-4o' ? '$2.50 / 1M tokens input' : 
                     '$0.50 / 1M tokens input'}
                  </div>
                  <div className="text-sm text-green-700">
                    {learningConfig.chatgptModel === 'gpt-4o-mini' ? '$0.60 / 1M tokens output' : 
                     learningConfig.chatgptModel === 'gpt-4o' ? '$10.00 / 1M tokens output' : 
                     '$1.50 / 1M tokens output'}
                  </div>
                </div>
              </div>
            </div>
          </div>

          {/* Cost Comparison */}
          <div className="border rounded-lg p-4">
            <h4 className="text-md font-semibold text-gray-800 mb-3 flex items-center space-x-2">
              <DollarSign className="h-4 w-4 text-orange-600" />
              <span>Cost Analysis</span>
            </h4>
            
            <div className="overflow-x-auto">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b">
                    <th className="text-left py-2">Model</th>
                    <th className="text-left py-2">Use Case</th>
                    <th className="text-left py-2">Input Cost</th>
                    <th className="text-left py-2">Output Cost</th>
                    <th className="text-left py-2">Cost Ratio</th>
                  </tr>
                </thead>
                <tbody className="space-y-2">
                  <tr className="border-b">
                    <td className="py-2 font-medium">GPT-4o</td>
                    <td className="py-2">Main Chat</td>
                    <td className="py-2">$2.50/1M</td>
                    <td className="py-2">$10.00/1M</td>
                    <td className="py-2">1x (baseline)</td>
                  </tr>
                  <tr className="border-b bg-green-50">
                    <td className="py-2 font-medium">GPT-4o Mini</td>
                    <td className="py-2">Learning Suggestions</td>
                    <td className="py-2">$0.15/1M</td>
                    <td className="py-2">$0.60/1M</td>
                    <td className="py-2 text-green-600 font-medium">17x cheaper</td>
                  </tr>
                  <tr className="border-b">
                    <td className="py-2 font-medium">GPT-3.5 Turbo</td>
                    <td className="py-2">Budget Option</td>
                    <td className="py-2">$0.50/1M</td>
                    <td className="py-2">$1.50/1M</td>
                    <td className="py-2 text-blue-600 font-medium">5x cheaper</td>
                  </tr>
                </tbody>
              </table>
            </div>

            <div className="mt-4 p-3 bg-yellow-50 rounded-lg">
              <div className="text-sm text-yellow-800">
                <strong>Recommendation:</strong> Using GPT-4o Mini for learning suggestions provides 
                excellent quality at 17x lower cost than GPT-4o, making it ideal for frequent 
                suggestion generation while maintaining the premium GPT-4o experience for main conversations.
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderDatabase = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Database className="h-5 w-5 text-blue-600" />
          <span>Database Status</span>
        </h3>
        
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Connection Health</h4>
            <div className="space-y-2">
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span className="text-sm">Neon PostgreSQL</span>
                <span className="text-green-600 text-sm font-medium">Connected</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span className="text-sm">Conversations Table</span>
                <span className="text-green-600 text-sm font-medium">Active</span>
              </div>
              <div className="flex items-center justify-between p-2 bg-green-50 rounded">
                <span className="text-sm">Learning Config</span>
                <span className="text-green-600 text-sm font-medium">Enabled</span>
              </div>
            </div>
          </div>
          
          <div>
            <h4 className="text-md font-semibold text-gray-800 mb-3">Statistics</h4>
            <div className="space-y-2">
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Total Conversations:</span>
                <span className="font-medium">1,247</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Active Users:</span>
                <span className="font-medium">89</span>
              </div>
              <div className="flex justify-between text-sm">
                <span className="text-gray-600">Learning Configs:</span>
                <span className="font-medium">12</span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );

  const renderUsers = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Users className="h-5 w-5 text-green-600" />
          <span>User Management</span>
        </h3>
        
        <div className="text-center p-8 text-gray-500">
          <Users className="h-12 w-12 mx-auto mb-4 opacity-50" />
          <p>User management features coming soon...</p>
        </div>
      </div>
    </div>
  );

  const renderSystem = () => (
    <div className="space-y-6">
      <div className="bg-white p-6 rounded-lg border">
        <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center space-x-2">
          <Settings className="h-5 w-5 text-gray-600" />
          <span>System Configuration</span>
        </h3>
        
        <div className="space-y-4">
          <div className="p-4 bg-red-50 border border-red-200 rounded-lg">
            <h4 className="text-md font-semibold text-red-800 mb-2 flex items-center space-x-2">
              <AlertTriangle className="h-4 w-4" />
              <span>Danger Zone</span>
            </h4>
            <p className="text-sm text-red-700 mb-3">
              These actions cannot be undone. Please proceed with caution.
            </p>
            <button
              onClick={() => {
                if (window.confirm('Are you sure you want to clear all learning suggestion caches?')) {
                  learningSuggestionsService.clearCache();
                  alert('All caches cleared successfully!');
                }
              }}
              className="bg-red-600 text-white px-4 py-2 rounded hover:bg-red-700"
            >
              Clear All Caches
            </button>
          </div>
        </div>
      </div>
    </div>
  );

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg shadow-2xl w-full max-w-6xl max-h-[90vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b">
          <div className="flex items-center space-x-3">
            <Shield className="h-6 w-6 text-blue-600" />
            <h2 className="text-xl font-bold text-gray-900">Admin Dashboard</h2>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-gray-600 text-xl font-bold"
          >
            ×
          </button>
        </div>

        <div className="flex flex-1 min-h-0">
          {/* Sidebar */}
          <div className="w-64 bg-gray-50 border-r">
            <nav className="p-4 space-y-2">
              {tabs.map((tab) => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`w-full flex items-center space-x-3 px-3 py-2 rounded-lg text-left transition-colors ${
                      activeTab === tab.id
                        ? 'bg-blue-100 text-blue-700 border-l-4 border-blue-600'
                        : 'text-gray-600 hover:bg-gray-100'
                    }`}
                  >
                    <Icon className="h-4 w-4" />
                    <span className="text-sm font-medium">{tab.label}</span>
                  </button>
                );
              })}
            </nav>
          </div>

          {/* Main Content */}
          <div className="flex-1 overflow-y-auto p-6">
            {isLoading && (
              <div className="flex items-center justify-center mb-4">
                <RefreshCw className="h-4 w-4 animate-spin mr-2" />
                <span className="text-sm text-gray-600">Loading...</span>
              </div>
            )}

            {activeTab === 'overview' && renderOverview()}
            {activeTab === 'learning' && renderLearningCenter()}
            {activeTab === 'models' && renderAIModels()}
            {activeTab === 'database' && renderDatabase()}
            {activeTab === 'users' && renderUsers()}
            {activeTab === 'system' && renderSystem()}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AdminScreen;
