// netlify/functions/rag.js - Updated for Neon PostgreSQL
const { Pool } = require('pg');

// Initialize Neon PostgreSQL connection
const pool = new Pool({
  connectionString: process.env.NEON_DATABASE_URL,
  ssl: { rejectUnauthorized: false }
});

// CORS headers for all responses
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight' }),
    };
  }

  let client;
  
  try {
    const { body } = event;
    const { user } = context.clientContext || {};
    
    // Extract user ID from Auth0 context
    const userId = user?.sub || event.headers['x-user-id'];
    
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'User authentication required' }),
      };
    }

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    const requestData = JSON.parse(body);
    const { action } = requestData;

    // Get database connection
    client = await pool.connect();

    switch (action) {
      case 'upload':
        return await uploadDocument(client, userId, requestData.document);
      
      case 'search':
        return await searchDocuments(client, userId, requestData.query, requestData.options);
      
      case 'list':
        return await getDocuments(client, userId);
      
      case 'delete':
        return await deleteDocument(client, userId, requestData.documentId);
      
      case 'stats':
        return await getUserStats(client, userId);
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }
  } catch (error) {
    console.error('RAG Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
    };
  } finally {
    if (client) {
      client.release();
    }
  }
};

/**
 * Upload and store document with embeddings
 */
async function uploadDocument(client, userId, document) {
  try {
    await client.query('BEGIN');

    // Insert document record
    const documentResult = await client.query(`
      INSERT INTO rag_documents (
        user_id, filename, original_filename, file_type, file_size, 
        text_content, metadata, category, tags
      ) VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9)
      RETURNING id, filename, created_at
    `, [
      userId,
      document.filename,
      document.filename,
      getDocumentType(document.type),
      document.size,
      document.text,
      JSON.stringify(document.metadata || {}),
      document.metadata?.category || 'general',
      document.metadata?.tags || []
    ]);

    const documentId = documentResult.rows[0].id;

    // Insert document chunks with embeddings
    const chunkInsertPromises = document.chunks.map(chunk => 
      client.query(`
        INSERT INTO rag_document_chunks (
          document_id, chunk_index, chunk_text, word_count, 
          character_count, embedding
        ) VALUES ($1, $2, $3, $4, $5, $6::vector)
      `, [
        documentId,
        chunk.index,
        chunk.text,
        chunk.wordCount,
        chunk.characterCount,
        JSON.stringify(chunk.embedding) // PostgreSQL vector format
      ])
    );

    await Promise.all(chunkInsertPromises);
    await client.query('COMMIT');

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        id: documentId,
        filename: document.filename,
        chunks: document.chunks.length,
        message: 'Document uploaded and processed successfully'
      }),
    };
  } catch (error) {
    await client.query('ROLLBACK');
    console.error('Error uploading document:', error);
    throw error;
  }
}

/**
 * Search documents using vector similarity
 */
async function searchDocuments(client, userId, queryEmbedding, options = {}) {
  try {
    const { limit = 10, threshold = 0.7, documentIds = null } = options;

    // Use the custom search function
    const query = `
      SELECT * FROM search_similar_chunks($1, $2, $3, $4, $5)
    `;

    const result = await client.query(query, [
      JSON.stringify(queryEmbedding), // Convert to vector format
      userId,
      threshold,
      limit,
      documentIds
    ]);

    const results = result.rows.map(row => ({
      documentId: row.document_id,
      filename: row.filename,
      chunkIndex: row.chunk_index,
      text: row.chunk_text,
      similarity: parseFloat(row.similarity),
      metadata: row.document_metadata
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results: results,
        totalFound: results.length,
        query: {
          limit,
          threshold,
          documentsSearched: results.length > 0 ? 'multiple' : 0
        }
      }),
    };
  } catch (error) {
    console.error('Error searching documents:', error);
    throw error;
  }
}

/**
 * Get list of documents for user
 */
