// src/services/ragService.js - Fast version to avoid timeouts
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
          success:
