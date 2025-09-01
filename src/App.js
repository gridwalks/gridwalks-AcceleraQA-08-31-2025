import React, { useState, useEffect, useRef } from 'react';
import { Send, BookOpen, Download, Clock, MessageSquare, LogOut, User } from 'lucide-react';

// Components
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import Sidebar from './components/Sidebar';
import AuthScreen from './components/AuthScreen';
import LoadingScreen from './components/LoadingScreen';

// Services
import { getChatGPTResponse } from './services/openaiService';
import { initializeAuth } from './services/authService';

// Utils
import { exportNotebook } from './utils/exportUtils';

const AcceleraQA = () => {
  const [messages, setMessages] = useState([]);
  const [inputMessage, setInputMessage] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [currentResources, setCurrentResources] = useState([]);
  const [showNotebook, setShowNotebook] = useState(false);
  const [selectedMessages, setSelectedMessages] = useState(new Set());
  const [isGeneratingNotes, setIsGeneratingNotes] = useState(false);
  const [user, setUser] = useState(null);
  const [isLoadingAuth, setIsLoadingAuth] = useState(true);
  const messagesEndRef = useRef(null);

  // Initialize authentication
  useEffect(() => {
    initializeAuth(setUser, setIsLoadingAuth, initializeWelcomeMessage);
  }, []);

  // Auto-scroll to bottom of messages
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const initializeWelcomeMessage = () => {
    const welcomeMessage = {
      id: Date.now(),
      type: 'ai',
      content: 'Welcome to AcceleraQA! I\'m your pharmaceutical quality and compliance AI assistant. I specialize in GMP, validation, CAPA, regulatory requirements, and quality risk management. How can I help you today?',
      timestamp: new Date().toISOString(),
      resources: [
        { title: "FDA Pharmaceutical Quality Resources Hub", type: "Portal", url: "https://www.fda.gov/drugs/pharmaceutical-quality-resources" },
        { title: "ICH Quality Guidelines Overview", type: "Guideline", url: "https://www.ich.org/page/quality-guidelines" },
        { title: "ISPE Pharmaceutical Engineering Resources", type: "Database", url: "https://www.ispe.org/pharmaceutical-engineering" }
      ]
    };
    setMessages([welcomeMessage]);
    setCurrentResources(welcomeMessage.resources);
  };

  const handleSendMessage = async () => {
    if (!inputMessage.trim()) return;

    const userMessage = {
      id: Date.now(),
      type: 'user',
      content: inputMessage,
      timestamp: new Date().toISOString()
    };

    setMessages(prev => [...prev, userMessage]);
    setInputMessage('');
    setIsLoading(true);

    try {
      const response = await getChatGPTResponse(inputMessage);
      
      const aiMessage = {
        id: Date.now() + 1,
        type: 'ai',
        content: response.answer,
        timestamp: new Date().toISOString(),
        resources: response.resources
      };

      setMessages(prev => [...prev, aiMessage]);
      setCurrentResources(response.resources);
    } catch (error) {
      console.error('Error getting AI response:', error);
      
      let errorMessage = 'Sorry, I encountered an error. Please try again.';
      
      if (error.message.includes('API key not configured')) {
        errorMessage = '⚠️ OpenAI API key not configured. Please contact your administrator to set up the REACT_APP_OPENAI_API_KEY environment variable.';
      } else if (error.message.includes('Invalid API key')) {
        errorMessage = '🔑 Invalid API key. Please check your OpenAI API key configuration.';
      } else if (error.message.includes('rate limit')) {
        errorMessage = '⏱️ API rate limit exceeded. Please wait a moment and try again.';
      } else if (error.message.includes('quota exceeded')) {
        errorMessage = '💳 API quota exceeded. Please check your OpenAI account billing and usage limits.';
      } else if (error.message.includes('fetch')) {
        errorMessage = '🌐 Network error. Please check your internet connection and try again.';
      }
      
      const errorMsg = {
        id: Date.now() + 1,
        type: 'ai',
        content: errorMessage,
        timestamp: new Date().toISOString(),
        resources: [
          { title: "OpenAI API Documentation", type: "Documentation", url: "https://platform.openai.com/docs/api-reference" },
          { title: "OpenAI API Key Management", type: "Dashboard", url: "https://platform.openai.com/account/api-keys" },
          { title: "OpenAI Usage Dashboard", type: "Dashboard", url: "https://platform.openai.com/account/usage" }
        ]
      };
      setMessages(prev => [...prev, errorMsg]);
      setCurrentResources(errorMsg.resources);
    } finally {
      setIsLoading(false);
    }
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentResources([]);
  };

  const getThirtyDayMessages = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return messages.filter(msg => new Date(msg.timestamp) >= thirtyDaysAgo);
  };

  const generateStudyNotes = async () => {
    if (selectedMessages.size === 0) return;

    setIsGeneratingNotes(true);
    const selectedMessageData = messages.filter(msg => selectedMessages.has(msg.id));
    
    const studyContent = selectedMessageData.map(msg => {
      if (msg.type === 'user') {
        return `Question: ${msg.content}`;
      } else {
        const resourceLinks = msg.resources ? 
          msg.resources.map(r => `- ${r.title} (${r.type}): ${r.url}`).join('\n') : '';
        return `Answer: ${msg.content}\n\nRelated Resources:\n${resourceLinks}`;
      }
    }).join('\n\n');

    const studyPrompt = `Create comprehensive study notes for pharmaceutical quality and compliance based on the following conversation topics. 

Format as organized study material with:
1. Executive Summary
2. Key Concepts and Definitions
3. Regulatory Requirements
4. Implementation Best Practices
5. Common Pitfalls to Avoid
6. Study Questions for Review

Include specific references to FDA, ICH, and other regulatory guidelines where applicable.

Conversation content:
${studyContent}`;

    try {
      const response = await getChatGPTResponse(studyPrompt);
      
      const studyNotesMessage = {
        id: Date.now(),
        type: 'ai',
        content: `📚 **Study Notes Generated**\n\nBased on your selected conversations, here are comprehensive study notes:\n\n${response.answer}\n\n---\n*Study notes generated from ${selectedMessages.size} selected conversation items on ${new Date().toLocaleDateString()}*`,
        timestamp: new Date().toISOString(),
        resources: response.resources,
        isStudyNotes: true,
        studyNotesData: {
          content: response.answer,
          selectedTopics: selectedMessageData.map(msg => msg.content.substring(0, 50) + '...').join(', '),
          resourceCount: response.resources.length,
          generatedDate: new Date().toLocaleDateString()
        }
      };

      setMessages(prev => [...prev, studyNotesMessage]);
      setCurrentResources(response.resources);
      setSelectedMessages(new Set());
      setShowNotebook(false);
    } catch (error) {
      console.error('Error generating study notes:', error);
      
      const errorMessage = {
        id: Date.now(),
        type: 'ai',
        content: '❌ Failed to generate study notes. Please check your API configuration and try again.',
        timestamp: new Date().toISOString()
      };
      setMessages(prev => [...prev, errorMessage]);
    } finally {
      setIsGeneratingNotes(false);
    }
  };

  // Loading screen
  if (isLoadingAuth) {
    return <LoadingScreen />;
  }

  // Authentication required screen
  if (!user) {
    return <AuthScreen />;
  }

  // Authenticated user interface
  return (
    <div className="min-h-screen bg-gray-50">
      <Header 
        user={user}
        showNotebook={showNotebook}
        setShowNotebook={setShowNotebook}
        clearChat={clearChat}
        exportNotebook={() => exportNotebook(messages)}
      />

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-160px)]">
          <ChatArea 
            messages={messages}
            inputMessage={inputMessage}
            setInputMessage={setInputMessage}
            isLoading={isLoading}
            handleSendMessage={handleSendMessage}
            messagesEndRef={messagesEndRef}
          />
          
          <Sidebar 
            showNotebook={showNotebook}
            messages={messages}
            getThirtyDayMessages={getThirtyDayMessages}
            selectedMessages={selectedMessages}
            setSelectedMessages={setSelectedMessages}
            generateStudyNotes={generateStudyNotes}
            isGeneratingNotes={isGeneratingNotes}
            currentResources={currentResources}
          />
        </div>
      </div>
    </div>
  );
};

export default AcceleraQA;