async function getDocuments(client, userId) {
  try {
    const result = await client.query(`
      SELECT 
        d.id,
        d.filename,
        d.file_type,
        d.file_size,
        d.category,
        d.tags,
        d.created_at,
        d.metadata,
        COUNT(c.id) as chunk_count
      FROM rag_documents d
      LEFT JOIN rag_document_chunks c ON d.id = c.document_id
      WHERE d.user_id = $1
      GROUP BY d.id, d.filename, d.file_type, d.file_size, d.category, d.tags, d.created_at, d.metadata
      ORDER BY d.created_at DESC
    `, [userId]);

    const documents = result.rows.map(row => ({
      id: row.id,
      filename: row.filename,
      type: `application/${row.file_type}`,
      size: row.file_size,
      chunks: parseInt(row.chunk_count),
      category: row.category,
      tags: row.tags,
      createdAt: row.created_at.toISOString(),
      metadata: row.metadata
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        documents: documents,
        total: documents.length
      }),
    };
  } catch (error) {
    console.error('Error getting documents:', error);
    throw error;
  }
}

/**
 * Delete a document and its chunks
 */
async function deleteDocument(client, userId, documentId) {
  try {
    // Verify the document belongs to the user and delete
    const result = await client.query(`
      DELETE FROM rag_documents 
      WHERE id = $1 AND user_id = $2
      RETURNING filename
    `, [documentId, userId]);

    if (result.rows.length === 0) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Document not found or not authorized' }),
      };
    }

    // Chunks are automatically deleted due to CASCADE constraint

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Document deleted successfully',
        documentId,
        filename: result.rows[0].filename
      }),
    };
  } catch (error) {
    console.error('Error deleting document:', error);
    throw error;
  }
}

/**
 * Get user RAG statistics
 */
async function getUserStats(client, userId) {
  try {
    const result = await client.query(`
      SELECT * FROM get_user_rag_stats($1)
    `, [userId]);

    const stats = result.rows[0] || {
      total_documents: 0,
      total_chunks: 0,
      total_size: 0,
      categories_used: [],
      oldest_document: null,
      newest_document: null
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalDocuments: parseInt(stats.total_documents) || 0,
        totalChunks: parseInt(stats.total_chunks) || 0,
        totalSize: parseInt(stats.total_size) || 0,
        categoriesUsed: stats.categories_used || [],
        oldestDocument: stats.oldest_document,
        newestDocument: stats.newest_document
      }),
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
}

/**
 * Helper function to convert MIME type to enum
 */
function getDocumentType(mimeType) {
  const typeMap = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt'
  };
  
  return typeMap[mimeType] || 'txt';
}

// ===========================================
// Enhanced Conversation Service for Neon
// ===========================================

// src/services/conversationService.js - Updated for Neon
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
   * Save a conversation to the server with enhanced RAG tracking
   * @param {Object[]} messages - Array of messages in the conversation
   * @param {Object} metadata - Optional metadata about the conversation
   * @returns {Promise<Object>} - Save result
   */
  async saveConversation(messages, metadata = {}) {
    console.log('Saving conversation to server...', { messageCount: messages.length });
    
    try {
      // Analyze messages for RAG usage
      const ragMessages = messages.filter(msg => 
        msg.sources && msg.sources.length > 0
      );
      
      const ragDocuments = [...new Set(
        ragMessages.flatMap(msg => 
          msg.sources?.map(source => source.documentId) || []
        )
      )];

      const payload = {
        messages: messages.map(msg => ({
          id: msg.id,
          type: msg.type,
          content: msg.content,
          timestamp: msg.timestamp,
          resources: msg.resources || [],
          sources: msg.sources || [],
          isStudyNotes: msg.isStudyNotes || false
        })),
        metadata: {
          topics: this.extractTopics(messages),
          messageCount: messages.length,
          lastActivity: new Date().toISOString(),
          ragUsed: ragMessages.length > 0,
          ragDocuments: ragDocuments,
          ragMessageCount: ragMessages.length,
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
        conversationCreated: conversation.created_at,
        ragUsed: conversation.used_rag || false,
        ragDocuments: conversation.rag_documents_referenced || []
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
   * Get conversation statistics including RAG usage
   * @returns {Promise<Object>} - Conversation statistics
   */
  async getConversationStats() {
    try {
      const result = await this.makeAuthenticatedRequest(`${this.apiUrl}/stats`, {
        method: 'GET',
      });

      return result.stats || {
        totalConversations: 0,
        totalMessages: 0,
        ragConversations: 0,
        ragUsagePercentage: 0,
        oldestConversation: null,
        newestConversation: null,
      };
    } catch (error) {
      console.error('Failed to get conversation stats:', error);
      return {
        totalConversations: 0,
        totalMessages: 0,
        ragConversations: 0,
        ragUsagePercentage: 0,
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
