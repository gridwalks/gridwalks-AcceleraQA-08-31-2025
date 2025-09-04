// netlify/functions/rag-blob.js - RAG system using Netlify Blob
const { getStore } = require('@netlify/blob');

// Get blob stores for different data types
const getDocumentStore = () => getStore('rag-documents');
const getChunkStore = () => getStore('rag-chunks');
const getUserStore = () => getStore('user-data');

// CORS headers
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

  try {
    const { body } = event;
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

    if (event.httpMethod !== 'POST') {
      return {
        statusCode: 405,
        headers,
        body: JSON.stringify({ error: 'Method not allowed' }),
      };
    }

    const requestData = JSON.parse(body);
    const { action } = requestData;

    switch (action) {
      case 'upload':
        return await uploadDocument(userId, requestData.document);
      
      case 'search':
        return await searchDocuments(userId, requestData.query, requestData.options);
      
      case 'list':
        return await getDocuments(userId);
      
      case 'delete':
        return await deleteDocument(userId, requestData.documentId);
      
      case 'stats':
        return await getUserStats(userId);
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' }),
        };
    }
  } catch (error) {
    console.error('RAG Blob Function error:', error);
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
 * Upload document with chunks and embeddings to Netlify Blob
 */
async function uploadDocument(userId, document) {
  try {
    const documentStore = getDocumentStore();
    const chunkStore = getChunkStore();
    
    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Prepare document metadata
    const documentMetadata = {
      id: documentId,
      userId,
      filename: document.filename,
      originalFilename: document.filename,
      fileType: getDocumentType(document.type),
      fileSize: document.size,
      textContent: document.text,
      metadata: document.metadata || {},
      category: document.metadata?.category || 'general',
      tags: document.metadata?.tags || [],
      chunkCount: document.chunks.length,
      createdAt: timestamp,
      updatedAt: timestamp
    };
    
    // Store document metadata
    await documentStore.set(`${userId}/${documentId}`, JSON.stringify(documentMetadata));
    
    // Store document chunks with embeddings
    const chunkPromises = document.chunks.map(async (chunk, index) => {
      const chunkId = `${documentId}_chunk_${index}`;
      const chunkData = {
        id: chunkId,
        documentId,
        userId,
        index: chunk.index,
        text: chunk.text,
        wordCount: chunk.wordCount,
        characterCount: chunk.characterCount,
        embedding: chunk.embedding, // Store as array
        createdAt: timestamp
      };
      
      return chunkStore.set(`${userId}/${chunkId}`, JSON.stringify(chunkData));
    });
    
    await Promise.all(chunkPromises);
    
    // Update user statistics
    await updateUserStats(userId, 'documents', 1);
    await updateUserStats(userId, 'chunks', document.chunks.length);
    await updateUserStats(userId, 'storage', document.size);
    
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
    throw error;
  }
}

/**
 * Search documents using cosine similarity
 */
async function searchDocuments(userId, queryEmbedding, options = {}) {
  try {
    const chunkStore = getChunkStore();
    const documentStore = getDocumentStore();
    
    const { limit = 10, threshold = 0.7, documentIds = null } = options;
    
    // Get all chunks for the user
    const chunksList = chunkStore.list(`${userId}/`);
    const chunks = [];
    
    // Retrieve all chunks (this could be optimized with pagination)
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
    
    // Sort by similarity and limit results
    const sortedChunks = chunks
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);
    
    // Get document metadata for results
    const results = await Promise.all(
      sortedChunks.map(async (chunk) => {
        try {
          const docData = await documentStore.get(`${userId}/${chunk.documentId}`);
          const document = docData ? JSON.parse(docData) : null;
          
          return {
            documentId: chunk.documentId,
            filename: document?.filename || 'Unknown',
            chunkIndex: chunk.index,
            text: chunk.text,
            similarity: chunk.similarity,
            metadata: document?.metadata || {}
          };
        } catch (error) {
          console.warn(`Error getting document metadata for ${chunk.documentId}:`, error);
          return {
            documentId: chunk.documentId,
            filename: 'Unknown',
            chunkIndex: chunk.index,
            text: chunk.text,
            similarity: chunk.similarity,
            metadata: {}
          };
        }
      })
    );
    
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
    throw error;
  }
}

/**
 * Get list of documents for user
 */
async function getDocuments(userId) {
  try {
    const documentStore = getDocumentStore();
    const documents = [];
    
    // List all documents for the user
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
    throw error;
  }
}

/**
 * Delete a document and its chunks
 */
async function deleteDocument(userId, documentId) {
  try {
    const documentStore = getDocumentStore();
    const chunkStore = getChunkStore();
    
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
    
    // Update user statistics
    await updateUserStats(userId, 'documents', -1);
    await updateUserStats(userId, 'chunks', -document.chunkCount);
    await updateUserStats(userId, 'storage', -document.fileSize);
    
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
    throw error;
  }
}

/**
 * Get user statistics
 */
async function getUserStats(userId) {
  try {
    const userStore = getUserStore();
    
    // Get user stats
    const statsData = await userStore.get(`${userId}/stats`);
    let stats = {
      documents: 0,
      chunks: 0,
      storage: 0,
      lastUpdated: new Date().toISOString()
    };
    
    if (statsData) {
      stats = { ...stats, ...JSON.parse(statsData) };
    }
    
    // Get document list to verify stats
    const documentStore = getDocumentStore();
    const docsList = documentStore.list(`${userId}/`);
    let docCount = 0;
    let totalSize = 0;
    let totalChunks = 0;
    let oldestDoc = null;
    let newestDoc = null;
    
    for await (const { key } of docsList) {
      try {
        const docData = await documentStore.get(key);
        if (docData) {
          const doc = JSON.parse(docData);
          docCount++;
          totalSize += doc.fileSize;
          totalChunks += doc.chunkCount;
          
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
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalDocuments: docCount,
        totalChunks: totalChunks,
        totalSize: totalSize,
        oldestDocument: oldestDoc,
        newestDocument: newestDoc,
        lastUpdated: stats.lastUpdated
      }),
    };
  } catch (error) {
    console.error('Error getting user stats:', error);
    throw error;
  }
}

/**
 * Update user statistics
 */
async function updateUserStats(userId, type, delta) {
  try {
    const userStore = getUserStore();
    const statsKey = `${userId}/stats`;
    
    // Get current stats
    const currentStatsData = await userStore.get(statsKey);
    let stats = {
      documents: 0,
      chunks: 0,
      storage: 0,
      lastUpdated: new Date().toISOString()
    };
    
    if (currentStatsData) {
      stats = { ...stats, ...JSON.parse(currentStatsData) };
    }
    
    // Update the specific stat
    stats[type] = Math.max(0, (stats[type] || 0) + delta);
    stats.lastUpdated = new Date().toISOString();
    
    // Save updated stats
    await userStore.set(statsKey, JSON.stringify(stats));
  } catch (error) {
    console.warn('Error updating user stats:', error);
  }
}

/**
 * Calculate cosine similarity between two vectors
 */
function cosineSimilarity(vecA, vecB) {
  if (!vecA || !vecB || vecA.length !== vecB.length) {
    return 0;
  }

  let dotProduct = 0;
  let normA = 0;
  let normB = 0;

  for (let i = 0; i < vecA.length; i++) {
    dotProduct += vecA[i] * vecB[i];
    normA += vecA[i] * vecA[i];
    normB += vecB[i] * vecB[i];
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
