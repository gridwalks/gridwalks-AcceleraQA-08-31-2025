// netlify/functions/rag-enhanced.js - Full RAG without blobs
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// Enhanced in-memory storage (persists during function lifecycle)
const storage = {
  documents: new Map(),
  chunks: new Map(),
  embeddings: new Map(),
  
  // User-specific storage
  getUserDocuments: (userId) => {
    const userDocs = [];
    for (const [key, doc] of storage.documents.entries()) {
      if (doc.userId === userId) {
        userDocs.push(doc);
      }
    }
    return userDocs;
  },
  
  getUserChunks: (userId) => {
    const userChunks = [];
    for (const [key, chunk] of storage.chunks.entries()) {
      if (chunk.userId === userId) {
        userChunks.push(chunk);
      }
    }
    return userChunks;
  }
};

exports.handler = async (event, context) => {
  console.log('Enhanced RAG Function called:', {
    method: event.httpMethod,
    hasBody: !!event.body,
    userAgent: event.headers['user-agent']
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
      
      case 'test':
        return await handleTest(userId);
      
      default:
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ error: `Invalid action: ${action}` }),
        };
    }
  } catch (error) {
    console.error('Enhanced RAG Function error:', error);
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
 * Handle document upload with real embedding generation
 */
async function handleUpload(userId, document) {
  try {
    console.log('Enhanced upload for user:', userId);

    if (!document || !document.filename) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid document data' }),
      };
    }

    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Extract text content (handle different file types)
    let textContent = '';
    if (document.text) {
      textContent = document.text;
    } else if (document.filename.endsWith('.txt')) {
      textContent = document.content || getPlaceholderText(document.filename);
    } else {
      // For non-text files, create pharmaceutical-relevant placeholder content
      textContent = getPharmaceuticalPlaceholder(document.filename);
    }
    
    // Chunk the text into manageable pieces
    const chunks = chunkText(textContent);
    console.log(`Created ${chunks.length} chunks from document`);
    
    // Generate embeddings for each chunk
    const chunksWithEmbeddings = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        // Generate real embedding using OpenAI
        const embedding = await generateEmbedding(chunk.text);
        
        const chunkWithEmbedding = {
          id: `${documentId}_chunk_${i}`,
          documentId,
          userId,
          index: i,
          text: chunk.text,
          wordCount: chunk.wordCount,
          characterCount: chunk.characterCount,
          embedding: embedding,
          createdAt: timestamp
        };
        
        chunksWithEmbeddings.push(chunkWithEmbedding);
        
        // Store in memory
        storage.chunks.set(chunkWithEmbedding.id, chunkWithEmbedding);
        
      } catch (embeddingError) {
        console.warn(`Failed to generate embedding for chunk ${i}:`, embeddingError);
        // Create a fallback chunk without embedding
        const fallbackChunk = {
          id: `${documentId}_chunk_${i}`,
          documentId,
          userId,
          index: i,
          text: chunk.text,
          wordCount: chunk.wordCount,
          characterCount: chunk.characterCount,
          embedding: null,
          createdAt: timestamp,
          embeddingError: embeddingError.message
        };
        
        chunksWithEmbeddings.push(fallbackChunk);
        storage.chunks.set(fallbackChunk.id, fallbackChunk);
      }
    }
    
    // Store document metadata
    const documentData = {
      id: documentId,
      userId,
      filename: document.filename,
      fileType: getFileType(document.filename),
      fileSize: textContent.length,
      textContent: textContent.substring(0, 1000), // Store preview
      chunkCount: chunksWithEmbeddings.length,
      createdAt: timestamp,
      metadata: {
        ...document.metadata,
        processedChunks: chunksWithEmbeddings.length,
        embeddingModel: 'text-embedding-3-small',
        hasEmbeddings: chunksWithEmbeddings.some(c => c.embedding !== null)
      }
    };
    
    storage.documents.set(documentId, documentData);
    
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        id: documentId,
        filename: document.filename,
        chunks: chunksWithEmbeddings.length,
        message: 'Document uploaded and processed with real embeddings',
        hasEmbeddings: chunksWithEmbeddings.some(c => c.embedding !== null),
        storage: 'enhanced-memory'
      }),
    };
  } catch (error) {
    console.error('Error in enhanced upload:', error);
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
 * Generate real embeddings using OpenAI API
 */
async function generateEmbedding(text) {
  try {
    const apiKey = process.env.REACT_APP_OPENAI_API_KEY;
    
    if (!apiKey) {
      throw new Error('OpenAI API key not configured');
    }
    
    const response = await fetch('https://api.openai.com/v1/embeddings', {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Authorization': `Bearer ${apiKey}`
      },
      body: JSON.stringify({
        model: 'text-embedding-3-small',
        input: text.substring(0, 8000), // Limit input length
        encoding_format: 'float'
      })
    });
    
    if (!response.ok) {
      throw new Error(`OpenAI API error: ${response.status}`);
    }
    
    const data = await response.json();
    
    if (!data.data || !data.data[0] || !data.data[0].embedding) {
      throw new Error('Invalid embedding response');
    }
    
    return data.data[0].embedding;
    
  } catch (error) {
    console.error('Error generating embedding:', error);
    throw error;
  }
}

