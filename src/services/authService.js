// src/services/authService.js - FIXED VERSION

import { createAuth0Client } from '@auth0/auth0-spa-js';

let auth0Client = null;

// Initialize Auth0 client
export const initializeAuth = async (setUser, setIsLoadingAuth, onSuccess) => {
  try {
    console.log('🔐 Initializing Auth0...');

    // Validate environment variables
    const domain = process.env.REACT_APP_AUTH0_DOMAIN;
    const clientId = process.env.REACT_APP_AUTH0_CLIENT_ID;
    
    if (!domain || !clientId) {
      console.error('❌ Auth0 environment variables missing:', { domain: !!domain, clientId: !!clientId });
      throw new Error('Auth0 configuration is incomplete. Please check environment variables.');
    }

    // Create Auth0 client
    auth0Client = await createAuth0Client({
      domain,
      clientId,
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: process.env.REACT_APP_AUTH0_AUDIENCE || `https://${domain}/api/v2/`
      },
      cacheLocation: 'localstorage',
      useRefreshTokens: true
    });

    console.log('✅ Auth0 client created successfully');

    // Check if we're returning from login
    const isCallback = window.location.search.includes('code=') && window.location.search.includes('state=');
    
    if (isCallback) {
      console.log('🔄 Processing Auth0 callback...');
      try {
        await auth0Client.handleRedirectCallback();
        console.log('✅ Auth0 callback processed successfully');
        
        // Clean up URL
        window.history.replaceState({}, document.title, window.location.pathname);
      } catch (error) {
        console.error('❌ Error handling Auth0 callback:', error);
        // Don't throw here, continue to check authentication
      }
    }

    // Check if user is authenticated
    const isAuthenticated = await auth0Client.isAuthenticated();
    console.log('🔍 Authentication status:', isAuthenticated);

    if (isAuthenticated) {
      const user = await auth0Client.getUser();
      console.log('👤 Authenticated user:', user?.sub);
      setUser(user);
      if (onSuccess) onSuccess();
    } else {
      console.log('🔓 User not authenticated');
      setUser(null);
    }

  } catch (error) {
    console.error('❌ Auth0 initialization failed:', error);
    setUser(null);
    throw error;
  } finally {
    setIsLoadingAuth(false);
  }
};

// Login function
export const login = async () => {
  if (!auth0Client) {
    console.error('❌ Auth0 client not initialized');
    throw new Error('Auth0 client not initialized');
  }

  try {
    console.log('🔐 Starting login...');
    await auth0Client.loginWithRedirect({
      authorizationParams: {
        prompt: 'login'
      }
    });
  } catch (error) {
    console.error('❌ Login failed:', error);
    throw error;
  }
};

// Logout function
export const logout = async () => {
  if (!auth0Client) {
    console.error('❌ Auth0 client not initialized');
    return;
  }

  try {
    console.log('🔓 Logging out...');
    await auth0Client.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  } catch (error) {
    console.error('❌ Logout failed:', error);
    throw error;
  }
};

// Get access token - FIXED VERSION
export const getToken = async () => {
  if (!auth0Client) {
    console.error('❌ Auth0 client not initialized');
    throw new Error('Auth0 client not initialized');
  }

  try {
    const isAuthenticated = await auth0Client.isAuthenticated();
    if (!isAuthenticated) {
      console.error('❌ User not authenticated');
      throw new Error('User not authenticated');
    }

    // Get token with proper configuration
    const token = await auth0Client.getTokenSilently({
      authorizationParams: {
        audience: process.env.REACT_APP_AUTH0_AUDIENCE || `https://${process.env.REACT_APP_AUTH0_DOMAIN}/api/v2/`
      }
    });

    console.log('✅ Token retrieved successfully');
    return token;

  } catch (error) {
    console.error('❌ Failed to get token:', error);
    
    // If token retrieval fails, try to re-authenticate
    if (error.error === 'login_required' || error.error === 'consent_required') {
      console.log('🔄 Re-authentication required');
      await login();
      return null;
    }
    
    throw error;
  }
};

// Get token info for debugging
export const getTokenInfo = async () => {
  try {
    const token = await getToken();
    if (!token) return null;

    // Decode JWT payload (without verification - for debugging only)
    const payload = JSON.parse(atob(token.split('.')[1]));
    
    return {
      token: token.substring(0, 20) + '...', // Truncated for security
      payload: {
        sub: payload.sub,
        aud: payload.aud,
        iss: payload.iss,
        exp: new Date(payload.exp * 1000).toISOString(),
        iat: new Date(payload.iat * 1000).toISOString()
      }
    };
  } catch (error) {
    console.error('❌ Failed to get token info:', error);
    return null;
  }
};

// Get user profile
export const getUser = async () => {
  if (!auth0Client) {
    console.error('❌ Auth0 client not initialized');
    return null;
  }

  try {
    const isAuthenticated = await auth0Client.isAuthenticated();
    if (!isAuthenticated) {
      return null;
    }

    return await auth0Client.getUser();
  } catch (error) {
    console.error('❌ Failed to get user:', error);
    return null;
  }
};

// Check if user is authenticated
export const isAuthenticated = async () => {
  if (!auth0Client) {
    return false;
  }

  try {
    return await auth0Client.isAuthenticated();
  } catch (error) {
    console.error('❌ Failed to check authentication:', error);
    return false;
  }
};

// Validate environment setup
export const validateEnvironment = () => {
  const required = [
    'REACT_APP_AUTH0_DOMAIN',
    'REACT_APP_AUTH0_CLIENT_ID'
  ];

  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    console.error('❌ Missing required environment variables:', missing);
    return false;
  }

  console.log('✅ Environment validation passed');
  return true;
};

// Default export for compatibility
const authService = {
  initializeAuth,
  login,
  logout,
  getToken,
  getTokenInfo,
  getUser,
  isAuthenticated,
  validateEnvironment
};

export default authService;
