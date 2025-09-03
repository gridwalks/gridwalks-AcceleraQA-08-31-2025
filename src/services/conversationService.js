// src/services/conversationService.js
import { getToken } from './authService';

const API_BASE_URL = '/.netlify/functions';

class ConversationService {
  constructor() {
    this.apiUrl = `${API_BASE_URL}/conversations`;
  }

  async makeAuthenticatedRequest(endpoint, options = {}) {
    try {
      // Get Auth0 token
      const token = await getToken();
      
      const defaultHeaders = {
        'Content-Type': 'application/json',
      };

      // Add authorization header if token is available
      if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
      }

      const response = await fetch(endpoint, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `HTTP ${response.status}: ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('API request failed:', error);
      throw error;
    }
  }

  /**
   * Save a conversation to the server
   * @param {Object[]} messages - Array of messages in the conversation
   * @param {Object} metadata - Optional metadata about the conversation
   * @returns {Promise<Object>} - Save result
   */
  async saveConversation(messages, metadata = {}) {
    console.log('Saving conversation to server...', { messageCount: messages.length });
    
    try {
      const payload = {
        messages: messages.map(msg => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp,
          resources: msg.resources || [],
          isStudyNotes: msg.isStudyNotes || false
        })),
        metadata: {
          topics: this.extractTopics(messages),
          messageCount: messages.length,
          lastActivity: new Date().toISOString(),
          ...metadata
        }
      };

      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      console.log('Conversation saved successfully:', result);
      return result;
    } catch (error) {
      console.error('Failed to save conversation:', error);
      throw new Error(`Failed to save conversation: ${error.message}`);
    }
  }

  /**
   * Load all conversations for the authenticated user
   * @returns {Promise<Object[]>} - Array of conversations
   */
  async loadConversations() {
    console.log('Loading conversations from server...');
    
    try {
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'GET',
      });

      console.log(`Loaded ${result.total} conversations from server`);
      
      // Convert server format back to message format
      const messages = this.conversationsToMessages(result.conversations);
      
      return messages;
    } catch (error) {
      console.error('Failed to load conversations:', error);
      
      // Return empty array instead of throwing to allow app to continue
      if (error.message.includes('401') || error.message.includes('authentication')) {
        console.warn('Authentication required for loading conversations');
        return [];
      }
      
      return [];
    }
  }

  /**
   * Delete all conversations for the authenticated user
   * @returns {Promise<Object>} - Deletion result
   */
  async clearConversations() {
    console.log('Clearing all conversations from server...');
    
    try {
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'DELETE',
      });

      console.log('All conversations cleared successfully');
      return result;
    } catch (error) {
      console.error('Failed to clear conversations:', error);
      throw new Error(`Failed to clear conversations: ${error.message}`);
    }
  }

  /**
   * Convert server conversation format to client message format
   * @param {Object[]} conversations - Server conversation objects
   * @returns {Object[]} - Array of messages
   */
  conversationsToMessages(conversations) {
    if (!Array.isArray(conversations)) {
      return [];
    }

    // Flatten all messages from all conversations
    const allMessages = conversations.flatMap(conversation => 
      (conversation.messages || []).map(msg => ({
        ...msg,
        isStored: true,
        isCurrent: false,
        conversationId: conversation.id,
        conversationCreated: conversation.createdAt
      }))
    );

    // Sort by timestamp
    allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    console.log(`Converted ${conversations.length} conversations to ${allMessages.length} messages`);
    return allMessages;
  }

  /**
   * Extract topics from messages for metadata
   * @param {Object[]} messages - Array of messages
   * @returns {string[]} - Array of topics
   */
  extractTopics(messages) {
    const topics = new Set();
    
    messages.forEach(msg => {
      if (msg.type === 'user' && msg.content) {
        // Simple topic extraction from user messages
        const content = msg.content.toLowerCase();
        
        // Common pharmaceutical topics
        const pharmaTopics = [
          'gmp', 'gcp', 'glp', 'validation', 'capa', 'fda', 'ich', 
          'regulatory', 'compliance', 'quality', 'manufacturing',
          'clinical', 'laboratory', 'cfr', 'part 11', 'audit'
        ];
        
        pharmaTopics.forEach(topic => {
          if (content.includes(topic)) {
            topics.add(topic.toUpperCase());
          }
        });
      }
    });
    
    return Array.from(topics);
  }

  /**
   * Check if the service is available and user is authenticated
   * @returns {Promise<boolean>} - Whether service is available
   */
  async isServiceAvailable() {
    try {
      // Try to make a simple request to check connectivity and auth
      await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'GET',
      });
      return true;
    } catch (error) {
      console.warn('Conversation service not available:', error.message);
      return false;
    }
  }

  /**
   * Get conversation statistics
   * @returns {Promise<Object>} - Conversation statistics
   */
  async getConversationStats() {
    try {
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'GET',
      });

      const conversations = result.conversations || [];
      const totalMessages = conversations.reduce((sum, conv) => sum + (conv.messages?.length || 0), 0);
      
      return {
        totalConversations: conversations.length,
        totalMessages,
        oldestConversation: conversations.length > 0 ? 
          conversations[conversations.length - 1]?.createdAt : null,
        newestConversation: conversations.length > 0 ? 
          conversations[0]?.createdAt : null,
      };
    } catch (error) {
      console.error('Failed to get conversation stats:', error);
      return {
        totalConversations: 0,
        totalMessages: 0,
        oldestConversation: null,
        newestConversation: null,
      };
    }
  }
}

// Create singleton instance
const conversationService = new ConversationService();

export default conversationService;

// Export convenience functions
export const saveConversation = (messages, metadata) => 
  conversationService.saveConversation(messages, metadata);

export const loadConversations = () => 
  conversationService.loadConversations();

export const clearConversations = () => 
  conversationService.clearConversations();

export const getConversationStats = () => 
  conversationService.getConversationStats();
