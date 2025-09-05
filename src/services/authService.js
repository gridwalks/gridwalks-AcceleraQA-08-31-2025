import { createAuth0Client } from '@auth0/auth0-spa-js';
import { AUTH0_CONFIG, ERROR_MESSAGES } from '../config/constants';

class AuthService {
  constructor() {
    this.auth0Client = null;
    this.isInitialized = false;
    this.cachedToken = null;
    this.tokenExpiry = null;
  }

  async initialize() {
    if (this.isInitialized) {
      return this.auth0Client;
    }

    try {
      // Validate required environment variables
      if (!AUTH0_CONFIG.DOMAIN || !AUTH0_CONFIG.CLIENT_ID) {
        throw new Error('Auth0 configuration missing. Please check environment variables.');
      }

      console.log('Initializing Auth0 client...');
      this.auth0Client = await createAuth0Client({
        domain: AUTH0_CONFIG.DOMAIN,
        clientId: AUTH0_CONFIG.CLIENT_ID,
        authorizationParams: {
          redirect_uri: AUTH0_CONFIG.REDIRECT_URI,
          audience: AUTH0_CONFIG.AUDIENCE,
          scope: AUTH0_CONFIG.SCOPE
        }
      });

      this.isInitialized = true;
      console.log('Auth0 client initialized successfully');
      return this.auth0Client;
    } catch (error) {
      console.error('Auth0 initialization failed:', error);
      throw new Error(`Authentication service initialization failed: ${error.message}`);
    }
  }

  async handleRedirectCallback() {
    if (!this.auth0Client) {
      throw new Error('Auth0 client not initialized');
    }

    try {
      await this.auth0Client.handleRedirectCallback();
      // Clean up the URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } catch (error) {
      console.error('Error handling redirect callback:', error);
      throw new Error('Failed to complete authentication');
    }
  }

  async isAuthenticated() {
    if (!this.auth0Client) {
      return false;
    }

    try {
      return await this.auth0Client.isAuthenticated();
    } catch (error) {
      console.error('Error checking authentication status:', error);
      return false;
    }
  }

  async getUser() {
    if (!this.auth0Client) {
      return null;
    }

    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        return null;
      }
      const user = await this.auth0Client.getUser();
      const claims = await this.auth0Client.getIdTokenClaims();
      const roles = claims?.[AUTH0_CONFIG.ROLES_CLAIM] || [];

      return { ...user, roles };
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async getToken() {
    console.log('=== GET TOKEN DEBUG ===');
    
    if (!this.auth0Client) {
      console.error('Auth0 client not initialized');
      throw new Error('Auth0 client not initialized');
    }

    try {
      // Check if user is authenticated first
      const isAuth = await this.isAuthenticated();
      console.log('User is authenticated:', isAuth);
      
      if (!isAuth) {
        console.error('User is not authenticated');
        throw new Error('User is not authenticated');
      }

      // Check if we have a cached token that's still valid
      if (this.cachedToken && this.tokenExpiry && Date.now() < this.tokenExpiry - 60000) {
        console.log('Using cached token (expires in:', Math.round((this.tokenExpiry - Date.now()) / 1000), 'seconds)');
        return this.cachedToken;
      }

      console.log('Getting fresh token from Auth0...');
      
      // Get fresh token with enhanced options
      const token = await this.auth0Client.getTokenSilently({
        authorizationParams: {
          audience: AUTH0_CONFIG.AUDIENCE,
          scope: AUTH0_CONFIG.SCOPE
        },
        // Add caching options
        cacheMode: 'cache-first',
        // Increase timeout for slower connections
        timeoutInSeconds: 30
      });

      if (!token) {
        console.error('No token returned from Auth0');
        throw new Error('No token returned from authentication service');
      }

      console.log('Token received successfully');
      console.log('Token length:', token.length);
      console.log('Token starts correctly:', token.startsWith('eyJ'));

      // Parse token to get expiry
      try {
        const tokenParts = token.split('.');
        if (tokenParts.length === 3) {
          let payload = tokenParts[1];
          while (payload.length % 4) {
            payload += '=';
          }
          
          const decoded = JSON.parse(atob(payload));
          if (decoded.exp) {
            this.tokenExpiry = decoded.exp * 1000; // Convert to milliseconds
            console.log('Token expires at:', new Date(this.tokenExpiry).toISOString());
          }
          
          console.log('Token subject:', decoded.sub);
          console.log('Token audience:', decoded.aud);
        }
      } catch (parseError) {
        console.warn('Could not parse token for caching:', parseError);
      }

      // Cache the token
      this.cachedToken = token;
      
      console.log('=== TOKEN SUCCESS ===');
      return token;

    } catch (error) {
      console.error('=== TOKEN ERROR ===');
      console.error('Error type:', error.constructor.name);
      console.error('Error message:', error.message);
      
      // Clear cached token on error
      this.cachedToken = null;
      this.tokenExpiry = null;

      // Handle specific Auth0 errors
      if (error.error === 'login_required') {
        console.error('Login required - redirecting to login');
        throw new Error('Please sign in again to continue');
      } else if (error.error === 'consent_required') {
        console.error('Consent required');
        throw new Error('Additional consent required');
      } else if (error.error === 'interaction_required') {
        console.error('Interaction required');
        throw new Error('Additional authentication required');
      }

      console.error('=== END TOKEN ERROR ===');
      throw new Error(`Failed to get access token: ${error.message}`);
    }
  }

