// netlify/functions/rag-blob.js - Fixed with ES modules
import { getStore } from '@netlify/blobs';

// CORS headers
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
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

  console.log('RAG Function called:', {
    method: event.httpMethod,
    headers: event.headers,
    hasBody: !!event.body
  });

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

    console.log('Parsed request data:', { action: requestData.action });

    // Extract user ID from multiple sources
    const userId = event.headers['x-user-id'] || 
                   event.headers['X-User-ID'] || 
                   context.clientContext?.user?.sub ||
                   'anonymous';

    console.log('User ID:', userId);

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

    console.log('Processing action:', action);

    // Handle different actions
    switch (action) {
      case 'upload':
        return await handleUpload(userId, requestData.document);
      
      case 'search':
        return await handleSearch(userId, requestData.query, requestData.options);
      
      case 'list':
        return await handleList(userId);
      
      case 'delete':
        return await handleDelete(userId, requestData.documentId);
      
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
    console.error('RAG Function error:', error);
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
 * Handle document upload
 */
async function handleUpload(userId, document) {
  try {
    console.log('Starting document upload for user:', userId);

    if (!document || !document.filename || !document.chunks) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid document data' }),
      };
    }

    // Get blob stores
    const documentStore = getStore('rag-documents');
    const chunkStore = getStore('rag-chunks');
    
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    console.log('Generated document ID:', documentId);
    
    // Prepare document metadata
    const documentMetadata = {
      id: documentId,
      userId,
      filename: document.filename,
      originalFilename: document.filename,
      fileType: getDocumentType(document.type || 'text/plain'),
      fileSize: document.size || 0,
      textContent: document.text || '',
      metadata: document.metadata || {},
      category: document.metadata?.category || 'general',
      tags: document.metadata?.tags || [],
      chunkCount: document.chunks.length,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    // Store document metadata
    await documentStore.set(`${userId}/${documentId}`, JSON.stringify(documentMetadata));
    console.log('Document metadata stored');
    
    // Store document chunks with embeddings
    const chunkPromises = document.chunks.map(async (chunk, index) => {
      const chunkId = `${documentId}_chunk_${index}`;
      const chunkData = {
        id: chunkId,
        documentId,
        userId,
        index: chunk.index || index,
        text: chunk.text || '',
        wordCount: chunk.wordCount || 0,
        characterCount: chunk.characterCount || 0,
        embedding: chunk.embedding || [], // Store as array
        createdAt: timestamp
      };
      
      return chunkStore.set(`${userId}/${chunkId}`, JSON.stringify(chunkData));
    });
    
    await Promise.all(chunkPromises);
    console.log('Document chunks stored');
    
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
    console.error('Error uploading document:', error);
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
 * Handle document search
 */
async function handleSearch(userId, queryEmbedding, options = {}) {
  try {
    console.log('Starting document search for user:', userId);

    if (!queryEmbedding || !Array.isArray(queryEmbedding)) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid query embedding is required' }),
      };
    }

    const chunkStore = getStore('rag-chunks');
    const documentStore = getStore('rag-documents');
    
    const { limit = 10, threshold = 0.7, documentIds = null } = options;
    
    console.log('Search options:', { limit, threshold, documentIds });

    // Get all chunks for the user (simplified approach)
    const chunks = [];
    
    try {
      const chunksList = chunkStore.list(`${userId}/`);
      
      for await (const { key } of chunksList) {
        try {
          const chunkData = await chunkStore.get(key);
          if (chunkData) {
            const chunk = JSON.parse(chunkData);
            
            // Filter by document IDs if specified
            if (documentIds && !documentIds.includes(chunk.documentId)) {
              continue;
            }
            
            // Calculate cosine similarity
            const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
            
            if (similarity >= threshold) {
              chunks.push({
                ...chunk,
                similarity
              });
            }
          }
        } catch (error) {
          console.warn(`Error processing chunk ${key}:`, error);
        }
      }
    } catch (error) {
      console.error('Error listing chunks:', error);
      return {
        statusCode: 500,
        headers,
        body: JSON.stringify({ error: 'Failed to search chunks' }),
      };
    }
    
    // Sort by similarity and limit results
    const sortedChunks = chunks
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    console.log(`Found ${sortedChunks.length} matching chunks`);
    
    // Get document metadata for results
    const results = [];
    for (const chunk of sortedChunks) {
      try {
        const docData = await documentStore.get(`${userId}/${chunk.documentId}`);
        const document = docData ? JSON.parse(docData) : null;
        
        results.push({
          documentId: chunk.documentId,
          filename: document?.filename || 'Unknown',
          chunkIndex: chunk.index,
          text: chunk.text,
          similarity: chunk.similarity,
          metadata: document?.metadata || {}
        });
      } catch (error) {
        console.warn(`Error getting document metadata for ${chunk.documentId}:`, error);
        results.push({
          documentId: chunk.documentId,
          filename: 'Unknown',
          chunkIndex: chunk.index,
          text: chunk.text,
          similarity: chunk.similarity,
          metadata: {}
        });
      }
    }
    
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
 * Handle list documents
 */
async function handleList(userId) {
  try {
    console.log('Listing documents for user:', userId);

    const documentStore = getStore('rag-documents');
    const documents = [];
    
    try {
      const docsList = documentStore.list(`${userId}/`);
      
      for await (const { key } of docsList) {
        try {
          const docData = await documentStore.get(key);
          if (docData) {
            const document = JSON.parse(docData);
            documents.push({
              id: document.id,
              filename: document.filename,
              type: `application/${document.fileType}`,
              size: document.fileSize,
              chunks: document.chunkCount,
              category: document.category,
              tags: document.tags,
              createdAt: document.createdAt,
              metadata: document.metadata
            });
          }
        } catch (error) {
          console.warn(`Error processing document ${key}:`, error);
        }
      }
    } catch (error) {
      console.error('Error listing documents:', error);
      // Return empty list instead of error
    }
    
    // Sort by creation date (newest first)
    documents.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
    
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
 * Handle delete document
 */
async function handleDelete(userId, documentId) {
  try {
    console.log('Deleting document:', documentId, 'for user:', userId);

    if (!documentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Document ID is required' }),
      };
    }

    const documentStore = getStore('rag-documents');
    const chunkStore = getStore('rag-chunks');
    
    // Get document to verify ownership and get metadata
    const docData = await documentStore.get(`${userId}/${documentId}`);
    
    if (!docData) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Document not found' }),
      };
    }
    
    const document = JSON.parse(docData);
    
    // Delete all chunks for this document
    try {
      const chunksList = chunkStore.list(`${userId}/`);
      const chunkDeletePromises = [];
      
      for await (const { key } of chunksList) {
        if (key.includes(`${documentId}_chunk_`)) {
          chunkDeletePromises.push(chunkStore.delete(key));
        }
      }
      
      // Delete the document
      await documentStore.delete(`${userId}/${documentId}`);
      
      // Delete all chunks
      await Promise.all(chunkDeletePromises);
    } catch (error) {
      console.error('Error deleting document chunks:', error);
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Document deleted successfully',
        documentId,
        filename: document.filename
      }),
    };
  } catch (error) {
    console.error('Error deleting document:', error);
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
 * Handle get user statistics
 */
async function handleStats(userId) {
  try {
    console.log('Getting stats for user:', userId);

    const documentStore = getStore('rag-documents');
    
    let docCount = 0;
    let totalSize = 0;
    let totalChunks = 0;
    let oldestDoc = null;
    let newestDoc = null;
    
    try {
      const docsList = documentStore.list(`${userId}/`);
      
      for await (const { key } of docsList) {
        try {
          const docData = await documentStore.get(key);
          if (docData) {
            const doc = JSON.parse(docData);
            docCount++;
            totalSize += doc.fileSize || 0;
            totalChunks += doc.chunkCount || 0;
            
            const docDate = new Date(doc.createdAt);
            if (!oldestDoc || docDate < new Date(oldestDoc)) {
              oldestDoc = doc.createdAt;
            }
            if (!newestDoc || docDate > new Date(newestDoc)) {
              newestDoc = doc.createdAt;
            }
          }
        } catch (error) {
          console.warn(`Error processing document stats for ${key}:`, error);
        }
      }
    } catch (error) {
      console.error('Error getting document stats:', error);
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalDocuments: docCount,
        totalChunks: totalChunks,
        totalSize: totalSize,
        oldestDocument: oldestDoc,
        newestDocument: newestDoc,
        lastUpdated: new Date().toISOString()
      }),
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
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

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || !Array.isArray(vecA) || !Array.isArray(vecB) || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    const a = Number(vecA[i]) || 0;
    const b = Number(vecB[i]) || 0;
    
    dotProduct += a * b;
    normA += a * a;
    normB += b * b;
  }

  const magnitude = Math.sqrt(normA) * Math.sqrt(normB);
  
  if (magnitude === 0) {
    return 0;
  }

  return dotProduct / magnitude;
}

/**
 * Helper function to convert MIME type to simple type
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
