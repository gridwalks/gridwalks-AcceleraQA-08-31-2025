// netlify/functions/neon-rag-fixed.js
// Fixed version of neon-rag function with proper error handling

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// FIXED: Use consistent import pattern like your working neon-db function
const getDatabaseConnection = () => {
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL environment variable is not set');
  }
  
  // IMPORTANT: Use dynamic import to avoid ES module issues
  return import('@neondatabase/serverless').then(({ neon }) => neon(connectionString));
};

// Improved user ID extraction with better error handling
const extractUserId = (event, context) => {
  console.log('=== USER ID EXTRACTION ===');
  
  let userId = null;
  let source = 'unknown';
  
  // 1. Direct header
  if (event.headers['x-user-id']) {
    userId = event.headers['x-user-id'];
    source = 'x-user-id header';
  }
  
  // 2. Case variations
  if (!userId && event.headers['X-User-ID']) {
    userId = event.headers['X-User-ID'];
    source = 'X-User-ID header';
  }
  
  // 3. Context
  if (!userId && context.clientContext?.user?.sub) {
    userId = context.clientContext.user.sub;
    source = 'context.clientContext.user.sub';
  }
  
  // 4. JWT token parsing (improved)
  if (!userId && event.headers.authorization) {
    try {
      const authHeader = event.headers.authorization;
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const parts = token.split('.');
        if (parts.length === 3) {
          // Add padding for base64 decoding
          let payload = parts[1];
          while (payload.length % 4) {
            payload += '=';
          }
          const decoded = Buffer.from(payload, 'base64').toString('utf8');
          const parsed = JSON.parse(decoded);
          if (parsed.sub) {
            userId = parsed.sub;
            source = 'JWT token payload';
          }
        }
      }
    } catch (error) {
      console.log('JWT parsing error:', error.message);
    }
  }
  
  console.log('Final userId:', userId, 'from:', source);
  return { userId, source };
};

export const handler = async (event, context) => {
  console.log('=== FIXED NEON RAG FUNCTION ===');
  console.log('Method:', event.httpMethod);
  console.log('Timestamp:', new Date().toISOString());
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    console.log('✅ CORS preflight handled');
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  try {
    // Validate HTTP method
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Parse request body with better error handling
    let requestData = {};
    if (event.body) {
      try {
        requestData = JSON.parse(event.body);
        console.log('✅ Request parsed:', { action: requestData.action });
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid JSON in request body' }),
        };
      }
    }

    // Extract user ID with enhanced debugging
    const { userId, source } = extractUserId(event, context);
    
    if (!userId) {
      console.error('❌ No user ID found');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'User authentication required',
          debug: {
            availableHeaders: Object.keys(event.headers || {}),
            hasAuth: !!event.headers.authorization,
            timestamp: new Date().toISOString()
          }
        }),
      };
    }

    console.log(`✅ User authenticated: ${userId} (from ${source})`);

    // Validate action
    const { action } = requestData;
    if (!action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Action parameter is required' }),
      };
    }

    console.log(`🔄 Processing action: ${action}`);

    // Initialize database connection with timeout
    console.log('🔄 Initializing database connection...');
    const sql = await Promise.race([
      getDatabaseConnection(),
      new Promise((_, reject) => 
        setTimeout(() => reject(new Error('Database connection timeout')), 5000)
      )
    ]);
    console.log('✅ Database connection initialized');

    // Handle different actions with proper error boundaries
    switch (action) {
      case 'test':
        return await handleTest(sql, userId);
      
      case 'list':
        return await handleList(sql, userId);
      
      case 'upload':
        return await handleUpload(sql, userId, requestData.document);
      
      case 'search':
        return await handleSearch(sql, userId, requestData.query, requestData.options);
      
      case 'delete':
        return await handleDelete(sql, userId, requestData.documentId);
      
      case 'stats':
        return await handleStats(sql, userId);
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: `Invalid action: ${action}`,
            availableActions: ['test', 'list', 'upload', 'search', 'delete', 'stats']
          }),
        };
    }

  } catch (error) {
    console.error('=== FUNCTION ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    console.error('Error stack:', error.stack?.substring(0, 1000)); // Limit stack trace size
    console.error('========================');
    
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Internal server error',
        message: error.message,
        timestamp: new Date().toISOString(),
        type: error.constructor.name
      }),
    };
  }
};

// Test handler
async function handleTest(sql, userId) {
  console.log('🧪 Running test for user:', userId);
  
  try {
    // Test basic database query
    const [result] = await sql`SELECT 1 as test_value, NOW() as current_time`;
    
    // Test table access
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rag_documents', 'rag_document_chunks')
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        userId,
        timestamp: new Date().toISOString(),
        storage: 'neon-postgresql',
        tests: {
          databaseConnection: {
            success: true,
            testValue: result.test_value,
            currentTime: result.current_time
          },
          tableAccess: {
            success: true,
            tablesFound: tables.map(t => t.table_name),
            requiredTables: ['rag_documents', 'rag_document_chunks']
          }
        },
        message: 'Fixed RAG function test successful'
      }),
    };

  } catch (error) {
    console.error('❌ Test failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Test failed',
        message: error.message,
        userId
      }),
    };
  }
}

// List handler
async function handleList(sql, userId) {
  console.log('📋 Listing documents for user:', userId);
  
  try {
    const documents = await sql`
      SELECT 
        id,
        filename,
        file_type,
        file_size,
        category,
        metadata,
        created_at
      FROM rag_documents 
      WHERE user_id = ${userId}
      ORDER BY created_at DESC
      LIMIT 100
    `;

    console.log(`✅ Found ${documents.length} documents`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        documents: documents.map(doc => ({
          id: doc.id,
          filename: doc.filename,
          type: `application/${doc.file_type}`,
          size: doc.file_size,
          category: doc.category || 'general',
          tags: doc.metadata?.tags || [],
          createdAt: doc.created_at,
          metadata: doc.metadata
        })),
        total: documents.length,
        storage: 'neon-postgresql',
        userId: userId
      }),
    };

  } catch (error) {
    console.error('❌ List failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to list documents',
        message: error.message,
        userId
      }),
    };
  }
}

// Placeholder handlers for other actions
async function handleUpload(sql, userId, document) {
  return {
    statusCode: 501,
    headers,
    body: JSON.stringify({ error: 'Upload not implemented in fixed version yet' }),
  };
}

async function handleSearch(sql, userId, query, options) {
  return {
    statusCode: 501,
    headers,
    body: JSON.stringify({ error: 'Search not implemented in fixed version yet' }),
  };
}

async function handleDelete(sql, userId, documentId) {
  return {
    statusCode: 501,
    headers,
    body: JSON.stringify({ error: 'Delete not implemented in fixed version yet' }),
  };
}

async function handleStats(sql, userId) {
  console.log('📊 Getting stats for user:', userId);
  
  try {
    const [stats] = await sql`
      SELECT 
        COUNT(DISTINCT d.id) as total_documents,
        COUNT(c.id) as total_chunks,
        SUM(d.file_size) as total_size
      FROM rag_documents d
      LEFT JOIN rag_document_chunks c ON d.id = c.document_id
      WHERE d.user_id = ${userId}
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalDocuments: parseInt(stats.total_documents) || 0,
        totalChunks: parseInt(stats.total_chunks) || 0,
        totalSize: parseInt(stats.total_size) || 0,
        storage: 'neon-postgresql',
        userId: userId
      }),
    };

  } catch (error) {
    console.error('❌ Stats failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get stats',
        message: error.message,
        userId
      }),
    };
  }
}
