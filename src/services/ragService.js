// src/services/ragService.js - Updated RAG service for Neon PostgreSQL
import openaiService from './openaiService';
import { getToken } from './authService';

const API_BASE_URL = '/.netlify/functions';

class RAGService {
  constructor() {
    // TEMPORARY: Use the fixed function endpoint
    this.apiUrl = `${API_BASE_URL}/neon-rag-fixed`;
    this.maxChunkSize = 1000;
    this.chunkOverlap = 200;
  }

  // ... rest of your RAGService code stays the same
};

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

      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

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
      return result;

    } catch (error) {
      console.error('Neon RAG API request failed:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'test'
      });
      
      return {
        success: true,
        data: result,
        recommendation: 'Neon PostgreSQL RAG system working! Full-text search with persistent storage.'
      };
      
    } catch (error) {
      console.error('Neon RAG connection test failed:', error);
      return {
        success: false,
        error: error.message,
        recommendation: 'Check Neon database connection and try again'
      };
    }
  }

  async uploadDocument(file, metadata = {}) {
    try {
      if (!file) {
        throw new Error('File is required');
      }

      const text = await this.extractTextFromFile(file);
      
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
            processingMode: 'neon-postgresql',
            ...metadata
          }
        }
      });

      return result;

    } catch (error) {
      console.error('Error uploading document to Neon:', error);
      throw error;
    }
  }

  async extractTextFromFile(file) {
    return new Promise((resolve, reject) => {
      if (file.type === 'text/plain') {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read text file'));
        reader.readAsText(file);
      } else {
        // For non-text files, return empty string for now
        // In a full implementation, you'd use libraries like pdf-parse for PDFs
        resolve('');
      }
    });
  }

  async getDocuments() {
    try {
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'list'
      });
      
      return result.documents || [];

    } catch (error) {
      console.error('Error getting documents from Neon:', error);
      throw error;
    }
  }

  async deleteDocument(documentId) {
    try {
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'delete',
        documentId
      });
      
      return result;

    } catch (error) {
      console.error('Error deleting document from Neon:', error);
      throw error;
    }
  }

  async searchDocuments(query, options = {}) {
    try {
      if (!query || !query.trim()) {
        throw new Error('Search query is required');
      }

      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'search',
        query: query.trim(),
        options: {
          limit: options.limit || 10,
          threshold: options.threshold || 0.3,
          documentIds: options.documentIds || null
        }
      });
      
      return result;

    } catch (error) {
      console.error('Error searching documents in Neon:', error);
      throw error;
    }
  }

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

Use the following document context to answer the user's question. The documents have been retrieved using full-text search from a PostgreSQL database and contain relevant information.

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
      
      const sourceDocs = [...new Set(searchResults.map(r => r.filename))];
      const highScoreResults = searchResults.filter(r => r.similarity > 0.6);
      
      let sourceAttribution = '';
      if (sourceDocs.length > 0) {
        sourceAttribution = `\n\n📄 **Sources Referenced:**\n`;
        sourceDocs.forEach(doc => {
          const docResults = searchResults.filter(r => r.filename === doc);
          const avgScore = docResults.reduce((sum, r) => sum + r.similarity, 0) / docResults.length;
          sourceAttribution += `• ${doc} (${(avgScore * 100).toFixed(1)}% relevance)\n`;
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
          searchType: 'full-text-postgresql',
          processingMode: 'neon-database'
        }
      };

    } catch (error) {
      console.error('Error generating Neon RAG response:', error);
      throw error;
    }
  }

  async getStats() {
    try {
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'stats'
      });
      
      return result;

    } catch (error) {
      console.error('Error getting Neon stats:', error);
      throw error;
    }
  }

  async runDiagnostics() {
    try {
      const diagnostics = {
        timestamp: new Date().toISOString(),
        mode: 'neon-postgresql',
        tests: {}
      };
      
      // Test connection
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
      
      // Test search functionality
      try {
        const searchResult = await this.searchDocuments('pharmaceutical quality gmp', { limit: 3 });
        diagnostics.tests.search = {
          success: true,
          resultsFound: searchResult.results?.length || 0,
          searchType: searchResult.searchType || 'full-text'
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
      
      const successfulTests = Object.values(diagnostics.tests).filter(test => test.success).length;
      const totalTests = Object.keys(diagnostics.tests).length;
      
      diagnostics.health = {
        score: (successfulTests / totalTests) * 100,
        status: successfulTests === totalTests ? 'healthy' : 
                successfulTests > totalTests / 2 ? 'partial' : 'unhealthy',
        mode: 'neon-postgresql',
        features: {
          persistentStorage: true,
          fullTextSearch: true,
          scalableDatabase: true,
          backupAndRecovery: true
        },
        recommendations: []
      };
      
      if (!diagnostics.tests.connectivity?.success) {
        diagnostics.health.recommendations.push('Check Neon database connection and credentials');
      }
      
      if (!diagnostics.tests.search?.success) {
        diagnostics.health.recommendations.push('Upload test documents to enable search testing');
      }
      
      if (diagnostics.health.status === 'healthy') {
        diagnostics.health.recommendations.push('System working well! Neon PostgreSQL provides robust, scalable document storage and search.');
      }
      
      return diagnostics;
      
    } catch (error) {
      console.error('Error running Neon diagnostics:', error);
      return {
        timestamp: new Date().toISOString(),
        mode: 'neon-postgresql',
        health: {
          score: 0,
          status: 'error',
          error: error.message
        }
      };
    }
  }

  async testUpload() {
    try {
      const testContent = `Test Document for AcceleraQA Neon RAG System

This is a comprehensive test document to verify the Neon PostgreSQL upload functionality works correctly.

Key Topics Covered:
- Good Manufacturing Practice (GMP) compliance requirements
- Quality Control Testing procedures and protocols
- Process Validation lifecycle and documentation
- Regulatory Compliance with FDA and ICH guidelines

Database Features Tested:
- Document storage with full metadata
- Text chunking for optimal search performance
- Full-text search capabilities using PostgreSQL
- Persistent storage with backup and recovery

This test ensures the Neon RAG system can process documents efficiently and provide reliable search functionality for pharmaceutical quality professionals.

Quality Assurance Notes:
- All processes must follow validated procedures
- Documentation must be complete and auditable
- Change control processes must be implemented
- Regular review and updates are required

This document will be stored in Neon PostgreSQL database and indexed for fast retrieval.`;

      const testFile = new File([testContent], 'neon-test-document.txt', { type: 'text/plain' });
      
      const result = await this.uploadDocument(testFile, {
        category: 'test',
        tags: ['test', 'neon-verification', 'postgresql'],
        testDocument: true,
        description: 'Test document for Neon PostgreSQL RAG system'
      });
      
      return {
        success: true,
        uploadResult: result,
        message: 'Test upload to Neon completed successfully'
      };
      
    } catch (error) {
      console.error('Neon test upload failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Test upload to Neon failed'
      };
    }
  }

  async testSearch() {
    try {
      const searchResult = await this.searchDocuments('GMP quality manufacturing validation compliance', {
        limit: 5,
        threshold: 0.2
      });
      
      return {
        success: true,
        searchResult: searchResult,
        message: `Neon search test completed - found ${searchResult.results?.length || 0} results using PostgreSQL full-text search`
      };
      
    } catch (error) {
      console.error('Neon test search failed:', error);
      return {
        success: false,
        error: error.message,
        message: 'Test search in Neon failed'
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
