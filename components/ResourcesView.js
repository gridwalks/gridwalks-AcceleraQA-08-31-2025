import React from 'react';
import { Search, ChevronRight } from 'lucide-react';

const ResourcesView = ({ currentResources }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
      <div className="mb-6">
        <h3 className="text-lg font-bold text-gray-900 mb-2">Further Learning</h3>
        <p className="text-sm text-gray-500">Curated resources for your query</p>
      </div>
      
      {currentResources.length > 0 ? (
        <div className="space-y-4 overflow-y-auto h-[calc(100%-100px)]">
          {currentResources.map((resource, index) => (
            <div key={index} className="group border border-gray-200 rounded-lg hover:border-gray-400 transition-all duration-300">
              <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block p-4">
                <div className="flex items-start justify-between">
                  <div className="flex-1">
                    <div className="flex items-center space-x-2 mb-2">
                      <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                        {resource.type}
                      </span>
                    </div>
                    <h4 className="font-semibold text-gray-900 group-hover:text-black mb-2 leading-snug">
                      {resource.title}
                    </h4>
                  </div>
                  <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all ml-3 flex-shrink-0" />
                </div>
              </a>
            </div>
          ))}
        </div>
      ) : (
        <div className="text-center py-12">
          <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
            <Search className="h-6 w-6 text-gray-400" />
          </div>
          <p className="text-gray-500">Ask a question to see relevant learning resources</p>
        </div>
      )}
    </div>
  );
};

export default ResourcesView;
