// netlify/functions/test-neon-simple.js
// Simple test function to isolate Neon connection issues

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event, context) => {
  console.log('=== SIMPLE NEON TEST FUNCTION ===');
  console.log('Method:', event.httpMethod);
  console.log('Headers present:', Object.keys(event.headers || {}));
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  const testResults = {
    timestamp: new Date().toISOString(),
    environment: process.env.NODE_ENV || 'unknown',
    tests: {}
  };

  // Test 1: Environment variables
  try {
    const neonUrl = process.env.NEON_DATABASE_URL;
    testResults.tests.environment = {
      success: !!neonUrl,
      hasNeonUrl: !!neonUrl,
      neonUrlLength: neonUrl ? neonUrl.length : 0,
      neonUrlStart: neonUrl ? neonUrl.substring(0, 20) + '...' : 'not set'
    };
  } catch (error) {
    testResults.tests.environment = {
      success: false,
      error: error.message
    };
  }

  // Test 2: Neon import
  try {
    const { neon } = await import('@neondatabase/serverless');
    testResults.tests.neonImport = {
      success: true,
      functionType: typeof neon
    };
  } catch (error) {
    testResults.tests.neonImport = {
      success: false,
      error: error.message
    };
  }

  // Test 3: Database connection (if environment is available)
  if (testResults.tests.environment?.success) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.NEON_DATABASE_URL);
      
      console.log('Testing database connection...');
      const [result] = await sql`SELECT 1 as test, NOW() as current_time`;
      
      testResults.tests.databaseConnection = {
        success: true,
        testQuery: result.test,
        currentTime: result.current_time
      };
    } catch (error) {
      console.error('Database connection failed:', error);
      testResults.tests.databaseConnection = {
        success: false,
        error: error.message,
        errorCode: error.code || 'unknown'
      };
    }
  } else {
    testResults.tests.databaseConnection = {
      success: false,
      skipped: 'Environment variables not available'
    };
  }

  // Test 4: Tables check (if connection works)
  if (testResults.tests.databaseConnection?.success) {
    try {
      const { neon } = await import('@neondatabase/serverless');
      const sql = neon(process.env.NEON_DATABASE_URL);
      
      const tables = await sql`
        SELECT table_name 
        FROM information_schema.tables 
        WHERE table_schema = 'public'
      `;
      
      testResults.tests.tablesCheck = {
        success: true,
        tableCount: tables.length,
        tables: tables.map(t => t.table_name)
      };
    } catch (error) {
      testResults.tests.tablesCheck = {
        success: false,
        error: error.message
      };
    }
  }

  // Calculate overall health
  const allTests = Object.values(testResults.tests);
  const successfulTests = allTests.filter(test => test.success).length;
  const totalTests = allTests.length;
  
  testResults.summary = {
    totalTests,
    successfulTests,
    failedTests: totalTests - successfulTests,
    healthScore: Math.round((successfulTests / totalTests) * 100),
    overallStatus: successfulTests === totalTests ? 'healthy' : 
                   successfulTests > totalTests / 2 ? 'partial' : 'unhealthy'
  };

  const statusCode = testResults.summary.overallStatus === 'unhealthy' ? 500 : 200;

  return {
    statusCode,
    headers,
    body: JSON.stringify(testResults, null, 2),
  };
};
