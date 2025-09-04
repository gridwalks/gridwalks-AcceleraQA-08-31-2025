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
      const fileInput = document.getElementById('file
