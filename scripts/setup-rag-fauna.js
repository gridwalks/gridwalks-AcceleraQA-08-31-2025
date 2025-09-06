// scripts/setup-rag-fauna.js
// Run this script to set up the necessary FaunaDB collections and indexes for RAG functionality

const faunadb = require('faunadb');

// Initialize FaunaDB client - make sure FAUNA_SECRET_KEY is set in your environment
const client = new faunadb.Client({
  secret: process.env.FAUNA_SECRET_KEY,
});

const q = faunadb.query;

async function setupRAGDatabase() {
  try {
    console.log('🚀 Setting up RAG database schema...');

    // 1. Create rag_documents collection
    try {
      await client.query(
        q.CreateCollection({ name: 'rag_documents' })
      );
      console.log('✅ Created rag_documents collection');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  rag_documents collection already exists');
      } else {
        throw error;
      }
    }

    // 2. Create index for documents by user
    try {
      await client.query(
        q.CreateIndex({
          name: 'rag_documents_by_user',
          source: q.Collection('rag_documents'),
          terms: [{ field: ['data', 'userId'] }],
          values: [{ field: ['ref'] }]
        })
      );
      console.log('✅ Created rag_documents_by_user index');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  rag_documents_by_user index already exists');
      } else {
        throw error;
      }
    }

    // 3. Create index for documents by ID (for direct lookups)
    try {
      await client.query(
        q.CreateIndex({
          name: 'rag_documents_by_id',
          source: q.Collection('rag_documents'),
          terms: [{ field: ['ref'] }],
          unique: true
        })
      );
      console.log('✅ Created rag_documents_by_id index');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  rag_documents_by_id index already exists');
      } else {
        throw error;
      }
    }

    // 4. Create index for documents by category (optional, for filtering)
    try {
      await client.query(
        q.CreateIndex({
          name: 'rag_documents_by_category',
          source: q.Collection('rag_documents'),
          terms: [
            { field: ['data', 'userId'] },
            { field: ['data', 'metadata', 'category'] }
          ],
          values: [{ field: ['ref'] }]
        })
      );
      console.log('✅ Created rag_documents_by_category index');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  rag_documents_by_category index already exists');
      } else {
        throw error;
      }
    }

    // 5. Create index for documents by creation date (for sorting)
    try {
      await client.query(
        q.CreateIndex({
          name: 'rag_documents_by_date',
          source: q.Collection('rag_documents'),
          terms: [{ field: ['data', 'userId'] }],
          values: [
            { field: ['data', 'createdAt'] },
            { field: ['ref'] }
          ]
        })
      );
      console.log('✅ Created rag_documents_by_date index');
    } catch (error) {
      if (error.message.includes('already exists')) {
        console.log('ℹ️  rag_documents_by_date index already exists');
      } else {
        throw error;
      }
    }

    console.log('🎉 RAG database setup completed successfully!');
    console.log('\n📋 Summary:');
    console.log('   • rag_documents collection created');
    console.log('   • rag_documents_by_user index created');
    console.log('   • rag_documents_by_id index created');
    console.log('   • rag_documents_by_category index created');
    console.log('   • rag_documents_by_date index created');
    console.log('\n🚀 Your RAG system is ready to use!');

  } catch (error) {
    console.error('❌ Error setting up RAG database:', error);
    process.exit(1);
  }
}

// Run the setup if this script is executed directly
if (require.main === module) {
  setupRAGDatabase();
}

module.exports = { setupRAGDatabase };

// ===========================================
// package.json updates - Add these scripts
// ===========================================

/*
Add these scripts to your package.json:

"scripts": {
  ...existing scripts...,
  "setup-rag": "node scripts/setup-rag-fauna.js",
  "dev:rag": "npm run setup-rag && npm run netlify:dev"
}

Add these dependencies if not already present:

"dependencies": {
  ...existing dependencies...,
  "mammoth": "^1.6.0"  // For Word document processing
}
*/

// ===========================================
// netlify.toml updates - Add RAG function config
// ===========================================

/*
Add this to your existing netlify.toml file:

# RAG function environment
[context.production.environment]
  NODE_ENV = "production"
  GENERATE_SOURCEMAP = "false"
  FAUNA_SECRET_KEY = "" # Add your Fauna secret key here

[context.deploy-preview.environment]
  NODE_ENV = "development"
  FAUNA_SECRET_KEY = "" # Add your Fauna secret key here
  
[context.branch-deploy.environment]
  NODE_ENV = "development"
  FAUNA_SECRET_KEY = "" # Add your Fauna secret key here

# Function settings for RAG
[functions]
  external_node_modules = ["faunadb", "mammoth"]
  node_bundler = "zisi"

# Enhanced security headers (update existing)
[[headers]]
  for = "/*"
  [headers.values]
    X-Frame-Options = "DENY"
    X-XSS-Protection = "1; mode=block"  
    X-Content-Type-Options = "nosniff"
    Referrer-Policy = "strict-origin-when-cross-origin"
    Content-Security-Policy = "default-src 'self'; script-src 'self' https://*.auth0.com https://cdn.auth0.com https://api.openai.com 'unsafe-eval'; style-src 'self' 'unsafe-inline'; img-src 'self' data: https:; connect-src 'self' https://api.openai.com https://*.auth0.com https://*.auth0.io https://*.netlify.app https://db.fauna.com; font-src 'self'; frame-src https://*.auth0.com; worker-src 'self' blob:; object-src 'none';"
*/

// ===========================================
// Environment Variables Guide
// ===========================================

/*
Add these environment variables to your .env file and Netlify dashboard:

# Existing variables
REACT_APP_OPENAI_API_KEY=your_openai_api_key
REACT_APP_AUTH0_DOMAIN=your-domain.auth0.com
REACT_APP_AUTH0_CLIENT_ID=your_client_id

# New RAG variables
FAUNA_SECRET_KEY=your_fauna_secret_key

To get your Fauna secret key:
1. Go to https://dashboard.fauna.com/
2. Create a new database or use existing
3. Go to Security tab
4. Create a new key with "Server" role
5. Copy the secret key

For Netlify deployment:
1. Go to your site dashboard
2. Site settings > Environment variables
3. Add FAUNA_SECRET_KEY with your secret key value
*/

// ===========================================
// Setup Instructions
// ===========================================

/*
1. Install new dependencies:
   npm install mammoth

2. Set up environment variables:
   - Add FAUNA_SECRET_KEY to your .env file
   - Add FAUNA_SECRET_KEY to Netlify environment variables

3. Set up FaunaDB schema:
   npm run setup-rag

4. Deploy to Netlify:
   git add .
   git commit -m "Add RAG functionality"
   git push

5. Test the functionality:
   - Open your deployed app
   - Click "RAG Config" in the header
   - Upload a test document
   - Try searching and testing RAG responses

The RAG system will now:
- Allow users to upload PDF, DOC, DOCX, and TXT files
- Process documents into searchable chunks
- Generate embeddings using OpenAI's embedding API
- Store everything in FaunaDB
- Enable semantic search across uploaded documents
- Generate AI responses using retrieved document context
*/
