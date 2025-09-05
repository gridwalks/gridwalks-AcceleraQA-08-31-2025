// Enhanced user ID extraction with better JWT handling
const extractUserId = (event, context) => {
  console.log('=== ENHANCED USER ID EXTRACTION ===');
  console.log('Event headers available:', Object.keys(event.headers || {}));
  
  let userId = null;
  let source = 'unknown';
  let debugInfo = {};
  
  // Method 1: Direct x-user-id header (most reliable for Netlify)
  if (event.headers['x-user-id']) {
    userId = event.headers['x-user-id'];
    source = 'x-user-id header';
    debugInfo.foundInHeader = true;
  }
  
  // Method 2: Extract from Authorization Bearer token
  if (!userId && event.headers.authorization) {
    try {
      const authHeader = event.headers.authorization;
      console.log('Processing Authorization header...');
      debugInfo.hasAuthHeader = true;
      
      if (authHeader.startsWith('Bearer ')) {
        const token = authHeader.replace('Bearer ', '');
        debugInfo.tokenLength = token.length;
        
        const parts = token.split('.');
        console.log('JWT parts count:', parts.length);
        
        // Handle different JWT formats
        if (parts.length === 3) {
          // Standard JWT (JWS): header.payload.signature
          try {
            let payload = parts[1];
            // Add padding if needed
            while (payload.length % 4) {
              payload += '=';
            }
            
            const decoded = Buffer.from(payload, 'base64').toString('utf8');
            const parsed = JSON.parse(decoded);
            
            console.log('JWT payload decoded successfully');
            debugInfo.jwtDecoded = true;
            debugInfo.jwtSubject = parsed.sub ? 'present' : 'missing';
            
            if (parsed.sub) {
              userId = parsed.sub;
              source = 'JWT Bearer token (3-part)';
              debugInfo.extractedFromJWT = true;
            }
          } catch (jwtError) {
            console.log('3-part JWT parsing error:', jwtError.message);
            debugInfo.jwtError = jwtError.message;
          }
        } else if (parts.length === 5) {
          // Encrypted JWT (JWE): header.encrypted_key.iv.ciphertext.tag
          console.log('Detected 5-part JWT (JWE - encrypted)');
          debugInfo.jwtType = 'JWE (encrypted)';
          
          // For JWE, we can't decode the payload directly
          // Instead, rely on Auth0's server-side decryption
          // The user ID should be passed via x-user-id header instead
          console.log('Cannot decode JWE payload client-side, need server-side handling');
          debugInfo.requiresServerDecryption = true;
        } else {
          console.log('Unexpected JWT format - parts:', parts.length);
          debugInfo.jwtPartsCount = parts.length;
        }
      } else {
        console.log('Authorization header does not start with Bearer');
        debugInfo.authHeaderFormat = 'not_bearer';
      }
    } catch (error) {
      console.log('Auth header processing error:', error.message);
      debugInfo.authProcessingError = error.message;
    }
  }
  
  // Method 3: Check Netlify context (backup)
  if (!userId && context.clientContext?.user?.sub) {
    userId = context.clientContext.user.sub;
    source = 'context.clientContext.user.sub';
    debugInfo.foundInContext = true;
  }
  
  // Method 4: Development fallback
  if (!userId && (process.env.NODE_ENV === 'development' || process.env.NETLIFY_DEV === 'true')) {
    userId = 'dev-user-' + Date.now();
    source = 'development fallback';
    debugInfo.developmentFallback = true;
    console.log('⚠️ Using development fallback user ID');
  }
  
  console.log('=== EXTRACTION RESULTS ===');
  console.log('Final userId:', userId || 'NOT_FOUND');
  console.log('Source:', source);
  console.log('Debug info:', debugInfo);
  console.log('================================');
  
  return { userId, source, debugInfo };
};
