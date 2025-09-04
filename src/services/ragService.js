// src/services/ragService.js - Debug version to test different endpoints
import openaiService from './openaiService';
import { getToken } from './authService';

const API_BASE_URL = '/.netlify/functions';

class RAGService {
  constructor() {
    this.apiUrl = `${API_BASE_URL}/rag-blob`;
    this.simpleUrl = `${API_BASE_URL}/rag-simple`;
    this.testUrl = `${API_BASE_URL}/test-simple`;
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
   * Test the RAG function connectivity with multiple endpoints
   */
  async testConnection() {
    try {
      console.log('Testing RAG function connectivity...');
      
      const tests = {};
      
      // Test 1: Simple test function (no imports)
      try {
        console.log('Testing simple function...');
        const simpleResponse = await fetch(this.testUrl, {
          method: 'GET'
        });
        
        if (simpleResponse.ok) {
          tests.simpleFunction = {
            success: true,
            data: await simpleResponse.json()
          };
        } else {
          tests.simpleFunction = {
            success: false,
            error: `HTTP ${simpleResponse.status}`
          };
        }
      } catch (error) {
        tests.simpleFunction = {
          success: false,
          error: error.message
        };
      }
      
      // Test 2: Simple RAG function (no blob imports)
      try {
        console.log('Testing simple RAG function...');
        const ragSimpleResult = await this.makeAuthenticatedRequest(this.simpleUrl, {
          action: 'list'
        });
        
        tests.simpleRAG = {
          success: true,
          data: ragSimpleResult
        };
      } catch (error) {
        tests.simpleRAG = {
          success: false,
          error: error.message
        };
      }
      
      // Test 3: Full RAG function (with blobs)
      try {
        console.log('Testing full RAG function...');
        const ragFullResult = await this.makeAuthenticatedRequest(this.apiUrl, {
          action: 'list'
        });
        
        tests.fullRAG = {
          success: true,
          data: ragFullResult
        };
      } catch (error) {
        tests.fullRAG = {
          success: false,
          error: error.message
        };
      }
      
      // Determine overall success
      const anySuccess = Object.values(tests).some(test => test.success);
      
      return {
        success: anySuccess,
        tests,
        recommendation: this.getRecommendation(tests)
      };
      
    } catch (error) {
      console.error('Connection test failed:', error);
      return {
        success: false,
        error: error.message,
        tests: {}
      };
    }
  }

  getRecommendation(tests) {
    if (tests.fullRAG?.success) {
      return 'All functions working! Use full RAG functionality.';
    } else if (tests.simpleRAG?.success) {
      return 'Simple RAG working. Issue with Netlify Blobs. Use mock storage for now.';
    } else if (tests.simpleFunction?.success) {
      return 'Basic functions working. Issue with RAG logic or authentication.';
    } else {
      return 'All functions failing. Check Netlify deployment and function logs.';
    }
  }

  /**
   * Upload document - tries different endpoints based on what's working
   */
  async uploadDocument(file, metadata = {}) {
    try {
      if (!file) {
        throw new Error('File is required');
      }

      console.log('Starting document upload process...');
      
      // Extract text from file
      const text = await this.extractTextFromFile(file);
      console.log('Text extracted, length:', text.length);
      
      // Chunk the text
      const chunks = this.chunkText(text);
      console.log('Text chunked into', chunks.length, 'chunks');
      
      // For testing, create simple chunks without embeddings first
      const simpleChunks = chunks.slice(0, 3).map(chunk => ({
        ...chunk,
        embedding: new Array(1536).fill(0.1) // Mock embedding
      }));
      
      console.log('Using simple chunks for testing:', simpleChunks.length);
      
      // Try simple RAG function first
      let result;
      try {
        result = await this.makeAuthenticatedRequest(this.simpleUrl, {
          action: 'upload',
          document: {
            filename: file.name,
            type: file.type,
            size: file.size,
            text: text.substring(0, 1000), // Limit for testing
            chunks: simpleChunks,
            metadata: {
              uploadedAt: new Date().toISOString(),
              processedChunks: simpleChunks.length,
              originalChunks: chunks.length,
              testMode: true,
              ...metadata
            }
          }
        });
        
        console.log('Upload successful with simple RAG function');
      } catch (simpleError) {
        console.warn('Simple RAG failed, trying full RAG:', simpleError);
        
        // Fallback to full RAG function
        result = await this.makeAuthenticatedRequest(this.apiUrl, {
          action: 'upload',
          document: {
            filename: file.name,
            type: file.type,
            size: file.size,
            text: text.substring(0, 1000),
            chunks: simpleChunks,
            metadata: {
              uploadedAt: new Date().toISOString(),
              processedChunks: simpleChunks.length,
              originalChunks: chunks.length,
              testMode: true,
              ...metadata
            }
          }
        });
      }

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
            // For non-text files, return a test placeholder
            const placeholder = `Test Document: ${file.name}

This is a test document for the RAG system. It contains sample pharmaceutical quality content to test the document upload and search functionality.

Key topics covered:
- Good Manufacturing Practice (GMP)
- Quality Control procedures
- Validation protocols
- CAPA systems
- Regulatory compliance

This content can be used to test semantic search and retrieval functionality in the RAG system.`;
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
   * Get list of uploaded documents
   */
  async getDocuments() {
    try {
      console.log('Getting document list...');
      
      // Try simple RAG first
      let result;
      try {
        result = await this.makeAuthenticatedRequest(this.simpleUrl, {
          action: 'list'
        });
      } catch (simpleError) {
        console.warn('Simple RAG failed, trying full RAG:', simpleError);
        result = await this.makeAuthenticatedRequest(this.apiUrl, {
          action: 'list'
        });
      }
      
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
      
      // Try simple RAG first
      let result;
      try {
        result = await this.makeAuthenticatedRequest(this.simpleUrl, {
          action: 'delete',
          documentId
        });
      } catch (simpleError) {
        console.warn('Simple RAG failed, trying full RAG:', simpleError);
        result = await this.makeAuthenticatedRequest(this.apiUrl, {
          action: 'delete',
          documentId
        });
      }
      
      return result;

    } catch (error) {
      console.error('Error deleting document:', error);
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

      console.log('Searching documents for:', query);
      
      // For testing, create a mock embedding
      const mockEmbedding = new Array(1536).fill(0).map(() => Math.random() * 0.1);
      
      // Try simple RAG first
      let result;
      try {
        result = await this.makeAuthenticatedRequest(this.simpleUrl, {
          action: 'search',
          query: mockEmbedding,
          options: {
            limit: options.limit || 10,
            threshold: options.threshold || 0.7
          }
        });
      } catch (simpleError) {
        console.warn('Simple RAG search failed, trying full RAG:', simpleError);
        result = await this.makeAuthenticatedRequest(this.apiUrl, {
          action: 'search',
          query: mockEmbedding,
          options: {
            limit: options.limit || 10,
            threshold: options.threshold || 0.7
          }
        });
      }
      
      return result;

    } catch (error) {
      console.error('Error searching documents:', error);
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

Use the following document context to answer the user's question:

DOCUMENT CONTEXT:
${context.substring(0, 10000)} ${context.length > 10000 ? '...[truncated]' : ''}

USER QUESTION: ${query}

Provide a comprehensive answer referencing the document content where relevant.`;

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
