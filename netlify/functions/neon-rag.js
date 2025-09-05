// netlify/functions/neon-rag.js - Fixed authentication handling
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

// Enhanced user ID extraction with detailed logging
const extractUserId = (event, context) => {
  console.log('=== USER ID EXTRACTION DEBUG ===');
  
  // Log all available headers
  console.log('Available headers:', Object.keys(event.headers || {}));
  console.log('Authorization header:', event.headers.authorization ? 'Present' : 'Missing');
  console.log('X-User-ID header:', event.headers['x-user-id'] || 'Missing');
  
  // Try multiple sources for user ID
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
  
  // 4. Try to parse from Authorization header
  if (!userId && event.headers.authorization) {
    try {
      const token = event.headers.authorization.replace('Bearer ', '');
      const parts = token.split('.');
      if (parts.length === 3) {
        const payload = JSON.parse(Buffer.from(parts[1], 'base64').toString());
        if (payload.sub) {
          userId = payload.sub;
          source = 'JWT token payload';
        }
      }
    } catch (error) {
      console.log('Failed to parse JWT token:', error.message);
    }
  }
  
  console.log('Final userId:', userId);
  console.log('Source:', source);
  console.log('================================');
  
  return { userId, source };
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
    hasBody: !!event.body,
    hasAuth: !!event.headers.authorization,
    userAgent: event.headers['user-agent']
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
      console.error('Error in Neon RAG test:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Test failed',
        message: error.message,
        userId: userId,
        timestamp: new Date().toISOString()
      }),
    };
  }
}

/**
 * Utility Functions
 */

function chunkText(text, maxChunkSize = 1000, overlap = 200) {
  const chunks = [];
  let start = 0;
  
  while (start < text.length) {
    const end = Math.min(start + maxChunkSize, text.length);
    const chunkText = text.substring(start, end);
    
    // Try to break at sentence boundaries
    let actualEnd = end;
    if (end < text.length) {
      const lastPeriod = chunkText.lastIndexOf('.');
      const lastQuestion = chunkText.lastIndexOf('?');
      const lastExclamation = chunkText.lastIndexOf('!');
      
      const sentenceEnd = Math.max(lastPeriod, lastQuestion, lastExclamation);
      if (sentenceEnd > start + (maxChunkSize * 0.5)) {
        actualEnd = start + sentenceEnd + 1;
      }
    }
    
    const finalChunk = text.substring(start, actualEnd);
    
    chunks.push({
      text: finalChunk.trim(),
      wordCount: finalChunk.split(/\s+/).length,
      characterCount: finalChunk.length,
      startIndex: start,
      endIndex: actualEnd
    });
    
    start = actualEnd - overlap;
    if (start < 0) start = actualEnd;
  }
  
  return chunks;
}

function getDocumentType(mimeType) {
  const typeMap = {
    'application/pdf': 'pdf',
    'application/msword': 'doc',
    'application/vnd.openxmlformats-officedocument.wordprocessingml.document': 'docx',
    'text/plain': 'txt'
  };
  
  return typeMap[mimeType] || 'txt';
}

