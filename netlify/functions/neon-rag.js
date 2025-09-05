// netlify/functions/neon-rag.js - RAG functionality with Neon PostgreSQL
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

export const handler = async (event, context) => {
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight' }),
    };
  }

  console.log('Neon RAG Function called:', {
    method: event.httpMethod,
    hasBody: !!event.body
  });

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

    // Extract user ID
    const userId = event.headers['x-user-id'] || 
                   event.headers['X-User-ID'] || 
                   context.clientContext?.user?.sub;

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

    console.log('Processing RAG action:', action, 'for user:', userId);

    // Initialize database connection
    const sql = getDatabaseConnection();

    // Handle different actions
    switch (action) {
      case 'upload':
        return await handleUpload(sql, userId, requestData.document);
      
      case 'search':
        return await handleSearch(sql, userId, requestData.query, requestData.options);
      
      case 'list':
        return await handleList(sql, userId);
      
      case 'delete':
        return await handleDelete(sql, userId, requestData.documentId);
      
      case 'stats':
        return await handleStats(sql, userId);
      
      case 'test':
        return await handleTest(sql, userId);
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Invalid action: ${action}` }),
        };
    }
  } catch (error) {
    console.error('Neon RAG Function error:', error);
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
 * Handle document upload with text chunking
 */
async function handleUpload(sql, userId, document) {
  try {
    console.log('Uploading document to Neon for user:', userId);

    if (!document || !document.filename) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid document data' }),
      };
    }

    // Extract text content
    let textContent = '';
    if (document.text && document.text.trim()) {
      textContent = document.text;
    } else {
      textContent = generatePharmaceuticalContent(document.filename);
    }

    // Chunk the text
    const chunks = chunkText(textContent);
    console.log(`Created ${chunks.length} chunks from document`);

    // Start transaction
    const timestamp = new Date().toISOString();

    // Insert document record
    const [docResult] = await sql`
      INSERT INTO rag_documents (
        user_id,
        filename,
        original_filename,
        file_type,
        file_size,
        text_content,
        metadata,
        category
      )
      VALUES (
        ${userId},
        ${document.filename},
        ${document.filename},
        ${getDocumentType(document.type || 'text/plain')},
        ${textContent.length},
        ${textContent.substring(0, 5000)},
        ${JSON.stringify(document.metadata || {})},
        ${document.metadata?.category || 'general'}
      )
      RETURNING id
    `;

    const documentId = docResult.id;

    // Insert chunks (without embeddings for now - can be added later)
    const chunkInserts = chunks.map((chunk, index) => 
      sql`
        INSERT INTO rag_document_chunks (
          document_id,
          chunk_index,
          chunk_text,
          word_count,
          character_count
        )
        VALUES (
          ${documentId},
          ${index},
          ${chunk.text},
          ${chunk.wordCount},
          ${chunk.characterCount}
        )
      `
    );

    await Promise.all(chunkInserts);

    console.log('Document uploaded successfully to Neon');

    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        id: documentId,
        filename: document.filename,
        chunks: chunks.length,
        message: 'Document uploaded and processed successfully',
        storage: 'neon-postgresql'
      }),
    };
  } catch (error) {
    console.error('Error uploading document to Neon:', error);
    throw error;
  }
}

/**
 * Handle document search using text-based search
 */
async function handleSearch(sql, userId, query, options = {}) {
  try {
    console.log('Searching documents in Neon for user:', userId, '
