// netlify/functions/neon-db.js - FIXED VERSION

const { neon } = require('@neondatabase/serverless');
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

const AUTH0_AUDIENCE = process.env.AUTH0_AUDIENCE;
if (!AUTH0_AUDIENCE) {
  throw new Error('AUTH0_AUDIENCE environment variable is not set');
}

// CORS headers
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS'
};

// JWT verification setup
const client = jwksClient({
  jwksUri: `https://${process.env.AUTH0_DOMAIN}/.well-known/jwks.json`,
  cache: true,
  cacheMaxEntries: 5,
  cacheMaxAge: 600000
});

// Get signing key for JWT verification
const getKey = (header, callback) => {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('❌ Error getting signing key:', err);
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
};

// Verify JWT token
const verifyToken = (token) => {
  return new Promise((resolve, reject) => {
    // Check token format first
    const parts = token.split('.');
    if (parts.length !== 3) {
      console.error('❌ Invalid JWT format - parts:', parts.length);
      return reject(new Error(`Invalid JWT format - expected 3 parts, got ${parts.length}`));
    }

    jwt.verify(token, getKey, {
      audience: AUTH0_AUDIENCE,
      issuer: `https://${process.env.AUTH0_DOMAIN}/`,
      algorithms: ['RS256']
    }, (err, decoded) => {
      if (err) {
        console.error('❌ JWT verification failed:', err.message);
        reject(err);
      } else {
        console.log('✅ JWT verified successfully for user:', decoded.sub);
        resolve(decoded);
      }
    });
  });
};

// Initialize Neon database connection
const initializeDatabase = () => {
  const databaseUrl = process.env.NEON_DATABASE_URL;
  
  if (!databaseUrl) {
    throw new Error('NEON_DATABASE_URL environment variable is not set');
  }

  return neon(databaseUrl);
};

// Create tables if they don't exist
const createTablesIfNotExist = async (sql) => {
  try {
    await sql`
      CREATE TABLE IF NOT EXISTS conversations (
        id SERIAL PRIMARY KEY,
        user_id VARCHAR(255) NOT NULL,
        message_id VARCHAR(255) NOT NULL,
        message_type VARCHAR(50) NOT NULL,
        content TEXT NOT NULL,
        resources JSONB DEFAULT '[]',
        timestamp TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_conversations_user_id 
      ON conversations(user_id)
    `;

    await sql`
      CREATE INDEX IF NOT EXISTS idx_conversations_timestamp 
      ON conversations(timestamp DESC)
    `;

    console.log('✅ Database tables verified/created');
  } catch (error) {
    console.error('❌ Error creating tables:', error);
    throw error;
  }
};

// Handle save conversation request
const handleSaveConversation = async (sql, userId, messages) => {
  try {
    console.log(`💾 Saving ${messages.length} messages for user: ${userId}`);

    // Delete existing messages for this user (simple approach)
    await sql`DELETE FROM conversations WHERE user_id = ${userId}`;

    // Insert new messages
    if (messages.length > 0) {
      const values = messages.map(msg => [
        userId,
        msg.id || `msg_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`,
        msg.type || 'user',
        msg.content || '',
        JSON.stringify(msg.resources || []),
        new Date(msg.timestamp || Date.now())
      ]);

      // Use a transaction for batch insert
      for (const [user_id, message_id, message_type, content, resources, timestamp] of values) {
        await sql`
          INSERT INTO conversations (user_id, message_id, message_type, content, resources, timestamp)
          VALUES (${user_id}, ${message_id}, ${message_type}, ${content}, ${resources}, ${timestamp})
        `;
      }
    }

    console.log('✅ Conversation saved successfully');
    return { success: true, saved_messages: messages.length };

  } catch (error) {
    console.error('❌ Error saving conversation:', error);
    throw error;
  }
};

