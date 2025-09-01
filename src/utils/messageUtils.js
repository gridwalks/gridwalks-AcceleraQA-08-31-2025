import { UI_CONFIG } from '../config/constants';

/**
 * Filters messages from the specified number of days ago
 * @param {Object[]} messages - Array of message objects
 * @param {number} days - Number of days to look back (default: 30)
 * @returns {Object[]} - Filtered messages
 */
export function getMessagesByDays(messages, days = UI_CONFIG.MESSAGE_HISTORY_DAYS) {
  if (!messages || !Array.isArray(messages)) {
    return [];
  }

  const cutoffDate = new Date();
  cutoffDate.setDate(cutoffDate.getDate() - days);
  
  return messages.filter(msg => {
    if (!msg.timestamp) return false;
    const messageDate = new Date(msg.timestamp);
    return messageDate >= cutoffDate && !isNaN(messageDate.getTime());
  });
}

/**
 * Combines user and AI message pairs into conversation objects
 * @param {Object[]} messages - Array of message objects
 * @returns {Object[]} - Array of combined conversation objects
 */
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
        id: `${userMessage.id}-${message.id}`,
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

/**
 * Gets recent conversations limited to display maximum
 * @param {Object[]} messages - Array of message objects
 * @returns {Object[]} - Array of recent conversations
 */
export function getRecentConversations(messages) {
  const recentMessages = getMessagesByDays(messages);
  const conversations = combineMessagesIntoConversations(recentMessages);
  return conversations.slice(-UI_CONFIG.MAX_DISPLAYED_CONVERSATIONS);
}

/**
 * Searches messages by content
 * @param {Object[]} messages - Array of message objects
 * @param {string} searchTerm - Search term
 * @returns {Object[]} - Filtered messages
 */
export function searchMessages(messages, searchTerm) {
  if (!messages || !searchTerm || searchTerm.trim() === '') {
    return messages;
  }

  const lowerSearchTerm = searchTerm.toLowerCase();
  
  return messages.filter(msg => 
    msg.content && msg.content.toLowerCase().includes(lowerSearchTerm)
  );
}

/**
 * Gets messages with study notes
 * @param {Object[]} messages - Array of message objects
 * @returns {Object[]} - Messages that are study notes
 */
export function getStudyNotes(messages) {
  if (!messages || !Array.isArray(messages)) {
    return [];
  }

  return messages.filter(msg => msg.isStudyNotes === true);
}

/**
 * Gets messages with resources
 * @param {Object[]} messages - Array of message objects
 * @returns {Object[]} - Messages that have resources
 */
export function getMessagesWithResources(messages) {
  if (!messages || !Array.isArray(messages)) {
    return [];
  }

  return messages.filter(msg => 
    msg.resources && Array.isArray(msg.resources) && msg.resources.length > 0
  );
}

/**
 * Creates a new message object with validation
 * @param {string} type - Message type ('user' or 'ai')
 * @param {string} content - Message content
 * @param {Object[]} resources - Optional resources array
 * @param {boolean} isStudyNotes - Whether this is a study notes message
 * @returns {Object} - New message object
 */
export function createMessage(type, content, resources = [], isStudyNotes = false) {
  if (!type || !content) {
    throw new Error('Message type and content are required');
  }

  if (type !== 'user' && type !== 'ai') {
    throw new Error('Message type must be "user" or "ai"');
  }

  if (typeof content !== 'string' || content.trim() === '') {
    throw new Error('Message content must be a non-empty string');
  }

  return {
    id: Date.now() + Math.random(), // More unique ID generation
    type,
    content: content.trim(),
    timestamp: new Date().toISOString(),
    resources: Array.isArray(resources) ? resources : [],
    isStudyNotes: Boolean(isStudyNotes)
  };
}

/**
 * Validates message object structure
 * @param {Object} message - Message object to validate
 * @returns {boolean} - Whether the message is valid
 */
export function validateMessage(message) {
  if (!message || typeof message !== 'object') {
    return false;
  }

  const requiredFields = ['id', 'type', 'content', 'timestamp'];
  const hasRequiredFields = requiredFields.every(field => 
    message.hasOwnProperty(field) && message[field] != null
  );

  if (!hasRequiredFields) {
    return false;
  }

  if (message.type !== 'user' && message.type !== 'ai') {
    return false;
  }

  if (typeof message.content !== 'string' || message.content.trim() === '') {
    return false;
  }

  // Validate timestamp
  const date = new Date(message.timestamp);
  if (isNaN(date.getTime())) {
    return false;
  }

  return true;
}

/**
 * Sanitizes message content for display
 * @param {string} content - Message content
 * @returns {string} - Sanitized content
 */
export function sanitizeMessageContent(content) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  const parser = new DOMParser();
  const doc = parser.parseFromString(content, 'text/html');

  // Remove script and other potentially dangerous elements
  const removableElements = doc.querySelectorAll('script, style, iframe, object, embed');
  removableElements.forEach(el => el.remove());

  // Strip dangerous attributes like event handlers and javascript: URLs
  Array.from(doc.body.getElementsByTagName('*')).forEach(el => {
    Array.from(el.attributes).forEach(attr => {
      const name = attr.name;
      const value = attr.value;
      if (
        /^on/i.test(name) ||
        name === 'srcdoc' ||
        (['href', 'src'].includes(name) && value.trim().toLowerCase().startsWith('javascript:'))
      ) {
        el.removeAttribute(name);
      }
    });
  });

  return doc.body.innerHTML.trim();
}

/**
 * Gets message statistics
 * @param {Object[]} messages - Array of message objects
 * @returns {Object} - Message statistics
 */
export function getMessageStats(messages) {
  if (!messages || !Array.isArray(messages)) {
    return {
      total: 0,
      userMessages: 0,
      aiMessages: 0,
      studyNotes: 0,
      withResources: 0,
      conversations: 0
    };
  }

  const userMessages = messages.filter(msg => msg.type === 'user');
  const aiMessages = messages.filter(msg => msg.type === 'ai');
  const studyNotes = messages.filter(msg => msg.isStudyNotes);
  const withResources = messages.filter(msg => 
    msg.resources && Array.isArray(msg.resources) && msg.resources.length > 0
  );
  const conversations = combineMessagesIntoConversations(messages);

  return {
    total: messages.length,
    userMessages: userMessages.length,
    aiMessages: aiMessages.length,
    studyNotes: studyNotes.length,
    withResources: withResources.length,
    conversations: conversations.length
  };
}

/**
 * Truncates message content for display in lists
 * @param {string} content - Message content
 * @param {number} maxLength - Maximum length (default: 100)
 * @returns {string} - Truncated content
 */
export function truncateContent(content, maxLength = 100) {
  if (!content || typeof content !== 'string') {
    return '';
  }

  if (content.length <= maxLength) {
    return content;
  }

  return content.substring(0, maxLength - 3) + '...';
}
