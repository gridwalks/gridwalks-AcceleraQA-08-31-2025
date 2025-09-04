// netlify/functions/rag-test.js - Simple test function to debug RAG issues

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
  'Content-Type': 'application/json',
};

exports.handler = async (event, context) => {
  console.log('RAG Test Function called');
  console.log('Method:', event.httpMethod);
  console.log('Headers:', JSON.stringify(event.headers, null, 2));
  console.log('Body length:', event.body ? event.body.length : 0);

  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  try {
    // Test basic function response
    if (event.httpMethod === 'GET') {
      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'RAG test function is working',
          timestamp: new Date().toISOString(),
          environment: process.env.NODE_ENV
        }),
      };
    }

    // Test POST with body parsing
    if (event.httpMethod === 'POST') {
      let requestData = {};
      
      try {
        requestData = JSON.parse(event.body || '{}');
      } catch (parseError) {
        return {
          statusCode: 400,
          headers,
          body: JSON.stringify({ 
            error: 'Invalid JSON in request body',
            details: parseError.message 
          }),
        };
      }

      // Extract user ID
      const userId = event.headers['x-user-id'] || 
                     event.headers['X-User-ID'] || 
                     context.clientContext?.user?.sub ||
                     'test-user';

      // Test blob store access
      let blobTestResult = 'Not tested';
      try {
        const { getStore } = require('@netlify/blobs');
        const testStore = getStore('test-store');
        
        // Try to set and get a test value
        await testStore.set('test-key', 'test-value');
        const testValue = await testStore.get('test-key');
        blobTestResult = testValue === 'test-value' ? 'Success' : 'Failed';
        
        // Clean up
        await testStore.delete('test-key');
      } catch (blobError) {
        blobTestResult = `Error: ${blobError.message}`;
      }

      return {
        statusCode: 200,
        headers,
        body: JSON.stringify({
          message: 'POST test successful',
          receivedData: requestData,
          userId,
          blobTest: blobTestResult,
          timestamp: new Date().toISOString()
        }),
      };
    }

    return {
      statusCode: 405,
      headers,
      body: JSON.stringify({ error: 'Method not allowed' }),
    };

  } catch (error) {
    console.error('Test function error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Internal server error',
        message: error.message,
        stack: error.stack
      }),
    };
  }
};
