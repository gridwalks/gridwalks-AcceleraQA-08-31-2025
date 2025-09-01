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
              <span className="px-4 py-2 bg-blue-50
