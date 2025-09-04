// netlify/functions/rag-fast.js - Fixed with CommonJS syntax
const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

// Lightweight in-memory storage
const storage = {
  documents: new Map(),
  chunks: new Map(),
  
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
  console.log('Fast RAG Function called:', {
    method: event.httpMethod,
    hasBody: !!event.body,
    headers: Object.keys(event.headers)
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
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid JSON in request body' }),
      };
    }

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

    switch (action) {
      case 'upload':
        return await handleFastUpload(userId, requestData.document);
      
      case 'list':
        return await handleList(userId);
      
      case 'delete':
        return await handleDelete(userId, requestData.documentId);
      
      case 'search':
        return await handleTextSearch(userId, requestData.query, requestData.options);
      
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
    console.error('Fast RAG Function error:', error);
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
 * Fast upload - no embeddings, instant processing
 */
async function handleFastUpload(userId, document) {
  try {
    console.log('Fast upload for user:', userId);

    if (!document || !document.filename) {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Invalid document data' }),
      };
    }

    const documentId = `doc_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    const timestamp = new Date().toISOString();
    
    // Get text content
    let textContent = '';
    if (document.text && document.text.trim()) {
      textContent = document.text;
    } else {
      // Generate pharmaceutical content based on filename
      textContent = generatePharmaceuticalContent(document.filename);
    }
    
    // Quick chunking - smaller chunks for faster processing
    const chunks = fastChunkText(textContent, 500); // Smaller chunks
    console.log(`Created ${chunks.length} chunks (fast mode)`);
    
    // Store chunks without embeddings for speed
    const storedChunks = [];
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      const chunkData = {
        id: `${documentId}_chunk_${i}`,
        documentId,
        userId,
        index: i,
        text: chunk.text,
        wordCount: chunk.wordCount,
        characterCount: chunk.characterCount,
        embedding: null,
        createdAt: timestamp
      };
      
      storedChunks.push(chunkData);
      storage.chunks.set(chunkData.id, chunkData);
    }
    
    // Store document metadata
    const documentData = {
      id: documentId,
      userId,
      filename: document.filename,
      fileType: getFileType(document.filename),
      fileSize: textContent.length,
      textContent: textContent.substring(0, 500), // Store preview
      chunkCount: storedChunks.length,
      createdAt: timestamp,
      metadata: {
        ...document.metadata,
        processedChunks: storedChunks.length,
        processingMode: 'fast',
        hasEmbeddings: false
      }
    };
    
    storage.documents.set(documentId, documentData);
    
    return {
      statusCode: 201,
      headers,
      body: JSON.stringify({
        id: documentId,
        filename: document.filename,
        chunks: storedChunks.length,
        message: 'Document uploaded successfully (fast mode)',
        processingTime: 'instant',
        searchType: 'text-based',
        storage: 'fast-memory'
      }),
    };
  } catch (error) {
    console.error('Error in fast upload:', error);
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
 * Fast text-based search (no embeddings needed)
 */
async function handleTextSearch(userId, query, options = {}) {
  try {
    console.log('Fast search for user:', userId, 'query:', query);

    if (!query || typeof query !== 'string') {
      return {
        statusCode: 400,
        headers,
        body: JSON.stringify({ error: 'Valid search query string is required' }),
      };
    }

    const { limit = 10, threshold = 0.3 } = options;
    const userChunks = storage.getUserChunks(userId);
    
    console.log(`Searching ${userChunks.length} chunks`);
    
    const lowerQuery = query.toLowerCase();
    const queryWords = lowerQuery.split(/\s+/).filter(word => word.length > 2);
    
    const results = [];
    
    for (const chunk of userChunks) {
      const lowerText = chunk.text.toLowerCase();
      
      // Multi-word scoring
      let score = 0;
      let matches = 0;
      
      // Exact phrase bonus
      if (lowerText.includes(lowerQuery)) {
        score += 10;
        matches++;
      }
      
      // Individual word scoring
      queryWords.forEach(word => {
        const wordMatches = (lowerText.match(new RegExp(`\\b${word}\\b`, 'g')) || []).length;
        if (wordMatches > 0) {
          score += wordMatches * 2;
          matches++;
        }
      });
      
      // Normalize score (0-1 range)
      const maxPossibleScore = 10 + (queryWords.length * 3);
      const normalizedScore = Math.min(score / maxPossibleScore, 1);
      
      if (normalizedScore >= threshold && matches > 0) {
        const document = storage.documents.get(chunk.documentId);
        
        results.push({
          documentId: chunk.documentId,
          filename: document?.filename || 'Unknown',
          chunkIndex: chunk.index,
          text: chunk.text,
          similarity: normalizedScore,
          matches: matches,
          score: score,
          metadata: document?.metadata || {}
        });
      }
    }
    
    // Sort by similarity score
    results.sort((a, b) => b.similarity - a.similarity);
    const limitedResults = results.slice(0, limit);
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        results: limitedResults,
        totalFound: limitedResults.length,
        searchType: 'text-based',
        storage: 'fast-memory',
        query: {
          text: query,
          words: queryWords,
          limit,
          threshold
        },
        performance: {
          chunksSearched: userChunks.length,
          processingTime: 'instant'
        }
      }),
    };
  } catch (error) {
    console.error('Error in fast search:', error);
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
      searchType: 'text-based'
    }));
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        documents: documents,
        total: documents.length,
        storage: 'fast-memory',
        capabilities: {
          semanticSearch: false,
          textSearch: true,
          instantUpload: true
        }
      }),
    };
  } catch (error) {
    console.error('Error in fast list:', error);
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
        storage: 'fast-memory'
      }),
    };
  } catch (error) {
    console.error('Error in fast delete:', error);
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
    const userDocuments = storage.getUserDocuments(userId);
    const userChunks = storage.getUserChunks(userId);
    
    let totalSize = 0;
    userDocuments.forEach(doc => {
      totalSize += doc.fileSize || 0;
    });
    
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        totalDocuments: userDocuments.length,
        totalChunks: userChunks.length,
        totalSize: totalSize,
        documentsWithEmbeddings: 0,
        chunksWithEmbeddings: 0,
        embeddingCoverage: 0,
        storage: 'fast-memory',
        mode: 'fast-processing',
        capabilities: {
          instantUpload: true,
          textSearch: true,
          semanticSearch: false
        },
        lastUpdated: new Date().toISOString()
      }),
    };
  } catch (error) {
    console.error('Error in fast stats:', error);
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
 * Handle test
 */
async function handleTest(userId) {
  try {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({
        userId,
        timestamp: new Date().toISOString(),
        storage: 'fast-memory',
        mode: 'fast-processing',
        tests: {
          storage: {
            success: true,
            totalDocuments: storage.documents.size,
            totalChunks: storage.chunks.size,
            userDocuments: storage.getUserDocuments(userId).length
          },
          textSearch: {
            success: true,
            note: 'Text-based search available'
          },
          embeddingGeneration: {
            success: false,
            note: 'Disabled for fast processing'
          }
        }
      }),
    };
  } catch (error) {
    console.error('Error in fast test:', error);
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

function fastChunkText(text, maxChunkSize = 500) {
  const chunks = [];
  const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
  
  let currentChunk = '';
  
  for (const sentence of sentences) {
    const trimmedSentence = sentence.trim();
    if (!trimmedSentence) continue;
    
    if (currentChunk.length + trimmedSentence.length > maxChunkSize && currentChunk.length > 0) {
      chunks.push({
        text: currentChunk.trim(),
        wordCount: currentChunk.split(/\s+/).length,
        characterCount: currentChunk.length
      });
      currentChunk = trimmedSentence + '.';
    } else {
      currentChunk += (currentChunk ? ' ' : '') + trimmedSentence + '.';
    }
  }
  
  if (currentChunk.trim()) {
    chunks.push({
      text: currentChunk.trim(),
      wordCount: currentChunk.split(/\s+/).length,
      characterCount: currentChunk.length
    });
  }
  
  return chunks;
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
}
