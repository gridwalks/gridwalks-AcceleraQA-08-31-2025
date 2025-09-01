import React from 'react';

const NotebookView = ({ 
  messages,
  getThirtyDayMessages, 
  selectedMessages, 
  setSelectedMessages, 
  generateStudyNotes, 
  isGeneratingNotes 
}) => {
  const selectAllConversations = () => {
    const combinedMessages = getThirtyDayMessages().reduce((acc, message, index, array) => {
      if (message.type === 'user' && index < array.length - 1 && array[index + 1].type === 'ai') {
        return acc;
      }
      
      if (message.type === 'ai' && index > 0 && array[index - 1].type === 'user') {
        const userMessage = array[index - 1];
        const combinedMessage = {
          id: `${userMessage.id}-${message.id}`,
          userContent: userMessage.content,
          aiContent: message.content,
          timestamp: message.timestamp,
          resources: message.resources || [],
          isStudyNotes: message.isStudyNotes
        };
        acc.push(combinedMessage);
      } else if (message.type === 'ai') {
        const combinedMessage = {
          id: message.id,
          userContent: null,
          aiContent: message.content,
          timestamp: message.timestamp,
          resources: message.resources || [],
          isStudyNotes: message.isStudyNotes
        };
        acc.push(combinedMessage);
      } else if (message.type === 'user') {
        const combinedMessage = {
          id: message.id,
          userContent: message.content,
          aiContent: null,
          timestamp: message.timestamp,
          resources: [],
          isStudyNotes: false
        };
        acc.push(combinedMessage);
      }
      
      return acc;
    }, []).slice(-10);

    const allIds = new Set(combinedMessages.map(msg => msg.id));
    setSelectedMessages(allIds);
  };

  const deselectAll = () => {
    setSelectedMessages(new Set());
  };

  const toggleMessageSelection = (messageId) => {
    const newSelected = new Set(selectedMessages);
    if (newSelected.has(messageId)) {
      newSelected.delete(messageId);
    } else {
      newSelected.add(messageId);
    }
    setSelectedMessages(newSelected);
  };

  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
      <div className="flex items-center justify-between mb-6">
        <div>
          <h3 className="text-lg font-bold text-gray-900">Notebook</h3>
          <p className="text-sm text-gray-500">{getThirtyDayMessages().length} conversations</p>
        </div>
        <div className="flex items-center space-x-3">
          {selectedMessages.size > 0 && (
            <span className="text-xs text-blue-600 font-medium bg-blue-50 px-2 py-1 rounded">
              {selectedMessages.size} selected
            </span>
          )}
          <div className="flex items-center space-x-2">
            <button
              onClick={selectedMessages.size > 0 ? deselectAll : selectAllConversations}
              className="px-3 py-1 text-xs font-medium text-gray-600 hover:text-gray-800 border border-gray-300 rounded hover:border-gray-400 transition-colors"
            >
              {selectedMessages.size > 0 ? 'Deselect All' : 'Select All'}
            </button>
            <button
              onClick={generateStudyNotes}
              disabled={selectedMessages.size === 0 || isGeneratingNotes}
              className={`px-4 py-2 text-sm font-medium rounded transition-colors ${
                selectedMessages.size > 0 
                  ? 'bg-black text-white hover:bg-gray-800' 
                  : 'bg-gray-100 text-gray-400 cursor-not-allowed'
              }`}
            >
              {isGeneratingNotes ? 'Generating...' : 'Study Notes'}
            </button>
          </div>
        </div>
      </div>
      <div className="space-y-3 overflow-y-auto h-[calc(100%-100px)]">
        {getThirtyDayMessages().reduce((acc, message, index, array) => {
          if (message.type === 'user' && index < array.length - 1 && array[index + 1].type === 'ai') {
            return acc;
          }
          
          if (message.type === 'ai' && index > 0 && array[index - 1].type === 'user') {
            const userMessage = array[index - 1];
            const combinedMessage = {
              id: `${userMessage.id}-${message.id}`,
              userContent: userMessage.content,
              aiContent: message.content,
              timestamp: message.timestamp,
              resources: message.resources || [],
              isStudyNotes: message.isStudyNotes
            };
            acc.push(combinedMessage);
          } else if (message.type === 'ai') {
            const combinedMessage = {
              id: message.id,
              userContent: null,
              aiContent: message.content,
              timestamp: message.timestamp,
              resources: message.resources || [],
              isStudyNotes: message.isStudyNotes
            };
            acc.push(combinedMessage);
          } else if (message.type === 'user') {
            const combinedMessage = {
              id: message.id,
              userContent: message.content,
              aiContent: null,
              timestamp: message.timestamp,
              resources: [],
              isStudyNotes: false
            };
            acc.push(combinedMessage);
          }
          
          return acc;
        }, []).slice(-10).map((combinedMessage) => (
          <div key={combinedMessage.id} className={`p-4 rounded-lg border transition-all ${
            selectedMessages.has(combinedMessage.id) 
              ? 'bg-blue-50 border-blue-300' 
              : 'bg-gray-50 border-gray-200 hover:border-gray-300'
          }`}>
            <div className="flex items-start space-x-3">
              <input
                type="checkbox"
                checked={selectedMessages.has(combinedMessage.id)}
                onChange={() => toggleMessageSelection(combinedMessage.id)}
                className="mt-1 rounded border-gray-300 text-black focus:ring-black"
              />
              <div className="flex-1 min-w-0">
                <div className="flex items-center justify-between mb-3">
                  <span className="text-xs font-semibold uppercase tracking-wide text-purple-600">
                    Conversation
                  </span>
                  <span className="text-xs text-gray-500">
                    {new Date(combinedMessage.timestamp).toLocaleDateString()}
                  </span>
                </div>
                
                {combinedMessage.userContent && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-blue-600 mb-1">QUESTION:</div>
                    <p className="text-sm text-gray-700 leading-relaxed bg-blue-50 p-2 rounded">
                      {combinedMessage.userContent}
                    </p>
                  </div>
                )}
                
                {combinedMessage.aiContent && (
                  <div className="mb-3">
                    <div className="text-xs font-medium text-green-600 mb-1">RESPONSE:</div>
                    <p className="text-sm text-gray-700 leading-relaxed line-clamp-4 bg-green-50 p-2 rounded">
                      {combinedMessage.aiContent}
                    </p>
                  </div>
                )}
                
                {combinedMessage.resources && combinedMessage.resources.length > 0 && (
                  <div className="mt-3 pt-2 border-t border-gray-200">
                    <div className="text-xs font-medium text-gray-600 mb-2">
                      LEARNING RESOURCES ({combinedMessage.resources.length}):
                    </div>
                    <div className="space-y-1">
                      {combinedMessage.resources.map((resource, idx) => (
                        <div key={idx} className="text-xs">
                          <a 
                            href={resource.url} 
                            target="_blank" 
                            rel="noopener noreferrer"
                            className="text-blue-600 hover:text-blue-800 hover:underline block"
                          >
                            • {resource.title} ({resource.type})
                          </a>
                        </div>
                      ))}
                    </div>
                  </div>
                )}
                
                {combinedMessage.isStudyNotes && (
                  <div className="mt-2">
                    <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full">
                      📚 Study Notes
                    </span>
                  </div>
                )}
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
};

export default NotebookView;
