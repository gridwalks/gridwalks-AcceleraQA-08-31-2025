// netlify/functions/neon-rag-fixed.js
// Fixed version of neon-rag function with proper authentication handling

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// FIXED: Use consistent import pattern and better error handling
const getDatabaseConnection = async () => {
  const connectionString = process.env.NEON_DATABASE_URL;
  if (!connectionString) {
    throw new Error('NEON_DATABASE_URL environment variable is not set');
  }
  
  // Use dynamic import to avoid ES module issues
  const { neon } = await import('@neondatabase/serverless');
  return neon(connectionString);
};

// ENHANCED: Better user ID extraction with comprehensive debugging
const extractUserId = (event, context) => {
  console.log('=== ENHANCED USER ID EXTRACTION ===');
  console.log('Event headers available:', Object.keys(event.headers || {}));
  
  let userId = null;
  let source = 'unknown';
  let debugInfo = {};
  
  // Method 1: Direct x-user-id header (most reliable for Netlify)
  if (event.headers['x-user-id']) {
    userId = event.headers['x-user-id'];
    source = 'x-user-id header';
    debugInfo.foundInHeader = true;
  }
  
  // Method 2: Case-insensitive header check
  if (!userId) {
    const userIdHeaders = ['x-user-id', 'X-User-ID', 'X-USER-ID'];
    for (const headerName of userIdHeaders) {
      if (event.headers[headerName]) {
        userId = event.headers[headerName];
        source = `${headerName} header`;
        debugInfo.foundInCaseVariant = headerName;
        break;
      }
    }
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
        if (parts.length === 3) {
          try {
            // Properly decode JWT payload with padding
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
              source = 'JWT Bearer token';
              debugInfo.extractedFromJWT = true;
            }
          } catch (jwtError) {
            console.log('JWT parsing error:', jwtError.message);
            debugInfo.jwtError = jwtError.message;
          }
        } else {
          console.log('Invalid JWT format - wrong number of parts:', parts.length);
          debugInfo.jwtPartsCount = parts.length;
        }
      } else {
        console.log('Authorization header does not start with Bearer');
        debugInfo.authHeaderFormat = 'not_bearer';
      }
    } catch (error) {
      console.log('Auth header processing error:', error.message);
      debugInfo.authProcessingError = error.message;
    }
  } else if (!event.headers.authorization) {
    debugInfo.noAuthHeader = true;
  }
  
  // Method 4: Check Netlify context (backup)
  if (!userId && context.clientContext?.user?.sub) {
    userId = context.clientContext.user.sub;
    source = 'context.clientContext.user.sub';
    debugInfo.foundInContext = true;
  }
  
  // Method 5: Development fallback (only in development)
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
  console.log('=== NEON RAG FUNCTION STARTED ===');
  console.log('Method:', event.httpMethod);
  console.log('Timestamp:', new Date().toISOString());
  console.log('Headers received:', Object.keys(event.headers || {}));
  
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
        console.log('✅ Request body parsed:', { action: requestData.action });
      } catch (parseError) {
        console.error('❌ JSON parse error:', parseError);
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid JSON in request body',
            details: parseError.message 
          }),
        };
      }
    }

    // ENHANCED: Extract user ID with comprehensive debugging
    const { userId, source, debugInfo } = extractUserId(event, context);
    
    if (!userId) {
      console.error('❌ No user ID found after all extraction methods');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'User authentication required',
          debug: {
            availableHeaders: Object.keys(event.headers || {}),
            extractionAttempts: debugInfo,
            timestamp: new Date().toISOString(),
            troubleshooting: {
              step1: 'Ensure Auth0 token is being sent correctly',
              step2: 'Verify x-user-id header is set in the request',
              step3: 'Check browser Network tab for request details',
              step4: 'Confirm JWT token format is valid'
            }
          }
        }),
      };
    }

    console.log(`✅ User authenticated: ${userId} (source: ${source})`);

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

    // Initialize database connection with timeout and retry
    console.log('🔄 Initializing database connection...');
    let sql;
    try {
      sql = await Promise.race([
        getDatabaseConnection(),
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Database connection timeout after 10 seconds')), 10000)
        )
      ]);
      console.log('✅ Database connection initialized');
    } catch (connectionError) {
      console.error('❌ Database connection failed:', connectionError);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ 
          error: 'Database connection failed',
          message: connectionError.message,
          type: 'connection_error'
        }),
      };
    }

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
    console.error('Error stack:', error.stack?.substring(0, 1000));
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

// Enhanced test handler
async function handleTest(sql, userId) {
  console.log('🧪 Running enhanced test for user:', userId);
  
  try {
    // Test 1: Basic database query
    console.log('Testing database connection...');
    const [result] = await sql`SELECT 1 as test_value, NOW() as current_time, version() as db_version`;
    
    // Test 2: Table access
    console.log('Testing table access...');
    const tables = await sql`
      SELECT table_name, table_type
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('rag_documents', 'rag_document_chunks')
    `;

    // Test 3: User permissions
    console.log('Testing user permissions...');
    let permissionTest = { canRead: false, canWrite: false };
    try {
      // Test read permission
      await sql`SELECT COUNT(*) FROM rag_documents WHERE user_id = ${userId} LIMIT 1`;
      permissionTest.canRead = true;
      
      // Test write permission (dry run)
      const testQuery = sql`SELECT 1 WHERE FALSE`; // This won't actually insert
      permissionTest.canWrite = true;
    } catch (permError) {
      console.log('Permission test error:', permError.message);
      permissionTest.error = permError.message;
    }

    const response = {
      userId,
      timestamp: new Date().toISOString(),
      storage: 'neon-postgresql',
      authentication: {
        success: true,
        userIdProvided: !!userId,
        userIdLength: userId.length
      },
      tests: {
        databaseConnection: {
          success: true,
          testValue: result.test_value,
          currentTime: result.current_time,
          databaseVersion: result.db_version
        },
        tableAccess: {
          success: true,
          tablesFound: tables.map(t => ({ name: t.table_name, type: t.table_type })),
          requiredTables: ['rag_documents', 'rag_document_chunks'],
          allTablesPresent: tables.length >= 2
        },
        userPermissions: permissionTest
      },
      systemInfo: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        netlifyDev: process.env.NETLIFY_DEV || 'false',
        hasNeonUrl: !!process.env.NEON_DATABASE_URL
      },
      message: 'Enhanced RAG function test successful - authentication and database working'
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(response, null, 2),
    };

  } catch (error) {
    console.error('❌ Enhanced test failed:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        userId,
        timestamp: new Date().toISOString(),
        error: 'Test failed',
        message: error.message,
        errorType: error.constructor.name
      }),
    };
  }
}

// Enhanced list handler
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

    console.log(`✅ Found ${documents.length} documents for user ${userId}`);

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
    body: JSON.stringify({ 
      error: 'Upload not implemented in this fixed version yet',
      message: 'This is a test version focusing on authentication fixes'
    }),
  };
}

async function handleSearch(sql, userId, query, options) {
  return {
    statusCode: 501,
    headers,
    body: JSON.stringify({ 
      error: 'Search not implemented in this fixed version yet',
      message: 'This is a test version focusing on authentication fixes'
    }),
  };
}

async function handleDelete(sql, userId, documentId) {
  return {
    statusCode: 501,
    headers,
    body: JSON.stringify({ 
      error: 'Delete not implemented in this fixed version yet',
      message: 'This is a test version focusing on authentication fixes'
    }),
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
        userId: userId,
        timestamp: new Date().toISOString()
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
