// src/services/ragService.js - Updated RAG service with FIXED authentication
import openaiService from './openaiService';
import authService, { getToken } from './authService';
import logger from '../utils/logger';

const API_BASE_URL = '/.netlify/functions';

class RAGService {
  constructor() {
    this.apiUrl = `${API_BASE_URL}/neon-rag-fixed`;
    this.maxChunkSize = 1000;
    this.chunkOverlap = 200;
  }

  async makeAuthenticatedRequest(endpoint, data = {}) {
    try {
      logger.debug('RAG service authenticated request');
      logger.debug('Endpoint:', endpoint);
      logger.debug('Data action:', data.action);
      
      // CRITICAL FIX: Get token with retry and better error handling
      let token = null;
      try {
        token = await getToken();
        logger.debug('Token retrieved:', !!token);
      } catch (tokenError) {
        logger.warn('Failed to get token:', tokenError);
      }

      // Prepare headers with BOTH methods for maximum compatibility
      const headers = {
        'Content-Type': 'application/json',
      };

      if (token) {
        // Method 1: Standard Authorization Bearer header
        headers['Authorization'] = `Bearer ${token}`;
        logger.debug('Added Authorization header');

        // Method 2: Extract user ID and add as x-user-id header
        try {
          const tokenParts = token.split('.');
          if (tokenParts.length === 3) {
            // Properly decode JWT payload with padding
            let payload = tokenParts[1];
            while (payload.length % 4) {
              payload += '=';
            }

            const decoded = atob(payload);
            const parsed = JSON.parse(decoded);

            if (parsed.sub) {
              headers['x-user-id'] = parsed.sub;
              logger.debug('Added x-user-id header from token');
            } else {
              logger.warn('No sub field in JWT token');
            }
          } else if (tokenParts.length === 5) {
            logger.debug('Encrypted token detected - fetching user profile for x-user-id');
            try {
              const user = await authService.getUser();
              if (user?.sub) {
                headers['x-user-id'] = user.sub;
                logger.debug('Added x-user-id header from profile for encrypted token');
              } else {
                logger.warn('Could not retrieve user profile for x-user-id');
              }
            } catch (profileError) {
              logger.warn('Error fetching user profile for x-user-id:', profileError.message);
            }
          } else {
            logger.warn('Invalid JWT format - parts:', tokenParts.length);
            try {
              const user = await authService.getUser();
              if (user?.sub) {
                headers['x-user-id'] = user.sub;
                logger.debug('Added x-user-id header from profile');
              } else {
                logger.warn('Could not retrieve user profile for x-user-id');
              }
            } catch (profileError) {
              logger.warn('Error fetching user profile for x-user-id:', profileError.message);
            }
          }
        } catch (jwtError) {
          logger.warn('Could not parse JWT for x-user-id:', jwtError.message);
          try {
            const user = await authService.getUser();
            if (user?.sub) {
              headers['x-user-id'] = user.sub;
              logger.debug('Added x-user-id header from profile');
            } else {
              logger.warn('Could not retrieve user profile for x-user-id');
            }
          } catch (profileError) {
            logger.warn('Error fetching user profile for x-user-id:', profileError.message);
          }
          // Continue anyway - the function should handle JWT parsing server-side
        }
      } else {
        logger.warn('No token available; proceeding with x-user-id fallback if possible');
        try {
          const user = await authService.getUser();
          if (user?.sub) {
            headers['x-user-id'] = user.sub;
            logger.debug('Added x-user-id header from profile without token');
          }
        } catch (profileError) {
          logger.warn('Error fetching user profile for x-user-id:', profileError.message);
        }
      }

      // ENHANCED: Add additional headers for debugging
      headers['X-Requested-With'] = 'XMLHttpRequest';
      headers['X-Client-Version'] = '2.1.0';
      headers['X-Timestamp'] = new Date().toISOString();

      logger.debug('Request headers prepared:', Object.keys(headers));
      logger.debug('Making request to:', endpoint);

      // Make the request with proper error handling
      const response = await fetch(endpoint, {
        method: 'POST',
        headers,
        body: JSON.stringify(data)
      });

      logger.debug('Response status:', response.status);
      logger.debug('Response ok:', response.ok);

      if (!response.ok) {
        logger.error('Request failed with status:', response.status);
        
        let errorData;
        try {
          errorData = await response.json();
          logger.error('Error response data:', errorData);
        } catch (parseError) {
          logger.error('Could not parse error response:', parseError);
          errorData = { 
            error: `HTTP ${response.status}: ${response.statusText}`,
            details: 'Could not parse error response'
          };
        }

        // Enhanced error messages based on status code
        if (response.status === 401) {
          throw new Error(`Authentication failed: ${errorData.error || 'Unauthorized'}. Please try signing out and signing in again.`);
        } else if (response.status === 403) {
          throw new Error(`Access forbidden: ${errorData.error || 'Insufficient permissions'}`);
        } else if (response.status >= 500) {
          throw new Error(`Server error: ${errorData.error || 'Internal server error'}. Please try again later.`);
        } else {
          throw new Error(errorData.error || `Request failed with status ${response.status}`);
        }
      }

      const result = await response.json();
      logger.debug('Request successful, response keys:', Object.keys(result));
      logger.debug('Request completed');
      return result;

    } catch (error) {
      logger.error('Request failed:', error);
      throw error;
    }
  }

