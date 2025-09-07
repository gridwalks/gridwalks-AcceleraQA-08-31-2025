// scripts/setup-neon-database.js
// Run this script to verify your Neon database setup and create necessary tables

import { neon } from '@neondatabase/serverless';
import { readFileSync } from 'fs';
import { join, dirname } from 'path';
import { fileURLToPath } from 'url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = dirname(__filename);

async function setupNeonDatabase() {
  try {
    console.log('🚀 Setting up AcceleraQA Neon PostgreSQL database...');

    // Check for environment variable
    const connectionString = process.env.NEON_DATABASE_URL;
    if (!connectionString) {
      console.error('❌ NEON_DATABASE_URL environment variable is not set');
      console.log('📋 Please set your Neon connection string:');
      console.log('   export NEON_DATABASE_URL="postgresql://user:pass@host/db?sslmode=require"');
      console.log('🔗 Get your connection string from: https://console.neon.tech/');
      process.exit(1);
    }

    // Initialize Neon connection
    const sql = neon(connectionString);
    console.log('✅ Connected to Neon database');

    // Test connection
    try {
      const [result] = await sql`SELECT NOW() as current_time, version() as db_version`;
      console.log('✅ Database connection successful');
      console.log(`   Current time: ${result.current_time}`);
      console.log(`   PostgreSQL version: ${result.db_version.split(' ')[0]} ${result.db_version.split(' ')[1]}`);
    } catch (error) {
      console.error('❌ Failed to connect to database:', error.message);
      process.exit(1);
    }

    // Enable the pgvector extension for vector similarity search (if available)
    try {
      await sql`CREATE EXTENSION IF NOT EXISTS vector`;
      console.log('✅ Vector extension enabled (for future embedding support)');
    } catch (error) {
      console.log('ℹ️  Vector extension not available (embeddings can be added later)');
    }

    // Create enum types
    console.log('📋 Creating database schema...');
    
    await sql`
      DO $ BEGIN
        CREATE TYPE document_type AS ENUM ('pdf', 'doc', 'docx', 'txt');
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $;
    `;

    await sql`
      DO $ BEGIN
        CREATE TYPE document_category AS ENUM (
          'general', 'gmp', 'validation', 'capa', 
          'regulatory', 'quality', 'sop', 'training'
        );
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $;
    `;

    // Create rag_documents table
    await sql`
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
      )
    `;

    // Create rag_document_chunks table
    await sql`
      CREATE TABLE IF NOT EXISTS rag_document_chunks (
        id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
        document_id UUID NOT NULL REFERENCES rag_documents(id) ON DELETE CASCADE,
        chunk_index INTEGER NOT NULL,
        chunk_text TEXT NOT NULL,
        word_count INTEGER NOT NULL,
        character_count INTEGER NOT NULL,
        embedding vector(1536), -- For future OpenAI embeddings
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        
        UNIQUE(document_id, chunk_index)
      )
    `;

    // Create conversations table
    await sql`
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
      )
    `;

    // Create training_resources table
    await sql`
      CREATE TABLE IF NOT EXISTS training_resources (
        id SERIAL PRIMARY KEY,
        name VARCHAR(255) NOT NULL,
        description TEXT,
        url TEXT NOT NULL,
        tag VARCHAR(100),
        created_at TIMESTAMP WITH TIME ZONE DEFAULT NOW(),
        updated_at TIMESTAMP WITH TIME ZONE DEFAULT NOW()
      )
    `;

    console.log('✅ Database tables created successfully');

    // Create indexes for optimal performance
    console.log('📋 Creating database indexes...');

    // Documents indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_documents_user_id ON rag_documents(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_documents_category ON rag_documents(user_id, category)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_documents_created ON rag_documents(user_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_documents_filename ON rag_documents(user_id, filename)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_documents_tags ON rag_documents USING GIN(tags)`;

    // Document chunks indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_chunks_document_id ON rag_document_chunks(document_id)`;
    
    // Try to create vector index if extension is available
    try {
      await sql`CREATE INDEX IF NOT EXISTS idx_rag_chunks_embedding ON rag_document_chunks USING ivfflat (embedding vector_cosine_ops)`;
      console.log('✅ Vector similarity index created');
    } catch (error) {
      console.log('ℹ️  Vector index skipped (will be created when embeddings are implemented)');
    }

    // Conversations indexes  
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_user_id ON conversations(user_id)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_created ON conversations(user_id, created_at DESC)`;
    await sql`CREATE INDEX IF NOT EXISTS idx_conversations_rag ON conversations(user_id, used_rag)`;

    // Full-text search indexes
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_documents_fts ON rag_documents USING gin(to_tsvector('english', text_content))`;
    await sql`CREATE INDEX IF NOT EXISTS idx_rag_chunks_fts ON rag_document_chunks USING gin(to_tsvector('english', chunk_text))`;

    console.log('✅ Database indexes created successfully');

    // Create update trigger function
    await sql`
      CREATE OR REPLACE FUNCTION update_updated_at()
      RETURNS TRIGGER AS $
      BEGIN
        NEW.updated_at = NOW();
        RETURN NEW;
      END;
      $ LANGUAGE plpgsql
    `;

    // Create triggers for updated_at
    await sql`
      DO $ BEGIN
        CREATE TRIGGER rag_documents_updated_at
          BEFORE UPDATE ON rag_documents
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at();
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $;
    `;

    await sql`
      DO $ BEGIN
        CREATE TRIGGER conversations_updated_at
          BEFORE UPDATE ON conversations
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at();
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $;
    `;

    await sql`
      DO $ BEGIN
        CREATE TRIGGER training_resources_updated_at
          BEFORE UPDATE ON training_resources
          FOR EACH ROW
          EXECUTE FUNCTION update_updated_at();
      EXCEPTION
        WHEN duplicate_object THEN null;
      END $;
    `;

    console.log('✅ Database triggers created successfully');

    // Create helper functions
    await sql`
      CREATE OR REPLACE FUNCTION search_similar_chunks(
        query_text TEXT,
        user_id_param VARCHAR(255),
        similarity_threshold FLOAT DEFAULT 0.3,
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
      ) AS $
      BEGIN
        RETURN QUERY
        SELECT 
          c.document_id,
          d.filename,
          c.chunk_index,
          c.chunk_text,
          ts_rank(to_tsvector('english', c.chunk_text), plainto_tsquery('english', query_text)) AS similarity,
          d.metadata
        FROM rag_document_chunks c
        JOIN rag_documents d ON c.document_id = d.id
        WHERE 
          d.user_id = user_id_param
          AND (document_ids IS NULL OR c.document_id = ANY(document_ids))
          AND (
            to_tsvector('english', c.chunk_text) @@ plainto_tsquery('english', query_text)
            OR c.chunk_text ILIKE '%' || query_text || '%'
          )
        ORDER BY similarity DESC
        LIMIT max_results;
      END;
      $ LANGUAGE plpgsql
    `;

    await sql`
      CREATE OR REPLACE FUNCTION get_user_rag_stats(user_id_param VARCHAR(255))
      RETURNS TABLE (
        total_documents BIGINT,
        total_chunks BIGINT,
        total_size BIGINT,
        categories_used TEXT[],
        oldest_document TIMESTAMP WITH TIME ZONE,
        newest_document TIMESTAMP WITH TIME ZONE
      ) AS $
      BEGIN
        RETURN QUERY
        SELECT 
          COUNT(DISTINCT d.id) as total_documents,
          COUNT(c.id) as total_chunks,
          SUM(d.file_size) as total_size,
          ARRAY_AGG(DISTINCT d.category::TEXT) as categories_used,
          MIN(d.created_at) as oldest_document,
          MAX(d.created_at) as newest_document
        FROM rag_documents d
        LEFT JOIN rag_document_chunks c ON d.id = c.document_id
        WHERE d.user_id = user_id_param;
      END;
      $ LANGUAGE plpgsql
    `;

    console.log('✅ Helper functions created successfully');

    // Test the setup with a sample query
    console.log('🧪 Testing database setup...');
    
    const tables = await sql`
      SELECT table_name 
      FROM information_schema.tables 
      WHERE table_schema = 'public' 
      AND table_name IN ('conversations', 'rag_documents', 'rag_document_chunks')
    `;

    console.log(`✅ Found ${tables.length}/3 required tables:`);
    tables.forEach(table => {
      console.log(`   • ${table.table_name}`);
    });

    // Test function
    try {
      const testStats = await sql`SELECT * FROM get_user_rag_stats('test-user')`;
      console.log('✅ Helper functions working correctly');
    } catch (error) {
      console.log('⚠️  Helper function test failed:', error.message);
    }

    console.log('\n🎉 AcceleraQA Neon database setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   ✅ Database connection verified');
    console.log('   ✅ Tables created: conversations, rag_documents, rag_document_chunks');
    console.log('   ✅ Indexes created for optimal performance');
    console.log('   ✅ Full-text search enabled');
    console.log('   ✅ Helper functions installed');
    console.log('   ✅ Triggers configured for automatic timestamps');
    console.log('\n🚀 Your AcceleraQA application is ready to use Neon PostgreSQL!');
    console.log('\n📖 Next steps:');
    console.log('   1. Add NEON_DATABASE_URL to your Netlify environment variables');
    console.log('   2. Deploy your functions to Netlify');
    console.log('   3. Test the RAG functionality in your application');

  } catch (error) {
    console.error('❌ Error setting up Neon database:', error);
    console.error('Stack trace:', error.stack);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  setupNeonDatabase();
}

export { setupNeonDatabase };
