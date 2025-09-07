import React, { useState } from 'react';
import { X, Download, Search } from 'lucide-react';
import NotebookView from './NotebookView';

const NotebookOverlay = ({
  messages,
  thirtyDayMessages,
  selectedMessages,
  setSelectedMessages,
  generateStudyNotes,
  isGeneratingNotes,
  storedMessageCount,
  isServerAvailable,
  exportNotebook,
  onClose
}) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [sortOrder, setSortOrder] = useState('desc');

  const handleExportClick = () => {
    try {
      exportNotebook();
    } catch (error) {
      console.error('Export failed:', error);
    }
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <h2 className="text-xl font-semibold text-gray-900">Notebook</h2>
            <div className="flex items-center space-x-2">
              <div className="relative">
                <Search className="h-4 w-4 absolute left-3 top-1/2 -translate-y-1/2 text-gray-400" />
                <input
                  type="text"
                  value={searchTerm}
                  onChange={(e) => setSearchTerm(e.target.value)}
                  placeholder="Search..."
                  className="pl-9 pr-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-gray-500 text-sm w-48"
                  aria-label="Search notebook"
                />
              </div>
              <select
                value={sortOrder}
                onChange={(e) => setSortOrder(e.target.value)}
                className="text-sm border border-gray-300 rounded-md py-2 px-3 focus:outline-none focus:ring-2 focus:ring-gray-500"
                aria-label="Sort conversations"
              >
                <option value="desc">Newest first</option>
                <option value="asc">Oldest first</option>
              </select>
              <button
                onClick={handleExportClick}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-black rounded hover:bg-gray-100 transition-colors focus:outline-none focus:ring-2 focus:ring-gray-300"
                aria-label="Export notebook"
                title="Export conversations to CSV file"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button
                onClick={onClose}
                className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
                aria-label="Close notebook"
              >
                <X className="h-5 w-5 text-gray-500" />
              </button>
            </div>
        </div>
        <div className="p-6 overflow-y-auto flex-1">
          <NotebookView
            messages={messages}
            thirtyDayMessages={thirtyDayMessages}
            selectedMessages={selectedMessages}
            setSelectedMessages={setSelectedMessages}
            generateStudyNotes={generateStudyNotes}
            isGeneratingNotes={isGeneratingNotes}
            storedMessageCount={storedMessageCount}
            isServerAvailable={isServerAvailable}
            searchTerm={searchTerm}
            sortOrder={sortOrder}
          />
        </div>
      </div>
    </div>
  );
};

export default NotebookOverlay;
