import React, { memo } from 'react';
import { Send, MessageSquare, FileText } from 'lucide-react';
import { exportToWord } from '../utils/exportUtils';
import { sanitizeMessageContent } from '../utils/messageUtils';

const ChatArea = memo(({ 
  messages, 
  inputMessage, 
  setInputMessage, 
  isLoading, 
  handleSendMessage, 
  handleKeyPress, 
  messagesEndRef 
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
      // Could show toast notification here
    }
  };

  return (
    <div className="lg:col-span-2 bg-gray-900/60 backdrop-blur-sm rounded-lg border border-gray-700 flex flex-col shadow-lg h-full text-gray-100">
      {/* Chat Messages - Scrollable window that grows with available space */}
      <div className="flex-1 h-full overflow-y-auto p-8 space-y-6 min-h-0" style={{ scrollBehavior: 'smooth' }}>
          {messages.length === 0 ? (
            <div className="text-center py-16">
              <div className="w-16 h-16 bg-gradient-to-r from-primary to-primary-light rounded-lg mx-auto mb-6 flex items-center justify-center">
                <MessageSquare className="h-8 w-8 text-white" />
              </div>
              <h3 className="text-2xl font-bold text-gray-100 mb-4">Welcome to AcceleraQA</h3>
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
                <div className={`max-w-3xl px-6 py-4 rounded-lg ${
                  message.type === 'user'
                    ? 'bg-primary text-white'
                    : message.isStudyNotes
                      ? 'bg-gradient-to-r from-primary-dark to-primary border border-primary text-white'
                      : 'bg-gray-800 border border-gray-700 text-gray-100'
                }`}>
                  <div 
                    className="whitespace-pre-wrap text-base leading-relaxed"
                    dangerouslySetInnerHTML={{
                      __html: sanitizeMessageContent(message.content)
                        .replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>')
                        .replace(/\*(.*?)\*/g, '<em>$1</em>')
                    }}
                  />
                  
                  {message.type === 'ai' && (
                    <div className={`flex items-center justify-between mt-3 pt-3 border-t ${
                      message.isStudyNotes
                        ? 'border-primary text-gray-300'
                        : 'border-gray-700 text-gray-400'
                    }`}>
                      <div className="flex items-center space-x-3">
                        <time className="text-xs" dateTime={message.timestamp}>
                          {new Date(message.timestamp).toLocaleString()}
                        </time>
                        {message.isStudyNotes && (
                          <span className="text-xs text-primary-light font-medium">
                            📚 Study Notes
                          </span>
                        )}
                      </div>

                      {message.isStudyNotes && (
                        <button
                          onClick={() => handleExportStudyNotes(message)}
                          className="ml-3 px-3 py-1 bg-primary text-white text-xs rounded hover:bg-primary-dark transition-colors flex items-center space-x-1 focus:outline-none focus:ring-2 focus:ring-primary-light"
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
              <div className="bg-gray-800 border border-gray-700 px-6 py-4 rounded-lg">
                <div className="flex items-center space-x-3">
                  <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-primary-light" />
                  <span className="text-gray-300">Analyzing your question...</span>
                </div>
              </div>
            </div>
          )}

          <div ref={messagesEndRef} aria-hidden="true" />
        </div>

      {/* Input Area - Always visible at bottom */}
      <div className="border-t border-gray-700 bg-gray-900 p-8 flex-shrink-0">
        <form onSubmit={handleSubmit} className="flex space-x-4">
          <div className="flex-1 relative">
            <textarea
              value={inputMessage}
              onChange={handleInputChange}
              onKeyDown={handleKeyPress}
              placeholder="Ask about GMP, validation, CAPA, regulations..."
              className="w-full px-4 py-4 bg-gray-800 border border-gray-700 rounded-lg focus:ring-2 focus:ring-primary focus:border-transparent text-base text-gray-100 placeholder-gray-500 resize-none min-h-[60px] max-h-32"
              disabled={isLoading}
              rows={1}
              aria-label="Enter your pharmaceutical quality question"
            />
            
            {/* Character count for very long messages */}
            {inputMessage.length > 500 && (
              <div className="absolute bottom-2 right-2 text-xs text-gray-400">
                {inputMessage.length}/2000
              </div>
            )}
          </div>
          
          <button
            type="submit"
            disabled={isLoading || !inputMessage.trim()}
            className="px-8 py-4 bg-primary text-white rounded-lg hover:bg-primary-dark disabled:opacity-50 disabled:cursor-not-allowed transition-colors focus:outline-none focus:ring-2 focus:ring-primary-light flex-shrink-0"
            aria-label="Send message"
          >
            <Send className="h-5 w-5" />
          </button>
        </form>

        {/* Quick action suggestions when no messages */}
        {messages.length === 0 && (
          <div className="mt-4 flex flex-wrap gap-2">
            <button
              onClick={() => setInputMessage("What are the key requirements for GMP compliance?")}
              className="text-sm px-3 py-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-full hover:bg-gray-700 transition-colors"
              disabled={isLoading}
            >
              GMP compliance requirements
            </button>
            <button
              onClick={() => setInputMessage("How do I develop a validation master plan?")}
              className="text-sm px-3 py-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-full hover:bg-gray-700 transition-colors"
              disabled={isLoading}
            >
              Validation master plan
            </button>
            <button
              onClick={() => setInputMessage("What is the CAPA process?")}
              className="text-sm px-3 py-1 bg-gray-800 border border-gray-700 text-gray-200 rounded-full hover:bg-gray-700 transition-colors"
              disabled={isLoading}
            >
              CAPA process
            </button>
          </div>
        )}
      </div>
    </div>
  );
});

ChatArea.displayName = 'ChatArea';

export default ChatArea;
