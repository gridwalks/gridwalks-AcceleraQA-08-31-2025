// netlify/functions/rag-simple.js - Simplified RAG function without blobs first

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// In-memory storage for testing (will be lost on function restart)
const mockDocuments = new Map();
const mockChunks = new Map();

exports.handler = async (event, context) => {
  console.log('Simple RAG Function called:', {
    method: event.httpMethod,
    hasBody: !!event.body
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
    // Only allow POST method
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

    // Extract user ID
    const userId = event.headers['x-user-id'] || 
                   event.headers['X-User-ID'] || 
                   context.clientContext?.user?.sub ||
                   'test-user';

    if (!userId || userId === 'anonymous') {
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

    // Handle different actions
    switch (action) {
      case 'upload':
        return await handleUpload(userId, requestData.document);
      
      case 'list':
        return await handleList(userId);
      
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
    console.error('Simple RAG Function error:', error);
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
 * Handle document upload (mock implementation)
 */
async function handleUpload(userId, document) {
  try {
    console.log('Mock upload for user:', userId);

    if (!document || !document.filename) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid document data' }),
      };
    }

    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Store in mock storage
    const documentData = {
      id: documentId,
      userId,
      filename: document.filename,
      fileType: 'txt',
      fileSize: document.size || 0,
      chunkCount: document.chunks ? document.chunks.length : 0,
      createdAt: timestamp,
      metadata: document.metadata || {}
    };
    
    mockDocuments.set(`${userId}/${documentId}`, documentData);
    
    // Store chunks
    if (document.chunks) {
      document.chunks.forEach((chunk, index) => {
        const chunkId = `${documentId}_chunk_${index}`;
        mockChunks.set(`${userId}/${chunkId}`, {
          id: chunkId,
          documentId,
          userId,
          index,
          text: chunk.text || '',
          embedding: chunk.embedding || [],
          createdAt: timestamp
        });
      });
    }
    
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        id: documentId,
        filename: document.filename,
        chunks: document.chunks ? document.chunks.length : 0,
        message: 'Document uploaded successfully (mock storage)',
        storage: 'mock'
      }),
    };
  } catch (error) {
    console.error('Error in mock upload:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to upload document',
        message: error.message 
      }),
    };
  }
}

/**
 * Handle list documents (mock implementation)
 */
async function handleList(userId) {
  try {
    console.log('Mock list for user:', userId);

    const documents = [];
    
    for (const [key, doc] of mockDocuments.entries()) {
      if (key.startsWith(`${userId}/`)) {
        documents.push({
          id: doc.id,
          filename: doc.filename,
          type: `application/${doc.fileType}`,
          size: doc.fileSize,
          chunks: doc.chunkCount,
          category: doc.metadata?.category || 'general',
          tags: doc.metadata?.tags || [],
          createdAt: doc.createdAt,
          metadata: doc.metadata
        });
      }
    }
    
    // Sort by creation date (newest first)
    documents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        documents: documents,
        total: documents.length,
        storage: 'mock'
      }),
    };
  } catch (error) {
    console.error('Error in mock list:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to list documents',
        message: error.message 
      }),
    };
  }
}

/**
 * Handle delete document (mock implementation)
 */
async function handleDelete(userId, documentId) {
  try {
    console.log('Mock delete for user:', userId, 'doc:', documentId);

    if (!documentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Document ID is required' }),
      };
    }

    const docKey = `${userId}/${documentId}`;
    const document = mockDocuments.get(docKey);
    
    if (!document) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Document not found' }),
      };
    }
    
    // Delete document
    mockDocuments.delete(docKey);
    
    // Delete chunks
    for (const [key] of mockChunks.entries()) {
      if (key.startsWith(`${userId}/`) && key.includes(`${documentId}_chunk_`)) {
        mockChunks.delete(key);
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Document deleted successfully (mock storage)',
        documentId,
        filename: document.filename,
        storage: 'mock'
      }),
    };
  } catch (error) {
    console.error('Error in mock delete:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to delete document',
        message: error.message 
      }),
    };
  }
}

/**
 * Handle search (mock implementation)
 */
async function handleSearch(userId, queryEmbedding, options = {}) {
  try {
    console.log('Mock search for user:', userId);

    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid query embedding is required' }),
      };
    }

    const { limit = 10 } = options;
    const results = [];
    
    // Get chunks for this user
    for (const [key, chunk] of mockChunks.entries()) {
      if (key.startsWith(`${userId}/`)) {
        const document = mockDocuments.get(`${userId}/${chunk.documentId}`);
        
        results.push({
          documentId: chunk.documentId,
          filename: document?.filename || 'Unknown',
          chunkIndex: chunk.index,
          text: chunk.text,
          similarity: Math.random() * 0.5 + 0.5, // Mock similarity score
          metadata: document?.metadata || {}
        });
      }
    }
    
    // Sort by similarity and limit
    results.sort((a, b) => b.similarity - a.similarity);
    const limitedResults = results.slice(0, limit);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results: limitedResults,
        totalFound: limitedResults.length,
        storage: 'mock',
        query: {
          limit,
          threshold: options.threshold || 0.7
        }
      }),
    };
  } catch (error) {
    console.error('Error in mock search:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Search failed',
        message: error.message 
      }),
    };
  }
}

/**
 * Handle stats (mock implementation)
 */
async function handleStats(userId) {
  try {
    console.log('Mock stats for user:', userId);

    let docCount = 0;
    let totalSize = 0;
    let totalChunks = 0;
    
    for (const [key, doc] of mockDocuments.entries()) {
      if (key.startsWith(`${userId}/`)) {
        docCount++;
        totalSize += doc.fileSize || 0;
        totalChunks += doc.chunkCount || 0;
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalDocuments: docCount,
        totalChunks: totalChunks,
        totalSize: totalSize,
        storage: 'mock',
        lastUpdated: new Date().toISOString()
      }),
    };
  } catch (error) {
    console.error('Error in mock stats:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Failed to get stats',
        message: error.message 
      }),
    };
  }
}
