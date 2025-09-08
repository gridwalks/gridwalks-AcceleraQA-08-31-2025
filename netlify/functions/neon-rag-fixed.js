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

// In-memory storage for documents and chunks
const storage = {
  documents: new Map(),
  chunks: new Map(),
};

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

    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    const text = document.text || '';
    const chunks = chunkText(text);

    storage.documents.set(`${userId}/${documentId}`, {
      id: documentId,
      userId,
      filename: document.filename,
      fileType: getFileType(document.filename),
      fileSize: document.size || text.length,
      chunkCount: chunks.length,
      createdAt: timestamp,
      metadata: document.metadata || {},
    });

    chunks.forEach((chunk) => {
      const chunkId = `${documentId}_chunk_${chunk.index}`;
      storage.chunks.set(`${userId}/${chunkId}`, {
        id: chunkId,
        documentId,
        userId,
        index: chunk.index,
        text: chunk.text,
        createdAt: timestamp,
      });
    });

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        id: documentId,
        filename: document.filename,
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
    const documents = [];
    for (const [key, doc] of storage.documents.entries()) {
      if (key.startsWith(`${userId}/`)) {
        documents.push({
          id: doc.id,
          filename: doc.filename,
          type: `application/${doc.fileType}`,
          size: doc.fileSize,
          chunks: doc.chunkCount,
          createdAt: doc.createdAt,
          metadata: doc.metadata,
        });
      }
    }

    documents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));

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

    const docKey = `${userId}/${documentId}`;
    const document = storage.documents.get(docKey);
    if (!document) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Document not found' }),
      };
    }

    storage.documents.delete(docKey);
    for (const key of storage.chunks.keys()) {
      if (key.startsWith(`${userId}/${documentId}_chunk_`)) {
        storage.chunks.delete(key);
      }
    }

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
    const lcQuery = query.toLowerCase();
    const results = [];

    for (const [key, chunk] of storage.chunks.entries()) {
      if (!key.startsWith(`${userId}/`)) continue;
      const text = chunk.text || '';
      const pos = text.toLowerCase().indexOf(lcQuery);
      if (pos !== -1) {
        const snippet = text.substring(Math.max(0, pos - 50), pos + lcQuery.length + 50);
        const document = storage.documents.get(`${userId}/${chunk.documentId}`);
        results.push({
          documentId: chunk.documentId,
          filename: document?.filename || 'Unknown',
          chunkIndex: chunk.index,
          text: snippet,
          similarity: 1,
        });
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ results: results.slice(0, limit), totalFound: results.length }),
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
    let docCount = 0;
    let totalChunks = 0;
    let totalSize = 0;

    for (const [key, doc] of storage.documents.entries()) {
      if (key.startsWith(`${userId}/`)) {
        docCount++;
        totalChunks += doc.chunkCount || 0;
        totalSize += doc.fileSize || 0;
      }
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalDocuments: docCount,
        totalChunks,
        totalSize,
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