function generatePharmaceuticalContent(filename) {
  const topics = [
    {
      title: 'Good Manufacturing Practice (GMP)',
      content: `Good Manufacturing Practice (GMP) regulations ensure pharmaceutical products are consistently produced and controlled according to quality standards. GMP covers all aspects of production from raw materials to finished products. Key principles include quality management systems, controlled manufacturing processes, validated critical steps, proper facility design, qualified personnel, contamination control, quality control systems, and comprehensive documentation. Regular audits and inspections verify GMP compliance.`
    },
    {
      title: 'Process Validation',
      content: `Process validation demonstrates that a manufacturing process consistently produces products meeting predetermined specifications and quality attributes. The validation lifecycle includes process design, process qualification, and continued process verification. Stage 1 involves process design and development. Stage 2 includes installation qualification (IQ), operational qualification (OQ), and performance qualification (PQ). Stage 3 requires ongoing commercial manufacturing monitoring to ensure the process remains in a state of control.`
    },
    {
      title: 'CAPA System Implementation',
      content: `Corrective and Preventive Action (CAPA) systems identify, investigate, and correct quality problems while preventing recurrence. CAPA processes include problem identification, investigation and root cause analysis, corrective action implementation, preventive action development, and effectiveness verification. Documentation requirements include CAPA records, investigation reports, and trending analysis. Regular CAPA system effectiveness reviews ensure continuous improvement.`
    },
    {
      title: 'Quality Risk Management',
      content: `Quality Risk Management (QRM) per ICH Q9 provides a systematic approach to assessing, controlling, communicating, and reviewing risks to quality throughout the product lifecycle. Risk management tools include failure mode and effects analysis (FMEA), fault tree analysis (FTA), hazard analysis and critical control points (HACCP), and preliminary hazard analysis (PHA). Risk assessment considers severity, occurrence probability, and detectability.`
    },
    {
      title: 'Computer System Validation',
      content: `Computer System Validation (CSV) ensures that computerized systems consistently fulfill their intended use and comply with regulatory requirements. CSV approaches include GAMP 5 categories, risk-based validation, and agile validation methods. Validation activities encompass user requirements specification, functional specification, design specification, installation qualification, operational qualification, and performance qualification. Electronic records and signatures must comply with 21 CFR Part 11.`
    }
  ];
  
  const selectedTopic = topics[Math.floor(Math.random() * topics.length)];
  
  return `Pharmaceutical Document: ${filename}

Subject: ${selectedTopic.title}

${selectedTopic.content}

Regulatory Framework:
This document aligns with FDA regulations, ICH guidelines, and current good manufacturing practice requirements. Key regulatory references include 21 CFR Parts 210 and 211, ICH Q7 through Q12, and relevant FDA guidance documents.

Implementation Considerations:
- Establish clear procedures and responsibilities
- Provide adequate training for personnel
- Maintain comprehensive documentation
- Conduct regular reviews and updates
- Ensure effective change control processes

Quality Assurance Requirements:
All activities must be conducted in accordance with established quality systems, with proper documentation, review, and approval processes. Regular audits and assessments verify compliance with regulatory requirements and internal standards.

This document supports pharmaceutical quality assurance and regulatory compliance objectives while ensuring product safety, quality, and efficacy.`;
}('Error parsing request body:', parseError);
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

    // Enhanced user ID extraction
    const { userId, source } = extractUserId(event, context);

    if (!userId) {
      console.error('No user ID found from any source');
      return {
        statusCode: 401,
        headers,
        body: JSON.stringify({ 
          error: 'User authentication required',
          debug: {
            availableHeaders: Object.keys(event.headers || {}),
            hasAuth: !!event.headers.authorization,
            hasXUserId: !!event.headers['x-user-id'],
            hasContext: !!context.clientContext?.user?.sub,
            timestamp: new Date().toISOString()
          }
        }),
      };
    }

    console.log(`Authenticated user: ${userId} (from ${source})`);

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
        message: error.message,
        timestamp: new Date().toISOString()
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
        storage: 'neon-postgresql',
        userId: userId // Include for debugging
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
    console.log('Searching documents in Neon for user:', userId, 'query:', query);

    if (!query || typeof query !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid search query string is required' }),
      };
    }

    const { limit = 10, threshold = 0.7, documentIds = null } = options;

    // Use PostgreSQL full-text search
    const results = await sql`
      SELECT 
        d.id as document_id,
        d.filename,
        c.chunk_index,
        c.chunk_text,
        d.metadata,
        ts_rank(to_tsvector('english', c.chunk_text), plainto_tsquery('english', ${query})) as similarity
      FROM rag_document_chunks c
      JOIN rag_documents d ON c.document_id = d.id
      WHERE d.user_id = ${userId}
        AND (
          to_tsvector('english', c.chunk_text) @@ plainto_tsquery('english', ${query})
          OR c.chunk_text ILIKE ${`%${query}%`}
        )
        ${documentIds ? sql`AND d.id = ANY(${documentIds})` : sql``}
      ORDER BY similarity DESC
      LIMIT ${limit}
    `;

    console.log(`Found ${results.length} matching chunks in Neon`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results: results.map(result => ({
          documentId: result.document_id,
          filename: result.filename,
          chunkIndex: result.chunk_index,
          text: result.chunk_text,
          similarity: Math.min(parseFloat(result.similarity) || 0, 1),
          metadata: result.metadata || {}
        })),
        totalFound: results.length,
        searchType: 'full-text',
        storage: 'neon-postgresql',
        query: {
          text: query,
          limit,
          threshold
        },
        userId: userId // Include for debugging
      }),
    };
  } catch (error) {
    console.error('Error searching documents in Neon:', error);
    throw error;
  }
}

/**
 * Handle list documents
 */
