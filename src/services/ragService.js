// src/services/ragService.js - Improved version with better error handling
import openaiService from './openaiService';
import { getToken } from './authService';

const API_BASE_URL = '/.netlify/functions';

class RAGService {
  constructor() {
    this.apiUrl = `${API_BASE_URL}/rag-blob`;
    this.testUrl = `${API_BASE_URL}/rag-test`;
    this.embeddingModel = 'text-embedding-3-small';
    this.maxChunkSize = 1000;
    this.chunkOverlap = 200;
  }

  async makeAuthenticatedRequest(endpoint, data = {}) {
    try {
      const token = await getToken();
      
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        headers['Authorization'] = `Bearer ${token}`;
        // Add user ID for blob functions
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            const payload = JSON.parse(atob(tokenParts[1]));
            if (payload.sub) {
              headers['x-user-id'] = payload.sub;
            }
          }
        } catch (parseError) {
          console.warn('Could not parse token for user ID:', parseError);
        }
      }

      console.log('Making request to:', endpoint);
      console.log('Request data:', data);

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      console.log('Response status:', response.status);

      if (!response.ok) {
        let errorData;
        try {
          errorData = await response.json();
        } catch {
          errorData = { error: `HTTP ${response.status}: ${response.statusText}` };
        }
        throw new Error(errorData.error || `Server error: ${response.status}`);
      }

      const result = await response.json();
      console.log('Response received:', result);
      return result;

    } catch (error) {
      console.error('RAG API request failed:', error);
      throw error;
    }
  }

  /**
   * Test the RAG function connectivity
   */
  async testConnection() {
    try {
      console.log('Testing RAG function connectivity...');
      
      // First test GET request
      const getResponse = await fetch(this.testUrl, {
        method: 'GET'
      });
      
      if (!getResponse.ok) {
        throw new Error(`GET test failed: ${getResponse.status}`);
      }
      
      const getResult = await getResponse.json();
      console.log('GET test result:', getResult);
      
      // Then test POST request
      const postResult = await this.makeAuthenticatedRequest(this.testUrl, {
        test: 'connection',
        timestamp: new Date().toISOString()
      });
      
      console.log('POST test result:', postResult);
      
      return {
        success: true,
        getTest: getResult,
        postTest: postResult
      };
      
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        error: error.message
      };
    }
  }

  /**
   * Upload and process a document for RAG search
   */
  async uploadDocument(file, metadata = {}) {
    try {
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

      if (file.size > 10 * 1024 * 1024) {
        throw new Error('File size must be less than 10MB');
      }

      console.log('Starting document upload process...');
      
      // Extract text from file
      const text = await this.extractTextFromFile(file);
      console.log('Text extracted, length:', text.length);
      
      // Chunk the text
      const chunks = this.chunkText(text);
      console.log('Text chunked into', chunks.length, 'chunks');
      
      // Generate embeddings for chunks (limit to first 5 for testing)
      const limitedChunks = chunks.slice(0, Math.min(chunks.length, 5));
      const chunksWithEmbeddings = await this.generateEmbeddings(limitedChunks);
      console.log('Embeddings generated for', chunksWithEmbeddings.length, 'chunks');
      
      // Save to server
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'upload',
        document: {
          filename: file.name,
          type: file.type,
          size: file.size,
          text: text.substring(0, 10000), // Limit text size for testing
          chunks: chunksWithEmbeddings,
          metadata: {
            uploadedAt: new Date().toISOString(),
            processedChunks: chunksWithEmbeddings.length,
            originalChunks: chunks.length,
            ...metadata
          }
        }
      });

      return result;

    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Extract text from file - simplified for testing
   */
  async extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
      const reader = new FileReader();
      
      reader.onload = (e) => {
        try {
          if (file.type === 'text/plain') {
            resolve(e.target.result);
          } else {
            // For non-text files, return a placeholder for testing
            const placeholder = `This is a test document: ${file.name}\n\nThis would normally contain the extracted text from the ${file.type} file. For testing purposes, we're using this placeholder text to verify that the upload process works correctly.\n\nThe file was uploaded on ${new Date().toISOString()} and has a size of ${file.size} bytes.`;
            resolve(placeholder);
          }
        } catch (error) {
          reject(new Error(`Failed to extract text: ${error.message}`));
        }
      };

      reader.onerror = () => reject(new Error('Failed to read file'));
      
      reader.readAsText(file);
    });
  }

  /**
   * Split text into chunks for better search performance
   */
  chunkText(text) {
    const chunks = [];
    
    // Simple chunking by character count for testing
    const chunkSize = this.maxChunkSize;
    
    for (let i = 0; i < text.length; i += chunkSize) {
      const chunkText = text.substring(i, i + chunkSize);
      
      chunks.push({
        index: chunks.length,
        text: chunkText,
        wordCount: chunkText.split(' ').length,
        characterCount: chunkText.length
      });
    }

    return chunks;
  }

  /**
   * Generate embeddings for text chunks using OpenAI
   */
  async generateEmbeddings(chunks) {
    console.log(`Generating embeddings for ${chunks.length} chunks...`);
    
    const chunksWithEmbeddings = [];
    
    for (let i = 0; i < chunks.length; i++) {
      const chunk = chunks[i];
      
      try {
        console.log(`Processing chunk ${i + 1}/${chunks.length}`);
        const embeddedChunk = await this.generateSingleEmbedding(chunk);
        chunksWithEmbeddings.push(embeddedChunk);
        
        // Add delay to avoid rate limiting
        if (i < chunks.length - 1) {
          await new Promise(resolve => setTimeout(resolve, 200));
        }
        
      } catch (error) {
        console.error(`Error processing chunk ${i}:`, error);
        
        // Add chunk without embedding as fallback
        chunksWithEmbeddings.push({
          ...chunk,
          embedding: new Array(1536).fill(0) // Fallback empty embedding
        });
      }
    }

    return chunksWithEmbeddings;
  }

  /**
   * Generate embedding for a single chunk
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
          input: chunk.text.substring(0, 8000) // Limit input size
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      
      return {
        ...chunk,
        embedding: data.data[0].embedding
      };
      
    } catch (error) {
      console.error('Error generating embedding:', error);
      throw error;
    }
  }

  /**
   * Search documents using semantic similarity
   */
  async searchDocuments(query, options = {}) {
    try {
      if (!query || !query.trim()) {
        throw new Error('Search query is required');
      }

      console.log('Generating query embedding...');
      const queryEmbedding = await this.generateQueryEmbedding(query);
      
      console.log('Searching documents...');
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'search',
        query: queryEmbedding,
        options: {
          limit: options.limit || 10,
          threshold: options.threshold || 0.7,
          documentIds: options.documentIds || null
        }
      });
      
      return result;

    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  /**
   * Generate embedding for search query
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
          input: query.substring(0, 8000) // Limit input size
        })
      });

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}));
        throw new Error(`OpenAI API error: ${response.status} - ${errorData.error?.message || 'Unknown error'}`);
      }

      const data = await response.json();
      return data.data[0].embedding;

    } catch (error) {
      console.error('Error generating query embedding:', error);
      throw error;
    }
  }

  /**
   * Get list of uploaded documents
   */
  async getDocuments() {
    try {
      console.log('Getting document list...');
      
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'list'
      });
      
      return result.documents || [];

    } catch (error) {
      console.error('Error getting documents:', error);
      throw error;
    }
  }

  /**
   * Delete a document
   */
  async deleteDocument(documentId) {
    try {
      console.log('Deleting document:', documentId);
      
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'delete',
        documentId
      });
      
      return result;

    } catch (error) {
      console.error('Error deleting document:', error);
      throw error;
    }
  }

  /**
   * Get user statistics
   */
  async getUserStats() {
    try {
      console.log('Getting user stats...');
      
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'stats'
      });
      
      return result;

    } catch (error) {
      console.error('Error getting stats:', error);
      throw error;
    }
  }

  /**
   * Generate AI response using RAG context
   */
  async generateRAGResponse(query, searchResults) {
    try {
      if (!searchResults || searchResults.length === 0) {
        return await openaiService.getChatResponse(query);
      }

      const context = searchResults
        .map((result, index) => 
          `[Document: ${result.filename}]\n${result.text}\n`
        )
        .join('\n---\n');

      const ragPrompt = `You are AcceleraQA, an AI assistant specialized in pharmaceutical quality and compliance. 

Use the following document context to answer the user's question. If the context contains relevant information, prioritize it in your response. If the context doesn't fully address the question, supplement with your general knowledge but clearly indicate what comes from the provided documents vs. your general knowledge.

DOCUMENT CONTEXT:
${context.substring(0, 15000)} ${context.length > 15000 ? '...[truncated]' : ''}

USER QUESTION: ${query}

Provide a comprehensive answer that:
1. Directly addresses the user's question
2. References specific information from the provided documents when relevant
3. Includes document names when citing information
4. Supplements with general pharmaceutical quality knowledge when needed
5. Maintains focus on practical implementation and current best practices`;

      const response = await openaiService.getChatResponse(ragPrompt);
      
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
export const testConnection = () => ragService.testConnection();
