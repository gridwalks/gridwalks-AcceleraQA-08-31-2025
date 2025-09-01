import { createAuth0Client } from '@auth0/auth0-spa-js';

let auth0Client = null;

// Initialize Auth0 client
const initAuth0 = async () => {
  if (!auth0Client) {
    auth0Client = await createAuth0Client({
      domain: process.env.REACT_APP_AUTH0_DOMAIN,
      clientId: process.env.REACT_APP_AUTH0_CLIENT_ID,
      authorizationParams: {
        redirect_uri: window.location.origin,
        audience: process.env.REACT_APP_AUTH0_AUDIENCE
      }
    });
  }
  return auth0Client;
};

export const initializeAuth = async (setUser, setIsLoadingAuth, initializeWelcomeMessage) => {
  try {
    const auth0 = await initAuth0();
    
    // Check if user is returning from redirect
    const query = window.location.search;
    if (query.includes("code=") && query.includes("state=")) {
      await auth0.handleRedirectCallback();
      window.history.replaceState({}, document.title, window.location.pathname);
    }

    // Check if user is authenticated
    const isAuthenticated = await auth0.isAuthenticated();
    
    if (isAuthenticated) {
      const user = await auth0.getUser();
      const token = await auth0.getTokenSilently();
      
      // Store user with token for API calls
      const userWithToken = {
        ...user,
        accessToken: token
      };
      
      setUser(userWithToken);
      
      // Initialize welcome message for authenticated user
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
    const auth0 = await initAuth0();
    await auth0.loginWithRedirect({
      authorizationParams: {
        redirect_uri: window.location.origin
      }
    });
  } catch (error) {
    console.error('Login error:', error);
  }
};

export const handleLogout = async () => {
  try {
    const auth0 = await initAuth0();
    await auth0.logout({
      logoutParams: {
        returnTo: window.location.origin
      }
    });
  } catch (error) {
    console.error('Logout error:', error);
  }
};

export const getAuth0Client = () => auth0Client;
