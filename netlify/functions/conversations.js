// netlify/functions/conversations.js - Updated for Neon PostgreSQL
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
    const { httpMethod, body } = event;
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

    // Get database connection
    client = await pool.connect();

    switch (httpMethod) {
      case 'GET':
        if (event.path.endsWith('/stats')) {
          return await getConversationStats(client, userId);
        }
        return await getConversations(client, userId);
      
      case 'POST':
        return await saveConversation(client, userId, JSON.parse(body));
      
      case 'DELETE':
        return await deleteConversations(client, userId);
      
      default:
        return {
          statusCode: 405,
          headers,
          body: JSON.stringify({ error: 'Method not allowed' }),
        };
    }
  } catch (error) {
    console.error('Conversations Function error:', error);
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
 * Save conversation with enhanced RAG tracking
 */
async function saveConversation(client, userId, conversationData) {
  try {
    const { messages, metadata } = conversationData;
    
    // Validate required fields
    if (!messages || !Array.isArray(messages) || messages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid messages array is required' }),
      };
    }

    // Extract RAG information
    const ragMessages = messages.filter(msg => 
      msg.sources && msg.sources.length > 0
    );
    
    const ragDocuments = [...new Set(
      ragMessages.flatMap(msg => 
        msg.sources?.map(source => source.documentId) || []
      )
    )];

    // Insert conversation
    const result = await client.query(`
      INSERT INTO conversations (
        user_id, messages, metadata, message_count, 
        used_rag, rag_documents_referenced
      ) VALUES ($1, $2, $3, $4, $5, $6)
      RETURNING id, created_at
    `, [
      userId,
      JSON.stringify(messages),
      JSON.stringify(metadata || {}),
      messages.length,
      ragMessages.length > 0,
      ragDocuments
    ]);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        id: result.rows[0].id,
        created_at: result.rows[0].created_at,
        message: 'Conversation saved successfully',
        messageCount: messages.length,
        ragUsed: ragMessages.length > 0,
        ragDocuments: ragDocuments.length
      }),
    };
  } catch (error) {
    console.error('Error saving conversation:', error);
    throw error;
  }
}

/**
 * Get conversations for user
 */
async function getConversations(client, userId) {
  try {
    const result = await client.query(`
      SELECT 
        id, messages, metadata, message_count, 
        used_rag, rag_documents_referenced, 
        created_at, updated_at
      FROM conversations
      WHERE user_id = $1
      ORDER BY created_at DESC
      LIMIT 100
    `, [userId]);

    const conversations = result.rows.map(row => ({
      id: row.id,
      messages: row.messages,
      metadata: row.metadata,
      messageCount: row.message_count,
      used_rag: row.used_rag,
      rag_documents_referenced: row.rag_documents_referenced,
      created_at: row.created_at.toISOString(),
      updated_at: row.updated_at.toISOString()
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        conversations,
        total: conversations.length
      }),
    };
  } catch (error) {
    console.error('Error getting conversations:', error);
    
    // Return empty result if no conversations found
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ conversations: [], total: 0 }),
    };
  }
}

/**
 * Delete all conversations for user
 */
async function deleteConversations(client, userId) {
  try {
    const result = await client.query(`
      DELETE FROM conversations 
      WHERE user_id = $1
    `, [userId]);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'All conversations deleted successfully',
        deletedCount: result.rowCount
      }),
    };
  } catch (error) {
    console.error('Error deleting conversations:', error);
    throw error;
  }
}

/**
 * Get conversation statistics
 */
async function getConversationStats(client, userId) {
  try {
    const result = await client.query(`
      SELECT 
        COUNT(*) as total_conversations,
        SUM(message_count) as total_messages,
        COUNT(*) FILTER (WHERE used_rag = true) as rag_conversations,
        ROUND(
          COUNT(*) FILTER (WHERE used_rag = true)::numeric / 
          COUNT(*)::numeric * 100, 2
        ) as rag_usage_percentage,
        AVG(message_count) as avg_messages_per_conversation,
        MIN(created_at) as oldest_conversation,
        MAX(created_at) as newest_conversation
      FROM conversations
      WHERE user_id = $1
    `, [userId]);

    const stats = result.rows[0];

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        stats: {
          totalConversations: parseInt(stats.total_conversations) || 0,
          totalMessages: parseInt(stats.total_messages) || 0,
          ragConversations: parseInt(stats.rag_conversations) || 0,
          ragUsagePercentage: parseFloat(stats.rag_usage_percentage) || 0,
          avgMessagesPerConversation: parseFloat(stats.avg_messages_per_conversation) || 0,
          oldestConversation: stats.oldest_conversation?.toISOString() || null,
          newestConversation: stats.newest_conversation?.toISOString() || null
        }
      }),
    };
  } catch (error) {
    console.error('Error getting conversation stats:', error);
    throw error;
  }
}
