// netlify/functions/rag.js
const faunadb = require('faunadb');

// Initialize FaunaDB client
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET_KEY,
});

const q = faunadb.query;

// CORS headers for all responses
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
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: 'Invalid action' }),
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
 * Upload and store document with embeddings
 */
async function uploadDocument(userId, document) {
  try {
    const documentData = {
      userId,
      filename: document.filename,
      type: document.type,
      size: document.size,
      textContent: document.text,
      chunks: document.chunks,
      metadata: document.metadata,
      createdAt: new Date().toISOString(),
      updatedAt: new Date().toISOString(),
    };

    const result = await client.query(
      q.Create(q.Collection('rag_documents'), {
        data: documentData
      })
    );

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        id: result.ref.id,
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
    const { limit = 10, threshold = 0.7, documentIds = null } = options;

    // Get all documents for the user
    let documentsQuery = q.Match(q.Index('rag_documents_by_user'), userId);
    
    // Filter by specific document IDs if provided
    if (documentIds && Array.isArray(documentIds)) {
      documentsQuery = q.Intersection(
        documentsQuery,
        q.Union(documentIds.map(id => q.Match(q.Index('rag_documents_by_id'), id)))
      );
    }

    const result = await client.query(
      q.Map(
        q.Paginate(documentsQuery, { size: 100 }),
        q.Lambda('ref', q.Get(q.Var('ref')))
      )
    );

    const documents = result.data;
    
    // Calculate similarity scores for all chunks
    const allResults = [];
    
    for (const doc of documents) {
      const chunks = doc.data.chunks || [];
      
      for (const chunk of chunks) {
        if (chunk.embedding) {
          const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
          
          if (similarity >= threshold) {
            allResults.push({
              documentId: doc.ref.id,
              filename: doc.data.filename,
              chunkIndex: chunk.index,
              text: chunk.text,
              similarity: similarity,
              metadata: doc.data.metadata
            });
          }
        }
      }
    }

    // Sort by similarity score and limit results
    const sortedResults = allResults
      .sort((a, b) => b.similarity - a.similarity)
      .slice(0, limit);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results: sortedResults,
        totalFound: allResults.length,
        query: {
          limit,
          threshold,
          documentsSearched: documents.length
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
    const result = await client.query(
      q.Map(
        q.Paginate(
          q.Match(q.Index('rag_documents_by_user'), userId),
          { size: 100 }
        ),
        q.Lambda('ref', 
          q.Let(
            { doc: q.Get(q.Var('ref')) },
            {
              id: q.Select(['ref', 'id'], q.Var('doc')),
              filename: q.Select(['data', 'filename'], q.Var('doc')),
              type: q.Select(['data', 'type'], q.Var('doc')),
              size: q.Select(['data', 'size'], q.Var('doc')),
              chunks: q.Count(q.Select(['data', 'chunks'], q.Var('doc'), [])),
              createdAt: q.Select(['data', 'createdAt'], q.Var('doc')),
              metadata: q.Select(['data', 'metadata'], q.Var('doc'), {})
            }
          )
        )
      )
    );

    const documents = result.data;

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        documents: documents,
        total: documents.length
      }),
    };
  } catch (error) {
    if (error.name === 'NotFound') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({ documents: [], total: 0 }),
      };
    }
    console.error('Error getting documents:', error);
    throw error;
  }
}

/**
 * Delete a document
 */
async function deleteDocument(userId, documentId) {
  try {
    // First verify the document belongs to the user
    const doc = await client.query(q.Get(q.Ref(q.Collection('rag_documents'), documentId)));
    
    if (doc.data.userId !== userId) {
      return {
        statusCode: 403,
        headers,
        body: JSON.stringify({ error: 'Not authorized to delete this document' }),
      };
    }

    // Delete the document
    await client.query(q.Delete(q.Ref(q.Collection('rag_documents'), documentId)));

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Document deleted successfully',
        documentId 
      }),
    };
  } catch (error) {
    if (error.name === 'NotFound') {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Document not found' }),
      };
    }
    console.error('Error deleting document:', error);
    throw error;
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