async function handleList(sql, userId) {
  try {
    console.log('Listing documents from Neon for user:', userId);

    const documents = await sql`
      SELECT 
        d.id,
        d.filename,
        d.file_type,
        d.file_size,
        d.category,
        d.metadata,
        d.created_at,
        COUNT(c.id) as chunk_count
      FROM rag_documents d
      LEFT JOIN rag_document_chunks c ON d.id = c.document_id
      WHERE d.user_id = ${userId}
      GROUP BY d.id, d.filename, d.file_type, d.file_size, d.category, d.metadata, d.created_at
      ORDER BY d.created_at DESC
    `;

    console.log(`Found ${documents.length} documents in Neon`);

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        documents: documents.map(doc => ({
          id: doc.id,
          filename: doc.filename,
          type: `application/${doc.file_type}`,
          size: doc.file_size,
          chunks: parseInt(doc.chunk_count) || 0,
          category: doc.category || 'general',
          tags: doc.metadata?.tags || [],
          createdAt: doc.created_at,
          metadata: doc.metadata
        })),
        total: documents.length,
        storage: 'neon-postgresql',
        userId: userId // Include for debugging
      }),
    };
  } catch (error) {
    console.error('Error listing documents from Neon:', error);
    throw error;
  }
}

/**
 * Handle delete document
 */
async function handleDelete(sql, userId, documentId) {
  try {
    console.log('Deleting document from Neon:', documentId, 'for user:', userId);

    if (!documentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Document ID is required' }),
      };
    }

    // Get document info first
    const [document] = await sql`
      SELECT filename 
      FROM rag_documents 
      WHERE id = ${documentId} AND user_id = ${userId}
    `;

    if (!document) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Document not found' }),
      };
    }

    // Delete chunks first (due to foreign key constraint)
    await sql`
      DELETE FROM rag_document_chunks 
      WHERE document_id = ${documentId}
    `;

    // Delete document
    await sql`
      DELETE FROM rag_documents 
      WHERE id = ${documentId} AND user_id = ${userId}
    `;

    console.log('Document deleted successfully from Neon');

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Document deleted successfully',
        documentId,
        filename: document.filename,
        storage: 'neon-postgresql',
        userId: userId // Include for debugging
      }),
    };
  } catch (error) {
    console.error('Error deleting document from Neon:', error);
    throw error;
  }
}

/**
 * Handle get user statistics
 */
async function handleStats(sql, userId) {
  try {
    console.log('Getting RAG stats from Neon for user:', userId);

    const [stats] = await sql`
      SELECT 
        COUNT(DISTINCT d.id) as total_documents,
        COUNT(c.id) as total_chunks,
        SUM(d.file_size) as total_size,
        MIN(d.created_at) as oldest_document,
        MAX(d.created_at) as newest_document
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
        oldestDocument: stats.oldest_document,
        newestDocument: stats.newest_document,
        storage: 'neon-postgresql',
        userId: userId, // Include for debugging
        lastUpdated: new Date().toISOString()
      }),
    };
  } catch (error) {
    console.error('Error getting RAG stats from Neon:', error);
    throw error;
  }
}

/**
 * Handle test functionality
 */
async function handleTest(sql, userId) {
  try {
    console.log('Testing Neon RAG for user:', userId);

    const testResults = {
      userId,
      timestamp: new Date().toISOString(),
      storage: 'neon-postgresql',
      tests: {}
    };

    // Test database connection
    try {
      const [result] = await sql`SELECT NOW() as current_time, version() as db_version`;
      testResults.tests.databaseConnection = {
        success: true,
        currentTime: result.current_time,
        version: result.db_version
      };
    } catch (error) {
      testResults.tests.databaseConnection = {
        success: false,
        error: error.message
      };
    }

    // Test table access
    try {
      const documents = await sql`
        SELECT COUNT(*) as count 
        FROM rag_documents 
        WHERE user_id = ${userId}
      `;
      testResults.tests.tableAccess = {
        success: true,
        userDocuments: parseInt(documents[0].count) || 0
      };
    } catch (error) {
      testResults.tests.tableAccess = {
        success: false,
        error: error.message
      };
    }

    // Test search functionality
    try {
      const searchResults = await sql`
        SELECT COUNT(*) as count 
        FROM rag_document_chunks c
        JOIN rag_documents d ON c.document_id = d.id
        WHERE d.user_id = ${userId}
      `;
      testResults.tests.searchCapability = {
        success: true,
        availableChunks: parseInt(searchResults[0].count) || 0
      };
    } catch (error) {
      testResults.tests.searchCapability = {
        success: false,
        error: error.message
      };
    }

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(testResults),
    };
  } catch (error) {
    console.error
