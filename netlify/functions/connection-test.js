// netlify/functions/connection-test.js
// Production connection test that runs in Netlify environment

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event, context) => {
  console.log('🔍 PRODUCTION CONNECTION TEST STARTING...');
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return { statusCode: 200, headers, body: JSON.stringify({ message: 'CORS OK' }) };
  }

  const testResults = {
    timestamp: new Date().toISOString(),
    environment: 'netlify-production',
    netlifyContext: context.awsRequestId || 'unknown',
    tests: {},
    recommendations: []
  };

  // Test 1: Environment Variables
  console.log('📋 Testing environment variables...');
  try {
    const neonUrl = process.env.NEON_DATABASE_URL;
    const openaiKey = process.env.REACT_APP_OPENAI_API_KEY;
    const auth0Domain = process.env.REACT_APP_AUTH0_DOMAIN;
    
    testResults.tests.environmentVariables = {
      success: true,
      variables: {
        NEON_DATABASE_URL: {
          present: !!neonUrl,
          length: neonUrl ? neonUrl.length : 0,
          startsWithPostgresql: neonUrl ? neonUrl.startsWith('postgresql://') : false,
          hasSslMode: neonUrl ? neonUrl.includes('sslmode=require') : false,
          hostExtracted: neonUrl ? extractHostFromUrl(neonUrl) : null
        },
        REACT_APP_OPENAI_API_KEY: {
          present: !!openaiKey,
          length: openaiKey ? openaiKey.length : 0,
          startsWithSk: openaiKey ? openaiKey.startsWith('sk-') : false
        },
        REACT_APP_AUTH0_DOMAIN: {
          present: !!auth0Domain,
          length: auth0Domain ? auth0Domain.length : 0,
          isAuth0Format: auth0Domain ? auth0Domain.includes('.auth0.com') : false
        }
      }
    };

    // Add recommendations based on env var issues
    if (!neonUrl) {
      testResults.recommendations.push('❌ NEON_DATABASE_URL not set in Netlify environment variables');
    } else if (!neonUrl.includes('sslmode=require')) {
      testResults.recommendations.push('⚠️ Add ?sslmode=require to NEON_DATABASE_URL');
    }

  } catch (error) {
    testResults.tests.environmentVariables = {
      success: false,
      error: error.message
    };
  }

  // Test 2: Neon Package Import
  console.log('📦 Testing Neon package import...');
  try {
    const { neon } = await import('@neondatabase/serverless');
    testResults.tests.neonPackage = {
      success: true,
      neonType: typeof neon,
      imported: 'successfully'
    };
  } catch (error) {
    console.error('Neon import failed:', error);
    testResults.tests.neonPackage = {
      success: false,
      error: error.message,
      stack: error.stack
    };
    testResults.recommendations.push('❌ @neondatabase/serverless package import failed - check package.json');
  }

  // Test 3: Database Connection
  if (testResults.tests.environmentVariables?.success && 
      testResults.tests.neonPackage?.success && 
      process.env.NEON_DATABASE_URL) {
    
    console.log('🔄 Testing database connection...');
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.NEON_DATABASE_URL);
      
      // Test basic connection with timeout
      const startTime = Date.now();
      const [result] = await Promise.race([
        sql`SELECT 
          1 as test_value,
          NOW() as current_time,
          version() as db_version,
          current_database() as database_name,
          current_user as db_user
        `,
        new Promise((_, reject) => 
          setTimeout(() => reject(new Error('Connection timeout after 10 seconds')), 10000)
        )
      ]);
      const connectionTime = Date.now() - startTime;

      testResults.tests.databaseConnection = {
        success: true,
        connectionTimeMs: connectionTime,
        testValue: result.test_value,
        currentTime: result.current_time,
        databaseVersion: result.db_version,
        databaseName: result.database_name,
        databaseUser: result.db_user
      };

      console.log('✅ Database connection successful');

    } catch (error) {
      console.error('❌ Database connection failed:', error);
      testResults.tests.databaseConnection = {
        success: false,
        error: error.message,
        errorCode: error.code || 'unknown',
        errorDetail: error.detail || 'no additional details'
      };

      // Add specific recommendations based on error type
      if (error.message.includes('ENOTFOUND')) {
        testResults.recommendations.push('❌ Database host not found - check Neon hostname');
      } else if (error.message.includes('authentication failed')) {
        testResults.recommendations.push('❌ Authentication failed - check username/password in connection string');
      } else if (error.message.includes('database') && error.message.includes('does not exist')) {
        testResults.recommendations.push('❌ Database does not exist - check database name');
      } else if (error.message.includes('timeout')) {
        testResults.recommendations.push('❌ Connection timeout - check network and Neon status');
      } else if (error.message.includes('SSL')) {
        testResults.recommendations.push('❌ SSL error - ensure ?sslmode=require in connection string');
      }
    }
  } else {
    testResults.tests.databaseConnection = {
      success: false,
      skipped: 'Prerequisites not met (environment variables or package import failed)'
    };
  }

  // Test 4: Required Tables Check
  if (testResults.tests.databaseConnection?.success) {
    console.log('📋 Checking required tables...');
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.NEON_DATABASE_URL);
      
      const tables = await sql`
        SELECT 
          table_name,
          table_type,
          table_schema
        FROM information_schema.tables 
        WHERE table_schema = 'public'
        ORDER BY table_name
      `;

      const requiredTables = ['conversations', 'rag_documents', 'rag_document_chunks'];
      const existingTables = tables.map(t => t.table_name);
      const missingTables = requiredTables.filter(required => !existingTables.includes(required));

      testResults.tests.tablesCheck = {
        success: missingTables.length === 0,
        totalTables: tables.length,
        existingTables: existingTables,
        requiredTables: requiredTables,
        missingTables: missingTables,
        allTables: tables
      };

      if (missingTables.length > 0) {
        testResults.recommendations.push(`❌ Missing tables: ${missingTables.join(', ')} - run database setup script`);
      }

    } catch (error) {
      testResults.tests.tablesCheck = {
        success: false,
        error: error.message
      };
    }
  }

  // Test 5: Table Record Counts (if tables exist)
  if (testResults.tests.tablesCheck?.success) {
    console.log('📊 Checking table record counts...');
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.NEON_DATABASE_URL);
      
      const counts = {};
      const tables = ['conversations', 'rag_documents', 'rag_document_chunks'];
      
      for (const table of tables) {
        try {
          const [result] = await sql`SELECT COUNT(*) as count FROM ${sql(table)}`;
          counts[table] = parseInt(result.count);
        } catch (error) {
          counts[table] = `Error: ${error.message}`;
        }
      }

      testResults.tests.recordCounts = {
        success: true,
        counts: counts
      };

    } catch (error) {
      testResults.tests.recordCounts = {
        success: false,
        error: error.message
      };
    }
  }

  // Calculate overall health score
  const allTests = Object.values(testResults.tests);
  const successfulTests = allTests.filter(test => test.success).length;
  const totalTests = allTests.length;
  const healthScore = Math.round((successfulTests / totalTests) * 100);

  testResults.summary = {
    totalTests,
    successfulTests,
    failedTests: totalTests - successfulTests,
    healthScore,
    overallStatus: healthScore >= 80 ? '🟢 Healthy' : 
                   healthScore >= 50 ? '🟡 Partial' : '🔴 Unhealthy',
    readyForProduction: healthScore >= 80
  };

  // Add final recommendations
  if (healthScore < 80) {
    testResults.recommendations.push('🔧 Review failed tests above and fix issues before using RAG functionality');
  } else {
    testResults.recommendations.push('🎉 System is ready for production use!');
  }

  console.log(`✅ Test completed. Health score: ${healthScore}%`);

  return {
    statusCode: healthScore >= 50 ? 200 : 500,
    headers,
    body: JSON.stringify(testResults, null, 2),
  };
};

// Helper function to extract host from connection URL
function extractHostFromUrl(url) {
  try {
    const match = url.match(/postgresql:\/\/[^@]*@([^\/]+)/);
    return match ? match[1] : null;
  } catch {
    return null;
  }
}
