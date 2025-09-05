// Fixed authentication extraction for netlify/functions/neon-rag.js
// Replace the extractUserId function with this improved version

const extractUserId = (event, context) => {
  console.log('=== USER ID EXTRACTION DEBUG ===');
  
  // Log available headers (safely)
  const headerKeys = Object.keys(event.headers || {});
  console.log('Available headers:', headerKeys);
  
  let userId = null;
  let source = 'unknown';
  
  // 1. Direct header (most reliable for Netlify)
  if (event.headers['x-user-id']) {
    userId = event.headers['x-user-id'];
    source = 'x-user-id header';
  }
  
  // 2. Case variations
  if (!userId && event.headers['X-User-ID']) {
    userId = event.headers['X-User-ID'];
    source = 'X-User-ID header';
  }
  
  // 3. Context (less reliable but worth trying)
  if (!userId && context.clientContext?.user?.sub) {
    userId = context.clientContext.user.sub;
    source = 'context.clientContext.user.sub';
  }
  
  // 4. Try to parse from Authorization header (improved)
  if (!userId && event.headers.authorization) {
    try {
      const authHeader = event.headers.authorization;
      console.log('Auth header present:', !!authHeader);
      
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        console.log('Token extracted, length:', token.length);
        
        // Improved JWT parsing with better error handling
        const parts = token.split('.');
        if (parts.length === 3) {
          try {
            // Add padding if needed for base64 decoding
            let payload = parts[1];
            while (payload.length % 4) {
              payload += '=';
            }
            
            const decoded = Buffer.from(payload, 'base64').toString('utf8');
            const parsed = JSON.parse(decoded);
            
            console.log('JWT payload parsed successfully');
            console.log('Payload sub:', parsed.sub ? 'present' : 'missing');
            
            if (parsed.sub) {
              userId = parsed.sub;
              source = 'JWT token payload';
            }
          } catch (jwtError) {
            console.log('JWT parsing error:', jwtError.message);
          }
        } else {
          console.log('Invalid JWT format - wrong number of parts:', parts.length);
        }
      }
    } catch (error) {
      console.log('Auth header processing error:', error.message);
    }
  }
  
  // 5. Fallback to a test user ID for debugging (remove in production)
  if (!userId && process.env.NODE_ENV === 'development') {
    userId = 'debug-user-' + Date.now();
    source = 'debug fallback';
    console.log('Using debug fallback user ID');
  }
  
  console.log('Final userId:', userId);
  console.log('Source:', source);
  console.log('================================');
  
  return { userId, source };
};

// Also add this helper function for better error responses
const createAuthErrorResponse = (userId, source) => {
  return {
    statusCode: 401,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-user-id',
      'Content-Type': 'application/json',
    },
    body: JSON.stringify({ 
      error: 'User authentication required',
      debug: {
        userId: userId || 'none',
        source: source || 'none',
        timestamp: new Date().toISOString(),
        troubleshooting: {
          checkAuthToken: 'Ensure Auth0 token is being sent correctly',
          checkHeaders: 'Verify x-user-id header is set',
          checkNetlify: 'Check Netlify function logs for more details'
        }
      }
    }),
  };
};
