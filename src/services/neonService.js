// src/services/neonService.js - FIXED VERSION

import { getToken } from './authService';

class NeonService {
  constructor() {
    this.apiUrl = '/.netlify/functions/neon-db';
    this.isInitialized = false;
    this.currentUser = null;
  }

  // Initialize service with user context
  async initialize(user) {
    if (!user || !user.sub) {
      throw new Error('Valid user object required for initialization');
    }

    this.currentUser = user;
    this.isInitialized = true;
    
    console.log('✅ Neon service initialized for user:', user.sub);
    
    // Test connection
    try {
      await this.isServiceAvailable();
      console.log('✅ Neon database connection verified');
    } catch (error) {
      console.warn('⚠️ Neon database connection test failed:', error.message);
      // Don't throw here - service can still work in degraded mode
    }

    return true;
  }

  // Check if service is available
  async isServiceAvailable() {
    try {
      const response = await this.makeRequest(this.apiUrl, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ action: 'test' })
      });

      return response.success || false;
    } catch (error) {
      console.warn('Neon service availability check failed:', error);
      return false;
    }
  }

  // Make authenticated request to Neon API
  async makeAuthenticatedRequest(url, options = {}) {
    if (!this.isInitialized) {
      throw new Error('Neon service not initialized. Call initialize() first.');
    }

    try {
      // Get authentication token
      const token = await getToken();
      if (!token) {
        throw new Error('No authentication token available');
      }

      // Make request with authentication
      const response = await fetch(url, {
        ...options,
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${token}`,
          ...options.headers
        }
      });

      if (!response.ok) {
        const errorText = await response.text();
        console.error('Neon API error response:', {
          status: response.status,
          statusText: response.statusText,
          body: errorText
        });
        throw new Error(`Neon API request failed: ${response.status} ${response.statusText}`);
      }

      const data = await response.json();
      
      if (!data.success) {
        throw new Error(data.error || 'Neon API request was not successful');
      }

      return data;

    } catch (error) {
      console.error('Authenticated request failed:', error);
      throw error;
    }
  }

  // Make unauthenticated request (for testing)
  async makeRequest(url, options = {}) {
    try {
      const response = await fetch(url, options);
      
      if (!response.ok) {
        throw new Error(`Request failed: ${response.status} ${response.statusText}`);
      }

      return await response.json();
    } catch (error) {
      console.error('Request failed:', error);
      throw error;
    }
  }

  // Save conversation to Neon database
  async saveConversation(messages) {
    if (!messages || messages.length === 0) {
      console.log('No messages to save');
      return { success: true };
    }

    try {
      console.log(`💾 Saving ${messages.length} messages to Neon database...`);

      const payload = {
        action: 'save_conversation',
        user_id: this.currentUser.sub,
        messages: messages.map(msg => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp || new Date().toISOString(),
          resources: msg.resources || []
        }))
      };

      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      console.log('✅ Conversation saved successfully');
      return result;

    } catch (error) {
      console.error('❌ Failed to save conversation to Neon:', error);
      throw new Error(`Failed to save conversation: ${error.message}`);
    }
  }

  // Load conversations from Neon database
  async loadConversations() {
    try {
      console.log('📥 Loading conversations from Neon database...');

      const payload = {
        action: 'load_conversations',
        user_id: this.currentUser.sub
      };

      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      const messages = result.messages || [];
      console.log(`✅ Loaded ${messages.length} messages from Neon database`);

      return messages;

    } catch (error) {
      console.error('❌ Failed to load conversations from Neon:', error);
      
      // Return empty array instead of throwing - allows app to continue
      console.log('📝 Returning empty conversation history due to load error');
      return [];
    }
  }

  // Get conversation statistics
  async getConversationStats() {
    try {
      const payload = {
        action: 'get_stats',
        user_id: this.currentUser.sub
      };

      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      return result.stats || {};

    } catch (error) {
      console.error('❌ Failed to get conversation stats:', error);
      return {
        total_messages: 0,
        total_conversations: 0,
        last_activity: null
      };
    }
  }

  // Delete conversations
  async deleteConversations() {
    try {
      console.log('🗑️ Deleting all conversations...');

      const payload = {
        action: 'delete_conversations',
        user_id: this.currentUser.sub
      };

      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      console.log('✅ Conversations deleted successfully');
      return result;

    } catch (error) {
      console.error('❌ Failed to delete conversations:', error);
      throw new Error(`Failed to delete conversations: ${error.message}`);
    }
  }

  // Health check
  async healthCheck() {
    try {
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify({
          action: 'health_check',
          user_id: this.currentUser.sub
        })
      });

      return {
        status: 'healthy',
        timestamp: new Date().toISOString(),
        ...result
      };

    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      };
    }
  }

  // Batch operations for performance
  async batchSaveMessages(messageGroups) {
    try {
      console.log(`💾 Batch saving ${messageGroups.length} message groups...`);

      const payload = {
        action: 'batch_save',
        user_id: this.currentUser.sub,
        message_groups: messageGroups
      };

      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      console.log('✅ Batch save completed successfully');
      return result;

    } catch (error) {
      console.error('❌ Batch save failed:', error);
      throw new Error(`Batch save failed: ${error.message}`);
    }
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }

  // Check initialization status
  isServiceInitialized() {
    return this.isInitialized;
  }

  // Reset service
  reset() {
    this.isInitialized = false;
    this.currentUser = null;
    console.log('🔄 Neon service reset');
  }
}

// Create and export singleton instance
const neonService = new NeonService();

// Helper function to initialize the service
export const initializeNeonService = async (user) => {
  return await neonService.initialize(user);
};

// Helper function to load conversations
export const loadConversations = async () => {
  return await neonService.loadConversations();
};

export default neonService;
