// netlify/functions/neon-db.js - Neon PostgreSQL database function
import { neon } from '@neondatabase/serverless';

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// Initialize Neon connection
const getDatabaseConnection = () => {
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL environment variable is not set');
  }
  return neon(connectionString);
};

export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight' }),
    };
  }

  console.log('Neon DB Function called:', {
    method: event.httpMethod,
    hasBody: !!event.body
  });

  try {
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    let requestData;
    try {
      requestData = JSON.parse(event.body || '{}');
    } catch (parseError) {
      console.error('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    // Extract user ID
    const userId = event.headers['x-user-id'] || 
                   event.headers['X-User-ID'] || 
                   context.clientContext?.user?.sub;

    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'User authentication required' }),
      };
    }

    const { action, data } = requestData;

    if (!action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Action parameter is required' }),
      };
    }

    console.log('Processing action:', action, 'for user:', userId);

    // Initialize database connection
    const sql = getDatabaseConnection();

    // Handle different actions
    switch (action) {
      case 'save_conversation':
        return await handleSaveConversation(sql, userId, data);
      
      case 'get_conversations':
        return await handleGetConversations(sql, userId);
      
      case 'clear_conversations':
        return await handleClearConversations(sql, userId);
      
      case 'get_stats':
        return await handleGetStats(sql, userId);
      
      case 'health_check':
        return await handleHealthCheck(sql);
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Invalid action: ${action}` }),
        };
    }
  } catch (error) {
    console.error('Neon DB Function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message 
      }),
    };
  }
};

/**
 * Save conversation to Neon database
 */
async function handleSaveConversation(sql, userId, data) {
  try {
    console.log('Saving conversation to Neon for user:', userId);

    if (!data || !data.messages || !Array.isArray(data.messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid conversation data' }),
      };
    }

    const { messages, metadata = {} } = data;

    // Extract RAG information
    const ragMessages = messages.filter(msg => 
      msg.sources && msg.sources.length > 0
    );
    
    const ragDocuments = [...new Set(
      ragMessages.flatMap(msg => 
        msg.sources?.map(source => source.documentId) || []
      )
    )];

    // Insert conversation record
    const [conversation] = await sql`
      INSERT INTO conversations (
        user_id, 
        messages, 
        metadata, 
        message_count, 
        used_rag, 
        rag_documents_referenced
      )
      VALUES (
        ${userId},
        ${JSON.stringify(messages)},
        ${JSON.stringify(metadata)},
        ${messages.length},
        ${ragMessages.length > 0},
        ${ragDocuments}
      )
      RETURNING id, created_at
    `;

    console.log('Conversation saved successfully to Neon:', conversation.id);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        id: conversation.id,
        created_at: conversation.created_at,
        message: 'Conversation saved successfully',
        messageCount: messages.length,
        ragUsed: ragMessages.length > 0,
        ragDocuments: ragDocuments.length
      }),
    };
  } catch (error) {
    console.error('Error saving conversation to Neon:', error);
    throw error;
  }
}

/**
 * Get conversations from Neon database
 */
async function handleGetConversations(sql, userId) {
  try {
    console.log('Loading conversations from Neon for user:', userId);

    const conversations = await sql`
      SELECT 
        id,
        messages,
        metadata,
        message_count,
        used_rag,
        rag_documents_referenced,
        created_at,
        updated_at
      FROM conversations 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    console.log(`Loaded ${conversations.length} conversations from Neon`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        conversations: conversations.map(conv => ({
          id: conv.id,
          messages: conv.messages,
          metadata: conv.metadata,
          messageCount: conv.message_count,
          used_rag: conv.used_rag,
          rag_documents_referenced: conv.rag_documents_referenced,
          created_at: conv.created_at,
          updated_at: conv.updated_at
        })),
        total: conversations.length
      }),
    };
  } catch (error) {
    console.error('Error loading conversations from Neon:', error);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ conversations: [], total: 0 }),
    };
  }
}

/**
 * Clear all conversations for user
 */
async function handleClearConversations(sql, userId) {
  try {
    console.log('Clearing conversations from Neon for user:', userId);

    const result = await sql`
      DELETE FROM conversations 
      WHERE user_id = ${userId}
    `;

    console.log('Conversations cleared successfully from Neon');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'All conversations deleted successfully',
        deletedCount: result.count || 0
      }),
    };
  } catch (error) {
    console.error('Error clearing conversations from Neon:', error);
    throw error;
  }
}

/**
 * Get conversation statistics
 */
async function handleGetStats(sql, userId) {
  try {
    console.log('Getting stats from Neon for user:', userId);

    const [stats] = await sql`
      SELECT 
        COUNT(*) as total_conversations,
        SUM(message_count) as total_messages,
        COUNT(*) FILTER (WHERE used_rag = true) as rag_conversations,
        MIN(created_at) as oldest_conversation,
        MAX(created_at) as newest_conversation
      FROM conversations 
      WHERE user_id = ${userId}
    `;

    const ragUsagePercentage = stats.total_conversations > 0 ? 
      Math.round((stats.rag_conversations / stats.total_conversations) * 100 * 100) / 100 : 0;
    
    const avgMessagesPerConversation = stats.total_conversations > 0 ?
      Math.round((stats.total_messages / stats.total_conversations) * 100) / 100 : 0;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        stats: {
          totalConversations: parseInt(stats.total_conversations) || 0,
          totalMessages: parseInt(stats.total_messages) || 0,
          ragConversations: parseInt(stats.rag_conversations) || 0,
          ragUsagePercentage,
          avgMessagesPerConversation,
          oldestConversation: stats.oldest_conversation,
          newestConversation: stats.newest_conversation
        }
      }),
    };
  } catch (error) {
    console.error('Error getting stats from Neon:', error);
    throw error;
  }
}

/**
 * Health check
 */
async function handleHealthCheck(sql) {
  try {
    console.log('Performing Neon health check...');

    // Test database connection
    const [result] = await sql`SELECT NOW() as current_time, version() as db_version`;
    
    // Test table existence
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('conversations', 'rag_documents', 'rag_document_chunks')
    `;

    const hasConversationsTable = tables.some(t => t.table_name === 'conversations');
    const hasRAGTables = tables.some(t => t.table_name === 'rag_documents');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        status: 'healthy',
        database: {
          connected: true,
          currentTime: result.current_time,
          version: result.db_version
        },
        tables: {
          conversations: hasConversationsTable,
          rag_documents: hasRAGTables,
          total: tables.length
        },
        timestamp: new Date().toISOString()
      }),
    };
  } catch (error) {
    console.error('Neon health check failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
}
