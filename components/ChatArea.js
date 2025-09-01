import React from 'react';
import { Send, MessageSquare, FileText } from 'lucide-react';
import { exportToWord } from '../utils/exportUtils';

const ChatArea = ({ 
  messages, 
  inputMessage, 
  setInputMessage, 
  isLoading, 
  handleSendMessage, 
  messagesEndRef 
}) => {
  return (
    <div className="lg:col-span-2 bg-white rounded-lg border border-gray-200 flex flex-col">
      {/* Chat Messages */}
      <div className="flex-1 p-8 overflow-y-auto space-y-6">
        {messages.length === 0 && (
          <div className="text-center py-16">
            <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mx-auto mb-6 flex items-center justify-center">
              <MessageSquare className="h-8 w-8 text-white" />
            </div>
            <h3 className="text-2xl font-bold text-gray-900 mb-4">Welcome to AcceleraQA</h3>
            <p className="text-gray-600 mb-8 text-lg">
              Ask questions about pharmaceutical quality and compliance topics
            </p>
            <div className="flex flex-wrap justify-center gap-3">
              <span className="px-4 py-2 bg-blue-50 text-blue-700 rounded-full font-medium">GMP</span>
              <span className="px-4 py-2 bg-purple-50 text-purple-700 rounded-full font-medium">Validation</span>
              <span className="px-4 py-2 bg-green-50 text-green-700 rounded-full font-medium">CAPA</span>
              <span className="px-4 py-2 bg-orange-50 text-orange-700 rounded-full font-medium">Regulatory</span>
            </div>
          </div>
        )}

        {messages.map((message) => (
          <div key={message.id} className={`flex ${message.type === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-3xl px-6 py-4 rounded-lg ${
              message.type === 'user' 
                ? 'bg-black text-white' 
                : message.isStudyNotes
                  ? 'bg-gradient-to-r from-green-50 to-blue-50 border border-green-200'
                  : 'bg-gray-50 border border-gray-200'
            }`}>
              <p className="whitespace-pre-wrap text-base leading-relaxed">{message.content}</p>
              <div className={`flex items-center justify-between mt-3 pt-3 border-t ${
                message.type === 'user' ? 'border-gray-700 text-gray-300' : 'border-gray-200 text-gray-500'
              }`}>
                <p className="text-xs">
                  {new Date(message.timestamp).toLocaleString()}
                  {message.isStudyNotes && <span className="ml-2 text-green-600">📚 Study Notes</span>}
                </p>
                {message.isStudyNotes && (
                  <button
                    onClick={() => exportToWord(message)}
                    className="ml-3 px-3 py-1 bg-black text-white text-xs rounded hover:bg-gray-800 transition-colors flex items-center space-x-1"
                  >
                    <FileText className="h-3 w-3" />
                    <span>Export to Word</span>
                  </button>
                )}
              </div>
            </div>
          </div>
        ))}

        {isLoading && (
          <div className="flex justify-start">
            <div className="bg-gray-50 border border-gray-200 px-6 py-4 rounded-lg">
              <div className="flex items-center space-x-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-black"></div>
                <span className="text-gray-700">Analyzing your question...</span>
              </div>
            </div>
          </div>
        )}

        <div ref={messagesEndRef} />
      </div>

      {/* Input Area */}
      <div className="p-8 border-t border-gray-200">
        <div className="flex space-x-4">
          <input
            type="text"
            value={inputMessage}
            onChange={(e) => setInputMessage(e.target.value)}
            onKeyPress={(e) => e.key === 'Enter' && handleSendMessage()}
            placeholder="Ask about GMP, validation, CAPA, regulations..."
            className="flex-1 px-4 py-4 border border-gray-300 rounded-lg focus:ring-2 focus:ring-black focus:border-transparent text-base"
            disabled={isLoading}
          />
          <button
            onClick={handleSendMessage}
            disabled={isLoading || !inputMessage.trim()}
            className="px-8 py-4 bg-black text-white rounded-lg hover:bg-gray-800 disabled:opacity-50 disabled:cursor-not-allowed transition-colors"
          >
            <Send className="h-5 w-5" />
          </button>
        </div>
      </div>
    </div>
  );
};

export default ChatArea;
