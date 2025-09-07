// src/components/ResourcesView.js - Enhanced with Learning Suggestions
import React, { memo, useState, useEffect } from 'react';
import { Search, ChevronRight, ExternalLink, BookOpen, Brain, RefreshCw, Sparkles, Target, Award } from 'lucide-react';
import learningSuggestionsService from '../services/learningSuggestionsService';

const ResourcesView = memo(({ currentResources = [], user, onSuggestionsUpdate }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [filteredResources, setFilteredResources] = useState(currentResources);
  const [learningSuggestions, setLearningSuggestions] = useState([]);
  const [isLoadingSuggestions, setIsLoadingSuggestions] = useState(false);
  const [activeTab, setActiveTab] = useState('suggestions'); // 'suggestions' or 'resources'
  const [showAllSuggestions, setShowAllSuggestions] = useState(false);

  // Load learning suggestions on component mount and user change
  useEffect(() => {
    if (user?.sub) {
      loadLearningSuggestions();
    }
  }, [user]);

  // Filter resources based on search term
  useEffect(() => {
    if (!searchTerm.trim()) {
      setFilteredResources(currentResources);
    } else {
      const filtered = currentResources.filter(resource =>
        resource.title.toLowerCase().includes(searchTerm.toLowerCase()) ||
        resource.type.toLowerCase().includes(searchTerm.toLowerCase())
      );
      setFilteredResources(filtered);
    }
  }, [currentResources, searchTerm]);

  const loadLearningSuggestions = async () => {
    if (!user?.sub) return;

    setIsLoadingSuggestions(true);
    try {
      console.log('Loading learning suggestions for user:', user.sub);
      const suggestions = await learningSuggestionsService.getLearningSuggestions(user.sub);
      setLearningSuggestions(suggestions);
      
      // Notify parent component about suggestions
      if (onSuggestionsUpdate) {
        onSuggestionsUpdate(suggestions);
      }
    } catch (error) {
      console.error('Error loading learning suggestions:', error);
      setLearningSuggestions([]);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const refreshSuggestions = async () => {
    if (!user?.sub) return;

    setIsLoadingSuggestions(true);
    try {
      console.log('Refreshing learning suggestions...');
      const suggestions = await learningSuggestionsService.refreshSuggestions(user.sub);
      setLearningSuggestions(suggestions);
      
      if (onSuggestionsUpdate) {
        onSuggestionsUpdate(suggestions);
      }
    } catch (error) {
      console.error('Error refreshing suggestions:', error);
    } finally {
      setIsLoadingSuggestions(false);
    }
  };

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleResourceClick = (resource) => {
    // Analytics could be tracked here
    if (resource.url) {
      window.open(resource.url, '_blank', 'noopener,noreferrer');
    }
  };

  const handleSuggestionClick = (suggestion) => {
    // For AI-generated suggestions, we might need to search for actual resources
    // or provide more detailed information
    console.log('Learning suggestion clicked:', suggestion);
    
    // You could implement a modal with more details or search for related resources
    if (suggestion.url) {
      window.open(suggestion.url, '_blank', 'noopener,noreferrer');
    }
  };

  const getDifficultyColor = (difficulty) => {
    switch (difficulty?.toLowerCase()) {
      case 'beginner': return 'bg-green-100 text-green-800 border-green-200';
      case 'intermediate': return 'bg-yellow-100 text-yellow-800 border-yellow-200';
      case 'advanced': return 'bg-red-100 text-red-800 border-red-200';
      default: return 'bg-gray-100 text-gray-800 border-gray-200';
    }
  };

  const getTypeIcon = (type) => {
    switch (type?.toLowerCase()) {
      case 'training': return <BookOpen className="h-4 w-4" />;
      case 'guideline': return <Target className="h-4 w-4" />;
      case 'reference': return <Award className="h-4 w-4" />;
      default: return <BookOpen className="h-4 w-4" />;
    }
  };

  const resourceTypeColors = {
    'Regulation': 'bg-red-50 text-red-700 border-red-200',
    'Guideline': 'bg-blue-50 text-blue-700 border-blue-200',
    'Guidance': 'bg-green-50 text-green-700 border-green-200',
    'Training': 'bg-purple-50 text-purple-700 border-purple-200',
    'Portal': 'bg-orange-50 text-orange-700 border-orange-200',
    'Database': 'bg-gray-50 text-gray-700 border-gray-200',
    'Framework': 'bg-indigo-50 text-indigo-700 border-indigo-200',
    'Template': 'bg-pink-50 text-pink-700 border-pink-200',
    'Report': 'bg-yellow-50 text-yellow-700 border-yellow-200',
    'Reference': 'bg-teal-50 text-teal-700 border-teal-200'
  };

  const displayedSuggestions = showAllSuggestions ? learningSuggestions : learningSuggestions.slice(0, 3);

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full shadow-sm flex flex-col">
      {/* Header */}
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2 flex items-center space-x-2">
              <Brain className="h-5 w-5 text-purple-600" />
              <span>Learning Center</span>
            </h3>
            <p className="text-sm text-gray-500">
              Personalized recommendations and curated resources
            </p>
          </div>
          {activeTab === 'suggestions' && (
            <button
              onClick={refreshSuggestions}
              disabled={isLoadingSuggestions}
              className="flex items-center space-x-1 px-3 py-1 text-sm text-purple-600 hover:text-purple-800 border border-purple-200 rounded-md hover:bg-purple-50 transition-colors disabled:opacity-50"
              title="Refresh learning suggestions"
            >
              <RefreshCw className={`h-3 w-3 ${isLoadingSuggestions ? 'animate-spin' : ''}`} />
              <span>Refresh</span>
            </button>
          )}
        </div>

        {/* Tab Navigation */}
        <div className="flex space-x-1 mb-4">
          <button
            onClick={() => setActiveTab('suggestions')}
            className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'suggestions'
                ? 'bg-purple-100 text-purple-700 border border-purple-200'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <Sparkles className="h-4 w-4" />
            <span>AI Suggestions</span>
            {learningSuggestions.length > 0 && (
              <span className="bg-purple-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {learningSuggestions.length}
              </span>
            )}
          </button>
          <button
            onClick={() => setActiveTab('resources')}
            className={`flex items-center space-x-2 px-3 py-2 text-sm font-medium rounded-md transition-colors ${
              activeTab === 'resources'
                ? 'bg-blue-100 text-blue-700 border border-blue-200'
                : 'text-gray-600 hover:text-gray-800 hover:bg-gray-100'
            }`}
          >
            <BookOpen className="h-4 w-4" />
            <span>Resources</span>
            {currentResources.length > 0 && (
              <span className="bg-blue-600 text-white text-xs px-1.5 py-0.5 rounded-full">
                {currentResources.length}
              </span>
            )}
          </button>
        </div>

        {/* Search input for resources tab */}
        {activeTab === 'resources' && currentResources.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-purple-500 focus:border-transparent"
            />
          </div>
        )}
      </div>
      
      {/* Content Area */}
      <div className="flex-1 overflow-y-auto">
        {/* AI Suggestions Tab */}
        {activeTab === 'suggestions' && (
          <div className="space-y-4">
            {isLoadingSuggestions ? (
              <div className="text-center py-8">
                <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-purple-600 mx-auto mb-4"></div>
                <p className="text-gray-600 text-sm">Analyzing your conversations...</p>
              </div>
            ) : learningSuggestions.length > 0 ? (
              <>
                {/* Personalized Header */}
                <div className="bg-gradient-to-r from-purple-50 to-blue-50 p-4 rounded-lg border border-purple-100 mb-4">
                  <div className="flex items-center space-x-2 mb-2">
                    <Brain className="h-4 w-4 text-purple-600" />
                    <span className="text-sm font-medium text-purple-800">
                      Based on Your Recent Conversations
                    </span>
                  </div>
                  <p className="text-xs text-purple-600">
                    These suggestions are tailored to help you advance your pharmaceutical quality expertise
                  </p>
                </div>

                {/* Suggestions List */}
                {displayedSuggestions.map((suggestion, index) => (
                  <SuggestionCard
                    key={suggestion.id}
                    suggestion={suggestion}
                    onClick={() => handleSuggestionClick(suggestion)}
                    getDifficultyColor={getDifficultyColor}
                    getTypeIcon={getTypeIcon}
                    index={index}
                  />
                ))}

                {/* Show More/Less Button */}
                {learningSuggestions.length > 3 && (
                  <button
                    onClick={() => setShowAllSuggestions(!showAllSuggestions)}
                    className="w-full py-2 px-4 text-sm text-purple-600 hover:text-purple-800 border border-purple-200 rounded-lg hover:bg-purple-50 transition-colors"
                  >
                    {showAllSuggestions 
                      ? `Show Less (${learningSuggestions.length - 3} hidden)` 
                      : `Show ${learningSuggestions.length - 3} More Suggestions`
                    }
                  </button>
                )}
              </>
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-purple-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <Brain className="h-6 w-6 text-purple-600" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No Suggestions Yet</h4>
                <p className="text-gray-600 text-sm mb-4">
                  Start conversations to get personalized learning recommendations
                </p>
                <button
                  onClick={loadLearningSuggestions}
                  className="px-4 py-2 bg-purple-600 text-white rounded-lg text-sm hover:bg-purple-700 transition-colors"
                >
                  Generate Suggestions
                </button>
              </div>
            )}
          </div>
        )}

        {/* Resources Tab */}
        {activeTab === 'resources' && (
          <div className="space-y-4">
            {currentResources.length > 0 ? (
              filteredResources.length > 0 ? (
                filteredResources.map((resource, index) => (
                  <ResourceCard
                    key={`${resource.url}-${index}`}
                    resource={resource}
                    onClick={() => handleResourceClick(resource)}
                    colorClass={resourceTypeColors[resource.type] || resourceTypeColors['Reference']}
                  />
                ))
              ) : (
                <div className="text-center py-8">
                  <Search className="w-8 h-8 text-gray-400 mx-auto mb-3" />
                  <p className="text-gray-600 text-sm">
                    No resources match "{searchTerm}"
                  </p>
                  <button
                    onClick={() => setSearchTerm('')}
                    className="mt-2 text-sm text-blue-600 hover:text-blue-800"
                  >
                    Clear search
                  </button>
                </div>
              )
            ) : (
              <div className="text-center py-12">
                <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                  <BookOpen className="h-6 w-6 text-gray-400" />
                </div>
                <h4 className="text-lg font-medium text-gray-900 mb-2">No resources yet</h4>
                <p className="text-gray-600">
                  Ask a question to see relevant learning resources
                </p>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

// Individual suggestion card component
const SuggestionCard = memo(({ suggestion, onClick, getDifficultyColor, getTypeIcon, index }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="group border border-gray-200 rounded-lg hover:border-purple-300 hover:shadow-md transition-all duration-300 cursor-pointer bg-white"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-3">
          <div className="flex items-center space-x-2">
            <div className="flex items-center space-x-1">
              {getTypeIcon(suggestion.type)}
              <span className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${
                suggestion.type === 'Training' ? 'bg-purple-50 text-purple-700 border-purple-200' :
                suggestion.type === 'Guideline' ? 'bg-blue-50 text-blue-700 border-blue-200' :
                'bg-gray-50 text-gray-700 border-gray-200'
              }`}>
                {suggestion.type}
              </span>
            </div>
            {suggestion.isPersonalized && (
              <span className="inline-flex items-center space-x-1 text-xs bg-gradient-to-r from-purple-100 to-blue-100 text-purple-700 px-2 py-1 rounded-full">
                <Sparkles className="h-3 w-3" />
                <span>AI</span>
              </span>
            )}
          </div>
          
          <ChevronRight 
            className={`h-4 w-4 text-gray-400 group-hover:text-purple-600 transition-all ml-3 flex-shrink-0 ${
              isHovered ? 'translate-x-1' : ''
            }`}
          />
        </div>
        
        <h4 className="font-semibold text-gray-900 group-hover:text-purple-800 mb-2 leading-snug">
          {suggestion.title}
        </h4>
        
        <p className="text-sm text-gray-600 mb-3 line-clamp-2">
          {suggestion.description}
        </p>

        {suggestion.objective && (
          <div className="mb-3">
            <span className="text-xs font-medium text-gray-500">Learning Objective:</span>
            <p className="text-xs text-gray-600 mt-1">{suggestion.objective}</p>
          </div>
        )}
        
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            {suggestion.difficulty && (
              <span className={`text-xs font-medium px-2 py-1 rounded-full border ${getDifficultyColor(suggestion.difficulty)}`}>
                {suggestion.difficulty}
              </span>
            )}
            {suggestion.relevanceScore && (
              <div className="flex items-center space-x-1">
                <span className="text-xs text-gray-500">Relevance:</span>
                <div className="flex space-x-0.5">
                  {[...Array(5)].map((_, i) => (
                    <div
                      key={i}
                      className={`w-2 h-2 rounded-full ${
                        i < Math.round(suggestion.relevanceScore / 2) 
                          ? 'bg-purple-400' 
                          : 'bg-gray-200'
                      }`}
                    />
                  ))}
                </div>
              </div>
            )}
          </div>
          
          {suggestion.isPersonalized && (
            <span className="text-xs text-purple-600 font-medium">
              Personalized
            </span>
          )}
        </div>
      </div>
    </div>
  );
});

// Individual resource card component (existing)
const ResourceCard = memo(({ resource, onClick, colorClass }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div 
      className="group border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-sm transition-all duration-300 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
      onClick={onClick}
      role="button"
      tabIndex={0}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onClick();
        }
      }}
    >
      <div className="p-4">
        <div className="flex items-start justify-between">
          <div className="flex-1 min-w-0">
            <div className="flex items-center space-x-2 mb-3">
              <span 
                className={`text-xs font-semibold uppercase tracking-wide px-2 py-1 rounded-full border ${colorClass}`}
              >
                {resource.type}
              </span>
            </div>
            
            <h4 className="font-semibold text-gray-900 group-hover:text-black mb-2 leading-snug">
              {resource.title}
            </h4>
            
            <div className="flex items-center text-sm text-gray-500">
              <ExternalLink className="h-3 w-3 mr-1" />
              <span className="truncate">
                {new URL(resource.url).hostname}
              </span>
            </div>
          </div>
          
          <ChevronRight 
            className={`h-4 w-4 text-gray-400 group-hover:text-black transition-all ml-3 flex-shrink-0 ${
              isHovered ? 'translate-x-1' : ''
            }`}
          />
        </div>
        
        {/* Progress indicator for known long resources */}
        {resource.type === 'Guideline' && (
          <div className="mt-3 pt-2 border-t border-gray-100">
            <div className="flex items-center text-xs text-gray-500">
              <BookOpen className="h-3 w-3 mr-1" />
              <span>Comprehensive guidance document</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
});

SuggestionCard.displayName = 'SuggestionCard';
ResourceCard.displayName = 'ResourceCard';
ResourcesView.displayName = 'ResourcesView';

export default ResourcesView;
