import React from 'react';
import { X, Download } from 'lucide-react';
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
          />
        </div>
      </div>
    </div>
  );
};

export default NotebookOverlay;
