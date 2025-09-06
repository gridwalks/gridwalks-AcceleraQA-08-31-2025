import React from 'react';
import NotebookView from './NotebookView';

const NotebookWindow = ({
  messages,
  thirtyDayMessages,
  selectedMessages,
  setSelectedMessages,
  generateStudyNotes,
  isGeneratingNotes,
  storedMessageCount = 0,
  isServerAvailable = true
}) => {
  return (
    <div className="p-6">
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
  );
};

export default NotebookWindow;

