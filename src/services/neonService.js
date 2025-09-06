// src/services/neonService.js - Neon PostgreSQL database service
import { getToken } from './authService';

class NeonService {
  constructor() {
    this.apiUrl = '/.netlify/functions/neon-db';
    this.isInitialized = false;
    this.userId = null;
    this.cachedConversations = null;
  }

  /**
   * Initialize the service with user authentication
   */
  async initialize(user) {
    if (user && user.sub) {
      this.userId = user.sub;
      this.isInitialized = true;
      console.log('NeonService initialized for user:', this.userId);
    }
  }

  /**
   * Make authenticated request to Netlify function
   */
  async makeAuthenticatedRequest(endpoint, options = {}) {
    try {
      const token = await getToken();
      
      const defaultHeaders = {
        'Content-Type': 'application/json',
      };

      if (token) {
        defaultHeaders['Authorization'] = `Bearer ${token}`;
        
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.sub) {
              defaultHeaders['x-user-id'] = payload.sub;
            }
          }
        } catch (parseError) {
          console.warn('Could not parse token for user ID:', parseError);
        }
      }

      if (!defaultHeaders['x-user-id'] && this.userId) {
        defaultHeaders['x-user-id'] = this.userId;
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
      console.error('Neon API request failed:', error);
      throw error;
    }
  }

  /**
   * Save a conversation to Neon database
   */
  async saveConversation(messages, metadata = {}) {
    if (!this.isInitialized) {
      throw new Error('NeonService not initialized');
    }

    console.log('Saving conversation to Neon...', { 
      messageCount: messages.length,
      userId: this.userId 
    });
    
    try {
      const validMessages = messages.filter(msg => 
        msg && msg.id && msg.type && msg.content && msg.timestamp
      );

      if (validMessages.length === 0) {
        console.warn('No valid messages to save');
        return { success: false, error: 'No valid messages' };
      }

      const ragMessages = validMessages.filter(msg => 
        msg.sources && msg.sources.length > 0
      );
      
      const ragDocuments = [...new Set(
        ragMessages.flatMap(msg => 
          msg.sources?.map(source => source.documentId) || []
        )
      )];

      const payload = {
        action: 'save_conversation',
        data: {
          messages: validMessages.map(msg => ({
            id: msg.id,
            type: msg.type,
            content: msg.content,
            timestamp: msg.timestamp,
            resources: msg.resources || [],
            sources: msg.sources || [],
            isStudyNotes: msg.isStudyNotes || false
          })),
          metadata: {
            topics: this.extractTopics(validMessages),
            messageCount: validMessages.length,
            lastActivity: new Date().toISOString(),
            ragUsed: ragMessages.length > 0,
            ragDocuments: ragDocuments,
            ragMessageCount: ragMessages.length,
            sessionId: Date.now().toString(),
            userAgent: navigator.userAgent,
            ...metadata
          }
        }
      };

      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify(payload),
      });

      console.log('Conversation saved successfully to Neon:', result);
      
      this.cachedConversations = null;
      
      return result;
    } catch (error) {
      console.error('Failed to save conversation to Neon:', error);
      throw new Error(`Failed to save conversation: ${error.message}`);
    }
  }

  /**
   * Load all conversations from Neon database
   */
  async loadConversations(useCache = true) {
    if (!this.isInitialized) {
      console.warn('NeonService not initialized, returning empty array');
      return [];
    }

    if (useCache && this.cachedConversations) {
      console.log('Returning cached conversations:', this.cachedConversations.length);
      return this.cachedConversations;
    }

    console.log('Loading conversations from Neon for user:', this.userId);
    
    try {
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'get_conversations'
        })
      });

      console.log(`Loaded ${result.total || 0} conversations from Neon`);
      
      const messages = this.conversationsToMessages(result.conversations || []);
      
      this.cachedConversations = messages;
      
      return messages;
    } catch (error) {
      console.error('Failed to load conversations from Neon:', error);
      
      if (error.message.includes('401') || error.message.includes('authentication')) {
        console.warn('Authentication required for loading conversations');
        return [];
      }
      
      console.warn('Returning empty conversations due to error:', error.message);
      return [];
    }
  }

  /**
   * Delete all conversations from Neon database
   */
  async clearConversations() {
    if (!this.isInitialized) {
      throw new Error('NeonService not initialized');
    }

    console.log('Clearing all conversations from Neon for user:', this.userId);
    
    try {
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'clear_conversations'
        })
      });

      console.log('All conversations cleared successfully from Neon');
      
      this.cachedConversations = null;
      
      return result;
    } catch (error) {
      console.error('Failed to clear conversations from Neon:', error);
      throw new Error(`Failed to clear conversations: ${error.message}`);
    }
  }

  /**
   * Auto-save current conversation with debouncing
   */
  async autoSaveConversation(messages, metadata = {}) {
    if (!this.isInitialized || !messages || messages.length === 0) {
      return;
    }

    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
    }

    this.autoSaveTimeout = setTimeout(async () => {
      try {
        const nonWelcomeMessages = messages.filter(msg => 
          !(msg.type === 'ai' && msg.content.includes('Welcome to AcceleraQA'))
        );

        if (nonWelcomeMessages.length >= 2) {
          console.log('Auto-saving conversation to Neon...');
          await this.saveConversation(messages, {
            ...metadata,
            autoSaved: true,
            autoSaveTime: new Date().toISOString()
          });
        }
      } catch (error) {
        console.warn('Auto-save to Neon failed:', error);
      }
    }, 3000);
  }

  /**
   * Convert server conversation format to client message format
   */
  conversationsToMessages(conversations) {
    if (!Array.isArray(conversations)) {
      return [];
    }

    const allMessages = conversations.flatMap(conversation => 
      (conversation.messages || []).map(msg => ({
        ...msg,
        isStored: true,
        isCurrent: false,
        conversationId: conversation.id,
        conversationCreated: conversation.created_at,
        ragUsed: conversation.used_rag || false,
        ragDocuments: conversation.rag_documents_referenced || []
      }))
    );

    allMessages.sort((a, b) => new Date(a.timestamp) - new Date(b.timestamp));

    console.log(`Converted ${conversations.length} conversations to ${allMessages.length} messages`);
    return allMessages;
  }

  /**
   * Extract topics from messages for metadata
   */
  extractTopics(messages) {
    const topics = new Set();
    
    messages.forEach(msg => {
      if (msg.type === 'user' && msg.content) {
        const content = msg.content.toLowerCase();
        
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
   * Check if the service is available
   */
  async isServiceAvailable() {
    try {
      console.log('Checking Neon service availability...');
      
      const response = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'health_check'
        })
      });
      
      console.log('Neon service is available');
      return true;
    } catch (error) {
      console.warn('Neon service not available:', error.message);
      return false;
    }
  }

  /**
   * Get conversation statistics including RAG usage
   */
  async getConversationStats() {
    if (!this.isInitialized) {
      return this.getEmptyStats();
    }

    try {
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'get_stats'
        })
      });

      return result.stats || this.getEmptyStats();
    } catch (error) {
      console.error('Failed to get conversation stats from Neon:', error);
      return this.getEmptyStats();
    }
  }

  /**
   * Get empty stats object
   */
  getEmptyStats() {
    return {
      totalConversations: 0,
      totalMessages: 0,
      ragConversations: 0,
      ragUsagePercentage: 0,
      oldestConversation: null,
      newestConversation: null,
    };
  }

  /**
   * Get cache status
   */
  getCacheStatus() {
    return {
      isInitialized: this.isInitialized,
      userId: this.userId,
      hasCachedConversations: !!this.cachedConversations,
      cachedMessageCount: this.cachedConversations?.length || 0,
      lastCacheTime: this.lastCacheTime || null
    };
  }

  /**
   * Cleanup method
   */
  cleanup() {
    if (this.autoSaveTimeout) {
      clearTimeout(this.autoSaveTimeout);
      this.autoSaveTimeout = null;
    }
    this.cachedConversations = null;
    this.isInitialized = false;
    this.userId = null;
  }
}

const neonService = new NeonService();

export default neonService;

// Export convenience functions
export const initializeNeonService = (user) => 
  neonService.initialize(user);

export const saveConversation = (messages, metadata) => 
  neonService.saveConversation(messages, metadata);

export const loadConversations = (useCache = true) => 
  neonService.loadConversations(useCache);

export const clearConversations = () => 
  neonService.clearConversations();

export const autoSaveConversation = (messages, metadata) => 
  neonService.autoSaveConversation(messages, metadata);

export const getConversationStats = () =>
  neonService.getConversationStats();
export const isServiceAvailable = () =>
  neonService.isServiceAvailable();
