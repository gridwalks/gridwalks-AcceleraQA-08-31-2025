// Enhanced authService.js with better token handling
export const getToken = async () => {
  console.log('=== ENHANCED GET TOKEN DEBUG ===');
  
  if (!authService.auth0Client) {
    console.error('Auth0 client not initialized');
    throw new Error('Auth0 client not initialized');
  }

  try {
    const isAuth = await authService.isAuthenticated();
    console.log('User is authenticated:', isAuth);
    
    if (!isAuth) {
      console.error('User is not authenticated');
      throw new Error('User is not authenticated');
    }

    // Check cached token first
    if (authService.cachedToken && authService.tokenExpiry && Date.now() < authService.tokenExpiry - 60000) {
      console.log('Using cached token');
      return authService.cachedToken;
    }

    console.log('Getting fresh token from Auth0...');
    
    // Enhanced token request with specific options for JWT format
    const tokenOptions = {
      authorizationParams: {
        audience: AUTH0_CONFIG.AUDIENCE,
        scope: AUTH0_CONFIG.SCOPE
      },
      cacheMode: 'cache-first',
      timeoutInSeconds: 30,
      // Force standard JWT format if possible
      detailedResponse: false
    };

    const token = await authService.auth0Client.getTokenSilently(tokenOptions);

    if (!token) {
      console.error('No token returned from Auth0');
      throw new Error('No token returned from authentication service');
    }

    console.log('Token received successfully');
    console.log('Token length:', token.length);
    console.log('Token starts correctly:', token.startsWith('eyJ'));

    // Enhanced token analysis
    const tokenParts = token.split('.');
    console.log('Token parts count:', tokenParts.length);
    
    if (tokenParts.length === 5) {
      console.warn('⚠️ Received JWE (encrypted JWT) - 5 parts detected');
      console.warn('This may cause issues with client-side parsing');
      console.warn('Consider configuring Auth0 to return JWS (signed JWT) instead');
    } else if (tokenParts.length === 3) {
      console.log('✅ Received JWS (signed JWT) - 3 parts detected');
      
      try {
        let payload = tokenParts[1];
        while (payload.length % 4) {
          payload += '=';
        }
        
        const decoded = JSON.parse(atob(payload));
        if (decoded.exp) {
          authService.tokenExpiry = decoded.exp * 1000;
          console.log('Token expires at:', new Date(authService.tokenExpiry).toISOString());
        }
        
        console.log('Token subject:', decoded.sub);
        console.log('Token audience:', decoded.aud);
      } catch (parseError) {
        console.warn('Could not parse token for caching:', parseError);
      }
    }

    // Cache the token
    authService.cachedToken = token;
    
    console.log('=== TOKEN SUCCESS ===');
    return token;

  } catch (error) {
    console.error('=== TOKEN ERROR ===');
    console.error('Error type:', error.constructor.name);
    console.error('Error message:', error.message);
    
    // Clear cached token on error
    authService.cachedToken = null;
    authService.tokenExpiry = null;

    // Enhanced error handling for specific Auth0 errors
    if (error.error === 'login_required') {
      console.error('Login required - user needs to re-authenticate');
      throw new Error('Please sign in again to continue');
    } else if (error.error === 'consent_required') {
      console.error('Consent required - additional permissions needed');
      throw new Error('Additional consent required');
    } else if (error.error === 'interaction_required') {
      console.error('Interaction required - user action needed');
      throw new Error('Additional authentication required');
    } else if (error.message.includes('timeout')) {
      console.error('Token request timed out');
      throw new Error('Authentication timeout - please try again');
    }

    console.error('=== END TOKEN ERROR ===');
    throw new Error(`Failed to get access token: ${error.message}`);
  }
};
