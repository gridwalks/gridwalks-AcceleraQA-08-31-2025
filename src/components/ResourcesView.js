import React, { memo, useState } from 'react';
import { Search, ChevronRight, ExternalLink, BookOpen } from 'lucide-react';

// Provide a default empty array for currentResources to prevent runtime errors
// when the prop is omitted. This ensures array methods like `.filter` and `.length`
// are always safe to use.
const ResourcesView = memo(({ currentResources = [] }) => {
  const [searchTerm, setSearchTerm] = useState('');
  // Initialize filteredResources with a safe default value
  const [filteredResources, setFilteredResources] = useState(currentResources);

  React.useEffect(() => {
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

  const handleSearchChange = (e) => {
    setSearchTerm(e.target.value);
  };

  const handleResourceClick = (resource) => {
    // Analytics could be tracked here
    window.open(resource.url, '_blank', 'noopener,noreferrer');
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

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full shadow-sm">
      <div className="mb-6">
        <div className="flex items-center justify-between mb-4">
          <div>
            <h3 className="text-lg font-bold text-gray-900 mb-2">Learning Resources</h3>
            <p className="text-sm text-gray-500">
              Curated resources for your query
            </p>
          </div>
          <BookOpen className="h-6 w-6 text-gray-400" />
        </div>

        {/* Search input when resources are available */}
        {currentResources.length > 0 && (
          <div className="relative">
            <Search className="absolute left-3 top-1/2 transform -translate-y-1/2 h-4 w-4 text-gray-400" />
            <input
              type="text"
              placeholder="Search resources..."
              value={searchTerm}
              onChange={handleSearchChange}
              className="w-full pl-10 pr-4 py-2 text-sm border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent"
            />
          </div>
        )}
      </div>
      
      {currentResources.length > 0 ? (
        <div className="space-y-4 overflow-y-auto h-[calc(100%-140px)]">
          {filteredResources.length > 0 ? (
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
          )}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <Search className="h-6 w-6 text-gray-400" />
          </div>
          <h4 className="text-lg font-medium text-gray-900 mb-2">No resources yet</h4>
          <p className="text-gray-600">
            Ask a question to see relevant learning resources
          </p>
        </div>
      )}
    </div>
  );
});

// Individual resource card component
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

ResourceCard.displayName = 'ResourceCard';
ResourcesView.displayName = 'ResourcesView';

export default ResourcesView;
