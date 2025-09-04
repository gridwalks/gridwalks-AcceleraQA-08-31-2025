import React, { memo } from 'react';
import NotebookView from './NotebookView';
import ResourcesView from './ResourcesView';
import { Cloud, CloudOff } from 'lucide-react';

const Sidebar = memo(({ 
  showNotebook, 
  messages, 
  thirtyDayMessages, 
  selectedMessages, 
  setSelectedMessages, 
  generateStudyNotes, 
  isGeneratingNotes, 
  currentResources,
  storedMessageCount = 0,
  isServerAvailable = true
}) => {
  
  // Debug logging for sidebar
  console.log('=== SIDEBAR DEBUG ===');
  console.log('showNotebook:', showNotebook);
  console.log('messages received:', messages?.length || 0);
  console.log('thirtyDayMessages received:', thirtyDayMessages?.length || 0);
  console.log('storedMessageCount:', storedMessageCount);
  console.log('isServerAvailable:', isServerAvailable);
  console.log('Will render:', showNotebook ? 'NotebookView' : 'ResourcesView');

  return (
    <div className="lg:col-span-1">
      {/* Storage Status Banner */}
      {showNotebook && (
        <div className={`mb-4 p-3 rounded-lg border ${
          isServerAvailable 
            ? 'bg-green-50 border-green-200 text-green-800'
            : 'bg-orange-50 border-orange-200 text-orange-800'
        }`}>
          <div className="flex items-center space-x-2">
            {isServerAvailable ? (
              <>
                <Cloud className="h-4 w-4 text-green-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Cloud Storage Active</div>
                  <div className="text-xs text-green-600">
                    {storedMessageCount > 0 
                      ? `${storedMessageCount} messages saved to cloud`
                      : 'Conversations automatically saved to Netlify Blob'
                    }
                  </div>
                </div>
              </>
            ) : (
              <>
                <CloudOff className="h-4 w-4 text-orange-600" />
                <div className="flex-1">
                  <div className="text-sm font-medium">Session Only Mode</div>
                  <div className="text-xs text-orange-600">
                    Conversations will be lost on page refresh
                  </div>
                </div>
              </>
            )}
          </div>
        </div>
      )}

      {showNotebook ? (
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
