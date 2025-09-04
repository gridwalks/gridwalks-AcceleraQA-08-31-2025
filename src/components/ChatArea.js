import React, { memo } from 'react';
import { Send, MessageSquare, FileText, Database } from 'lucide-react';
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
  setRAGEnabled
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

  const toggleRAG = () => {
    setRAGEnabled(!ragEnabled);
  };

  return (
    <div className="lg:col-span-2 rounded-lg border border-gray-200 p-6 h-full shadow-sm bg-gray-900/60 backdrop-blur-sm flex flex-col text-gray-100">
      {/* Chat Messages - Scrollable window that grows with available space */}
      <div className="flex-1 h-full overflow-y-auto p-8 space-y-6 min-h-0 bg-white text-gray-900" style={{ scrollBehavior: 'smooth' }}>
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
                  
                  {/* Show sources if RAG was used */}
                  {message.sources && message.sources.length > 0 && (
                    <div className="mt-3 pt-3 border-t border-gray-600">
                      <div className="text-sm text-gray-300 mb-2">
                        📄 Sources from your documents:
                      </div>
                      <div className="space-y-1">
                        {message.sources.slice(0, 3).map((source, index) => (
                          <div key={index} className="text-xs text-gray-400">
                            • {source.filename} ({(source.similarity * 100).toFixed(1)}% match)
                          </div>
                        ))}
                        {message.sources.length > 3 && (
                          <div className="text-xs text-gray-400">
                            +{message.sources.length - 3} more sources
                          </div>
                        )}
                      </div>
                    </div>
                  )}
                  
                  {message.type === 'ai' && (
                    <div className={`flex items-center justify-between mt-3 pt-3 border-t ${
                      message.isStudyNotes
                        ? 'border-primary text-gray-300'
                        : 'border-gray-700 text-gray-400'
