// src/components/RAGConfigurationPage.js
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
  BarChart3
} from 'lucide-react';
import ragService from '../services/ragService';

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
  const [uploadMetadata, setUploadMetadata] = useState({
    title: '',
    description: '',
    tags: '',
    category: 'general'
  });

  // Load documents on component mount
  useEffect(() => {
    loadDocuments();
  }, []);

  const loadDocuments = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    
    try {
      const docs = await ragService.getDocuments();
      setDocuments(docs);
    } catch (error) {
      console.error('Error loading documents:', error);
      setError('Failed to load documents. Please try again.');
    } finally {
      setIsLoading(false);
    }
  }, []);

  const handleFileSelect = (event) => {
    const file = event.target.files[0];
    if (file) {
      setSelectedFile(file);
      setUploadMetadata(prev => ({
        ...prev,
        title: file.name.replace(/\.[^/.]+$/, '') // Remove file extension
      }));
    }
  };

  const handleUpload = async () => {
    if (!selectedFile) {
      setError('Please select a file to upload');
      return;
    }

    setIsLoading(true);
    setUploadStatus({ type: 'processing', message: 'Processing document...' });
    setError(null);

    try {
      // Prepare metadata
      const metadata = {
        ...uploadMetadata,
        tags: uploadMetadata.tags.split(',').map(tag => tag.trim()).filter(tag => tag)
      };

      const result = await ragService.uploadDocument(selectedFile, metadata);
      
      setUploadStatus({ 
        type: 'success', 
        message: `Successfully uploaded "${selectedFile.name}" with ${result.chunks} chunks processed` 
      });
      
      // Clear form
      setSelectedFile(null);
      setUploadMetadata({
        title: '',
        description: '',
        tags: '',
        category: 'general'
      });
      
      // Reset file input
      const fileInput = document.getElementById('file-upload');
      if (fileInput) fileInput.value = '';
      
      // Reload documents
      await loadDocuments();
      
    } catch (error) {
      console.error('Error uploading document:', error);
      setUploadStatus({ 
        type: 'error', 
        message: error.message || 'Failed to upload document' 
      });
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
      
      // Clear search results if they contain the deleted document
      setSearchResults(prev => prev.filter(result => result.documentId !== documentId));
      
    } catch (error) {
      console.error('Error deleting document:', error);
      setError(`Failed to delete "${filename}". Please try again.`);
    }
  };

  const handleSearch = async () => {
    if (!searchQuery.trim()) {
      setError('Please enter a search query');
      return;
    }

    setIsSearching(true);
    setError(null);

    try {
      const results = await ragService.searchDocuments(searchQuery, {
        limit: 20,
        threshold: 0.6
      });
      
      setSearchResults(results.results || []);
      
      if (results.results.length === 0) {
        setError('No relevant documents found for your query');
      }
      
    } catch (error) {
      console.error('Error searching documents:', error);
      setError('Failed to search documents. Please try again.');
      setSearchResults([]);
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
      // First search for relevant documents
      const searchResults = await ragService.searchDocuments(searchQuery, {
        limit: 5,
        threshold: 0.7
      });

      if (searchResults.results.length === 0) {
        setError('No relevant documents found to generate response');
        return;
      }

      // Generate RAG response
      const ragResponse = await ragService.generateRAGResponse(searchQuery, searchResults.results);
      
      // Show results in a modal or new tab
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
                <strong>${result.filename}</strong> (Similarity: ${(result.similarity * 100).toFixed(1)}%)
                <br><em>${result.text.substring(0, 200)}...</em>
              </div>
            `).join('')}
          </div>
        </body>
        </html>
      `);
      
    } catch (error) {
      console.error('Error testing RAG:', error);
      setError('Failed to test RAG response. Please try again.');
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
              <p className="text-sm text-gray-500">Upload documents and configure search capabilities</p>
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
              onClick={() => setActiveTab('settings')}
              className={`py-4 px-1 border-b-2 font-medium text-sm ${
                activeTab === 'settings'
                  ? 'border-blue-500 text-blue-600'
                  : 'border-transparent text-gray-500 hover:text-gray-700 hover:border-gray-300'
              }`}
            >
              <div className="flex items-center space-x-2">
                <Settings className="h-4 w-4" />
                <span>Settings</span>
              </div>
            </button>
          </nav>
        </div>

        {/* Content */}
        <div className="p-6 overflow-y-auto max-h-[calc(90vh-180px)]">
          {/* Error Display */}
          {error && (
            <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-lg flex items-start space-x-3">
              <AlertCircle className="h-5 w-5 text-red-500 flex-shrink-0 mt-0.5" />
              <div>
                <p className="text-red-800 font-medium">Error</p>
                <p className="text-red-700 text-sm">{error}</p>
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
                  <span>Upload Document</span>
                </h3>
                
                <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-2">
                      Select File
                    </label>
                    <input
                      id="file-upload"
                      type="file"
                      accept=".pdf,.doc,.docx,.txt"
                      onChange={handleFileSelect}
                      className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-md file:border-0 file:text-sm file:font-medium file:bg-blue-50 file:text-blue-700 hover:file:bg-blue-100"
                    />
                    <p className="text-xs text-gray-500 mt-1">
                      Supported formats: PDF, DOC, DOCX, TXT (max 10MB)
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

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Description
                      </label>
                      <textarea
                        value={uploadMetadata.description}
                        onChange={(e) => setUploadMetadata(prev => ({ ...prev, description: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        rows={3}
                        placeholder="Brief description of the document"
                      />
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-1">
                        Tags
                      </label>
                      <input
                        type="text"
                        value={uploadMetadata.tags}
                        onChange={(e) => setUploadMetadata(prev => ({ ...prev, tags: e.target.value }))}
                        className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                        placeholder="Comma-separated tags"
                      />
                    </div>
                  </div>
                </div>

                <div className="mt-6 flex justify-end">
                  <button
                    onClick={handleUpload}
                    disabled={!selectedFile || isLoading}
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
                    <p className="text-gray-600">Loading documents...</p>
                  </div>
                ) : documents.length === 0 ? (
                  <div className="text-center py-12 bg-gray-50 rounded-lg">
                    <FileText className="h-12 w-12 text-gray-400 mx-auto mb-4" />
                    <h4 className="text-lg font-medium text-gray-900 mb-2">No Documents Yet</h4>
                    <p className="text-gray-600">Upload your first document to get started with RAG search.</p>
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
                          {doc.metadata?.description && (
                            <p><span className="font-medium">Description:</span> {doc.metadata.description}</p>
                          )}
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
                  <span>Search Documents</span>
                </h3>

                <div className="flex space-x-4 mb-4">
                  <input
                    type="text"
                    value={searchQuery}
                    onChange={(e) => setSearchQuery(e.target.value)}
                    placeholder="Enter your search query..."
                    className="flex-1 px-4 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                    onKeyDown={(e) => e.key === 'Enter' && handleSearch()}
                  />
                  <button
                    onClick={handleSearch}
                    disabled={isSearching || !searchQuery.trim()}
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
                    disabled={isSearching || !searchQuery.trim()}
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
                  Search your uploaded documents using semantic similarity. "Test RAG" will generate an AI response using the search results as context.
                </p>
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
                              {(result.similarity * 100).toFixed(1)}% match
                            </span>
                          </div>
                        </div>
                        <p className="text-gray-700 text-sm leading-relaxed bg-gray-50 p-3 rounded-md">
                          {result.text}
                        </p>
                        <div className="mt-2 text-xs text-gray-500">
                          Chunk {result.chunkIndex + 1} • Document ID: {result.documentId}
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              )}
            </div>
          )}

          {/* Settings Tab */}
          {activeTab === 'settings' && (
            <div className="space-y-6">
              <div className="bg-gray-50 p-6 rounded-lg">
                <h3 className="text-lg font-medium text-gray-900 mb-4 flex items-center space-x-2">
                  <Settings className="h-5 w-5" />
                  <span>RAG Settings</span>
                </h3>
                
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Search Similarity Threshold
                      </label>
                      <input
                        type="range"
                        min="0.5"
                        max="0.95"
                        step="0.05"
                        className="w-full"
                        defaultValue="0.7"
                      />
                      <div className="flex justify-between text-xs text-gray-500 mt-1">
                        <span>Less Strict (0.5)</span>
                        <span>More Strict (0.95)</span>
                      </div>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Maximum Results
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="5">5 results</option>
                        <option value="10" selected>10 results</option>
                        <option value="20">20 results</option>
                        <option value="50">50 results</option>
                      </select>
                    </div>

                    <div>
                      <label className="block text-sm font-medium text-gray-700 mb-2">
                        Chunk Size
                      </label>
                      <select className="w-full px-3 py-2 border border-gray-300 rounded-md focus:ring-2 focus:ring-blue-500 focus:border-transparent">
                        <option value="500">500 characters</option>
                        <option value="1000" selected>1000 characters</option>
                        <option value="1500">1500 characters</option>
                        <option value="2000">2000 characters</option>
                      </select>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div className="bg-blue-50 p-4 rounded-lg">
                      <h4 className="font-medium text-blue-900 mb-2">RAG Statistics</h4>
                      <div className="space-y-2 text-sm">
                        <div className="flex justify-between">
                          <span className="text-blue-700">Total Documents:</span>
                          <span className="font-medium text-blue-900">{documents.length}</span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Total Chunks:</span>
                          <span className="font-medium text-blue-900">
                            {documents.reduce((total, doc) => total + doc.chunks, 0)}
                          </span>
                        </div>
                        <div className="flex justify-between">
                          <span className="text-blue-700">Storage Used:</span>
                          <span className="font-medium text-blue-900">
                            {formatFileSize(documents.reduce((total, doc) => total + doc.size, 0))}
                          </span>
                        </div>
                      </div>
                    </div>

                    <div className="bg-yellow-50 p-4 rounded-lg">
                      <h4 className="font-medium text-yellow-900 mb-2">Best Practices</h4>
                      <ul className="text-sm text-yellow-800 space-y-1">
                        <li>• Use descriptive filenames and titles</li>
                        <li>• Add relevant tags and categories</li>
                        <li>• Keep documents focused on specific topics</li>
                        <li>• Test search queries regularly</li>
                        <li>• Remove outdated documents</li>
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
