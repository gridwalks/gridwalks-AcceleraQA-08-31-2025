// Updated App.js - Fixed generateStudyNotes function

// Generate study notes from selected messages
const generateStudyNotes = useCallback(async () => {
  if (selectedMessages.size === 0 || isGeneratingNotes) return;

  setIsGeneratingNotes(true);
  setError(null);

  try {
    // Get selected conversation data from thirtyDayMessages based on selected IDs
    const selectedConversationData = thirtyDayMessages.filter(msg => {
      // Check if this message's ID is in selectedMessages
      if (selectedMessages.has(msg.id)) {
        return true;
      }
      
      // For combined conversations, check if the combined ID is selected
      const combinedId = `${msg.id}-combined`;
      if (selectedMessages.has(combinedId)) {
        return true;
      }
      
      return false;
    });

    // Also check for combined conversations from the notebook view
    const thirtyDayConversations = combineMessagesIntoConversations(thirtyDayMessages);
    const selectedCombinedConversations = thirtyDayConversations.filter(conv => 
      selectedMessages.has(conv.id)
    );

    // Flatten combined conversations back to individual messages
    const messagesFromCombined = selectedCombinedConversations.flatMap(conv => {
      const messages = [];
      if (conv.originalUserMessage) {
        messages.push(conv.originalUserMessage);
      }
      if (conv.originalAiMessage) {
        messages.push(conv.originalAiMessage);
      }
      return messages;
    });

    // Combine all selected message data
    const allSelectedMessages = [
      ...selectedConversationData,
      ...messagesFromCombined
    ];

    // Remove duplicates based on message ID
    const uniqueSelectedMessages = allSelectedMessages.reduce((acc, msg) => {
      if (!acc.find(existing => existing.id === msg.id)) {
        acc.push(msg);
      }
      return acc;
    }, []);

    console.log('Selected messages for study notes:', uniqueSelectedMessages);
    
    if (uniqueSelectedMessages.length === 0) {
      throw new Error('No valid messages found in selection. Please ensure you have selected conversations from the notebook.');
    }

    const response = await openaiService.generateStudyNotes(uniqueSelectedMessages);
    
    const studyNotesMessage = createMessage(
      'ai',
      `📚 **Study Notes Generated**\n\nBased on your selected conversations, here are comprehensive study notes:\n\n${response.answer}\n\n---\n*Study notes generated from ${selectedMessages.size} selected conversation items on ${new Date().toLocaleDateString()}*`,
      response.resources,
      true
    );

    // Add study notes data for export
    studyNotesMessage.studyNotesData = {
      content: response.answer,
      selectedTopics: uniqueSelectedMessages
        .filter(msg => msg.content && msg.type === 'user')
        .map(msg => msg.content.substring(0, 50) + '...')
        .join(', '),
      resourceCount: response.resources.length,
      generatedDate: new Date().toLocaleDateString()
    };

    setMessages(prev => [...prev, studyNotesMessage]);
    setCurrentResources(response.resources);
    setSelectedMessages(new Set());
    setShowNotebook(false);

  } catch (error) {
    console.error('Error generating study notes:', error);
    
    const errorMessage = createMessage(
      'ai',
      error.message || 'Failed to generate study notes. Please try again.'
    );
    
    setMessages(prev => [...prev, errorMessage]);
  } finally {
    setIsGeneratingNotes(false);
  }
}, [selectedMessages, thirtyDayMessages, isGeneratingNotes, openaiService, setMessages, setCurrentResources, setSelectedMessages, setShowNotebook, setError, createMessage, combineMessagesIntoConversations]);

