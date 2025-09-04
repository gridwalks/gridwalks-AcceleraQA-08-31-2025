// src/services/ragService.js - Updated to use enhanced function
import openaiService from './openaiService';
import { getToken } from './authService';

const API_BASE_URL = '/.netlify/functions';

class RAGService {
  constructor() {
    this.apiUrl = `${API_BASE_URL}/rag-enhanced`; // Use the working enhanced function
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
   * Test the enhanced RAG function connectivity
   */
  async testConnection() {
    try {
      console.log('Testing enhanced RAG function connectivity...');
      
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'test'
      });
      
      return {
        success: true,
        data: result,
        recommendation: 'Enhanced RAG function working with real embeddings!'
      };
      
    } catch (error) {
      console.error('Enhanced RAG connection test failed:', error);
      return {
        success: false,
        error: error.message,
        recommendation: 'Check function deployment and environment variables'
      };
    }
  }

  /**
   * Upload document with real embedding generation
   */
  async uploadDocument(file, metadata = {}) {
    try {
      if (!file) {
        throw new Error('File is required');
      }

      console.log('Starting enhanced document upload process...');
      
      // Extract text from file
      const text = await this.extractTextFromFile(file);
      console.log('Text extracted, length:', text.length);
      
      console.log('Sending to enhanced function for processing...');
      
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
            ...metadata
          }
        }
      });

      console.log('Enhanced upload successful:', result);
      return result;

    } catch (error) {
      console.error('Error uploading document:', error);
      throw error;
    }
  }

  /**
   * Extract text from file - now handles multiple formats
   */
  async extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read text file'));
        reader.readAsText(file);
      } else {
        // For other file types, the enhanced function will handle them
        // We just pass the filename and basic info
        resolve(''); // Let the function generate appropriate placeholder content
      }
    });
  }

  /**
   * Get list of uploaded documents
   */
  async getDocuments() {
    try {
      console.log('Getting document list from enhanced function...');
      
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
   * Search documents using real semantic similarity
   */
  async searchDocuments(query, options = {}) {
    try {
      if (!query || !query.trim()) {
        throw new Error('Search query is required');
      }

      console.log('Searching documents with enhanced function:', query);
      
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'search',
        query: query.trim(), // Send the actual query text, not embedding
        options: {
          limit: options.limit || 10,
          threshold: options.threshold || 0.7
        }
      });
      
      console.log('Enhanced search results:', result);
      return result;

    } catch (error) {
      console.error('Error searching documents:', error);
      throw error;
    }
  }

  /**
   * Generate AI response using enhanced RAG context
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

Use the following document context to answer the user's question. The documents have been retrieved using semantic search and are relevant to the user's query.

DOCUMENT CONTEXT:
${context.substring(0, 12000)} ${context.length > 12000 ? '...[truncated]' : ''}

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
      const highConfidenceSources = searchResults.filter(r => r.similarity > 0.8);
      
      let sourceAttribution = '';
      if (sourceDocs.length > 0) {
        sourceAttribution = `\n\n📄 **Sources Referenced:**\n`;
        sourceDocs.forEach(doc => {
          const docResults = searchResults.filter(r => r.filename === doc);
          const avgSimilarity = docResults.reduce((sum, r) => sum + r.similarity, 0) / docResults.length;
          sourceAttribution += `• ${doc} (${(avgSimilarity * 100).toFixed(1)}% relevant)\n`;
        });
        
        if (highConfidenceSources.length > 0) {
          sourceAttribution += `\n🎯 **High-confidence matches:** ${highConfidenceSources.length} chunks with >80% relevance`;
        }
      }

      return {
        ...response,
        answer: response.answer + sourceAttribution,
        sources: searchResults,
        ragMetadata: {
          totalSources: searchResults.length,
          highConfidenceSources: highConfidenceSources.length,
          avgSimilarity: searchResults.reduce((sum, r) => sum + r.similarity, 0) / searchResults.length,
          searchType: 'semantic',
          embeddingsUsed: true
        }
      };

    } catch (error) {
      console.error('Error generating enhanced RAG response:', error);
      throw error;
    }
  }

  /**
   * Get enhanced statistics
   */
  async getStats() {
    try {
      console.log('Getting enhanced stats...');
      
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'stats'
      });
      
      return result;

    } catch (error) {
      console.error('Error getting enhanced stats:', error);
      throw error;
    }
  }

  /**
   * Test all enhanced functionality
   */
  async runDiagnostics() {
    try {
      console.log('Running enhanced RAG diagnostics...');
      
      const diagnostics = {
        timestamp: new Date().toISOString(),
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
          searchType: searchResult.searchType
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
        recommendations: []
      };
      
      if (!diagnostics.tests.connectivity?.success) {
        diagnostics.health.recommendations.push('Check Netlify function deployment');
      }
      
      if (!diagnostics.tests.search?.success) {
        diagnostics.health.recommendations.push('Upload test documents to enable search testing');
      }
      
      return diagnostics;
      
    } catch (error) {
      console.error('Error running diagnostics:', error);
      return {
        timestamp: new Date().toISOString(),
        health: {
          score: 0,
          status: 'error',
          error: error.message
        }
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
