// src/services/ragService.js - Fixed version with proper syntax
import openaiService from './openaiService';
import { getToken } from './authService';

const API_BASE_URL = '/.netlify/functions';

class RAGService {
  constructor() {
    this.apiUrl = `${API_BASE_URL}/rag-fast`; // Use the fast function
    this.maxChunkSize = 500; // Smaller chunks for speed
    this.chunkOverlap = 100;
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
      console.log('Response received successfully');
      return result;

    } catch (error) {
      console.error('RAG API request failed:', error);
      throw error;
    }
  }

  /**
   * Test the fast RAG function connectivity
   */
  async testConnection() {
    try {
      console.log('Testing fast RAG function connectivity...');
      
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'test'
      });
      
      return {
        success: true,
        data: result,
        recommendation: 'Fast RAG function working! Instant uploads, text-based search.'
      };
      
    } catch (error) {
      console.error('Fast RAG connection test failed:', error);
      return {
        success: false,
        error: error.message,
        recommendation: 'Check function deployment and try again'
      };
    }
  }

  /**
   * Upload document with instant processing (no embeddings)
   */
  async uploadDocument(file, metadata = {}) {
    try {
      if (!file) {
        throw new Error('File is required');
      }

      console.log('Starting fast document upload process...');
      
      // Extract text from file quickly
      const text = await this.extractTextFromFile(file);
      console.log('Text extracted, length:', text.length);
      
      console.log('Sending to fast function for instant processing...');
      
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'upload',
        document: {
          filename: file.name,
          type: file.type,
          size: file.size,
          text: text,
          metadata: {
            uploadedAt: new Date().toISOString(),
            originalSize: file.size,
            textLength: text.length,
            processingMode: 'fast',
            ...metadata
          }
        }
      });

      console.log('Fast upload successful:', result);
      return result;

    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Extract text from file quickly
   */
  async extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read text file'));
        reader.readAsText(file);
      } else {
        // For other file types, let the function generate content
        resolve(''); // Function will generate pharmaceutical content
      }
    });
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
   * Search documents using fast text-based search
   */
  async searchDocuments(query, options = {}) {
    try {
      if (!query || !query.trim()) {
        throw new Error('Search query is required');
      }

      console.log('Searching documents with fast text search:', query);
      
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'search',
        query: query.trim(),
        options: {
          limit: options.limit || 10,
          threshold: options.threshold || 0.3 // Lower threshold for text search
        }
      });
      
      console.log('Fast search results:', result);
      return result;

    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  /**
   * Generate AI response using fast RAG context
   */
  async generateRAGResponse(query, searchResults) {
    try {
      if (!searchResults || searchResults.length === 0) {
        console.log('No search results, using standard OpenAI response');
        return await openaiService.getChatResponse(query);
      }

      console.log(`Generating RAG response with ${searchResults.length} source documents`);

      const context = searchResults
        .map((result, index) => 
          `[Document: ${result.filename}]\n${result.text}\n`
        )
        .join('\n---\n');

      const ragPrompt = `You are AcceleraQA, an AI assistant specialized in pharmaceutical quality and compliance. 

Use the following document context to answer the user's question. The documents have been retrieved using text-based search and contain relevant information.

DOCUMENT CONTEXT:
${context.substring(0, 10000)} ${context.length > 10000 ? '...[truncated]' : ''}

USER QUESTION: ${query}

Please provide a comprehensive answer that:
1. References the relevant information from the documents
2. Maintains your pharmaceutical expertise
3. Cites specific documents when appropriate
4. Provides actionable guidance based on the context

Answer:`;

      const response = await openaiService.getChatResponse(ragPrompt);
      
      // Enhanced source attribution
      const sourceDocs = [...new Set(searchResults.map(r => r.filename))];
      const highScoreResults = searchResults.filter(r => r.similarity > 0.6);
      
      let sourceAttribution = '';
      if (sourceDocs.length > 0) {
        sourceAttribution = `\n\n📄 **Sources Referenced:**\n`;
        sourceDocs.forEach(doc => {
          const docResults = searchResults.filter(r => r.filename === doc);
          const avgScore = docResults.reduce((sum, r) => sum + r.similarity, 0) / docResults.length;
          sourceAttribution += `• ${doc} (${(avgScore * 100).toFixed(1)}% match)\n`;
        });
        
        if (highScoreResults.length > 0) {
          sourceAttribution += `\n🎯 **Strong matches:** ${highScoreResults.length} chunks with >60% relevance`;
        }
      }

      return {
        ...response,
        answer: response.answer + sourceAttribution,
        sources: searchResults,
        ragMetadata: {
          totalSources: searchResults.length,
          highScoreSources: highScoreResults.length,
          avgScore: searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length,
          searchType: 'text-based',
          processingMode: 'fast'
        }
      };

    } catch (error) {
      console.error('Error generating fast RAG response:', error);
      throw error;
    }
  }

  /**
   * Get fast statistics
   */
  async getStats() {
    try {
      console.log('Getting fast stats...');
      
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'stats'
      });
      
      return result;

    } catch (error) {
      console.error('Error getting fast stats:', error);
      throw error;
    }
  }

  /**
   * Run quick diagnostics
   */
  async runDiagnostics() {
    try {
      console.log('Running fast RAG diagnostics...');
      
      const diagnostics = {
        timestamp: new Date().toISOString(),
        mode: 'fast-processing',
        tests: {}
      };
      
      // Test basic connectivity
      try {
        const connectionTest = await this.testConnection();
        diagnostics.tests.connectivity = connectionTest;
      } catch (error) {
        diagnostics.tests.connectivity = {
          success: false,
          error: error.message
        };
      }
      
      // Test document listing
      try {
        const documents = await this.getDocuments();
        diagnostics.tests.documentListing = {
          success: true,
          documentCount: documents.length
        };
      } catch (error) {
        diagnostics.tests.documentListing = {
          success: false,
          error: error.message
        };
      }
      
      // Test search (if documents exist)
      try {
        const searchResult = await this.searchDocuments('pharmaceutical quality', { limit: 3 });
        diagnostics.tests.search = {
          success: true,
          resultsFound: searchResult.results?.length || 0,
          searchType: searchResult.searchType || 'text-based'
        };
      } catch (error) {
        diagnostics.tests.search = {
          success: false,
          error: error.message
        };
      }
      
      // Test stats
      try {
        const stats = await this.getStats();
        diagnostics.tests.stats = {
          success: true,
          ...stats
        };
      } catch (error) {
        diagnostics.tests.stats = {
          success: false,
          error: error.message
        };
      }
      
      // Overall health assessment
      const successfulTests = Object.values(diagnostics.tests).filter(test => test.success).length;
      const totalTests = Object.keys(diagnostics.tests).length;
      
      diagnostics.health = {
        score: (successfulTests / totalTests) * 100,
        status: successfulTests === totalTests ? 'healthy' : 
                successfulTests > totalTests / 2 ? 'partial' : 'unhealthy',
        mode: 'fast-processing',
        features: {
          instantUpload: true,
          textSearch: true,
          semanticSearch: false,
          embeddingGeneration: false
        },
        recommendations: []
      };
      
      if (!diagnostics.tests.connectivity?.success) {
        diagnostics.health.recommendations.push('Check Netlify function deployment');
      }
      
      if (!diagnostics.tests.search?.success) {
        diagnostics.health.recommendations.push('Upload test documents to enable search testing');
      }
      
      if (diagnostics.health.status === 'healthy') {
        diagnostics.health.recommendations.push('System working well! Upload documents and try search functionality.');
      }
      
      return diagnostics;
      
    } catch (error) {
      console.error('Error running diagnostics:', error);
      return {
        timestamp: new Date().toISOString(),
        mode: 'fast-processing',
        health: {
          score: 0,
          status: 'error',
          error: error.message
        }
      };
    }
  }

  /**
   * Quick upload test with small sample document
   */
  async testUpload() {
    try {
      console.log('Testing upload functionality...');
      
      // Create a small test file
      const testContent = `Test Document for AcceleraQA RAG System

This is a small test document to verify the upload functionality works correctly.

Key Topics:
- Good Manufacturing Practice (GMP)
- Quality Control Testing
- Process Validation
- Regulatory Compliance

This test ensures the RAG system can process documents quickly without timeouts.`;

      const testFile = new File([testContent], 'test-document.txt', { type: 'text/plain' });
      
      const result = await this.uploadDocument(testFile, {
        category: 'test',
        tags: ['test', 'upload-verification'],
        testDocument: true
      });
      
      return {
        success: true,
        uploadResult: result,
        message: 'Test upload completed successfully'
      };
      
    } catch (error) {
      console.error('Test upload failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Test upload failed'
      };
    }
  }

  /**
   * Quick search test
   */
  async testSearch() {
    try {
      console.log('Testing search functionality...');
      
      const searchResult = await this.searchDocuments('GMP quality manufacturing', {
        limit: 5,
        threshold: 0.2
      });
      
      return {
        success: true,
        searchResult: searchResult,
        message: `Search test completed - found ${searchResult.results?.length || 0} results`
      };
      
    } catch (error) {
      console.error('Test search failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Test search failed'
      };
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
export const getStats = () => ragService.getStats();
export const runDiagnostics = () => ragService.runDiagnostics();
export const testUpload = () => ragService.testUpload();
export const testSearch = () => ragService.testSearch();
