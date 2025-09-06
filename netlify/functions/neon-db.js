// netlify/functions/neon-db.js - FIXED VERSION
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

// FIXED: Enhanced user ID extraction with better handling of JWE tokens
const extractUserId = async (event, context) => {
  console.log('=== ENHANCED USER ID EXTRACTION ===');
  console.log('Available headers:', Object.keys(event.headers || {}));
  
  let userId = null;
  let source = 'unknown';
  let debugInfo = {};
  
  // Method 1: Direct x-user-id header (most reliable)
  if (event.headers['x-user-id']) {
    userId = event.headers['x-user-id'];
    source = 'x-user-id header';
    debugInfo.foundInHeader = true;
    console.log('✅ Found user ID in x-user-id header');
  }
  
  // Method 2: Case variations of x-user-id header
  if (!userId && event.headers['X-User-ID']) {
    userId = event.headers['X-User-ID'];
    source = 'X-User-ID header (case variation)';
    debugInfo.foundInHeaderCaseVar = true;
    console.log('✅ Found user ID in X-User-ID header');
  }
  
  // Method 3: Extract from Authorization Bearer token
  if (!userId && event.headers.authorization) {
    try {
      const authHeader = event.headers.authorization;
      console.log('Processing Authorization header...');
      debugInfo.hasAuthHeader = true;
      
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        debugInfo.tokenLength = token.length;
        
        const parts = token.split('.');
        console.log('JWT parts count:', parts.length);
        debugInfo.jwtPartsCount = parts.length;
        
        // Handle different JWT formats
        if (parts.length === 3) {
          // Standard JWT (JWS): header.payload.signature
          try {
            let payload = parts[1];
            // Add padding if needed
            while (payload.length % 4) {
              payload += '=';
            }
            
            const decoded = Buffer.from(payload, 'base64').toString('utf8');
            const parsed = JSON.parse(decoded);
            
            console.log('JWT payload decoded successfully');
            debugInfo.jwtDecoded = true;
            debugInfo.jwtSubject = parsed.sub ? 'present' : 'missing';
            
            if (parsed.sub) {
              userId = parsed.sub;
              source = 'JWT Bearer token (3-part)';
              debugInfo.extractedFromJWT = true;
              console.log('✅ Extracted user ID from JWT');
            }
          } catch (jwtError) {
            console.log('3-part JWT parsing error:', jwtError.message);
            debugInfo.jwtError = jwtError.message;
          }
        } else if (parts.length === 5) {
          // Encrypted JWT (JWE): header.encrypted_key.iv.ciphertext.tag
          console.log('🔒 Detected 5-part JWT (JWE - encrypted)');
          debugInfo.jwtType = 'JWE (encrypted)';
          debugInfo.requiresServerDecryption = true;
          
          // For JWE, we cannot decode the payload client-side
          // The client MUST send the user ID via x-user-id header
          console.log('❌ Cannot decode JWE payload - x-user-id header required');
        } else {
          console.log('⚠️ Unexpected JWT format - parts:', parts.length);
          debugInfo.jwtUnexpectedFormat = true;
        }
      } else {
        console.log('Authorization header does not start with Bearer');
        debugInfo.authHeaderFormat = 'not_bearer';
      }
    } catch (error) {
      console.log('Auth header processing error:', error.message);
      debugInfo.authProcessingError = error.message;
    }
  }
  
  // Method 4: Check Netlify context (backup)
  if (!userId && context.clientContext?.user?.sub) {
    userId = context.clientContext.user.sub;
    source = 'netlify context';
    debugInfo.foundInContext = true;
    console.log('✅ Found user ID in Netlify context');
  }
  
  // Method 5: Development fallback
  if (!userId && (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true')) {
    userId = 'dev-user-' + Date.now();
    source = 'development fallback';
    debugInfo.developmentFallback = true;
    console.log('⚠️ Using development fallback user ID');
  }
  
  console.log('=== EXTRACTION RESULTS ===');
  console.log('Final userId:', userId || 'NOT_FOUND');
  console.log('Source:', source);
  console.log('Debug info:', debugInfo);
  console.log('================================');
  
  return { userId, source, debugInfo };
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

  console.log('=== NEON DB FUNCTION CALLED ===');
  console.log('Method:', event.httpMethod);
  console.log('Has body:', !!event.body);
  console.log('Headers received:', Object.keys(event.headers || {}));
  console.log('User agent:', event.headers['user-agent']);

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

    console.log('Request action:', requestData.action);

    // CRITICAL FIX: Enhanced user ID extraction
    const { userId, source, debugInfo } = await extractUserId(event, context);

    if (!userId) {
      console.error('❌ No user ID found from any source');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'User authentication required',
          message: 'No user ID could be extracted from the request. Please ensure you are properly authenticated.',
          debug: {
            availableHeaders: Object.keys(event.headers || {}),
            hasAuth: !!event.headers.authorization,
            hasXUserId: !!event.headers['x-user-id'],
            hasContext: !!context.clientContext?.user?.sub,
            debugInfo,
            timestamp: new Date().toISOString(),
            suggestion: 'Try signing out and signing in again, or check that x-user-id header is being sent.'
          }
        }),
      };
    }

    console.log(`✅ Authenticated user: ${userId} (from ${source})`);

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
        return await handleHealthCheck(sql, userId);
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Invalid action: ${action}` }),
        };
    }
  } catch (error) {
    console.error('=== NEON DB FUNCTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack);
    console.error('==============================');
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        suggestion: 'Please try again. If the problem persists, check your authentication status.'
      }),
    };
  }
};

/**
 * Save conversation to Neon database
 */
async function handleSaveConversation(sql, userId, data) {
  try {
    console.log('💾 Saving conversation to Neon for user:', userId);

    if (!data || !data.messages || !Array.isArray(data.messages)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid conversation data - messages array required' }),
      };
    }

    const { messages, metadata = {} } = data;

    if (messages.length === 0) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Empty conversation - no messages to save' }),
      };
    }

    console.log(`Processing ${messages.length} messages...`);

    // Extract RAG information
    const ragMessages = messages.filter(msg => 
      msg.sources && msg.sources.length > 0
    );
    
    const ragDocuments = [...new Set(
      ragMessages.flatMap(msg => 
        msg.sources?.map(source => source.documentId) || []
      )
    )];

    console.log(`Found ${ragMessages.length} RAG messages with ${ragDocuments.length} unique documents`);

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

    console.log('✅ Conversation saved successfully to Neon:', conversation.id);

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        id: conversation.id,
        created_at: conversation.created_at,
        message: 'Conversation saved successfully to Neon database',
        messageCount: messages.length,
        ragUsed: ragMessages.length > 0,
        ragDocuments: ragDocuments.length,
        userId: userId,
        source: 'neon-postgresql'
      }),
    };
  } catch (error) {
    console.error('❌ Error saving conversation to Neon:', error);
    throw error;
  }
}

/**
 * Get conversations from Neon database
 */
async function handleGetConversations(sql, userId) {
  try {
    console.log('📖 Loading conversations from Neon for user:', userId);

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

    console.log(`✅ Loaded ${conversations.length} conversations from Neon`);

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
        total: conversations.length,
        userId: userId,
        source: 'neon-postgresql'
      }),
    };
  } catch (error) {
    console.error('❌ Error loading conversations from Neon:', error);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        conversations: [], 
        total: 0,
        message: 'No conversations found or error occurred',
        error: error.message
      }),
    };
  }
}

/**
 * Clear all conversations for user
 */
async function handleClearConversations(sql, userId) {
  try {
    console.log('🗑️ Clearing conversations from Neon for user:', userId);

    const result = await sql`
      DELETE FROM conversations 
      WHERE user_id = ${userId}
    `;

    console.log('✅ Conversations cleared successfully from Neon');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'All conversations deleted successfully from Neon database',
        deletedCount: result.count || 0,
        userId: userId,
        source: 'neon-postgresql'
      }),
    };
  } catch (error) {
    console.error('❌ Error clearing conversations from Neon:', error);
    throw error;
  }
}

/**
 * Get conversation statistics
 */
async function handleGetStats(sql, userId) {
  try {
    console.log('📊 Getting stats from Neon for user:', userId);

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
        },
        userId: userId,
        source: 'neon-postgresql'
      }),
    };
  } catch (error) {
    console.error('❌ Error getting stats from Neon:', error);
    throw error;
  }
}

/**
 * Health check
 */
async function handleHealthCheck(sql, userId) {
  try {
    console.log('🏥 Performing Neon health check...');

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
        userId: userId,
        timestamp: new Date().toISOString(),
        source: 'neon-postgresql'
      }),
    };
  } catch (error) {
    console.error('❌ Neon health check failed:', error);
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        status: 'unhealthy',
        error: error.message,
        timestamp: new Date().toISOString(),
        source: 'neon-postgresql'
      }),
    };
  }
}
