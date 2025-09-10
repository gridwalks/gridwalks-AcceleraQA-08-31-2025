// src/services/neonService.js - FIXED VERSION
import { getToken, getUserId } from './authService';

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
   * FIXED: Enhanced authenticated request with better error handling
   */
  async makeAuthenticatedRequest(endpoint, options = {}) {
    try {
      console.log('=== NEON SERVICE AUTHENTICATED REQUEST ===');
      console.log('Endpoint:', endpoint);
      console.log('Options action:', options.body ? JSON.parse(options.body).action : 'N/A');
      
      const defaultHeaders = {
        'Content-Type': 'application/json',
      };

      // CRITICAL FIX: Always try to get fresh token and user ID
      let token = null;
      let userId = null;

      try {
        // Get token first
        token = await getToken();
        console.log('Token retrieved:', !!token);
        console.log('Token length:', token?.length || 0);
        
        if (token) {
          defaultHeaders['Authorization'] = `Bearer ${token}`;
          console.log('Added Authorization header');
        }
      } catch (tokenError) {
        console.error('Failed to get token:', tokenError);
        throw new Error(`Authentication failed: ${tokenError.message}`);
      }

      try {
        // Get user ID using the new helper function
        userId = await getUserId();
        console.log('User ID retrieved:', userId ? userId.substring(0, 10) + '...' : 'null');
        
        if (userId) {
          defaultHeaders['x-user-id'] = userId;
          console.log('Added x-user-id header');
        } else {
          throw new Error('User ID not available');
        }
      } catch (userIdError) {
        console.error('Failed to get user ID:', userIdError);
        throw new Error(`User identification failed: ${userIdError.message}`);
      }

      // Fallback to stored user ID if available
      if (!defaultHeaders['x-user-id'] && this.userId) {
        defaultHeaders['x-user-id'] = this.userId;
        console.log('Using stored user ID as fallback');
      }

      // Add debugging headers
      defaultHeaders['X-Requested-With'] = 'XMLHttpRequest';
      defaultHeaders['X-Client-Version'] = '2.1.0';
      defaultHeaders['X-Timestamp'] = new Date().toISOString();

      console.log('Request headers prepared:', Object.keys(defaultHeaders));
      console.log('Has Authorization:', !!defaultHeaders['Authorization']);
      console.log('Has x-user-id:', !!defaultHeaders['x-user-id']);

      const response = await fetch(endpoint, {
        ...options,
        headers: {
          ...defaultHeaders,
          ...options.headers,
        },
      });

      console.log('Response status:', response.status);
      console.log('Response ok:', response.ok);

      if (!response.ok) {
        console.error('Request failed with status:', response.status);
        
        let errorData;
        try {
          errorData = await response.json();
          console.error('Error response data:', errorData);
        } catch (parseError) {
          console.error('Could not parse error response:', parseError);
          errorData = { 
            error: `HTTP ${response.status}: ${response.statusText}`,
            details: 'Could not parse error response'
          };
        }

        // Enhanced error messages
        if (response.status === 401) {
          throw new Error(`Authentication failed: ${errorData.error || 'Unauthorized'}. Please try signing out and signing in again.`);
        } else if (response.status === 403) {
          throw new Error(`Access forbidden: ${errorData.error || 'Insufficient permissions'}`);
        } else if (response.status >= 500) {
          throw new Error(`Server error: ${errorData.error || 'Internal server error'}. Please try again later.`);
        } else {
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }
      }

      const result = await response.json();
      console.log('Request successful, response keys:', Object.keys(result));
      console.log('=== NEON REQUEST COMPLETED ===');
      return result;

    } catch (error) {
      console.error('=== NEON REQUEST FAILED ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      console.error('============================');
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
      const validMessages = messages
        .filter(msg =>
          msg &&
          msg.id &&
          (msg.type || msg.role) &&
          msg.content &&
          msg.timestamp
        )
        .map(msg => ({
          ...msg,
          type: msg.type || (msg.role === 'assistant' ? 'ai' : msg.role),
        }));

      if (validMessages.length === 0) {
        console.warn('No valid messages to save');
        return { success: false, error: 'No valid messages' };
      }

      const ragMessages = validMessages.filter(
        msg => msg.sources && msg.sources.length > 0
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
      
      if (error.message.includes('Authentication failed') || error.message.includes('401')) {
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
        const nonWelcomeMessages = messages.filter(msg => {
          const msgType = msg.type || msg.role;
          return !(msgType === 'ai' && msg.content.includes('Welcome to AcceleraQA'));
        });

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
        type: msg.type === 'assistant' ? 'ai' : msg.type,
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
      const msgType = msg.type || msg.role;
      if (msgType === 'user' && msg.content) {
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
   * Training resources management
   */
  async addTrainingResource(resource) {
    try {
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'add_training_resource',
          data: resource
        })
      });
      return result.resource;
    } catch (error) {
      console.error('Failed to add training resource:', error);
      throw error;
    }
  }

  async getTrainingResources() {
    try {
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'get_training_resources' })
      });
      return result.resources || [];
    } catch (error) {
      console.error('Failed to load training resources:', error);
      return [];
    }
  }

  /**
   * Load overall system status information
   */
  async getSystemStatus() {
    try {
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify({ action: 'get_system_status' })
      });
      return result.status || {};
    } catch (error) {
      console.error('Failed to load system status:', error);
      return {};
    }
  }

  /**
   * Check if the service is available
   */
  async isServiceAvailable() {
    try {
      console.log('Checking Neon service availability...');

      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'health_check'
        })
      });

      console.log('Neon service is available');
      return { ok: true };
    } catch (error) {
      console.warn('Neon service not available:', error.message);
      return { ok: false, error: error.message };
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

export const getSystemStatus = () =>
  neonService.getSystemStatus();

export const isServiceAvailable = () =>
  neonService.isServiceAvailable();
