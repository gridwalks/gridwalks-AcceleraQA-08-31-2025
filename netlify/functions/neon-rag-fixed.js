// Enhanced server-side authentication handling
const jwt = require('jsonwebtoken');
const jwksClient = require('jwks-rsa');

// JWKS client for Auth0 token verification
const client = jwksClient({
  jwksUri: `https://${process.env.REACT_APP_AUTH0_DOMAIN}/.well-known/jwks.json`,
  requestHeaders: {}, 
  timeout: 30000,
  cache: true,
  rateLimit: true,
  jwksRequestsPerMinute: 5,
  jwksUri: `https://${process.env.REACT_APP_AUTH0_DOMAIN}/.well-known/jwks.json`
});

function getKey(header, callback) {
  client.getSigningKey(header.kid, (err, key) => {
    if (err) {
      console.error('Error getting signing key:', err);
      return callback(err);
    }
    const signingKey = key.publicKey || key.rsaPublicKey;
    callback(null, signingKey);
  });
}

// Enhanced user extraction with JWT verification
const extractUserId = async (event, context) => {
  console.log('=== ENHANCED SERVER-SIDE USER EXTRACTION ===');
  
  let userId = null;
  let source = 'unknown';
  let debugInfo = {};
  
  // Method 1: Direct x-user-id header (most reliable)
  if (event.headers['x-user-id']) {
    userId = event.headers['x-user-id'];
    source = 'x-user-id header';
    debugInfo.foundInHeader = true;
    console.log('✅ Found user ID in x-user-id header');
    return { userId, source, debugInfo };
  }
  
  // Method 2: JWT token verification
  if (event.headers.authorization) {
    try {
      const authHeader = event.headers.authorization;
      
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        const parts = token.split('.');
        
        console.log('JWT parts count:', parts.length);
        debugInfo.jwtPartsCount = parts.length;
        
        if (parts.length === 3) {
          // Standard JWT - verify and decode
          try {
            const decoded = await new Promise((resolve, reject) => {
              jwt.verify(token, getKey, {
                audience: process.env.REACT_APP_AUTH0_AUDIENCE,
                issuer: `https://${process.env.REACT_APP_AUTH0_DOMAIN}/`,
                algorithms: ['RS256']
              }, (err, decoded) => {
                if (err) reject(err);
                else resolve(decoded);
              });
            });
            
            if (decoded && decoded.sub) {
              userId = decoded.sub;
              source = 'JWT verification';
              debugInfo.jwtVerified = true;
              debugInfo.jwtSubject = decoded.sub;
              console.log('✅ JWT verified and user extracted');
            }
          } catch (verifyError) {
            console.error('JWT verification failed:', verifyError.message);
            debugInfo.jwtVerificationError = verifyError.message;
            
            // Fallback: try to decode without verification (less secure)
            try {
              let payload = parts[1];
              while (payload.length % 4) {
                payload += '=';
              }
              
              const decoded = JSON.parse(Buffer.from(payload, 'base64').toString());
              if (decoded.sub) {
                userId = decoded.sub;
                source = 'JWT decode (unverified)';
                debugInfo.jwtUnverified = true;
                console.log('⚠️ JWT decoded without verification');
              }
            } catch (decodeError) {
              console.error('JWT decode failed:', decodeError.message);
              debugInfo.jwtDecodeError = decodeError.message;
            }
          }
        } else if (parts.length === 5) {
          // JWE (encrypted JWT) - cannot decode client-side
          console.log('🔒 JWE token detected - requires server-side decryption');
          debugInfo.jwtType = 'JWE';
          debugInfo.requiresServerDecryption = true;
          
          // For JWE, we need the frontend to send x-user-id header
          // or implement server-side JWE decryption
        }
      }
    } catch (error) {
      console.error('Auth header processing error:', error);
      debugInfo.authProcessingError = error.message;
    }
  }
  
  // Method 3: Netlify context
  if (!userId && context.clientContext?.user?.sub) {
    userId = context.clientContext.user.sub;
    source = 'netlify context';
    debugInfo.foundInContext = true;
    console.log('✅ Found user ID in Netlify context');
  }
  
  // Method 4: Development fallback
  if (!userId && (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true')) {
    userId = 'dev-user-' + Date.now();
    source = 'development fallback';
    debugInfo.developmentFallback = true;
    console.log('⚠️ Using development fallback');
  }
  
  console.log('Final userId:', userId || 'NOT_FOUND');
  console.log('Source:', source);
  console.log('=== END EXTRACTION ===');
  
  return { userId, source, debugInfo };
};
