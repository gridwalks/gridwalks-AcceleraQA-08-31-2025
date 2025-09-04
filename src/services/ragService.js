// src/services/ragService.js
import openaiService from './openaiService';
import { getToken } from './authService';

const API_BASE_URL = '/.netlify/functions';

class RAGService {
  constructor() {
    this.apiUrl = `${API_BASE_URL}/rag`;
    this.embeddingModel = 'text-embedding-3-small';
    this.maxChunkSize = 1000;
    this.chunkOverlap = 200;
  }

  /**
   * Upload and process a document for RAG search
   * @param {File} file - Document file to upload
   * @param {Object} metadata - Document metadata
   * @returns {Promise<Object>} - Upload result
   */
  async uploadDocument(file, metadata = {}) {
    try {
      // Validate file
      if (!file) {
        throw new Error('File is required');
      }

      const allowedTypes = [
        'application/pdf',
        'text/plain',
        'application/msword',
        'application/vnd.openxmlformats-officedocument.wordprocessingml.document'
      ];

      if (!allowedTypes.includes(file.type)) {
        throw new Error('Unsupported file type. Please upload PDF, DOC, DOCX, or TXT files.');
      }

      if (file.size > 10 * 1024 * 1024) { // 10MB limit
        throw new Error('File size must be less than 10MB');
      }

      // Extract text from file
      const text = await this.extractTextFromFile(file);
      
      // Chunk the text
      const chunks = this.chunkText(text);
      
      // Generate embeddings for chunks
      const chunksWithEmbeddings = await this.generateEmbeddings(chunks);
      
      // Save to server
      const result = await this.saveDocument({
        filename: file.name,
        type: file.type,
        size: file.size,
        text,
        chunks: chunksWithEmbeddings,
        metadata: {
          uploadedAt: new Date().toISOString(),
          processedChunks: chunksWithEmbeddings.length,
          ...metadata
        }
      });

      return result;

    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Extract text from different file types
   * @param {File} file - File to extract text from
   * @returns {Promise<string>} - Extracted text
   */
  async extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = async (e) => {
        try {
          const arrayBuffer = e.target.result;
          let text = '';

          if (file.type === 'text/plain') {
            text = new TextDecoder().decode(arrayBuffer);
          } else if (file.type === 'application/pdf') {
            // For PDF, we'll need to use a library like PDF.js
            text = await this.extractPdfText(arrayBuffer);
          } else if (file.type.includes('word')) {
            // For Word docs, we'll need mammoth.js (already in dependencies)
            text = await this.extractWordText(arrayBuffer);
          }

          if (!text.trim()) {
            throw new Error('No text could be extracted from the file');
          }

          resolve(text);
        } catch (error) {
          reject(new Error(`Failed to extract text: ${error.message}`));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      reader.readAsArrayBuffer(file);
    });
  }

  /**
   * Extract text from PDF using PDF.js (simplified version)
   * @param {ArrayBuffer} arrayBuffer - PDF file buffer
   * @returns {Promise<string>} - Extracted text
   */
  async extractPdfText(arrayBuffer) {
    // This is a placeholder - in production you'd use PDF.js
    // For now, return a message indicating PDF processing is needed
    throw new Error('PDF processing requires additional setup. Please convert to text format.');
  }

  /**
   * Extract text from Word document using mammoth.js
   * @param {ArrayBuffer} arrayBuffer - Word document buffer
   * @returns {Promise<string>} - Extracted text
   */
  async extractWordText(arrayBuffer) {
    try {
      // Import mammoth dynamically
      const mammoth = await import('mammoth');
      const result = await mammoth.extractRawText({ arrayBuffer });
      return result.value;
    } catch (error) {
      throw new Error('Failed to extract text from Word document');
    }
  }

  /**
   * Split text into chunks for better search performance
   * @param {string} text - Text to chunk
   * @returns {Array<Object>} - Text chunks with metadata
   */
  chunkText(text) {
    const chunks = [];
    const sentences = text.split(/[.!?]+/).filter(s => s.trim().length > 0);
    
    let currentChunk = '';
    let chunkIndex = 0;

    for (const sentence of sentences) {
      const sentenceText = sentence.trim() + '.';
      
      // If adding this sentence would exceed max chunk size, save current chunk
      if (currentChunk.length + sentenceText.length > this.maxChunkSize && currentChunk.length > 0) {
        chunks.push({
          index: chunkIndex++,
          text: currentChunk.trim(),
          wordCount: currentChunk.split(' ').length,
          characterCount: currentChunk.length
        });
        
        // Start new chunk with overlap
        const overlapText = this.getOverlapText(currentChunk, this.chunkOverlap);
        currentChunk = overlapText + sentenceText;
      } else {
        currentChunk += ' ' + sentenceText;
      }
    }

    // Add the last chunk if it has content
    if (currentChunk.trim().length > 0) {
      chunks.push({
        index: chunkIndex,
        text: currentChunk.trim(),
        wordCount: currentChunk.split(' ').length,
        characterCount: currentChunk.length
      });
    }

    return chunks;
  }

  /**
   * Get overlap text from the end of a chunk
   * @param {string} text - Source text
   * @param {number} overlapSize - Number of characters to overlap
   * @returns {string} - Overlap text
   */
  getOverlapText(text, overlapSize) {
    if (text.length <= overlapSize) return text;
    
    // Find the last complete sentence within the overlap size
    const overlapText = text.slice(-overlapSize);
    const lastPeriod = overlapText.lastIndexOf('.');
    
    if (lastPeriod > 0) {
      return overlapText.slice(lastPeriod + 1).trim();
    }
    
    return overlapText;
  }

  /**
   * Generate embeddings for text chunks using OpenAI
   * @param {Array<Object>} chunks - Text chunks
   * @returns {Promise<Array<Object>>} - Chunks with embeddings
   */
  async generateEmbeddings(chunks) {
    console.log(`Generating embeddings for ${chunks.length} chunks...`);
    
    const chunksWithEmbeddings = [];

    // Process chunks in batches to avoid rate limits
    const batchSize = 10;
    for (let i = 0; i < chunks.length; i += batchSize) {
      const batch = chunks.slice(i, i + batchSize);
      
      try {
        const batchResults = await Promise.all(
          batch.map(chunk => this.generateSingleEmbedding(chunk))
        );
        
        chunksWithEmbeddings.push(...batchResults);
        
        // Small delay between batches to respect rate limits
        if (i + batchSize < chunks.length) {
          await new Promise(resolve => setTimeout(resolve, 100));
        }
        
      } catch (error) {
        console.error(`Error processing batch ${i / batchSize + 1}:`, error);
        throw error;
      }
    }

    return chunksWithEmbeddings;
  }

  /**
   * Generate embedding for a single chunk
   * @param {Object} chunk - Text chunk
   * @returns {Promise<Object>} - Chunk with embedding
   */
  async generateSingleEmbedding(chunk) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: chunk.text
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      
      return {
        ...chunk,
        embedding: data.data[0].embedding
      };
      
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw new Error(`Failed to generate embedding for chunk ${chunk.index}`);
    }
  }

  /**
   * Save document to server
   * @param {Object} documentData - Document data with embeddings
   * @returns {Promise<Object>} - Save result
   */
  async saveDocument(documentData) {
    try {
      const token = await getToken();
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          action: 'upload',
          document: documentData
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Document saved successfully:', result);
      
      return result;

    } catch (error) {
      console.error('Error saving document:', error);
      throw error;
    }
  }

  /**
   * Search documents using semantic similarity
   * @param {string} query - Search query
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Search results
   */
  async searchDocuments(query, options = {}) {
    try {
      if (!query || !query.trim()) {
        throw new Error('Search query is required');
      }

      // Generate embedding for the query
      const queryEmbedding = await this.generateQueryEmbedding(query);
      
      // Search documents on server
      const searchResults = await this.performSearch(queryEmbedding, options);
      
      return searchResults;

    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for search query
   * @param {string} query - Search query
   * @returns {Promise<Array<number>>} - Query embedding
   */
  async generateQueryEmbedding(query) {
    try {
      const response = await fetch('https://api.openai.com/v1/embeddings', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${process.env.REACT_APP_OPENAI_API_KEY}`
        },
        body: JSON.stringify({
          model: this.embeddingModel,
          input: query
        })
      });

      if (!response.ok) {
        throw new Error(`OpenAI API error: ${response.status}`);
      }

      const data = await response.json();
      return data.data[0].embedding;

    } catch (error) {
      console.error('Error generating query embedding:', error);
      throw error;
    }
  }

  /**
   * Perform search on server
   * @param {Array<number>} queryEmbedding - Query embedding
   * @param {Object} options - Search options
   * @returns {Promise<Object>} - Search results
   */
  async performSearch(queryEmbedding, options) {
    try {
      const token = await getToken();
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          action: 'search',
          query: queryEmbedding,
          options: {
            limit: options.limit || 10,
            threshold: options.threshold || 0.7,
            documentIds: options.documentIds || null
          }
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const results = await response.json();
      return results;

    } catch (error) {
      console.error('Error performing search:', error);
      throw error;
    }
  }

  /**
   * Get list of uploaded documents
   * @returns {Promise<Array>} - List of documents
   */
  async getDocuments() {
    try {
      const token = await getToken();
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          action: 'list'
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const data = await response.json();
      return data.documents || [];

    } catch (error) {
      console.error('Error getting documents:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   * @param {string} documentId - Document ID to delete
   * @returns {Promise<Object>} - Delete result
   */
  async deleteDocument(documentId) {
    try {
      const token = await getToken();
      
      const response = await fetch(this.apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': token ? `Bearer ${token}` : ''
        },
        body: JSON.stringify({
          action: 'delete',
          documentId
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      return result;

    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Generate AI response using RAG context
   * @param {string} query - User query
   * @param {Array} searchResults - Relevant document chunks
   * @returns {Promise<string>} - AI response with context
   */
  async generateRAGResponse(query, searchResults) {
    try {
      if (!searchResults || searchResults.length === 0) {
        return await openaiService.getChatResponse(query);
      }

      // Create context from search results
      const context = searchResults
        .map((result, index) => 
          `[Document: ${result.filename}]\n${result.text}\n`
        )
        .join('\n---\n');

      // Enhanced prompt with context
      const ragPrompt = `You are AcceleraQA, an AI assistant specialized in pharmaceutical quality and compliance. 

Use the following document context to answer the user's question. If the context contains relevant information, prioritize it in your response. If the context doesn't fully address the question, supplement with your general knowledge but clearly indicate what comes from the provided documents vs. your general knowledge.

DOCUMENT CONTEXT:
${context}

USER QUESTION: ${query}

Provide a comprehensive answer that:
1. Directly addresses the user's question
2. References specific information from the provided documents when relevant
3. Includes document names when citing information
4. Supplements with general pharmaceutical quality knowledge when needed
5. Maintains focus on practical implementation and current best practices`;

      const response = await openaiService.getChatResponse(ragPrompt);
      
      // Add source attribution
      const sourceDocs = [...new Set(searchResults.map(r => r.filename))];
      const sourceAttribution = sourceDocs.length > 0 ? 
        `\n\n📄 **Sources Referenced:**\n${sourceDocs.map(doc => `• ${doc}`).join('\n')}` : '';

      return {
        ...response,
        answer: response.answer + sourceAttribution,
        sources: searchResults
      };

    } catch (error) {
      console.error('Error generating RAG response:', error);
      throw error;
    }
  }
}

// Create singleton instance
const ragService = new RAGService();

export default ragService;

// Export convenience functions
export const uploadDocument = (file, metadata) => ragService.uploadDocument(file, metadata);
export const searchDocuments = (query, options) => ragService.searchDocuments(query, options);
export const getDocuments = () => ragService.getDocuments();
export const deleteDocument = (documentId) => ragService.deleteDocument(documentId);
export const generateRAGResponse = (query, searchResults) => ragService.generateRAGResponse(query, searchResults);