  async login() {
    if (!this.auth0Client) {
      throw new Error('Auth0 client not initialized');
    }

    try {
      console.log('Initiating login...');
      await this.auth0Client.loginWithRedirect({
        authorizationParams: {
          redirect_uri: AUTH0_CONFIG.REDIRECT_URI,
          audience: AUTH0_CONFIG.AUDIENCE,
          scope: AUTH0_CONFIG.SCOPE
        }
      });
    } catch (error) {
      console.error('Login error:', error);
      throw new Error('Failed to initiate login');
    }
  }

  async logout() {
    if (!this.auth0Client) {
      throw new Error('Auth0 client not initialized');
    }

    try {
      // Clear cached token
      this.cachedToken = null;
      this.tokenExpiry = null;
      
      await this.auth0Client.logout({
        logoutParams: {
          returnTo: AUTH0_CONFIG.LOGOUT_URI
        }
      });
    } catch (error) {
      console.error('Logout error:', error);
      throw new Error('Failed to logout');
    }
  }

  // Clear token cache (useful for debugging)
  clearTokenCache() {
    console.log('Clearing token cache...');
    this.cachedToken = null;
    this.tokenExpiry = null;
  }

  // Get token info for debugging
  getTokenInfo() {
    return {
      hasCachedToken: !!this.cachedToken,
      tokenExpiry: this.tokenExpiry ? new Date(this.tokenExpiry).toISOString() : null,
      isExpired: this.tokenExpiry ? Date.now() > this.tokenExpiry : null,
      timeUntilExpiry: this.tokenExpiry ? Math.round((this.tokenExpiry - Date.now()) / 1000) : null
    };
  }

  handleAuthError(error) {
    console.error('Auth Error:', error);
    
    if (!error.error) {
      return ERROR_MESSAGES.AUTH_ERROR;
    }

    switch (error.error) {
      case 'access_denied':
        return 'Access was denied. Please try signing in again.';
      case 'unauthorized':
        return 'Unauthorized access. Please check your credentials.';
      case 'consent_required':
        return 'Additional consent is required to access this application.';
      case 'interaction_required':
        return 'Additional authentication is required.';
      case 'login_required':
        return 'Please sign in to continue.';
      default:
        return ERROR_MESSAGES.AUTH_ERROR;
    }
  }
}

// Create singleton instance
const authService = new AuthService();

// Export the singleton as default
export default authService;

// Export initialization function
export const initializeAuth = async (setUser, setIsLoadingAuth, initializeWelcomeMessage) => {
  try {
    await authService.initialize();
    
    // Check if user is returning from redirect
    const query = window.location.search;
    if (query.includes("code=") && query.includes("state=")) {
      await authService.handleRedirectCallback();
    }

    // Check if user is authenticated
    const user = await authService.getUser();
    
    if (user) {
      setUser(user);
      // Only call initializeWelcomeMessage if it's provided
      if (typeof initializeWelcomeMessage === 'function') {
        initializeWelcomeMessage();
      }
    }
    
    setIsLoadingAuth(false);
  } catch (error) {
    console.error('Auth initialization error:', error);
    setIsLoadingAuth(false);
  }
};

// Export login function
export const handleLogin = async () => {
  try {
    await authService.login();
  } catch (error) {
    console.error('Login failed:', error);
    // Could show a toast notification here
  }
};

// Export logout function
export const handleLogout = async () => {
  try {
    await authService.logout();
  } catch (error) {
    console.error('Logout failed:', error);
    // Could show a toast notification here
  }
};

// Export getToken function with enhanced error handling
export const getToken = async () => {
  try {
    return await authService.getToken();
  } catch (error) {
    console.error('Token retrieval failed:', error);
    throw error;
  }
};

// Export additional debugging functions
export const clearTokenCache = () => authService.clearTokenCache();
export const getTokenInfo = () => authService.getTokenInfo();
