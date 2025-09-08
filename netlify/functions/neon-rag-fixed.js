// Enhanced server-side authentication handling
// NOTE: When clients use encrypted JWE tokens, they must include an `x-user-id`
// header because the server cannot derive the user identity from the token alone.
// Requests lacking this header will be rejected with a 401 response.
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// JWKS client for Auth0 token verification
const client = jwksClient({
  jwksUri: `https://${process.env.REACT_APP_AUTH0_DOMAIN}/.well-known/jwks.json`,
  requestHeaders: {}, 
  timeout: 30000,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('Error getting signing key:', err);
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Enhanced user extraction with JWT verification
const extractUserId = async (event, context) => {
  console.log('=== ENHANCED SERVER-SIDE USER EXTRACTION ===');
  
  let userId = null;
  let source = 'unknown';
  let debugInfo = {};
  
  // Method 1: Direct x-user-id header (most reliable)
  if (event.headers['x-user-id']) {
    userId = event.headers['x-user-id'];
    source = 'x-user-id header';
    debugInfo.foundInHeader = true;
    console.log('✅ Found user ID in x-user-id header');
    return { userId, source, debugInfo };
  }
  
  // Method 2: JWT token verification
  if (event.headers.authorization) {
    try {
      const authHeader = event.headers.authorization;
      
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const parts = token.split('.');
        
        console.log('JWT parts count:', parts.length);
        debugInfo.jwtPartsCount = parts.length;
        
        if (parts.length === 3) {
          // Standard JWT - verify and decode
          try {
            const decoded = await new Promise((resolve, reject) => {
              jwt.verify(token, getKey, {
                audience: process.env.REACT_APP_AUTH0_AUDIENCE,
                issuer: `https://${process.env.REACT_APP_AUTH0_DOMAIN}/`,
                algorithms: ['RS256']
              }, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
              });
            });
            
            if (decoded && decoded.sub) {
              userId = decoded.sub;
              source = 'JWT verification';
              debugInfo.jwtVerified = true;
              debugInfo.jwtSubject = decoded.sub;
              console.log('✅ JWT verified and user extracted');
            }
          } catch (verifyError) {
            console.error('JWT verification failed:', verifyError.message);
            debugInfo.jwtVerificationError = verifyError.message;
            
            // Fallback: try to decode without verification (less secure)
            try {
              let payload = parts[1];
              while (payload.length % 4) {
                payload += '=';
              }
              
              const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
              if (decoded.sub) {
                userId = decoded.sub;
                source = 'JWT decode (unverified)';
                debugInfo.jwtUnverified = true;
                console.log('⚠️ JWT decoded without verification');
              }
            } catch (decodeError) {
              console.error('JWT decode failed:', decodeError.message);
              debugInfo.jwtDecodeError = decodeError.message;
            }
          }
        } else if (parts.length === 5) {
          // JWE (encrypted JWT) - requires x-user-id header or server-side decryption
          console.log('🔒 JWE token detected - requires server-side decryption');
          debugInfo.jwtType = 'JWE';
          debugInfo.requiresServerDecryption = true;

          // Clients must send the user ID in the x-user-id header when using JWE.
          const headerUserId = event.headers['x-user-id'];
          if (headerUserId) {
            userId = headerUserId;
            source = 'x-user-id header (JWE)';
            debugInfo.foundInHeader = true;
            console.log('✅ Using x-user-id header for JWE token');
          } else {
            console.error('x-user-id header required for JWE token');
            debugInfo.missingUserIdHeader = true;
            const err = new Error('x-user-id header required when using JWE token');
            err.statusCode = 401;
            throw err;
          }

          // Optional: implement server-side JWE decryption here if a decryption key is available.
        }
      }
    } catch (error) {
      console.error('Auth header processing error:', error);
      debugInfo.authProcessingError = error.message;
    }
  }
  
  // Method 3: Netlify context
  if (!userId && context.clientContext?.user?.sub) {
    userId = context.clientContext.user.sub;
    source = 'netlify context';
    debugInfo.foundInContext = true;
    console.log('✅ Found user ID in Netlify context');
  }
  
  // Method 4: Development fallback
  if (!userId && (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true')) {
    userId = 'dev-user-' + Date.now();
    source = 'development fallback';
    debugInfo.developmentFallback = true;
    console.log('⚠️ Using development fallback');
  }
  
  console.log('Final userId:', userId || 'NOT_FOUND');
  console.log('Source:', source);
  console.log('=== END EXTRACTION ===');

  return { userId, source, debugInfo };
};

// Standard headers for all responses
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// Database connection helper
let sqlInstance = null;
async function getSql() {
  if (!sqlInstance) {
    const { neon } = await import('@neondatabase/serverless');
    const connectionString = process.env.NEON_DATABASE_URL;
    if (!connectionString) {
      throw new Error('NEON_DATABASE_URL environment variable is not set');
    }
    sqlInstance = neon(connectionString);
  }
  return sqlInstance;
}

let poolInstance = null;
async function getPool() {
  if (!poolInstance) {
    const { Pool } = await import('@neondatabase/serverless');
    const connectionString = process.env.NEON_DATABASE_URL;
    if (!connectionString) {
      throw new Error('NEON_DATABASE_URL environment variable is not set');
    }
    poolInstance = new Pool({ connectionString });
  }
  return poolInstance;
}

function chunkText(text, size = 800) {
  const chunks = [];
  let index = 0;
  for (let i = 0; i < text.length; i += size) {
    const chunkText = text.slice(i, i + size);
    chunks.push({
      text: chunkText,
      index: index++,
      wordCount: chunkText.split(/\s+/).filter(Boolean).length,
      characterCount: chunkText.length,
    });
  }
  return chunks;
}

function getFileType(filename = '') {
  const ext = filename.split('.').pop().toLowerCase();
  if (['pdf'].includes(ext)) return 'pdf';
  if (['doc', 'docx'].includes(ext)) return 'doc';
  return 'txt';
}

// Main handler that dispatches RAG actions
exports.handler = async (event, context) => {
  console.log('Neon RAG Fixed function called:', {
    method: event.httpMethod,
    hasBody: !!event.body,
  });

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight' }),
    };
  }

  try {
    // Only allow POST requests
    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    // Parse request body
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

    // Extract authenticated user
    const { userId } = await extractUserId(event, context);
    if (!userId) {
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ error: 'User authentication required' }),
      };
    }

    const { action } = requestData;
    if (!action) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Action parameter is required' }),
      };
    }

    console.log('Processing action:', action, 'for user:', userId);

    // Dispatch actions
    switch (action) {
      case 'test':
        return await handleTest(userId, requestData);
      case 'list':
        return await handleList(userId);
      case 'upload':
        return await handleUpload(userId, requestData.document);
      case 'delete':
        return await handleDelete(userId, requestData.documentId);
      case 'search':
        return await handleSearch(userId, requestData.query, requestData.options);
      case 'stats':
        return await handleStats(userId);
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Invalid action: ${action}` }),
        };
    }
  } catch (error) {
    console.error('Neon RAG Fixed function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
      }),
    };
  }
};

// Action handlers
async function handleTest(userId) {
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({ message: 'RAG service operational', userId }),
  };
}

async function handleUpload(userId, document) {
  try {
    if (!document || !document.filename) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid document data' }),
      };
    }
    const text = document.text || '';
    const chunks = chunkText(text);

    const pool = await getPool();
    let client;
    let insertedDocument;
    try {
      client = await pool.connect();
      await client.query('BEGIN');

      const docResult = await client.query(
        `INSERT INTO rag_documents (
          user_id,
          filename,
          original_filename,
          file_type,
          file_size,
          text_content,
          metadata
        ) VALUES ($1,$2,$3,$4,$5,$6,$7) RETURNING id, filename, created_at`,
        [
          userId,
          document.filename,
          document.filename,
          getFileType(document.filename),
          document.size || text.length,
          text,
          JSON.stringify(document.metadata || {}),
        ]
      );
      insertedDocument = docResult.rows[0];

      for (const chunk of chunks) {
        await client.query(
          `INSERT INTO rag_document_chunks (
            document_id,
            chunk_index,
            chunk_text,
            word_count,
            character_count
          ) VALUES ($1,$2,$3,$4,$5)`,
          [
            insertedDocument.id,
            chunk.index,
            chunk.text,
            chunk.wordCount,
            chunk.characterCount,
          ]
        );
      }

      await client.query('COMMIT');
    } catch (err) {
      if (client) {
        try {
          await client.query('ROLLBACK');
        } catch (rollbackError) {
          console.error('Rollback error:', rollbackError);
        }
      }
      throw err;
    } finally {
      if (client) client.release();
    }

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        id: insertedDocument.id,
        filename: insertedDocument.filename,
        chunks: chunks.length,
        message: 'Document uploaded successfully',
      }),
    };
  } catch (error) {
    console.error('Upload error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to upload document', message: error.message }),
    };
  }
}

async function handleList(userId) {
  try {
    const sql = await getSql();
    const rows = await sql`
      SELECT d.id, d.filename, d.file_type, d.file_size, d.created_at, d.metadata,
             (SELECT COUNT(*) FROM rag_document_chunks c WHERE c.document_id = d.id) AS chunk_count
      FROM rag_documents d
      WHERE d.user_id = ${userId}
      ORDER BY d.created_at DESC
    `;

    const documents = rows.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      type: `application/${doc.file_type}`,
      size: doc.file_size,
      chunks: doc.chunk_count,
      createdAt: doc.created_at,
      metadata: doc.metadata,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ documents, total: documents.length }),
    };
  } catch (error) {
    console.error('List error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to list documents', message: error.message }),
    };
  }
}

async function handleDelete(userId, documentId) {
  try {
    if (!documentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Document ID is required' }),
      };
    }
    const sql = await getSql();
    const [doc] = await sql`
      SELECT id FROM rag_documents WHERE id = ${documentId} AND user_id = ${userId}
    `;
    if (!doc) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Document not found' }),
      };
    }

    await sql`
      DELETE FROM rag_documents WHERE id = ${documentId} AND user_id = ${userId}
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'Document deleted', documentId }),
    };
  } catch (error) {
    console.error('Delete error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to delete document', message: error.message }),
    };
  }
}