// Handle load conversations request
const handleLoadConversations = async (sql, userId) => {
  try {
    console.log(`📥 Loading conversations for user: ${userId}`);

    const result = await sql`
      SELECT message_id, message_type, content, resources, timestamp
      FROM conversations 
      WHERE user_id = ${userId}
      ORDER BY timestamp ASC
    `;

    const messages = result.map(row => ({
      id: row.message_id,
      type: row.message_type,
      content: row.content,
      resources: typeof row.resources === 'string' ? JSON.parse(row.resources) : row.resources,
      timestamp: row.timestamp
    }));

    console.log(`✅ Loaded ${messages.length} messages`);
    return { success: true, messages };

  } catch (error) {
    console.error('❌ Error loading conversations:', error);
    throw error;
  }
};

// Handle get stats request
const handleGetStats = async (sql, userId) => {
  try {
    const result = await sql`
      SELECT 
        COUNT(*) as total_messages,
        COUNT(DISTINCT DATE(timestamp)) as total_conversations,
        MAX(timestamp) as last_activity
      FROM conversations 
      WHERE user_id = ${userId}
    `;

    const stats = result[0] || {};
    return {
      success: true,
      stats: {
        total_messages: parseInt(stats.total_messages) || 0,
        total_conversations: parseInt(stats.total_conversations) || 0,
        last_activity: stats.last_activity
      }
    };

  } catch (error) {
    console.error('❌ Error getting stats:', error);
    throw error;
  }
};

// Handle delete conversations request
const handleDeleteConversations = async (sql, userId) => {
  try {
    const result = await sql`DELETE FROM conversations WHERE user_id = ${userId}`;
    return { success: true, deleted_count: result.count };

  } catch (error) {
    console.error('❌ Error deleting conversations:', error);
    throw error;
  }
};

// Main handler function
exports.handler = async (event, context) => {
  console.log('🚀 Neon DB function called:', event.httpMethod);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers: corsHeaders,
      body: ''
    };
  }

  try {
    // Validate environment
    if (!process.env.NEON_DATABASE_URL) {
      throw new Error('NEON_DATABASE_URL not configured');
    }

    if (!process.env.AUTH0_DOMAIN) {
      throw new Error('AUTH0_DOMAIN not configured');
    }

    // Parse request body
    const body = JSON.parse(event.body || '{}');
    const { action } = body;

    console.log('📋 Action requested:', action);

    // Handle test action (no auth required)
    if (action === 'test') {
      return {
        statusCode: 200,
        headers: corsHeaders,
        body: JSON.stringify({
          success: true,
          message: 'Neon database connection is working',
          timestamp: new Date().toISOString()
        })
      };
    }

    // All other actions require authentication
    const authHeader = event.headers.authorization || event.headers.Authorization;
    if (!authHeader || !authHeader.startsWith('Bearer ')) {
      console.error('❌ No authorization header found');
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'No authorization token provided' })
      };
    }

    const token = authHeader.substring(7); // Remove 'Bearer ' prefix

    // Verify JWT token
    let decoded;
    try {
      decoded = await verifyToken(token);
    } catch (error) {
      console.error('❌ Token verification failed:', error.message);
      return {
        statusCode: 401,
        headers: corsHeaders,
        body: JSON.stringify({ error: 'Invalid or expired token' })
      };
    }

    const userId = decoded.sub;
    console.log('👤 Authenticated user:', userId);

    // Initialize database
    const sql = initializeDatabase();
    await createTablesIfNotExist(sql);

    // Handle different actions
    let result;
    switch (action) {
      case 'save_conversation':
        result = await handleSaveConversation(sql, userId, body.messages);
        break;

      case 'load_conversations':
        result = await handleLoadConversations(sql, userId);
        break;

      case 'get_stats':
        result = await handleGetStats(sql, userId);
        break;

      case 'delete_conversations':
        result = await handleDeleteConversations(sql, userId);
        break;

      case 'health_check':
        result = {
          success: true,
          status: 'healthy',
          user_id: userId,
          timestamp: new Date().toISOString()
        };
        break;

      default:
        throw new Error(`Unknown action: ${action}`);
    }

    return {
      statusCode: 200,
      headers: corsHeaders,
      body: JSON.stringify(result)
    };

  } catch (error) {
    console.error('❌ Function error:', error);

    return {
      statusCode: 500,
      headers: corsHeaders,
      body: JSON.stringify({
        success: false,
        error: error.message || 'Internal server error'
      })
    };
  }
};
