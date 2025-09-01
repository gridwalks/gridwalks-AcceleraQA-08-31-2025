import React, { useState, useEffect, useRef } from 'react';
import { Send, BookOpen, Download, Clock, MessageSquare, Search, FileText, ChevronRight, LogOut, User } from 'lucide-react';

// Initialize Netlify Identity
let netlifyIdentity = null;
if (typeof window !== 'undefined' && window.netlifyIdentity) {
  netlifyIdentity = window.netlifyIdentity;
}

// Real ChatGPT integration
const getChatGPTResponse = async (message) => {
  const API_KEY = process.env.REACT_APP_OPENAI_API_KEY;
  
  if (!API_KEY) {
    throw new Error('OpenAI API key not configured. Please add REACT_APP_OPENAI_API_KEY to your environment variables.');
  }

  try {
    const response = await fetch('https://api.openai.com/v1/chat/completions', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${API_KEY}`
      },
      body: JSON.stringify({
        model: "gpt-4", // or "gpt-3.5-turbo" for lower cost
        messages: [
          {
            role: "system",
            content: `You are AcceleraQA, an AI assistant specialized in pharmaceutical quality and compliance. 

Your expertise includes:
- Good Manufacturing Practice (GMP) and cGMP regulations
- Process Validation & Qualification (PQ, IQ, OQ)
- Corrective and Preventive Actions (CAPA) systems
- Regulatory Compliance (FDA, EMA, ICH guidelines)
- Quality Risk Management (ICH Q9, QRM principles)
- Documentation & Records Management (batch records, SOPs)
- Pharmaceutical Quality Systems (ICH Q10)
- Change Control and Configuration Management
- Supplier Quality Management
- Validation of computerized systems (CSV)
- Cleaning validation and contamination control
- Stability testing and shelf-life determination

Always provide accurate, professional responses with relevant regulatory references when possible. 
Keep responses concise but comprehensive (aim for 150-300 words unless more detail is specifically requested). 
Focus on practical implementation and current best practices.
When appropriate, mention specific FDA guidance documents, ICH guidelines, or industry standards.
Prioritize patient safety and product quality in all recommendations.`
          },
          {
            role: "user",
            content: message
          }
        ],
        max_tokens: 1200,
        temperature: 0.7
      })
    });

    if (!response.ok) {
      const errorData = await response.json().catch(() => ({}));
      
      if (response.status === 401) {
        throw new Error('Invalid API key. Please check your OpenAI API key configuration.');
      } else if (response.status === 429) {
        throw new Error('API rate limit exceeded. Please try again in a moment.');
      } else if (response.status === 402) {
        throw new Error('API quota exceeded. Please check your OpenAI account billing.');
      } else {
        throw new Error(`OpenAI API error: ${response.status} ${errorData.error?.message || 'Unknown error'}`);
      }
    }

    const data = await response.json();
    const aiResponse = data.choices[0].message.content;

    // Generate relevant resources based on the response content
    const resources = generateResources(message, aiResponse);

    return {
      answer: aiResponse,
      resources: resources
    };

  } catch (error) {
    console.error('ChatGPT API Error:', error);
    throw error;
  }
}; // - End ChatGPT Integration

// Smart resource generation based on topic detection
const generateResources = (query, response) => {
  const lowerQuery = query.toLowerCase();
  const lowerResponse = response.toLowerCase();
  
  let resources = [];
  
  // GMP Resources
  if (lowerQuery.includes('gmp') || lowerQuery.includes('cgmp') || lowerResponse.includes('manufacturing') || lowerResponse.includes('gmp')) {
    resources.push(
      { title: "FDA Current Good Manufacturing Practice Regulations", type: "Regulation", url: "https://www.fda.gov/drugs/pharmaceutical-quality-resources/current-good-manufacturing-practice-cgmp-regulations" },
      { title: "ICH Q7 Good Manufacturing Practice Guide for APIs", type: "Guideline", url: "https://database.ich.org/sites/default/files/Q7%20Guideline.pdf" },
      { title: "FDA GMP Training Resources", type: "Training", url: "https://www.fda.gov/drugs/guidance-compliance-regulatory-information/pharmaceutical-cgmps" },
      { title: "ISPE GMP Baseline Guide Series", type: "Reference", url: "https://www.ispe.org/pharmaceutical-engineering/baseline-guides" }
    );
  }
  
  // Validation Resources
  if (lowerQuery.includes('validation') || lowerQuery.includes('qualify') || lowerQuery.includes('iq') || lowerQuery.includes('oq') || lowerQuery.includes('pq') || lowerResponse.includes('validation')) {
    resources.push(
      { title: "FDA Process Validation Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/process-validation-general-principles-and-practices" },
      { title: "ICH Q8-Q12 Quality by Design Implementation", type: "Guideline", url: "https://database.ich.org/sites/default/files/ICH_Q8-Q12_Guideline_Step4_2019_1119.pdf" },
      { title: "ISPE Validation Master Plan Template", type: "Template", url: "https://www.ispe.org/pharmaceutical-engineering/validation-master-plan" },
      { title: "FDA Computer System Validation Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/general-principles-software-validation" }
    );
  }
  
  // CAPA Resources
  if (lowerQuery.includes('capa') || lowerQuery.includes('corrective') || lowerQuery.includes('preventive') || lowerResponse.includes('capa')) {
    resources.push(
      { title: "FDA Quality Systems Approach to Pharmaceutical cGMP Regulations", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/quality-systems-approach-pharmaceutical-cgmp-regulations" },
      { title: "ISPE Root Cause Analysis Methodology", type: "Training", url: "https://www.ispe.org/pharmaceutical-engineering/root-cause-analysis" },
      { title: "FDA Warning Letters Database - CAPA Examples", type: "Database", url: "https://www.fda.gov/inspections-compliance-enforcement-and-criminal-investigations/compliance-actions-and-activities/warning-letters" },
      { title: "ICH Q10 Pharmaceutical Quality System", type: "Guideline", url: "https://database.ich.org/sites/default/files/Q10%20Guideline.pdf" }
    );
  }
  
  // Risk Management Resources
  if (lowerQuery.includes('risk') || lowerQuery.includes('qrm') || lowerQuery.includes('fmea') || lowerResponse.includes('risk')) {
    resources.push(
      { title: "ICH Q9 Quality Risk Management", type: "Guideline", url: "https://database.ich.org/sites/default/files/Q9%20Guideline.pdf" },
      { title: "FDA Risk-Based Approach to Pharmaceutical Quality", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/pharmaceutical-quality-manufacturing-information" },
      { title: "ISPE Risk Management Framework", type: "Framework", url: "https://www.ispe.org/pharmaceutical-engineering/risk-management" }
    );
  }
  
  // Regulatory/ICH Resources
  if (lowerQuery.includes('ich') || lowerQuery.includes('regulatory') || lowerQuery.includes('fda') || lowerQuery.includes('ema') || lowerResponse.includes('regulatory')) {
    resources.push(
      { title: "ICH Quality Guidelines (Q1-Q14)", type: "Guideline", url: "https://www.ich.org/page/quality-guidelines" },
      { title: "FDA Pharmaceutical Quality Resources", type: "Portal", url: "https://www.fda.gov/drugs/pharmaceutical-quality-resources" },
      { title: "EMA Quality Guidelines", type: "Guideline", url: "https://www.ema.europa.eu/en/human-regulatory/research-development/quality/quality-guidelines" }
    );
  }
  
  // Cleaning Validation
  if (lowerQuery.includes('cleaning') || lowerQuery.includes('contamination') || lowerResponse.includes('cleaning')) {
    resources.push(
      { title: "FDA Cleaning Validation Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/cleaning-validation" },
      { title: "ISPE Cleaning Validation Baseline Guide", type: "Guide", url: "https://www.ispe.org/pharmaceutical-engineering/cleaning-validation" }
    );
  }
  
  // Stability Testing
  if (lowerQuery.includes('stability') || lowerQuery.includes('shelf') || lowerResponse.includes('stability')) {
    resources.push(
      { title: "ICH Q1A-Q1F Stability Testing Guidelines", type: "Guideline", url: "https://www.ich.org/page/quality-guidelines" },
      { title: "FDA Stability Testing Guidance", type: "Guidance", url: "https://www.fda.gov/regulatory-information/search-fda-guidance-documents/stability-testing-drug-substances-and-drug-products" }
    );
  }
  
  // Default pharmaceutical resources if no specific match
  if (resources.length === 0) {
    resources.push(
      { title: "FDA Pharmaceutical Quality Resources Hub", type: "Portal", url: "https://www.fda.gov/drugs/pharmaceutical-quality-resources" },
      { title: "ICH Quality Guidelines Overview", type: "Guideline", url: "https://www.ich.org/page/quality-guidelines" },
      { title: "ISPE Pharmaceutical Engineering Resources", type: "Database", url: "https://www.ispe.org/pharmaceutical-engineering" },
      { title: "PDA Technical Resources", type: "Database", url: "https://www.pda.org/publications/technical-resources" }
    );
  }
  
  return resources.slice(0, 6); // Limit to 6 resources max
};

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
  // Add this to your App.js - Replace the existing useEffect for authentication

// Initialize authentication
useEffect(() => {
  if (netlifyIdentity) {
    netlifyIdentity.init();
    
    // Get current user
    const currentUser = netlifyIdentity.currentUser();
    setUser(currentUser);
    setIsLoadingAuth(false);

    // Handle password recovery from email links
    netlifyIdentity.on('init', user => {
      if (!user) {
        // Check if this is a recovery or invite link
        if (window.location.hash) {
          const hash = window.location.hash;
          if (hash.includes('recovery_token') || hash.includes('invite_token') || hash.includes('confirmation_token')) {
            // Open the modal to handle the token
            netlifyIdentity.open();
          }
        }
      }
    });

    // Listen for authentication events
    netlifyIdentity.on('login', (user) => {
      setUser(user);
      netlifyIdentity.close();
      // Clear any hash from URL
      if (window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
      // Initialize welcome message for new user
      initializeWelcomeMessage();
    });

    netlifyIdentity.on('logout', () => {
      setUser(null);
      setMessages([]);
      setCurrentResources([]);
    });

    netlifyIdentity.on('close', () => {
      // Modal closed - clear hash if present
      if (window.location.hash) {
        window.history.replaceState({}, document.title, window.location.pathname);
      }
    });

    // Handle password recovery success
    netlifyIdentity.on('recovery', () => {
      alert('Password updated successfully! Please log in with your new password.');
      netlifyIdentity.close();
    });

    // Handle errors
    netlifyIdentity.on('error', (err) => {
      console.error('Netlify Identity error:', err);
      alert('Authentication error: ' + err.message);
    });

  } else {
    setIsLoadingAuth(false);
  }
}, []);
            , []);

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

  const handleLogin = () => {
    if (netlifyIdentity) {
      netlifyIdentity.open();
    }
  };

  const handleLogout = () => {
    if (netlifyIdentity) {
      netlifyIdentity.logout();
    }
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

  const exportNotebook = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const recentMessages = messages.filter(msg => 
      new Date(msg.timestamp) >= thirtyDaysAgo
    );

    const csvContent = [
      ['Timestamp', 'Type', 'Message', 'Resources'],
      ...recentMessages.map(msg => [
        msg.timestamp,
        msg.type,
        msg.content.replace(/,/g, ';').replace(/\n/g, ' '),
        msg.resources ? msg.resources.map(r => `${r.title}: ${r.url}`).join(' | ') : ''
      ])
    ].map(row => row.join(',')).join('\n');

    const blob = new Blob([csvContent], { type: 'text/csv' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'acceleraqa-notebook.csv';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const getThirtyDayMessages = () => {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
    return messages.filter(msg => new Date(msg.timestamp) >= thirtyDaysAgo);
  };

  const clearChat = () => {
    setMessages([]);
    setCurrentResources([]);
  };

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

  const exportToWord = (studyNotesMessage) => {
    const studyData = studyNotesMessage.studyNotesData;
    const resources = studyNotesMessage.resources || [];
    
    const wordContent = `
PHARMACEUTICAL QUALITY & COMPLIANCE STUDY NOTES
Generated: ${studyData.generatedDate}
Topics Covered: ${studyData.selectedTopics}

${studyData.content}

ADDITIONAL LEARNING RESOURCES (${studyData.resourceCount} items):

${resources.map((resource, index) => 
  `${index + 1}. ${resource.title} (${resource.type})\n   Link: ${resource.url}\n`
).join('\n')}

---
Generated by AcceleraQA - AI-powered pharmaceutical quality and compliance assistant
Date: ${new Date().toLocaleString()}
    `.trim();

    const blob = new Blob([wordContent], { 
      type: 'application/msword' 
    });
    
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `AcceleraQA-Study-Notes-${new Date().toISOString().split('T')[0]}.doc`;
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  // Loading screen
  if (isLoadingAuth) {
    return (
      <div className="min-h-screen bg-black text-white flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
          <p className="text-lg">Loading AcceleraQA...</p>
        </div>
      </div>
    );
  }

  // Authentication required screen
  if (!user) {
    return (
      <div className="min-h-screen bg-black text-white">
        {/* Header */}
        <header className="border-b border-gray-800">
          <div className="max-w-7xl mx-auto px-6 py-4">
            <div className="flex items-center justify-between">
              <div className="text-2xl font-bold tracking-tight">AcceleraQA</div>
              <button
                onClick={handleLogin}
                className="px-6 py-2 bg-white text-black font-medium rounded hover:bg-gray-100 transition-colors"
              >
                Sign In
              </button>
            </div>
          </div>
        </header>

        {/* Hero Section */}
        <div className="max-w-7xl mx-auto px-6 py-20">
          <div className="max-w-4xl">
            <h1 className="text-6xl lg:text-8xl font-bold mb-8 leading-tight">
              The Future of
              <span className="block text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-purple-500">
                Pharmaceutical QA
              </span>
            </h1>
            
            <p className="text-xl lg:text-2xl text-gray-300 mb-12 leading-relaxed max-w-3xl">
              AI-powered learning assistant for pharmaceutical quality and compliance professionals. 
              Accelerating innovation in regulatory excellence through intelligent automation.
            </p>

            <div className="bg-gradient-to-r from-purple-600 to-blue-600 p-8 rounded-lg mb-16">
              <h2 className="text-2xl font-bold mb-4">Sign In Required</h2>
              <p className="text-lg text-blue-100 mb-6">
                Access AcceleraQA's advanced pharmaceutical AI assistant with personalized learning resources, 
                conversation history, and study note generation.
              </p>
              <button
                onClick={handleLogin}
                className="group inline-flex items-center space-x-3 bg-white text-black px-8 py-4 rounded-lg font-semibold text-lg hover:bg-gray-100 transition-all duration-300"
              >
                <User className="h-5 w-5" />
                <span>Sign In to Continue</span>
                <ChevronRight className="h-5 w-5 group-hover:translate-x-1 transition-transform" />
              </button>
            </div>

            {/* Features Section */}
            <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="text-center p-6 bg-gray-900 rounded-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-lg mx-auto mb-6 flex items-center justify-center">
                  <MessageSquare className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Intelligent Responses</h3>
                <p className="text-gray-400">
                  Advanced AI understanding of pharmaceutical regulations, GMP standards, and compliance requirements
                </p>
              </div>
              
              <div className="text-center p-6 bg-gray-900 rounded-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-purple-600 to-pink-600 rounded-lg mx-auto mb-6 flex items-center justify-center">
                  <BookOpen className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Curated Learning</h3>
                <p className="text-gray-400">
                  Dynamic resource recommendations from FDA, ICH, and industry leaders for continuous professional development
                </p>
              </div>
              
              <div className="text-center p-6 bg-gray-900 rounded-lg">
                <div className="w-16 h-16 bg-gradient-to-r from-pink-600 to-red-600 rounded-lg mx-auto mb-6 flex items-center justify-center">
                  <FileText className="h-8 w-8 text-white" />
                </div>
                <h3 className="text-xl font-semibold mb-4">Export & Analyze</h3>
                <p className="text-gray-400">
                  Generate comprehensive study materials and export conversation data for team collaboration
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Footer */}
        <footer className="border-t border-gray-800 mt-20">
          <div className="max-w-7xl mx-auto px-6 py-8">
            <div className="text-center text-gray-500">
              Built for pharmaceutical quality and compliance professionals worldwide
            </div>
          </div>
        </footer>
      </div>
    );
  }

  // Authenticated user interface
  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header - Authenticated */}
      <header className="bg-black text-white border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-6">
          <div className="flex justify-between items-center h-16">
            <div className="flex items-center space-x-4">
              <div className="text-2xl font-bold tracking-tight">AcceleraQA</div>
              <div className="hidden md:block text-sm text-gray-400">
                Pharmaceutical Quality & Compliance AI
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-2 text-sm text-gray-300">
                <User className="h-4 w-4" />
                <span>{user.email}</span>
              </div>
              <button
                onClick={clearChat}
                className="px-4 py-2 text-gray-300 hover:text-white transition-colors text-sm"
              >
                Clear
              </button>
              <button
                onClick={() => setShowNotebook(!showNotebook)}
                className="flex items-center space-x-2 px-4 py-2 bg-gray-800 rounded hover:bg-gray-700 transition-colors"
              >
                {showNotebook ? (
                  <>
                    <MessageSquare className="h-4 w-4" />
                    <span>Chat</span>
                  </>
                ) : (
                  <>
                    <Clock className="h-4 w-4" />
                    <span>Notebook</span>
                  </>
                )}
              </button>
              <button
                onClick={exportNotebook}
                className="flex items-center space-x-2 px-4 py-2 bg-white text-black rounded hover:bg-gray-100 transition-colors"
              >
                <Download className="h-4 w-4" />
                <span>Export</span>
              </button>
              <button
                onClick={handleLogout}
                className="flex items-center space-x-2 px-4 py-2 text-gray-300 hover:text-white transition-colors"
              >
                <LogOut className="h-4 w-4" />
                <span>Sign Out</span>
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="max-w-7xl mx-auto px-6 py-8">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 h-[calc(100vh-160px)]">
          {/* Main Chat Area */}
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

          {/* Sidebar - Resources or Notebook */}
          <div className="lg:col-span-1">
            {showNotebook ? (
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
            ) : (
              <div className="bg-white rounded-lg border border-gray-200 p-6 h-full">
                <div className="mb-6">
                  <h3 className="text-lg font-bold text-gray-900 mb-2">Further Learning</h3>
                  <p className="text-sm text-gray-500">Curated resources for your query</p>
                </div>
                
                {currentResources.length > 0 ? (
                  <div className="space-y-4 overflow-y-auto h-[calc(100%-100px)]">
                    {currentResources.map((resource, index) => (
                      <div key={index} className="group border border-gray-200 rounded-lg hover:border-gray-400 transition-all duration-300">
                        <a href={resource.url} target="_blank" rel="noopener noreferrer" className="block p-4">
                          <div className="flex items-start justify-between">
                            <div className="flex-1">
                              <div className="flex items-center space-x-2 mb-2">
                                <span className="text-xs font-semibold uppercase tracking-wide text-gray-500">
                                  {resource.type}
                                </span>
                              </div>
                              <h4 className="font-semibold text-gray-900 group-hover:text-black mb-2 leading-snug">
                                {resource.title}
                              </h4>
                            </div>
                            <ChevronRight className="h-4 w-4 text-gray-400 group-hover:text-black group-hover:translate-x-1 transition-all ml-3 flex-shrink-0" />
                          </div>
                        </a>
                      </div>
                    ))}
                  </div>
                ) : (
                  <div className="text-center py-12">
                    <div className="w-12 h-12 bg-gray-100 rounded-lg mx-auto mb-4 flex items-center justify-center">
                      <Search className="h-6 w-6 text-gray-400" />
                    </div>
                    <p className="text-gray-500">Ask a question to see relevant learning resources</p>
                  </div>
                )}
              </div>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};

export default AcceleraQA;
