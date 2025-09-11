import React from 'react';
import { Send, Loader2 } from 'lucide-react';

const ChatArea = ({
  messages,
  inputMessage,
  setInputMessage,
  isLoading,
  handleSendMessage,
  handleKeyPress,
  messagesEndRef,
  ragEnabled,
  setRAGEnabled,
  isSaving,
}) => {
  return (
    <div className="flex flex-col h-full">
      <div className="flex-1 overflow-y-auto space-y-4 mb-4">
        {messages.map((msg) => (
          <div
            key={msg.id}
            className={`flex ${msg.type === 'user' ? 'justify-end' : 'justify-start'}`}
          >
            <div
              className={`rounded-lg px-4 py-2 max-w-[75%] whitespace-pre-wrap ${
                msg.type === 'user'
                  ? 'bg-blue-600 text-white'
                  : 'bg-gray-200 text-gray-900'
              }`}
            >
              {msg.content}
              {msg.resources && msg.resources.length > 0 && (
                <ul className="mt-2 text-sm text-blue-700 list-disc list-inside">
                  {msg.resources.map((r, i) => (
                    <li key={i}>
                      <a
                        href={r.url}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="underline"
                      >
                        {r.title || r.url}
                      </a>
                    </li>
                  ))}
                </ul>
              )}
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="border-t border-gray-200 pt-4 space-y-2">
        <div className="flex items-center justify-between">
          <label className="flex items-center space-x-2 text-sm text-gray-600">
            <input
              type="checkbox"
              checked={ragEnabled}
              onChange={(e) => setRAGEnabled(e.target.checked)}
              className="rounded"
            />
            <span>RAG Search</span>
          </label>
          {isSaving && (
            <span className="text-xs text-gray-500 flex items-center">
              <Loader2 className="h-3 w-3 mr-1 animate-spin" /> Saving...
            </span>
          )}
        </div>
        <div className="flex space-x-2">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={handleKeyPress}
            className="flex-1 px-3 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring focus:border-blue-300"
            placeholder="Type your message..."
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || inputMessage.trim() === ''}
            className="px-4 py-2 bg-blue-600 text-white rounded-lg disabled:opacity-50 flex items-center justify-center"
          >
            {isLoading ? (
              <Loader2 className="h-4 w-4 animate-spin" />
            ) : (
              <Send className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;

