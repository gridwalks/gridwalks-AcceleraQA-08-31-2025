// src/components/RAGConfigurationPage.js - Fixed authentication for Neon
import React, { useState, useEffect, useCallback } from 'react';
import { 
  Upload, 
  FileText, 
  Trash2, 
  Search, 
  AlertCircle, 
  CheckCircle, 
  Download,
  Settings,
  Database,
  Loader,
  X,
  Eye,
  BarChart3,
  Bug,
  User,
  Key
} from 'lucide-react';
import ragService from '../services/ragService';
import { getToken } from '../services/authService';

const RAGConfigurationPage = ({ user, onClose }) => {
  const [documents, setDocuments] = useState([]);
  const [isLoading, setIsLoading] = useState(false);
  const [uploadStatus, setUploadStatus] = useState(null);
  const [selectedFile, setSelectedFile] = useState(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [isSearching, setIsSearching] = useState(false);
  const [activeTab, setActiveTab] = useState('documents');
  const [error, setError] = useState(null);
  const [debugInfo, setDebugInfo] = useState(null);
  const [authDebug, setAuthDebug] = useState(null);
  const [uploadMetadata, setUploadMetadata] = useState({
    title: '',
    description: '',
    tags: '',
    category: 'general'
  });

  // Enhanced authentication debugging
  const checkAuthentication = useCallback(async () => {
    try {
      console.log('=== AUTHENTICATION DEBUG ===');
      
      const authInfo = {
        user: {
          present: !!user,
          sub: user?.sub,
          email: user?.email,
          name: user?.name
        },
        token: {
          present: false,
          valid: false,
          payload: null
        },
        timestamp: new Date().toISOString()
      };

      // Try to get token
      try {
        const token = await getToken();
        authInfo.token.present = !!token;
        
        if (token) {
          try {
            const tokenParts = token.split('.');
            if (tokenParts.length === 3) {
              const payload = JSON.parse(atob(tokenParts[1]));
              authInfo.token.valid = true;
              authInfo.token.payload = {
                sub: payload.sub,
                aud: payload.aud,
                exp: payload.exp,
                iat: payload.iat,
                scope: payload.scope
              };
            }
          } catch (parseError) {
            console.error('Token parsing error:', parseError);
            authInfo.token.parseError = parseError.message;
          }
        }
      } catch (tokenError) {
        console.error('Token retrieval error:', tokenError);
        authInfo.token.error = tokenError.message;
      }

      console.log('Authentication info:', authInfo);
      setAuthDebug(authInfo);
      return authInfo;
      
    } catch (error) {
      console.error('Authentication check failed:', error);
      setAuthDebug({ error: error.message });
      return null;
    }
  }, [user]);

  useEffect(() => {
    loadDocuments();
    testConnection();
    checkAuthentication();
  }, [checkAuthentication]);

  const testConnection = async () => {
    try {
      console.log('=== CONNECTION TEST DEBUG ===');
      console.log('User object:', user);
      
      // Check authentication first
      const authInfo = await checkAuthentication();
      if (!authInfo?.user?.present || !authInfo?.user?.sub) {
        setError('User authentication missing. Please sign in again.');
        setDebugInfo({
          success: false,
          error: 'No authenticated user found',
          authInfo
        });
        return;
      }

      if (!authInfo?.token?.present) {
        setError('Authentication token missing. Please try refreshing the page.');
        setDebugInfo({
          success: false,
          error: 'No authentication token available',
          authInfo
        });
        return;
      }

      console.log('Testing RAG connection with auth info:', authInfo);
      
      const result = await ragService.testConnection();
      console.log('RAG test result:', result);
      
      setDebugInfo({
        ...result,
        authInfo,
        timestamp: new Date().toISOString()
      });
      
      if (!result.success) {
        setError(`Connection test failed: ${result.error}`);
      } else {
        setError(null);
      }
    } catch (error) {
      console.error('Connection test error:', error);
      const authInfo = await checkAuthentication();
      setDebugInfo({ 
        success: false, 
        error: error.message,
        authInfo,
        timestamp: new Date().toISOString()
      });
      setError(`Connection test failed: ${error.message}`);
    }
  };

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      console.log('Loading documents...');
      const docs = await ragService.getDocuments();
      console.log('Documents loaded:', docs);
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      setError(`Failed to load documents: ${error.message}`);
      
      // If it's an auth error, check authentication
      if (error.message.includes('authentication') || error.message.includes('401')) {
        await checkAuthentication();
      }
    } finally {
      setIsLoading(false);
    }
  }, [checkAuthentication]);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadMetadata(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, '')
      }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    // Check authentication before upload
    const authInfo = await checkAuthentication();
    if (!authInfo?.user?.present || !authInfo?.token?.present) {
      setError('Authentication required. Please sign in again.');
      return;
    }

    setIsLoading(true);
    setUploadStatus({ type: 'processing', message: 'Processing document...' });
    setError(null);

    try {
      const metadata = {
        ...uploadMetadata,
        tags: uploadMetadata.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      console.log('Uploading document with metadata:', metadata);
      const result = await ragService.uploadDocument(selectedFile, metadata);
      console.log('Upload result:', result);
      
      setUploadStatus({ 
        type: 'success', 
        message: `Successfully uploaded "${selectedFile.name}" with ${result.chunks} chunks processed` 
      });
      
      setSelectedFile(null);
      setUploadMetadata({
        title: '',
        description: '',
        tags: '',
        category: 'general'
      });
      
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
      
      await loadDocuments();
      
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadStatus({ 
        type: 'error', 
        message: `Upload failed: ${error.message}` 
      });
      setError(`Upload failed: ${error.message}`);
      
      // If it's an auth error, check authentication
      if (error.message.includes('authentication') || error.message.includes('401')) {
        await checkAuthentication();
      }
    } finally {
      setIsLoading(false);
    }
  };

  const handleDelete = async (documentId, filename) => {
    const confirmed = window.confirm(`Are you sure you want to delete "${filename}"? This action cannot be undone.`);
    
    if (!confirmed) return;

    try {
      await ragService.deleteDocument(documentId);
      setDocuments(prev => prev.filter(doc => doc.id !== documentId));
      setSearchResults(prev => prev.filter(result => result.documentId !== documentId));
      
    } catch (error) {
      console.error('Error deleting document:', error);
      setError(`Failed to delete "${filename}": ${error.message}`);
      
      if (error.message.includes('authentication') || error.message.includes('401')) {
        await checkAuthentication();
      }
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    // Check authentication before search
    const authInfo = await checkAuthentication();
    if (!authInfo?.user?.present || !authInfo?.token?.present) {
      setError('Authentication required. Please sign in again.');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      console.log('Searching with query:', searchQuery);
      const results = await ragService.searchDocuments(searchQuery, {
        limit: 20,
        threshold: 0.3
      });
      
      console.log('Search results:', results);
      setSearchResults(results.results || []);
      
      if (!results.results || results.results.length === 0) {
        setError('No relevant documents found for your query');
      }
      
    } catch (error) {
      console.error('Error searching documents:', error);
      setError(`Search failed: ${error.message}`);
      setSearchResults([]);
      
      if (error.message.includes('authentication') || error.message.includes('401')) {
        await checkAuthentication();
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleTestRAG = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a query to test RAG');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const searchResults = await ragService.searchDocuments(searchQuery, {
        limit: 5,
        threshold: 0.4
      });

      if (!searchResults.results || searchResults.results.length === 0) {
        setError('No relevant documents found to generate response');
        return;
      }

      const ragResponse = await ragService.generateRAGResponse(searchQuery, searchResults.results);
      
      const newWindow = window.open('', '_blank');
      newWindow.document.write(`
        <!DOCTYPE html>
        <html>
        <head>
          <title>RAG Test Response</title>
          <style>
            body { font-family: Arial, sans-serif; margin: 40px; line-height: 1.6; }
            .query { background: #f0f9ff; padding: 20px; border-radius: 8px; margin-bottom: 20px; }
            .response { background: #fefefe; padding: 20px; border: 1px solid #e5e7eb; border-radius: 8px; }
            .sources { margin-top: 20px; padding: 20px; background: #f9fafb; border-radius: 8px; }
            .source-item { margin-bottom: 10px; padding: 10px; background: white; border-radius: 4px; }
          </style>
        </head>
        <body>
          <h1>RAG Test Response</h1>
          <div class="query">
            <h3>Query:</h3>
            <p>${searchQuery}</p>
          </div>
          <div class="response">
            <h3>AI Response:</h3>
            <div>${ragResponse.answer.replace(/\n/g, '<br>')}</div>
          </div>
          <div class="sources">
            <h3>Source Documents:</h3>
            ${searchResults.results.map(result => `
              <div class="source-item">
                <strong>${result.filename}</strong> (Relevance: ${(result.similarity * 100).toFixed(1)}%)
                <br><em>${result.text.substring(0, 200)}...</em>
              </div>
            `).join('')}
          </div>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error('Error testing RAG:', error);
      setError(`RAG test failed: ${error.message}`);
      
      if (error.message.includes('authentication') || error.message.includes('401')) {
        await checkAuthentication();
      }
    } finally {
      setIsSearching(false);
    }
  };

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return parseFloat((bytes / Math.pow(k, i)).toFixed(2)) + ' ' + sizes[i];
  };

  const getFileTypeIcon = (type) => {
    if (type.includes('pdf')) return '📄';
    if (type.includes('word')) return '📝';
    if (type.includes('text')) return '📃';
    return '📄';
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-lg shadow-xl max-w-6xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-6 border-b border-gray-200">
          <div className="flex items-center space-x-3">
            <Database className="h-6 w-6 text-blue-600" />
            <div>
              <h2 className="text-xl font-semibold text-gray-900">RAG Configuration</h2>
              <p className="text-sm text-gray-500">Upload documents and configure search with Neon PostgreSQL</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
            aria-label="Close RAG configuration"
          >
            <X className="h-5 w-5 text-gray-500" />
          </button>
        </div>

        {/* Enhanced Debug Info */}
        {debugInfo && (
          <div className={`p-4 border-b ${debugInfo.success ? 'bg-green-50 border-green-200' : 'bg-red-50 border-red-200'}`}>
            <div className="flex items-center space-x-2">
              {debugInfo.success ? (
                <CheckCircle className="h-4 w-4 text-green-600" />
              ) : (
                <AlertCircle className="h-4 w-4 text-red-600" />
              )}
              <span className={`text-sm font-medium ${debugInfo.success ? 'text-green-800' : 'text-red-800'}`}>
                Function Status: {debugInfo.success ? 'Connected' : 'Error'}
              </span>
            </div>
            {!debugInfo.success && (
              <p className="text-sm text-red-700 mt-1">Error: {debugInfo.error}</p>
            )}
            
            {/* Authentication Status */}
            {authDebug && (
              <div className="mt-2 text-xs">
                <div className={`inline-flex items-center space-x-1 ${authDebug.user?.present ? 'text-green-600' : 'text-red-600'}`}>
                  <User className="h-3 w-3" />
                  <span>User: {authDebug.user?.present ? '✓' : '✗'}</span>
                  {authDebug.user?.sub && <span>({authDebug.user.sub.substring(0, 8)}...)</span>}
                </div>
                <div className={`inline-flex items-center space-x-1 ml-4 ${authDebug.token?.present ? 'text-green-600' : 'text-red-600'}`}>
                  <Key className="h-3 w-3" />
                  <span>Token: {authDebug.token?.present ? '✓' : '✗'}</span>
                  {authDebug.token?.valid && <span>(Valid)</span>}
                </div>
              </div>
            )}
          </div>
        )}

        {/* Tabs */}
        <div className="border-b border-gray-200">
          <nav className="flex space-x-8 px-6" aria-label="Tabs">
            <button
              onClick={() => setActiveTab('documents')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'documents'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <FileText className="h-4 w-4" />
                <span>Documents ({documents.length})</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('search')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'search'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Search className="h-4 w-4" />
                <span>Search & Test</span>
              </div>
            </button>
            <button
              onClick={() => setActiveTab('debug')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'debug'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Bug className="h-4 w-4" />
                <span>Debug</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-220px)]">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
                {error.includes('authentication') && (
                  <button
                    onClick={checkAuthentication}
                    className="mt-2 text-sm text-red-600 hover:text-red-800 underline"
                  >
                    Check Authentication Status
                  </button>
                )}
              </div>
              <button
                onClick={() => setError(null)}
                className="ml-auto text-red-500 hover:text-red-700"
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Upload Status */}
          {uploadStatus && (
            <div className={`mb-6 p-4 rounded-lg flex items-start space-x-3 ${
              uploadStatus.type === 'success' ? 'bg-green-50 border border-green-200' :
              uploadStatus.type === 'error' ? 'bg-red-50 border border-red-200' :
              'bg-blue-50 border border-blue-200'
            }`}>
              {uploadStatus.type === 'success' && <CheckCircle className="h-5 w-5 text-green-500 flex-shrink-0 mt-0.5" />}
              {uploadStatus.type === 'error' && <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />}
              {uploadStatus.type === 'processing' && <Loader className="h-5 w-5 text-blue-500 flex-shrink-0 mt-0.5 animate-spin" />}
              <div className="flex-1">
                <p className={`font-medium ${
                  uploadStatus.type === 'success' ? 'text-green-800' :
                  uploadStatus.type === 'error' ? 'text-red-800' :
                  'text-blue-800'
                }`}>
                  {uploadStatus.type === 'success' ? 'Upload Successful' :
                   uploadStatus.type === 'error' ? 'Upload Failed' :
                   'Processing...'}
                </p>
                <p className={`text-sm ${
                  uploadStatus.type === 'success' ? 'text-green-700' :
                  uploadStatus.type === 'error' ? 'text-red-700' :
                  'text-blue-700'
                }`}>
                  {uploadStatus.message}
                </p>
              </div>
              <button
                onClick={() => setUploadStatus(null)}
                className={`${
                  uploadStatus.type === 'success' ? 'text-green-500 hover:text-green-700' :
                  uploadStatus.type === 'error' ? 'text-red-500 hover:text-red-700' :
                  'text-blue-500 hover:text-blue-700'
                }`}
              >
                <X className="h-4 w-4" />
              </button>
            </div>
          )}

          {/* Documents Tab */}
          {activeTab === 'documents' && (
            <div className="space-y-6">
              {/* Upload Section */}
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                  <Upload className="h-5 w-5" />
                  <span>Upload Document (Neon PostgreSQL Storage)</span>
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select File (Text files work best)
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".txt,.pdf,.doc,.docx"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Persistent storage with Neon PostgreSQL database and full-text search
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Title
                      </label>
                      <input
                        type="text"
                        value={uploadMetadata.title}
                        onChange={(e) => setUploadMetadata(prev => ({ ...prev, title: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Document title"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Category
                      </label>
                      <select
                        value={uploadMetadata.category}
                        onChange={(e) => setUploadMetadata(prev => ({ ...prev, category: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                      >
                        <option value="general">General</option>
                        <option value="gmp">GMP</option>
                        <option value="validation">Validation</option>
                        <option value="capa">CAPA</option>
                        <option value="regulatory">Regulatory</option>
                        <option value="quality">Quality</option>
                        <option value="sop">SOP</option>
                        <option value="training">Training</option>
                      </select>
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || isLoading || !debugInfo?.success}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {isLoading ? (
                      <>
                        <Loader className="h-4 w-4 animate-spin" />
                        <span>Processing...</span>
                      </>
                    ) : (
                      <>
                        <Upload className="h-4 w-4" />
                        <span>Upload & Process</span>
                      </>
                    )}
                  </button>
                </div>
              </div>

              {/* Documents List */}
              <div>
                <div className="flex items-center justify-between mb-4">
                  <h3 className="text-lg font-medium text-gray-900">Uploaded Documents</h3>
                  <button
                    onClick={loadDocuments}
                    disabled={isLoading}
                    className="px-4 py-2 text-sm text-gray-600 hover:text-gray-800 border border-gray-300 rounded-md hover:border-gray-400 transition-colors flex items-center space-x-2"
                  >
                    <Download className="h-4 w-4" />
                    <span>Refresh</span>
                  </button>
                </div>

                {isLoading ? (
                  <div className="text-center py-12">
                    <Loader className="h-8 w-8 text-blue-600 mx-auto animate-spin mb-4" />
                    <p className="text-gray-600">Loading documents from Neon database...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h4>
                    <p className="text-gray-600">Upload your first document to get started with RAG search.</p>
                    {!debugInfo?.success && (
                      <p className="text-red-600 text-sm mt-2">
                        Please fix authentication issues above before uploading.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
                    {documents.map((doc) => (
                      <div key={doc.id} className="bg-white border border-gray-200 rounded-lg p-4 hover:border-gray-300 transition-colors">
                        <div className="flex items-start justify-between mb-3">
                          <div className="flex items-center space-x-3">
                            <span className="text-2xl">{getFileTypeIcon(doc.type)}</span>
                            <div>
                              <h4 className="font-medium text-gray-900 truncate max-w-[200px]" title={doc.filename}>
                                {doc.filename}
                              </h4>
                              <p className="text-sm text-gray-500">
                                {formatFileSize(doc.size)} • {doc.chunks} chunks
                              </p>
                            </div>
                          </div>
                          <button
                            onClick={() => handleDelete(doc.id, doc.filename)}
                            className="p-2 text-gray-400 hover:text-red-500 transition-colors"
                            aria-label={`Delete ${doc.filename}`}
                          >
                            <Trash2 className="h-4 w-4" />
                          </button>
                        </div>

                        <div className="text-sm text-gray-600 space-y-1">
                          <p><span className="font-medium">Category:</span> {doc.metadata?.category || 'General'}</p>
                          <p><span className="font-medium">Uploaded:</span> {new Date(doc.createdAt).toLocaleDateString()}</p>
                          <p><span className="font-medium">Storage:</span> Neon PostgreSQL</p>
                          <p><span className="font-medium">Search:</span> Full-text indexed</p>
                          {doc.metadata?.tags && doc.metadata.tags.length > 0 && (
                            <div className="flex items-center space-x-1 mt-2">
                              <span className="font-medium">Tags:</span>
                              {doc.metadata.tags.map((tag, index) => (
                                <span key={index} className="px-2 py-1 bg-blue-100 text-blue-800 text-xs rounded-full">
                                  {tag}
                                </span>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          )}

          {/* Search Tab */}
          {activeTab === 'search' && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                  <Search className="h-5 w-5" />
                  <span>Search Documents (PostgreSQL Full-Text)</span>
                </h3>

                <div className="flex space-x-4 mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter your search query..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                    disabled={!debugInfo?.success}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim() || !debugInfo?.success}
                    className="px-6 py-2 bg-blue-600 text-white font-medium rounded-md hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {isSearching ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Search className="h-4 w-4" />
                    )}
                    <span>Search</span>
                  </button>
                  <button
                    onClick={handleTestRAG}
                    disabled={isSearching || !searchQuery.trim() || !debugInfo?.success}
                    className="px-6 py-2 bg-green-600 text-white font-medium rounded-md hover:bg-green-700 disabled:opacity-50 disabled:cursor-not-allowed transition-colors flex items-center space-x-2"
                  >
                    {isSearching ? (
                      <Loader className="h-4 w-4 animate-spin" />
                    ) : (
                      <Eye className="h-4 w-4" />
                    )}
                    <span>Test RAG</span>
                  </button>
                </div>

                <p className="text-sm text-gray-600">
                  Search your uploaded documents using PostgreSQL full-text search with ranking. "Test RAG" will generate an AI response using the search results as context.
                </p>
                
                {!debugInfo?.success && (
                  <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-md">
                    <p className="text-sm text-red-700">
                      Search is disabled due to authentication issues. Please resolve the connection problems above.
                    </p>
                  </div>
                )}
              </div>

              {/* Search Results */}
              {searchResults.length > 0 && (
                <div>
                  <h4 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                    <BarChart3 className="h-5 w-5" />
                    <span>Search Results ({searchResults.length})</span>
                  </h4>
                  
                  <div className="space-y-4">
                    {searchResults.map((result, index) => (
                      <div key={`${result.documentId}-${result.chunkIndex}`} className="bg-white border border-gray-200 rounded-lg p-4">
                        <div className="flex items-start justify-between mb-2">
                          <div className="flex items-center space-x-2">
                            <span className="text-sm font-medium text-blue-600">#{index + 1}</span>
                            <h5 className="font-medium text-gray-900">{result.filename}</h5>
                            <span className="px-2 py-1 bg-green-100 text-green-800 text-xs rounded-full">
                              {(result.similarity * 100).toFixed(1)}% relevance
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-3 rounded-md">
                          {result.text}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          Chunk {result.chunkIndex + 1} • Document ID: {result.documentId} • Storage: PostgreSQL
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Debug Tab */}
          {activeTab === 'debug' && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                  <Bug className="h-5 w-5" />
                  <span>Debug Information</span>
                </h3>
                
                <div className="space-y-4">
                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Connection Test</h4>
                    <button
                      onClick={testConnection}
                      className="px-4 py-2 bg-blue-600 text-white rounded-md hover:bg-blue-700 transition-colors"
                    >
                      Run Connection Test
                    </button>
                    
                    {debugInfo && (
                      <div className="mt-3 p-3 bg-white border rounded-md">
                        <pre className="text-xs text-gray-600 whitespace-pre-wrap">
                          {JSON.stringify(debugInfo, null, 2)}
                        </pre>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Authentication Status</h4>
                    <button
                      onClick={checkAuthentication}
                      className="px-4 py-2 bg-green-600 text-white rounded-md hover:bg-green-700 transition-colors"
                    >
                      Check Authentication
                    </button>
                    
                    {authDebug && (
                      <div className="mt-3 p-3 bg-white border rounded-md">
                        <div className="space-y-2 text-sm">
                          <div>
                            <strong>User Present:</strong> 
                            <span className={authDebug.user?.present ? 'text-green-600' : 'text-red-600'}>
                              {authDebug.user?.present ? ' ✓ Yes' : ' ✗ No'}
                            </span>
                            {authDebug.user?.sub && (
                              <span className="ml-2 text-gray-600">
                                (ID: {authDebug.user.sub.substring(0, 12)}...)
                              </span>
                            )}
                          </div>
                          <div>
                            <strong>Email:</strong> {authDebug.user?.email || 'Not available'}
                          </div>
                          <div>
                            <strong>Token Present:</strong> 
                            <span className={authDebug.token?.present ? 'text-green-600' : 'text-red-600'}>
                              {authDebug.token?.present ? ' ✓ Yes' : ' ✗ No'}
                            </span>
                          </div>
                          <div>
                            <strong>Token Valid:</strong> 
                            <span className={authDebug.token?.valid ? 'text-green-600' : 'text-red-600'}>
                              {authDebug.token?.valid ? ' ✓ Yes' : ' ✗ No'}
                            </span>
                          </div>
                          {authDebug.token?.payload && (
                            <div className="mt-2 p-2 bg-gray-50 rounded text-xs">
                              <strong>Token Details:</strong>
                              <pre>{JSON.stringify(authDebug.token.payload, null, 2)}</pre>
                            </div>
                          )}
                          {authDebug.token?.error && (
                            <div className="text-red-600 text-xs">
                              <strong>Token Error:</strong> {authDebug.token.error}
                            </div>
                          )}
                        </div>
                      </div>
                    )}
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Environment Check</h4>
                    <div className="p-3 bg-white border rounded-md space-y-2">
                      <p className="text-sm">
                        <strong>OpenAI API Key:</strong> 
                        <span className={process.env.REACT_APP_OPENAI_API_KEY ? 'text-green-600' : 'text-red-600'}>
                          {process.env.REACT_APP_OPENAI_API_KEY ? ' ✓ Set' : ' ✗ Missing'}
                        </span>
                      </p>
                      <p className="text-sm">
                        <strong>Auth0 Domain:</strong> 
                        <span className={process.env.REACT_APP_AUTH0_DOMAIN ? 'text-green-600' : 'text-red-600'}>
                          {process.env.REACT_APP_AUTH0_DOMAIN ? ' ✓ Set' : ' ✗ Missing'}
                        </span>
                      </p>
                      <p className="text-sm">
                        <strong>Current URL:</strong> {window.location.origin}
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Function Endpoints</h4>
                    <div className="p-3 bg-white border rounded-md space-y-2">
                      <p className="text-sm">
                        <strong>Neon RAG Function:</strong> 
                        <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                          {window.location.origin}/.netlify/functions/neon-rag
                        </code>
                      </p>
                      <p className="text-sm">
                        <strong>Neon DB Function:</strong> 
                        <code className="ml-2 px-2 py-1 bg-gray-100 rounded text-xs">
                          {window.location.origin}/.netlify/functions/neon-db
                        </code>
                      </p>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">System Capabilities</h4>
                    <div className="p-3 bg-white border rounded-md">
                      <ul className="text-sm space-y-1 text-gray-600">
                        <li>✅ Neon PostgreSQL database storage</li>
                        <li>✅ Full-text search with ranking</li>
                        <li>✅ Document persistence across sessions</li>
                        <li>✅ RAG response generation</li>
                        <li>✅ Advanced conversation analytics</li>
                        <li>✅ Scalable serverless architecture</li>
                        <li>🔄 Vector embeddings (future support)</li>
                      </ul>
                    </div>
                  </div>

                  <div>
                    <h4 className="font-medium text-gray-800 mb-2">Troubleshooting</h4>
                    <div className="p-3 bg-yellow-50 border border-yellow-200 rounded-md">
                      <p className="text-sm text-yellow-800 mb-2">
                        <strong>If you're seeing authentication errors:</strong>
                      </p>
                      <ul className="text-sm text-yellow-700 space-y-1">
                        <li>1. Try refreshing the page to get a new token</li>
                        <li>2. Sign out and sign back in</li>
                        <li>3. Check that your Auth0 configuration is correct</li>
                        <li>4. Verify that NEON_DATABASE_URL is set in Netlify</li>
                        <li>5. Check the Network tab in browser dev tools</li>
                      </ul>
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default RAGConfigurationPage;
