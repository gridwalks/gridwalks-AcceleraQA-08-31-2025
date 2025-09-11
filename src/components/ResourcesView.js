// src/components/ResourcesView.js - ENHANCED WITH AI LEARNING SUGGESTIONS
import React, { useState, useEffect } from 'react';
import { 
  BookOpen, 
  ExternalLink, 
  Clock, 
  Star, 
  Brain,
  Sparkles,
  TrendingUp,
  Target,
  RefreshCw,
  AlertCircle,
  CheckCircle,
  Users,
  Award
} from 'lucide-react';
import learningSuggestionsService from '../services/learningSuggestionsService';

const ResourcesView = ({ user, learningSuggestions = [], onRefreshSuggestions }) => {
  const [activeTab, setActiveTab] = useState('ai-suggestions');
  const [suggestions, setSuggestions] = useState(learningSuggestions);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [lastRefresh, setLastRefresh] = useState(null);

  // Static learning resources
  const staticResources = [
    {
      id: 'fda-gmp',
      title: 'FDA GMP Guidelines',
      description: 'Comprehensive guide to Current Good Manufacturing Practices for pharmaceutical manufacturing.',
      url: 'https://www.fda.gov/drugs/pharmaceutical-quality-resources/current-good-manufacturing-practice-cgmp-regulations',
      category: 'Regulatory',
      difficulty: 'Intermediate',
      estimatedTime: '45 minutes'
    },
    {
      id: 'ich-q7',
      title: 'ICH Q7 - API GMP Guide',
      description: 'International guidelines for Good Manufacturing Practice for Active Pharmaceutical Ingredients.',
      url: 'https://database.ich.org/sites/default/files/Q7_Guideline.pdf',
      category: 'GMP',
      difficulty: 'Advanced',
      estimatedTime: '60 minutes'
    },
    {
      id: 'validation-guide',
      title: 'Equipment Validation Fundamentals',
      description: 'Learn the basics of IQ, OQ, and PQ validation protocols with practical examples.',
      url: '#',
      category: 'Validation',
      difficulty: 'Beginner',
      estimatedTime: '30 minutes'
    },
    {
      id: 'capa-training',
      title: 'CAPA Investigation Best Practices',
      description: 'Master corrective and preventive action investigations with root cause analysis techniques.',
      url: '#',
      category: 'Quality Management',
      difficulty: 'Intermediate',
      estimatedTime: '40 minutes'
    }
  ];

  useEffect(() => {
    setSuggestions(learningSuggestions);
    if (learningSuggestions.length > 0) {
      setLastRefresh(new Date());
    }
  }, [learningSuggestions]);

  const handleRefreshSuggestions = async () => {
    if (!user) return;

    setIsLoadingSuggestions(true);
    try {
      const newSuggestions = await learningSuggestionsService.refreshSuggestions(user.sub);
      setSuggestions(newSuggestions);
      setLastRefresh(new Date());
      if (onRefreshSuggestions) {
        onRefreshSuggestions(newSuggestions);
      }
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'text-green-600 bg-green-100';
      case 'intermediate': return 'text-yellow-600 bg-yellow-100';
      case 'advanced': return 'text-red-600 bg-red-100';
      default: return 'text-gray-600 bg-gray-100';
    }
  };

  const getCategoryColor = (category) => {
    const colors = {
      'GMP': 'text-blue-600 bg-blue-100',
      'Validation': 'text-purple-600 bg-purple-100',
      'CAPA': 'text-orange-600 bg-orange-100',
      'Quality Control': 'text-teal-600 bg-teal-100',
      'Quality Assurance': 'text-indigo-600 bg-indigo-100',
      'Regulatory Affairs': 'text-red-600 bg-red-100',
      'Manufacturing': 'text-green-600 bg-green-100',
      'Documentation': 'text-gray-600 bg-gray-100',
      'General': 'text-slate-600 bg-slate-100'
    };
    return colors[category] || colors['General'];
  };

  const renderRelevanceStars = (relevance) => {
    return (
      <div className="flex items-center space-x-1">
        {[1, 2, 3, 4, 5].map((star) => (
          <Star
            key={star}
            className={`h-3 w-3 ${
              star <= relevance ? 'text-yellow-400 fill-current' : 'text-gray-300'
            }`}
          />
        ))}
        <span className="text-xs text-gray-500 ml-1">({relevance}/5)</span>
      </div>
    );
  };

  const renderAISuggestions = () => (
    <div className="space-y-4">
      {/* Header with refresh */}
      <div className="flex items-center justify-between mb-6">
        <div className="flex items-center space-x-2">
          <Brain className="h-5 w-5 text-purple-600" />
          <h3 className="text-lg font-semibold text-gray-900">AI-Powered Learning Suggestions</h3>
          {suggestions.length > 0 && (
            <span className="bg-purple-100 text-purple-700 text-xs px-2 py-1 rounded-full">
              {suggestions.length} personalized
            </span>
          )}
        </div>
        
        <button
          onClick={handleRefreshSuggestions}
          disabled={isLoadingSuggestions}
          className="flex items-center space-x-1 text-sm text-purple-600 hover:text-purple-700 disabled:opacity-50"
        >
          <RefreshCw className={`h-4 w-4 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* Last refresh info */}
      {lastRefresh && (
        <div className="text-xs text-gray-500 mb-4 flex items-center space-x-1">
          <Clock className="h-3 w-3" />
          <span>Last updated: {lastRefresh.toLocaleTimeString()}</span>
        </div>
      )}

      {/* Suggestions list */}
      {isLoadingSuggestions ? (
        <div className="flex items-center justify-center py-8">
          <RefreshCw className="h-6 w-6 animate-spin text-purple-600 mr-2" />
          <span className="text-gray-600">Generating personalized suggestions...</span>
        </div>
      ) : suggestions.length === 0 ? (
        <div className="text-center py-8">
          <Brain className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">No AI Suggestions Yet</h4>
          <p className="text-gray-600 mb-4">
            Start a few conversations to get personalized learning recommendations based on your interests.
          </p>
          <button
            onClick={handleRefreshSuggestions}
            className="bg-purple-600 text-white px-4 py-2 rounded-lg hover:bg-purple-700"
          >
            Generate Suggestions
          </button>
        </div>
      ) : (
        <div className="space-y-4">
          {suggestions.map((suggestion) => (
            <div
              key={suggestion.id}
              className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
            >
              <div className="flex items-start justify-between mb-3">
                <div className="flex-1">
                  <div className="flex items-center space-x-2 mb-2">
                    <h4 className="text-md font-semibold text-gray-900">{suggestion.title}</h4>
                    {suggestion.source === 'AI-Generated' && (
                      <Sparkles className="h-4 w-4 text-purple-500" />
                    )}
                  </div>
                  
                  <p className="text-sm text-gray-600 mb-3">{suggestion.description}</p>
                  
                  {suggestion.actionable && (
                    <div className="bg-blue-50 border-l-4 border-blue-400 p-3 mb-3">
                      <div className="flex items-center space-x-2">
                        <Target className="h-4 w-4 text-blue-600" />
                        <span className="text-sm font-medium text-blue-900">Next Step:</span>
                      </div>
                      <p className="text-sm text-blue-800 mt-1">{suggestion.actionable}</p>
                    </div>
                  )}
                </div>
              </div>

              <div className="flex items-center justify-between">
                <div className="flex items-center space-x-3">
                  {/* Category */}
                  <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(suggestion.category)}`}>
                    {suggestion.category}
                  </span>
                  
                  {/* Difficulty */}
                  <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(suggestion.difficulty)}`}>
                    {suggestion.difficulty}
                  </span>
                  
                  {/* Time estimate */}
                  <div className="flex items-center space-x-1 text-xs text-gray-500">
                    <Clock className="h-3 w-3" />
                    <span>{suggestion.estimatedTime}</span>
                  </div>
                </div>

                {/* Relevance score */}
                <div className="flex items-center space-x-2">
                  {renderRelevanceStars(suggestion.relevance)}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );

  const renderStaticResources = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-6">
        <BookOpen className="h-5 w-5 text-blue-600" />
        <h3 className="text-lg font-semibold text-gray-900">Essential Learning Resources</h3>
      </div>

      <div className="space-y-4">
        {staticResources.map((resource) => (
          <div
            key={resource.id}
            className="bg-white border border-gray-200 rounded-lg p-4 hover:shadow-md transition-shadow"
          >
            <div className="flex items-start justify-between mb-3">
              <div className="flex-1">
                <h4 className="text-md font-semibold text-gray-900 mb-2">{resource.title}</h4>
                <p className="text-sm text-gray-600 mb-3">{resource.description}</p>
              </div>
              {resource.url !== '#' && (
                <ExternalLink className="h-4 w-4 text-gray-400 ml-2 flex-shrink-0" />
              )}
            </div>

            <div className="flex items-center justify-between">
              <div className="flex items-center space-x-3">
                <span className={`text-xs px-2 py-1 rounded-full ${getCategoryColor(resource.category)}`}>
                  {resource.category}
                </span>
                <span className={`text-xs px-2 py-1 rounded-full ${getDifficultyColor(resource.difficulty)}`}>
                  {resource.difficulty}
                </span>
                <div className="flex items-center space-x-1 text-xs text-gray-500">
                  <Clock className="h-3 w-3" />
                  <span>{resource.estimatedTime}</span>
                </div>
              </div>

              {resource.url !== '#' && (
                <a
                  href={resource.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-blue-600 hover:text-blue-700 text-sm font-medium flex items-center space-x-1"
                >
                  <span>Access Resource</span>
                  <ExternalLink className="h-3 w-3" />
                </a>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );

  const renderLearningProgress = () => (
    <div className="space-y-4">
      <div className="flex items-center space-x-2 mb-6">
        <TrendingUp className="h-5 w-5 text-green-600" />
        <h3 className="text-lg font-semibold text-gray-900">Learning Progress</h3>
      </div>

      <div className="bg-white border border-gray-200 rounded-lg p-6">
        <div className="text-center">
          <Award className="h-12 w-12 text-gray-400 mx-auto mb-4" />
          <h4 className="text-lg font-medium text-gray-900 mb-2">Progress Tracking Coming Soon</h4>
          <p className="text-gray-600">
            Track your learning journey and achievements as you complete resources and apply knowledge.
          </p>
        </div>
      </div>
    </div>
  );

  const tabs = [
    { id: 'ai-suggestions', label: 'AI Suggestions', icon: Brain, count: suggestions.length },
    { id: 'resources', label: 'Learning Resources', icon: BookOpen, count: staticResources.length },
    { id: 'progress', label: 'Progress', icon: TrendingUp, count: null }
  ];

  return (
    <div className="flex flex-col h-full">
      {/* Tab Navigation */}
      <div className="border-b border-gray-200 mb-6">
        <nav className="flex space-x-8">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex items-center space-x-2 py-2 px-1 border-b-2 font-medium text-sm transition-colors ${
                  activeTab === tab.id
                    ? 'border-blue-500 text-blue-600'
                    : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
                }`}
              >
                <Icon className="h-4 w-4" />
                <span>{tab.label}</span>
                {tab.count !== null && (
                  <span className={`inline-flex items-center justify-center px-2 py-1 text-xs font-bold leading-none rounded-full ${
                    activeTab === tab.id ? 'bg-blue-100 text-blue-600' : 'bg-gray-100 text-gray-600'
                  }`}>
                    {tab.count}
                  </span>
                )}
              </button>
            );
          })}
        </nav>
      </div>

      {/* Tab Content */}
      <div className="flex-1 overflow-y-auto">
        {activeTab === 'ai-suggestions' && renderAISuggestions()}
        {activeTab === 'resources' && renderStaticResources()}
        {activeTab === 'progress' && renderLearningProgress()}
      </div>
    </div>
  );
};

export default ResourcesView;
