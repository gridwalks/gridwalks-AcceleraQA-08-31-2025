-- scripts/setup-neon-database.sql
-- Run this SQL script in your Neon database to set up the RAG schema

-- Enable the pgvector extension for vector similarity search
CREATE EXTENSION IF NOT EXISTS vector;

-- Create enum for document types
CREATE TYPE document_type AS ENUM ('pdf', 'doc', 'docx', 'txt');

-- Create enum for document categories
CREATE TYPE document_category AS ENUM (
    'general', 'gmp', 'validation', 'capa', 
    'regulatory', 'quality', 'sop', 'training'
);

-- Create documents table
CREATE TABLE IF NOT EXISTS rag_documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    filename VARCHAR(500) NOT NULL,
    original_filename VARCHAR(500) NOT NULL,
    file_type document_type NOT NULL,
    file_size INTEGER NOT NULL,
    text_content TEXT NOT NULL,
    metadata JSONB DEFAULT '{}',
    category document_category DEFAULT 'general',
    tags TEXT[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create document chunks table for vector search
CREATE TABLE IF NOT EXISTS rag_document_chunks (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
    chunk_index INTEGER NOT NULL,
    chunk_text TEXT NOT NULL,
    word_count INTEGER NOT NULL,
    character_count INTEGER NOT NULL,
    -- Vector embedding (1536 dimensions for OpenAI text-embedding-3-small)
    embedding vector(1536),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    
    UNIQUE(document_id, chunk_index)
);

-- Create conversations table (enhanced to track RAG usage)
CREATE TABLE IF NOT EXISTS conversations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id VARCHAR(255) NOT NULL,
    messages JSONB NOT NULL,
    metadata JSONB DEFAULT '{}',
    message_count INTEGER NOT NULL,
    used_rag BOOLEAN DEFAULT FALSE,
    rag_documents_referenced UUID[] DEFAULT '{}',
    created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
);

-- Create indexes for optimal performance