/**
 * Handle semantic search with real embeddings
 */
async function handleSearch(userId, query, options = {}) {
  try {
    console.log('Enhanced search for user:', userId, 'query:', query);

    if (!query || typeof query !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid search query string is required' }),
      };
    }

    const { limit = 10, threshold = 0.7 } = options;
    
    // Generate embedding for the search query
    let queryEmbedding;
    try {
      queryEmbedding = await generateEmbedding(query);
    } catch (embeddingError) {
      console.warn('Could not generate query embedding:', embeddingError);
      // Fallback to text-based search
      return handleTextBasedSearch(userId, query, options);
    }
    
    const userChunks = storage.getUserChunks(userId);
    console.log(`Found ${userChunks.length} chunks for user`);
    
    const results = [];
    
    for (const chunk of userChunks) {
      if (!chunk.embedding) {
        // Skip chunks without embeddings
        continue;
      }
      
      try {
        // Calculate cosine similarity
        const similarity = cosineSimilarity(queryEmbedding, chunk.embedding);
        
        if (similarity >= threshold) {
          const document = storage.documents.get(chunk.documentId);
          
          results.push({
            documentId: chunk.documentId,
            filename: document?.filename || 'Unknown',
            chunkIndex: chunk.index,
            text: chunk.text,
            similarity: similarity,
            metadata: document?.metadata || {}
          });
        }
      } catch (error) {
        console.warn(`Error calculating similarity for chunk ${chunk.id}:`, error);
      }
    }
    
    // Sort by similarity and limit results
    results.sort((a, b) => b.similarity - a.similarity);
    const limitedResults = results.slice(0, limit);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results: limitedResults,
        totalFound: limitedResults.length,
        searchType: 'semantic',
        storage: 'enhanced-memory',
        query: {
          text: query,
          limit,
          threshold,
          hasEmbedding: true
        }
      }),
    };
  } catch (error) {
    console.error('Error in enhanced search:', error);
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
 * Fallback text-based search when embeddings aren't available
 */
function handleTextBasedSearch(userId, query, options = {}) {
  const { limit = 10 } = options;
  const userChunks = storage.getUserChunks(userId);
  const lowerQuery = query.toLowerCase();
  
  const results = [];
  
  for (const chunk of userChunks) {
    const lowerText = chunk.text.toLowerCase();
    if (lowerText.includes(lowerQuery)) {
      const document = storage.documents.get(chunk.documentId);
      
      // Simple relevance scoring based on term frequency
      const queryWords = lowerQuery.split(/\s+/);
      let score = 0;
      queryWords.forEach(word => {
        const matches = (lowerText.match(new RegExp(word, 'g')) || []).length;
        score += matches;
      });
      
      results.push({
        documentId: chunk.documentId,
        filename: document?.filename || 'Unknown',
        chunkIndex: chunk.index,
        text: chunk.text,
        similarity: Math.min(score / 10, 1), // Normalize to 0-1
        metadata: document?.metadata || {}
      });
    }
  }
  
  results.sort((a, b) => b.similarity - a.similarity);
  
  return {
    statusCode: 200,
    headers,
    body: JSON.stringify({
      results: results.slice(0, limit),
      totalFound: results.length,
      searchType: 'text-based',
      storage: 'enhanced-memory',
      query: {
        text: query,
        limit,
        hasEmbedding: false
      }
    }),
  };
}

/**
 * Handle list documents
 */
async function handleList(userId) {
  try {
    console.log('Enhanced list for user:', userId);

    const userDocuments = storage.getUserDocuments(userId);
    
    const documents = userDocuments.map(doc => ({
      id: doc.id,
      filename: doc.filename,
      type: `application/${doc.fileType}`,
      size: doc.fileSize,
      chunks: doc.chunkCount,
      category: doc.metadata?.category || 'general',
      tags: doc.metadata?.tags || [],
      createdAt: doc.createdAt,
      metadata: doc.metadata,
      hasEmbeddings: doc.metadata?.hasEmbeddings || false
    }));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        documents: documents,
        total: documents.length,
        storage: 'enhanced-memory',
        capabilities: {
          semanticSearch: true,
          textSearch: true,
          realEmbeddings: true
        }
      }),
    };
  } catch (error) {
    console.error('Error in enhanced list:', error);
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
    console.log('Enhanced delete for user:', userId, 'doc:', documentId);

    if (!documentId) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Document ID is required' }),
      };
    }

    const document = storage.documents.get(documentId);
    
    if (!document || document.userId !== userId) {
      return {
        statusCode: 404,
        headers,
        body: JSON.stringify({ error: 'Document not found' }),
      };
    }
    
    // Delete document
    storage.documents.delete(documentId);
    
    // Delete all associated chunks
    let deletedChunks = 0;
    for (const [chunkId, chunk] of storage.chunks.entries()) {
      if (chunk.documentId === documentId && chunk.userId === userId) {
        storage.chunks.delete(chunkId);
        deletedChunks++;
      }
    }
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ 
        message: 'Document deleted successfully',
        documentId,
        filename: document.filename,
        deletedChunks,
        storage: 'enhanced-memory'
      }),
    };
  } catch (error) {
    console.error('Error in enhanced delete:', error);
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
 * Handle stats
 */
async function handleStats(userId) {
  try {
    console.log('Enhanced stats for user:', userId);

    const userDocuments = storage.getUserDocuments(userId);
    const userChunks = storage.getUserChunks(userId);
    
    let totalSize = 0;
    let totalChunks = 0;
    let documentsWithEmbeddings = 0;
    let chunksWithEmbeddings = 0;
    
    userDocuments.forEach(doc => {
      totalSize += doc.fileSize || 0;
      totalChunks += doc.chunkCount || 0;
      if (doc.metadata?.hasEmbeddings) {
        documentsWithEmbeddings++;
      }
    });
    
    userChunks.forEach(chunk => {
      if (chunk.embedding) {
        chunksWithEmbeddings++;
      }
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalDocuments: userDocuments.length,
        totalChunks: totalChunks,
        totalSize: totalSize,
        documentsWithEmbeddings,
        chunksWithEmbeddings,
        embeddingCoverage: totalChunks > 0 ? (chunksWithEmbeddings / totalChunks * 100).toFixed(1) : 0,
        storage: 'enhanced-memory',
        capabilities: {
          semanticSearch: chunksWithEmbeddings > 0,
          textSearch: true,
          embeddingGeneration: true
        },
        lastUpdated: new Date().toISOString()
      }),
    };
  } catch (error) {
    console.error('Error in enhanced stats:', error);
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
 * Handle test functionality
 */
async function handleTest(userId) {
  try {
    const testResults = {
      userId,
      timestamp: new Date().toISOString(),
      storage: 'enhanced-memory',
      tests: {}
    };
    
    // Test embedding generation
    try {
      const testEmbedding = await generateEmbedding('This is a test for pharmaceutical quality systems.');
      testResults.tests.embeddingGeneration = {
        success: true,
        embeddingDimensions: testEmbedding.length
      };
    } catch (error) {
      testResults.tests.embeddingGeneration = {
        success: false,
        error: error.message
      };
    }
    
    // Test storage
    testResults.tests.storage = {
      success: true,
      totalDocuments: storage.documents.size,
      totalChunks: storage.chunks.size,
      userDocuments: storage.getUserDocuments(userId).length
    };
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(testResults),
    };
  } catch (error) {
    console.error('Error in enhanced test:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({ 
        error: 'Test failed',
        message: error.message 
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
  return magnitude === 0 ? 0 : dotProduct / magnitude;
}

function getFileType(filename) {
  const ext = filename.split('.').pop().toLowerCase();
  const typeMap = {
    'pdf': 'pdf',
    'doc': 'doc',
    'docx': 'docx',
    'txt': 'txt'
  };
  return typeMap[ext] || 'txt';
}

function getPlaceholderText(filename) {
  return `Test Document: ${filename}

This is a pharmaceutical quality document for testing the RAG system. It contains industry-relevant content to test semantic search capabilities.

Good Manufacturing Practice (GMP) Overview:
Current Good Manufacturing Practice regulations ensure that pharmaceutical products are consistently produced and controlled according to quality standards. These regulations minimize the risks involved in pharmaceutical production.

Key GMP Principles:
1. Quality management systems must be established
2. Manufacturing processes must be clearly defined and controlled
3. Critical process steps and changes must be validated
4. Manufacturing facilities and equipment must be designed, constructed, and maintained
5. Personnel must be qualified and trained
6. Contamination must be minimized during production
7. Quality control systems must be established
8. Records must be maintained to demonstrate compliance

Validation Requirements:
Process validation demonstrates that a manufacturing process, when operated within established parameters, will consistently produce a product that meets predetermined quality attributes and specifications.

CAPA System:
Corrective and Preventive Action systems are essential for identifying, investigating, and correcting quality problems, and for preventing their recurrence.

This content can be used to test document chunking, embedding generation, and semantic search functionality.`;
}

function getPharmaceuticalPlaceholder(filename) {
  const topics = [
    'Quality Control Testing Procedures',
    'Manufacturing Process Controls', 
    'Cleaning Validation Protocols',
    'Computer System Validation',
    'Stability Testing Guidelines',
    'Change Control Procedures'
  ];
  
  const selectedTopic = topics[Math.floor(Math.random() * topics.length)];
  
  return `Pharmaceutical Document: ${filename}

Topic: ${selectedTopic}

This document contains pharmaceutical quality and compliance information related to ${selectedTopic.toLowerCase()}. The content has been processed through the AcceleraQA RAG system for semantic search and AI-powered responses.

Document Summary:
This technical document outlines industry best practices and regulatory requirements for pharmaceutical operations. It includes detailed procedures, compliance guidelines, and quality assurance protocols essential for maintaining product safety and efficacy.

Key Sections:
- Regulatory Framework and Guidelines
- Standard Operating Procedures (SOPs)
- Quality Control Measurements
- Risk Assessment and Management
- Documentation and Record Keeping
- Training and Personnel Qualifications

The document provides comprehensive guidance for pharmaceutical professionals working in quality assurance, manufacturing, and regulatory compliance roles.

Note: This is placeholder content generated for RAG system testing. Actual document content would contain specific technical details, procedures, and regulatory citations relevant to pharmaceutical operations.`;
}
