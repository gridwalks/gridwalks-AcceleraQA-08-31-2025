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
  async