// Updated OpenAI Service - Fixed generateStudyNotes method
;
async generateStudyNotes(selectedMessages) {
  if (!selectedMessages || selectedMessages.length === 0) {
    throw new Error('No messages selected for study notes generation');
  }

  console.log('Generating study notes for messages:', selectedMessages);

  // Group messages by conversation pairs (user question + AI response)
  const conversationPairs = [];
  let currentPair = {};

  selectedMessages
    .sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp))
    .forEach(msg => {
      if (msg.type === 'user') {
        // Start new conversation pair
        if (currentPair.question || currentPair.answer) {
          conversationPairs.push(currentPair);
        }
        currentPair = { question: msg.content };
      } else if (msg.type === 'ai' && !msg.isStudyNotes) {
        // Add AI response to current pair
        currentPair.answer = msg.content;
        currentPair.resources = msg.resources || [];
      }
    });

  // Don't forget the last pair
  if (currentPair.question || currentPair.answer) {
    conversationPairs.push(currentPair);
  }

  if (conversationPairs.length === 0) {
    throw new Error('No valid conversation pairs found for study notes generation');
  }

  // Create study content from conversation pairs
  const studyContent = conversationPairs
    .map((pair, index) => {
      let content = `\n=== CONVERSATION ${index + 1} ===\n`;
      
      if (pair.question) {
        content += `QUESTION: ${pair.question}\n\n`;
      }
      
      if (pair.answer) {
        content += `ANSWER: ${pair.answer}\n`;
      }
      
      if (pair.resources && pair.resources.length > 0) {
        content += `\nRELATED RESOURCES:\n`;
        content += pair.resources
          .map(r => `• ${r.title} (${r.type}): ${r.url}`)
          .join('\n');
        content += '\n';
      }
      
      return content;
    })
    .join('\n');

  const studyPrompt = `Create comprehensive study notes for pharmaceutical quality and compliance based on the following conversation topics. 

Format as organized study material with:
1. **Executive Summary** - Key takeaways from all conversations
2. **Core Topics Covered** - Main pharmaceutical quality areas discussed
3. **Key Concepts and Definitions** - Important terms and their meanings
4. **Regulatory Requirements** - Specific FDA, ICH, or other regulatory guidance mentioned
5. **Implementation Best Practices** - Practical recommendations from the discussions
6. **Common Pitfalls to Avoid** - Warnings and cautions identified
7. **Study Questions for Review** - Questions to test understanding

Include specific references to FDA, ICH, and other regulatory guidelines where applicable.
Make this comprehensive but well-organized for study purposes.

Number of conversations analyzed: ${conversationPairs.length}

Conversation content:
${studyContent}`;

  return await this.getChatResponse(studyPrompt);
}

// Updated messageUtils.js - Fixed combineMessagesIntoConversations function

export function combineMessagesIntoConversations(messages) {
  if (!messages || !Array.isArray(messages)) {
    return [];
  }

  return messages.reduce((acc, message, index, array) => {
    // Skip user messages that have a following AI message (they'll be combined)
    if (message.type === 'user' && index < array.length - 1 && array[index + 1].type === 'ai') {
      return acc;
    }
    
    // Combine AI message with preceding user message
    if (message.type === 'ai' && index > 0 && array[index - 1].type === 'user') {
      const userMessage = array[index - 1];
      const combinedMessage = {
        id: `${userMessage.id}-${message.id}`, // Use both IDs for unique identification
        userContent: userMessage.content,
        aiContent: message.content,
        timestamp: message.timestamp,
        resources: message.resources || [],
        isStudyNotes: message.isStudyNotes || false,
        originalUserMessage: userMessage,
        originalAiMessage: message
      };
      acc.push(combinedMessage);
    } 
    // Handle standalone AI messages (like welcome messages)
    else if (message.type === 'ai') {
      const combinedMessage = {
        id: message.id,
        userContent: null,
        aiContent: message.content,
        timestamp: message.timestamp,
        resources: message.resources || [],
        isStudyNotes: message.isStudyNotes || false,
        originalAiMessage: message
      };
      acc.push(combinedMessage);
    } 
    // Handle standalone user messages (unlikely but possible)
    else if (message.type === 'user') {
      const combinedMessage = {
        id: message.id,
        userContent: message.content,
        aiContent: null,
        timestamp: message.timestamp,
        resources: [],
        isStudyNotes: false,
        originalUserMessage: message
      };
      acc.push(combinedMessage);
    }
    
    return acc;
  }, []);
}
