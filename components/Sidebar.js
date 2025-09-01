import React from 'react';
import NotebookView from './NotebookView';
import ResourcesView from './ResourcesView';

const Sidebar = ({ 
  showNotebook, 
  messages, 
  getThirtyDayMessages, 
  selectedMessages, 
  setSelectedMessages, 
  generateStudyNotes, 
  isGeneratingNotes, 
  currentResources 
}) => {
  return (
    <div className="lg:col-span-1">
      {showNotebook ? (
        <NotebookView 
          messages={messages}
          getThirtyDayMessages={getThirtyDayMessages}
          selectedMessages={selectedMessages}
          setSelectedMessages={setSelectedMessages}
          generateStudyNotes={generateStudyNotes}
          isGeneratingNotes={isGeneratingNotes}
        />
      ) : (
        <ResourcesView currentResources={currentResources} />
      )}
    </div>
  );
};

export default Sidebar;