async function handleSearch(userId, query, options = {}) {
  try {
    if (!query || typeof query !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid search query is required' }),
      };
    }
    const { limit = 10 } = options;
    const sql = await getSql();
    const rows = await sql`
      SELECT c.document_id, c.chunk_index, c.chunk_text, d.filename
      FROM rag_document_chunks c
      JOIN rag_documents d ON c.document_id = d.id
      WHERE d.user_id = ${userId}
        AND c.chunk_text ILIKE ${'%' + query + '%'}
      LIMIT ${limit}
    `;

    const results = rows.map(r => ({
      documentId: r.document_id,
      filename: r.filename,
      chunkIndex: r.chunk_index,
      text: r.chunk_text,
      similarity: 1,
    }));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ results, totalFound: results.length }),
    };
  } catch (error) {
    console.error('Search error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Search failed', message: error.message }),
    };
  }
}

async function handleStats(userId) {
  try {
    const sql = await getSql();
    const [docInfo] = await sql`
      SELECT COUNT(*) AS doc_count, COALESCE(SUM(file_size),0) AS total_size
      FROM rag_documents
      WHERE user_id = ${userId}
    `;
    const [chunkInfo] = await sql`
      SELECT COUNT(*) AS chunk_count
      FROM rag_document_chunks c
      JOIN rag_documents d ON c.document_id = d.id
      WHERE d.user_id = ${userId}
    `;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalDocuments: parseInt(docInfo.doc_count, 10),
        totalChunks: parseInt(chunkInfo.chunk_count, 10),
        totalSize: parseInt(docInfo.total_size, 10) || 0,
        lastUpdated: new Date().toISOString(),
      }),
    };
  } catch (error) {
    console.error('Stats error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ error: 'Failed to get stats', message: error.message }),
    };
  }
}