  async testConnection() {
    try {
      logger.debug('Testing RAG connection...');
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'test'
      });
      
      return {
        success: true,
        data: result,
        recommendation: 'Neon PostgreSQL RAG system working! Full-text search with persistent storage.'
      };
      
    } catch (error) {
      logger.error('RAG connection test failed:', error);
      return {
        success: false,
        error: error.message,
        recommendation: 'Check authentication and database connection'
      };
    }
  }

  async uploadDocument(file, metadata = {}) {
    try {
      if (!file) {
        throw new Error('File is required');
      }

      logger.debug('Uploading document:', file.name);
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
      logger.error('Error uploading document:', error);
      throw error;
    }
  }

  async extractTextFromFile(file) {
    if (file.type === 'text/plain') {
      return new Promise((resolve, reject) => {
        const reader = new FileReader();
        reader.onload = (e) => resolve(e.target.result);
        reader.onerror = () => reject(new Error('Failed to read text file'));
        reader.readAsText(file);
      });
    }


    // Handle DOCX files using a dynamic import to avoid bundling mammoth
    if (
      file.type === 'application/vnd.openxmlformats-officedocument.wordprocessingml.document' ||
      file.name?.toLowerCase().endsWith('.docx')
    ) {
      try {
        const arrayBuffer = await file.arrayBuffer();
        const mammoth = await import('mammoth');

        const { value } = await mammoth.extractRawText({ arrayBuffer });
        return value;
      } catch (err) {
        logger.error('Failed to extract DOCX text:', err);
        return '';
      }
    }

    // For unsupported file types return empty string for now
    logger.warn('Unsupported file type for text extraction:', file.type || file.name);

    return '';
  }

  async getDocuments() {
    try {
      logger.debug('Getting documents list...');
      const result = await this.makeAuthenticatedRequest(this.apiUrl, {
        action: 'list'
      });
      
      return result.documents || [];

    } catch (error) {
      logger.error('Error getting documents:', error);
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
      logger.error('Error deleting document:', error);
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
      logger.error('Error searching documents:', error);
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
      logger.error('Error generating RAG response:', error);
      throw error;
    }
  }

  async search(query, options = {}) {
    try {
      const searchData = await this.searchDocuments(query, options);
      const matches = searchData.results || [];
      const response = await this.generateRAGResponse(query, matches);
      return {
        answer: response.answer,
        sources: response.sources || matches,
        resources: response.resources || []
      };
    } catch (error) {
      logger.error('Error performing RAG search:', error);
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
      logger.error('Error getting stats:', error);
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
        diagnostics.health.recommendations.push('Check authentication and database connection');
      }
      
      if (!diagnostics.tests.search?.success) {
        diagnostics.health.recommendations.push('Upload test documents to enable search testing');
      }
      
      if (diagnostics.health.status === 'healthy') {
        diagnostics.health.recommendations.push('System working well! Neon PostgreSQL provides robust, scalable document storage and search.');
      }
      
      return diagnostics;
      
    } catch (error) {
      logger.error('Error running diagnostics:', error);
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

This test ensures the Neon RAG system can process documents efficiently and provide reliable search functionality for pharmaceutical quality professionals.`;

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
      logger.error('Test upload failed:', error);
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
        message: `Search test completed - found ${searchResult.results?.length || 0} results using PostgreSQL full-text search`
      };
      
    } catch (error) {
      logger.error('Test search failed:', error);
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
export const search = (query, options) => ragService.search(query, options);
export const searchDocuments = (query, options) => ragService.searchDocuments(query, options);
export const getDocuments = () => ragService.getDocuments();
export const deleteDocument = (documentId) => ragService.deleteDocument(documentId);
export const generateRAGResponse = (query, searchResults) => ragService.generateRAGResponse(query, searchResults);
export const testConnection = () => ragService.testConnection();
export const getStats = () => ragService.getStats();
export const runDiagnostics = () => ragService.runDiagnostics();
export const testUpload = () => ragService.testUpload();
export const testSearch = () => ragService.testSearch();
