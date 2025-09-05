// netlify/functions/auth-test.js
// Simple function to test authentication without database dependencies

const headers = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Content-Type': 'application/json',
};

export const handler = async (event, context) => {
  console.log('=== AUTHENTICATION TEST FUNCTION ===');
  console.log('Method:', event.httpMethod);
  console.log('Headers received:', Object.keys(event.headers || {}));
  
  // Handle CORS preflight
  if (event.httpMethod === 'OPTIONS') {
    return {
      statusCode: 200,
      headers,
      body: JSON.stringify({ message: 'CORS preflight successful' }),
    };
  }

  try {
    const authTest = {
      timestamp: new Date().toISOString(),
      method: event.httpMethod,
      headers: {},
      authentication: {},
      environment: {
        nodeEnv: process.env.NODE_ENV || 'unknown',
        netlifyDev: process.env.NETLIFY_DEV || 'false'
      }
    };

    // Check all headers (safely)
    authTest.headers = {
      total: Object.keys(event.headers || {}).length,
      hasAuthorization: !!event.headers?.authorization,
      hasXUserId: !!event.headers?.['x-user-id'],
      hasUserAgent: !!event.headers?.['user-agent'],
      contentType: event.headers?.['content-type'] || 'not provided'
    };

    // Test Authorization header
    if (event.headers?.authorization) {
      const authHeader = event.headers.authorization;
      authTest.authentication.authHeader = {
        present: true,
        startsWithBearer: authHeader.startsWith('Bearer '),
        length: authHeader.length
      };

      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const parts = token.split('.');
        
        authTest.authentication.jwtToken = {
          hasThreeParts: parts.length === 3,
          headerLength: parts[0]?.length || 0,
          payloadLength: parts[1]?.length || 0,
          signatureLength: parts[2]?.length || 0
        };

        if (parts.length === 3) {
          try {
            // Decode JWT payload
            let payload = parts[1];
            while (payload.length % 4) {
              payload += '=';
            }
            
            const decoded = Buffer.from(payload, 'base64').toString('utf8');
            const parsed = JSON.parse(decoded);
            
            authTest.authentication.jwtPayload = {
              decoded: true,
              hasSub: !!parsed.sub,
              hasExp: !!parsed.exp,
              hasIat: !!parsed.iat,
              subject: parsed.sub || 'not found',
              audience: parsed.aud || 'not found',
              issuer: parsed.iss || 'not found',
              expiresAt: parsed.exp ? new Date(parsed.exp * 1000).toISOString() : 'not found'
            };
          } catch (jwtError) {
            authTest.authentication.jwtPayload = {
              decoded: false,
              error: jwtError.message
            };
          }
        }
      }
    } else {
      authTest.authentication.authHeader = {
        present: false,
        message: 'No Authorization header found'
      };
    }

    // Test x-user-id header
    if (event.headers?.['x-user-id']) {
      authTest.authentication.xUserId = {
        present: true,
        value: event.headers['x-user-id'],
        length: event.headers['x-user-id'].length
      };
    } else {
      authTest.authentication.xUserId = {
        present: false,
        message: 'No x-user-id header found'
      };
    }

    // Test Netlify context
    if (context.clientContext?.user) {
      authTest.authentication.netlifyContext = {
        present: true,
        user: context.clientContext.user
      };
    } else {
      authTest.authentication.netlifyContext = {
        present: false,
        message: 'No Netlify client context found'
      };
    }

    // Determine authentication status
    const isAuthenticated = !!(
      (event.headers?.authorization && event.headers.authorization.startsWith('Bearer ')) ||
      event.headers?.['x-user-id'] ||
      context.clientContext?.user?.sub
    );

    authTest.summary = {
      isAuthenticated,
      recommendedUserId: 
        event.headers?.['x-user-id'] || 
        authTest.authentication.jwtPayload?.subject || 
        context.clientContext?.user?.sub || 
        'none found',
      authenticationMethod: isAuthenticated ? 
        (event.headers?.['x-user-id'] ? 'x-user-id header' :
         authTest.authentication.jwtPayload?.decoded ? 'JWT token' :
         context.clientContext?.user ? 'Netlify context' : 'unknown') : 'none'
    };

    const statusCode = isAuthenticated ? 200 : 401;
    const message = isAuthenticated ? 'Authentication test passed' : 'Authentication test failed';

    return {
      statusCode,
      headers,
      body: JSON.stringify({
        message,
        success: isAuthenticated,
        ...authTest
      }, null, 2),
    };

  } catch (error) {
    console.error('Auth test error:', error);
    return {
      statusCode: 500,
      headers,
      body: JSON.stringify({
        error: 'Auth test function failed',
        message: error.message,
        timestamp: new Date().toISOString()
      }),
    };
  }
};
