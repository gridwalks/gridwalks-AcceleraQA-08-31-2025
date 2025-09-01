import { createAuth0Client } from '@auth0/auth0-spa-js';
import { AUTH0_CONFIG, ERROR_MESSAGES } from '../config/constants';

class AuthService {
  constructor() {
    this.auth0Client = null;
    this.isInitialized = false;
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

      return await this.auth0Client.getUser();
    } catch (error) {
      console.error('Error getting user:', error);
      return null;
    }
  }

  async getToken() {
    if (!this.auth0Client) {
      return null;
    }

    try {
      const isAuth = await this.isAuthenticated();
      if (!isAuth) {
        return null;
      }

      return await this.auth0Client.getTokenSilently();
    } catch (error) {
      console.error('Error getting token:', error);
      return null;
    }
  }

  async login() {
    if (!this.auth0Client) {
      throw new Error('Auth0 client not initialized');
    }

    try {
      await this.auth0Client.loginWithRedirect({
        authorizationParams: {
          redirect_uri: AUTH0_CONFIG.REDIRECT_URI
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

// Export the instance and convenience functions
export default authService;

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
      initializeWelcomeMessage();
    }
    
    setIsLoadingAuth(false);
  } catch (error) {
    console.error('Auth initialization error:', error);
    setIsLoadingAuth(false);
  }
};

export const handleLogin = async () => {
  try {
    await authService.login();
  } catch (error) {
    console.error('Login failed:', error);
    // Could show a toast notification here
  }
};

export const handleLogout = async () => {
  try {
    await authService.logout();
  } catch (error) {
    console.error('Logout failed:', error);
    // Could show a toast notification here
  }
};
