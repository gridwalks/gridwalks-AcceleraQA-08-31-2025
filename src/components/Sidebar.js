import React, { memo } from 'react';
import NotebookView from './NotebookView';
import ResourcesView from './ResourcesView';

const Sidebar = memo(({ 
  showNotebook, 
  messages, 
  thirtyDayMessages, 
  selectedMessages, 
  setSelectedMessages, 
  generateStudyNotes, 
  isGeneratingNotes, 
  currentResources 
}) => {
  
  // Debug logging for sidebar
  console.log('=== SIDEBAR DEBUG ===');
  console.log('showNotebook:', showNotebook);
  console.log('messages received:', messages?.length || 0);
  console.log('thirtyDayMessages received:', thirtyDayMessages?.length || 0);
  console.log('Will render:', showNotebook ? 'NotebookView' : 'ResourcesView');

  return (
    <div className="lg:col-span-1">
      {showNotebook ? (
        <NotebookView
          messages={messages}
          thirtyDayMessages={thirtyDayMessages}
          selectedMessages={selectedMessages}
          setSelectedMessages={setSelectedMessages}
          generateStudyNotes={generateStudyNotes}
          isGeneratingNotes={isGeneratingNotes}
        />
      ) : (
        <ResourcesView
          currentResources={currentResources}
        />
      )}
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
