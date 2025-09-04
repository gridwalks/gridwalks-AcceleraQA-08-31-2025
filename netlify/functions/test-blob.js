// netlify/functions/test-blob.js - Test Netlify Blob connectivity
const { getStore } = require('@netlify/blobs');

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
  console.log('Test Blob Function called');
  console.log('Method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers, null, 2));

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  try {
    const testResults = {
      timestamp: new Date().toISOString(),
      nodeVersion: process.version,
      environment: process.env.NODE_ENV || 'unknown',
      tests: {}
    };

    // Test 1: Basic function response
    testResults.tests.basicFunction = {
      success: true,
      message: 'Function executed successfully'
    };

    // Test 2: Try to get a blob store
    try {
      const testStore = getStore('test-store');
      testResults.tests.blobStoreCreation = {
        success: true,
        message: 'Blob store created successfully'
      };

      // Test 3: Try to set and get a test value
      try {
        const testKey = 'test-key-' + Date.now();
        const testValue = JSON.stringify({ 
          message: 'Hello from Netlify Blobs!', 
          timestamp: new Date().toISOString() 
        });
        
        await testStore.set(testKey, testValue);
        testResults.tests.blobWrite = {
          success: true,
          message: 'Successfully wrote to blob store',
          key: testKey
        };

        // Test 4: Try to read the value back
        const retrievedValue = await testStore.get(testKey);
        
        if (retrievedValue) {
          const parsedValue = JSON.parse(retrievedValue);
          testResults.tests.blobRead = {
            success: true,
            message: 'Successfully read from blob store',
            retrievedData: parsedValue
          };
        } else {
          testResults.tests.blobRead = {
            success: false,
            message: 'Could not retrieve data from blob store'
          };
        }

        // Test 5: Clean up the test data
        try {
          await testStore.delete(testKey);
          testResults.tests.blobDelete = {
            success: true,
            message: 'Successfully deleted test data'
          };
        } catch (deleteError) {
          testResults.tests.blobDelete = {
            success: false,
            message: 'Failed to delete test data',
            error: deleteError.message
          };
        }

      } catch (readWriteError) {
        testResults.tests.blobWrite = {
          success: false,
          message: 'Failed to write/read blob data',
          error: readWriteError.message
        };
      }

    } catch (storeError) {
      testResults.tests.blobStoreCreation = {
        success: false,
        message: 'Failed to create blob store',
        error: storeError.message
      };
    }

    // Test 6: Environment check
    testResults.tests.environment = {
      success: true,
      netlifyContext: !!context.clientContext,
      deployContext: context.clientContext?.context || 'unknown',
      functionName: context.functionName || 'unknown'
    };

    // Calculate overall success
    const allTests = Object.values(testResults.tests);
    const successfulTests = allTests.filter(test => test.success).length;
    const totalTests = allTests.length;
    
    testResults.summary = {
      totalTests,
      successfulTests,
      failedTests: totalTests - successfulTests,
      overallSuccess: successfulTests === totalTests,
      successRate: Math.round((successfulTests / totalTests) * 100)
    };

    return {
      statusCode: 200,
      headers,
      body: JSON.stringify(testResults, null, 2),
    };

  } catch (error) {
    console.error('Test function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Test function failed',
        message: error.message,
        stack: error.stack,
        timestamp: new Date().toISOString()
      }, null, 2),
    };
  }
};