-- Documents indexes
CREATE INDEX IF NOT EXISTS idx_rag_documents_user_id ON rag_documents(user_id);
CREATE INDEX IF NOT EXISTS idx_rag_documents_category ON rag_documents(user_id, category);
CREATE INDEX IF NOT EXISTS idx_rag_documents_created ON rag_documents(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_rag_documents_filename ON rag_documents(user_id, filename);
CREATE INDEX IF NOT EXISTS idx_rag_documents_tags ON rag_documents USING GIN(tags);

-- Document chunks indexes
CREATE INDEX IF NOT EXISTS idx_rag_chunks_document_id ON rag_document_chunks(document_id);
CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding ON rag_document_chunks USING ivfflat (embedding vector_cosine_ops);

-- Conversations indexes  
CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id);
CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(user_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_conversations_rag ON conversations(user_id, used_rag);

-- Create function to update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = NOW();
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Create triggers for updated_at
CREATE TRIGGER rag_documents_updated_at
    BEFORE UPDATE ON rag_documents
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

CREATE TRIGGER conversations_updated_at
    BEFORE UPDATE ON conversations
    FOR EACH ROW
    EXECUTE FUNCTION update_updated_at();

-- Create function for cosine similarity search
CREATE OR REPLACE FUNCTION search_similar_chunks(
    query_embedding vector(1536),
    user_id_param VARCHAR(255),
    similarity_threshold FLOAT DEFAULT 0.7,
    max_results INTEGER DEFAULT 10,
    document_ids UUID[] DEFAULT NULL
)
RETURNS TABLE (
    document_id UUID,
    filename VARCHAR,
    chunk_index INTEGER,
    chunk_text TEXT,
    similarity FLOAT,
    document_metadata JSONB
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        c.document_id,
        d.filename,
        c.chunk_index,
        c.chunk_text,
        1 - (c.embedding <=> query_embedding) AS similarity,
        d.metadata
    FROM rag_document_chunks c
    JOIN rag_documents d ON c.document_id = d.id
    WHERE 
        d.user_id = user_id_param
        AND (document_ids IS NULL OR c.document_id = ANY(document_ids))
        AND (1 - (c.embedding <=> query_embedding)) >= similarity_threshold
    ORDER BY c.embedding <=> query_embedding
    LIMIT max_results;
END;
$$ LANGUAGE plpgsql;

-- Create function to get user document statistics
CREATE OR REPLACE FUNCTION get_user_rag_stats(user_id_param VARCHAR(255))
RETURNS TABLE (
    total_documents BIGINT,
    total_chunks BIGINT,
    total_size BIGINT,
    categories_used TEXT[],
    oldest_document TIMESTAMP WITH TIME ZONE,
    newest_document TIMESTAMP WITH TIME ZONE
) AS $$
BEGIN
    RETURN QUERY
    SELECT 
        COUNT(d.id) as total_documents,
        COUNT(c.id) as total_chunks,
        SUM(d.file_size) as total_size,
        ARRAY_AGG(DISTINCT d.category::TEXT) as categories_used,
        MIN(d.created_at) as oldest_document,
        MAX(d.created_at) as newest_document
    FROM rag_documents d
    LEFT JOIN rag_document_chunks c ON d.id = c.document_id
    WHERE d.user_id = user_id_param;
END;
$$ LANGUAGE plpgsql;

-- Sample data cleanup function (for maintenance)
CREATE OR REPLACE FUNCTION cleanup_old_conversations(
    user_id_param VARCHAR(255),
    days_to_keep INTEGER DEFAULT 90
)
RETURNS INTEGER AS $$
DECLARE
    deleted_count INTEGER;
BEGIN
    DELETE FROM conversations 
    WHERE user_id = user_id_param 
    AND created_at < NOW() - INTERVAL '%s days' USING days_to_keep;
    
    GET DIAGNOSTICS deleted_count = ROW_COUNT;
    RETURN deleted_count;
END;
$$ LANGUAGE plpgsql;

-- Grant permissions (adjust as needed for your setup)
-- GRANT ALL PRIVILEGES ON ALL TABLES IN SCHEMA public TO your_app_user;
-- GRANT ALL PRIVILEGES ON ALL SEQUENCES IN SCHEMA public TO your_app_user;
-- GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO your_app_user;

-- Create sample indexes for full-text search (optional)
CREATE INDEX IF NOT EXISTS idx_rag_documents_fts 
ON rag_documents USING gin(to_tsvector('english', text_content));

CREATE INDEX IF NOT EXISTS idx_rag_chunks_fts 
ON rag_document_chunks USING gin(to_tsvector('english', chunk_text));

-- Helpful queries for monitoring and maintenance:

-- View to see document statistics per user
CREATE OR REPLACE VIEW user_document_stats AS
SELECT 
    d.user_id,
    COUNT(d.id) as document_count,
    COUNT(c.id) as chunk_count,
    SUM(d.file_size) as total_size_bytes,
    AVG(c.word_count) as avg_chunk_words,
    MIN(d.created_at) as first_upload,
    MAX(d.created_at) as last_upload
FROM rag_documents d
LEFT JOIN rag_document_chunks c ON d.id = c.document_id
GROUP BY d.user_id;

-- View to see search performance statistics
CREATE OR REPLACE VIEW rag_usage_stats AS
SELECT 
    user_id,
    COUNT(*) as total_conversations,
    COUNT(*) FILTER (WHERE used_rag = true) as rag_conversations,
    COUNT(*) FILTER (WHERE used_rag = false) as non_rag_conversations,
    ROUND(
        COUNT(*) FILTER (WHERE used_rag = true)::numeric / 
        COUNT(*)::numeric * 100, 2
    ) as rag_usage_percentage,
    AVG(message_count) as avg_messages_per_conversation
FROM conversations
GROUP BY user_id;

-- Comments for documentation
COMMENT ON TABLE rag_documents IS 'Stores uploaded documents for RAG search';
COMMENT ON TABLE rag_document_chunks IS 'Stores document chunks with vector embeddings for similarity search';
COMMENT ON TABLE conversations IS 'Stores chat conversations with RAG usage tracking';
COMMENT ON FUNCTION search_similar_chunks IS 'Performs cosine similarity search on document chunks';
COMMENT ON FUNCTION get_user_rag_stats IS 'Returns comprehensive statistics for a user''s RAG documents';

-- Performance tuning recommendations:
-- 1. Adjust ivfflat index parameters based on your data size:
--    CREATE INDEX idx_rag_chunks_embedding ON rag_document_chunks USING ivfflat (embedding vector_cosine_ops) WITH (lists = 100);
-- 2. Consider partitioning large tables by user_id if you have many users
-- 3. Monitor and adjust work_mem for vector operations
-- 4. Use connection pooling for high-traffic applications
