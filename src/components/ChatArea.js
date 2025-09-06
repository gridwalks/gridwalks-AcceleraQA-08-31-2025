import React, { memo } from 'react';
import {
  Send,
  MessageSquare,
  FileText,
  Database,
  Cloud,
  FilePlus,
  HelpCircle,
  ShieldCheck,
  Trash2
} from 'lucide-react';
import { exportToWord } from '../utils/exportUtils';
import { sanitizeMessageContent } from '../utils/messageUtils';

const ChatArea = memo(({
  messages,
  inputMessage,
  setInputMessage,
  isLoading,
  handleSendMessage,
  handleKeyPress,
  messagesEndRef,
  ragEnabled,
  setRAGEnabled,
  clearChat,
  isSaving = false
}) => {
  const handleInputChange = (e) => {
    setInputMessage(e.target.value);
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    handleSendMessage();
  };

  const handleExportStudyNotes = (message) => {
    try {
      exportToWord(message);
    } catch (error) {
      console.error('Failed to export study notes:', error);
    }
  };

  const toggleRAG = () => {
    setRAGEnabled(!ragEnabled);
  };

  return (
    <div className="lg:col-span-2 rounded-lg border border-gray-200 p-6 h-full shadow-sm bg-white flex flex-col text-gray-900">
      {/* Chat Messages */}
      <div className="flex-1 h-full overflow-y-auto p-8 space-y-6 min-h-0 bg-gray-50 text-gray-900" style={{ scrollBehavior: 'smooth' }}>
        <div className="px-4 py-2 text-sm text-purple-700 bg-purple-50 border border-purple-100 rounded">
          Answers are grouped in approved sources only.
        </div>
        {messages.length === 0 ? (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-light rounded-lg mx-auto mb-6 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Welcome to AcceleraQA</h3>
            <p className="text-gray-400 mb-8 text-lg">
              Ask questions about pharmaceutical quality and compliance topics
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <span className="px-4 py-2 bg-primary/20 text-primary-light rounded-full font-medium">GMP</span>
              <span className="px-4 py-2 bg-primary/20 text-primary-light rounded-full font-medium">Validation</span>
              <span className="px-4 py-2 bg-primary/20 text-primary-light rounded-full font-medium">CAPA</span>
              <span className="px-4 py-2 bg-primary/20 text-primary-light rounded-full font-medium">Regulatory</span>
              <span className="px-4 py-2 bg-primary/20 text-primary-light rounded-full font-medium">Risk Management</span>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
              <div className={`max-w-3xl px-6 py-4 rounded-lg shadow-sm ${
                message.type === 'user'
                  ? 'bg-purple-100 border border-purple-200 text-purple-900'
                  : message.isStudyNotes
                    ? 'bg-gradient-to-r from-purple-100 to-purple-200 border border-purple-200 text-purple-900'
                    : 'bg-gray-100 border border-gray-200 text-gray-900'
              }`}>
                <div
                  className="whitespace-pre-wrap text-base leading-relaxed"
                  dangerouslySetInnerHTML={{
                    __html: sanitizeMessageContent(message.content)
                      .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                      .replace(/\*(.*?)\*/g, '<em>$1</em>')
                  }}
                />

                {/* Show sources if RAG was used */}
                {message.sources && message.sources.length > 0 && (
                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <div className="text-sm text-gray-600 mb-2">
                      📄 Sources from your documents:
                    </div>
                    <div className="space-y-1">
                      {message.sources.slice(0, 3).map((source, index) => (
                        <div key={index} className="text-xs text-gray-500">
                          • {source.filename} ({(source.similarity * 100).toFixed(1)}% match)
                        </div>
                      ))}
                      {message.sources.length > 3 && (
                        <div className="text-xs text-gray-500">
                          +{message.sources.length - 3} more sources
                        </div>
                      )}
                    </div>
                  </div>
                )}

                {message.type === 'ai' && (
                  <div className={`flex items-center justify-between mt-3 pt-3 border-t ${
                    message.isStudyNotes
                      ? 'border-purple-200 text-gray-500'
                      : 'border-gray-200 text-gray-500'
                  }`}>
                    <div className="flex items-center space-x-3">
                      <time className="text-xs text-gray-500" dateTime={message.timestamp}>
                        {new Date(message.timestamp).toLocaleString()}
                      </time>
                      {message.isStudyNotes && (
                        <span className="text-xs bg-purple-100 text-purple-700 px-2 py-0.5 rounded">
                          📚 Study Notes
                        </span>
                      )}
                      {message.sources && message.sources.length > 0 && (
                        <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded">
                          🔍 RAG Enhanced
                        </span>
                      )}
                      {message.isStored && (
                        <span className="text-xs bg-green-100 text-green-700 px-2 py-0.5 rounded flex items-center space-x-1">
                          <Cloud className="h-3 w-3" />
                          <span>Saved</span>
                        </span>
                      )}
                    </div>

                    {message.isStudyNotes && (
                      <button
                        onClick={() => handleExportStudyNotes(message)}
                        className="ml-3 px-3 py-1 bg-purple-500 text-white text-xs rounded hover:bg-purple-600 transition-colors flex items-center space-x-1 focus:outline-none focus:ring-2 focus:ring-purple-300"
                        aria-label="Export study notes to Word document"
                      >
                        <FileText className="h-3 w-3" />
                        <span>Export to Word</span>
                      </button>
                    )}
                  </div>
                )}
              </div>
            </div>
          ))
        )}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-100 border border-gray-200 px-6 py-4 rounded-lg shadow-sm">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-light" />
                <span className="text-gray-600">
                  {ragEnabled ? 'Searching documents and analyzing...' : 'Analyzing your question...'}
                </span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} aria-hidden="true" />
      </div>

      {/* Input Area */}
      <div className="border-t border-gray-200 bg-white p-8 flex-shrink-0">
        {/* Action Buttons and Controls */}
        <div className="mb-4 flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex flex-wrap gap-2">
            <button
              className="w-full sm:w-auto flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
              aria-label="Insert SOP"
            >
              <FilePlus className="h-4 w-4 mr-2" />
              <span>Insert SOP</span>
            </button>
            <button
              className="w-full sm:w-auto flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
              aria-label="Generate SOP"
            >
              <FileText className="h-4 w-4 mr-2" />
              <span>Generate SOP</span>
            </button>
            <button
              className="w-full sm:w-auto flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
              aria-label="Generate quiz"
            >
              <HelpCircle className="h-4 w-4 mr-2" />
              <span>Generate quiz</span>
            </button>
            <button
              className="w-full sm:w-auto flex items-center px-4 py-2 bg-primary text-white rounded-lg hover:bg-primary-dark transition-colors text-sm font-medium"
              aria-label="Create attestation"
            >
              <ShieldCheck className="h-4 w-4 mr-2" />
              <span>Create attestation</span>
            </button>
          </div>

          <div className="flex flex-col items-stretch sm:items-end gap-2">
            <div className="flex flex-wrap gap-2 sm:justify-end">
              <button
                onClick={toggleRAG}
                className={`w-full sm:w-auto flex items-center px-4 py-2 rounded-lg transition-colors ${
                  ragEnabled
                    ? 'bg-blue-600 text-white hover:bg-blue-700'
                    : 'bg-gray-200 text-gray-700 hover:bg-gray-300'
                }`}
                aria-label={ragEnabled ? 'Disable RAG search' : 'Enable RAG search'}
              >
                <Database className="h-4 w-4 mr-2" />
                <span className="text-sm font-medium">RAG {ragEnabled ? 'ON' : 'OFF'}</span>
              </button>
              <button
                onClick={clearChat}
                className="w-full sm:w-auto flex items-center px-4 py-2 bg-gray-200 text-gray-700 rounded-lg hover:bg-gray-300 transition-colors text-sm font-medium"
                aria-label="Clear current chat"
                title="Clear current conversation"
              >
                <Trash2 className="h-4 w-4 mr-2" />
                <span>Clear Chat</span>
              </button>
            </div>
            <div className="text-xs text-gray-500 sm:text-right">
              {ragEnabled
                ? 'AI will search your uploaded documents for context'
                : 'AI will use general pharmaceutical knowledge only'}
            </div>
            {/* Save Status Indicator */}
            {isSaving && (
              <div className="flex items-center space-x-2 text-blue-600 text-sm">
                <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-blue-600" />
                <span>Auto-saving to cloud...</span>
              </div>
            )}
          </div>
        </div>

        <form onSubmit={handleSubmit} className="flex space-x-4">
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder={ragEnabled
                ? 'Ask about your documents or pharmaceutical topics...'
                : 'Ask about GMP, validation, CAPA, regulations...'
              }
              className="w-full px-4 py-4 bg-gray-50 border border-gray-300 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base text-gray-900 placeholder-gray-500 resize-none min-h-[60px] max-h-32"
              disabled={isLoading || isSaving}
              rows={1}
              aria-label="Enter your pharmaceutical quality question"
            />

            {inputMessage.length > 500 && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-500">
                {inputMessage.length}/2000
              </div>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading || isSaving || !inputMessage.trim()}
            className="px-8 py-4 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>

        {/* Quick action suggestions */}
        {messages.length === 0 && !isLoading && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setInputMessage('What are the key requirements for GMP compliance?')}
              className="text-sm px-3 py-1 bg-gray-100 border border-gray-200 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              disabled={isLoading || isSaving}
            >
              GMP compliance requirements
            </button>
            <button
              onClick={() => setInputMessage('How do I develop a validation master plan?')}
              className="text-sm px-3 py-1 bg-gray-100 border border-gray-200 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              disabled={isLoading || isSaving}
            >
              Validation master plan
            </button>
            <button
              onClick={() => setInputMessage('What is the CAPA process?')}
              className="text-sm px-3 py-1 bg-gray-100 border border-gray-200 text-gray-700 rounded-full hover:bg-gray-200 transition-colors"
              disabled={isLoading || isSaving}
            >
              CAPA process
            </button>
            {ragEnabled && (
              <button
                onClick={() => setInputMessage('Search my documents for quality procedures')}
                className="text-sm px-3 py-1 bg-blue-100 border border-blue-200 text-blue-700 rounded-full hover:bg-blue-200 transition-colors"
                disabled={isLoading || isSaving}
              >
                Search my documents
              </button>
            )}
          </div>
        )}
      </div>
    </div>
  );
});

ChatArea.displayName = 'ChatArea';

export default ChatArea;

