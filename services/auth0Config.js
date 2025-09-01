// Auth0 configuration for AcceleraQA
export const auth0Config = {
  domain: process.env.REACT_APP_AUTH0_DOMAIN,
  clientId: process.env.REACT_APP_AUTH0_CLIENT_ID,
  authorizationParams: {
    redirect_uri: `${window.location.origin}/callback`,
    audience: process.env.REACT_APP_AUTH0_AUDIENCE,
    scope: 'openid profile email'
  },
  // Optional: Custom Auth0 theme
  theme: {
    logo: '/logo.png',
    primaryColor: '#000000'
  }
};

// Validate required environment variables
export const validateAuth0Config = () => {
  const required = [
    'REACT_APP_AUTH0_DOMAIN',
    'REACT_APP_AUTH0_CLIENT_ID'
  ];
  
  const missing = required.filter(key => !process.env[key]);
  
  if (missing.length > 0) {
    throw new Error(`Missing required Auth0 environment variables: ${missing.join(', ')}`);
  }
};

// Auth0 error handling
export const handleAuth0Error = (error) => {
  console.error('Auth0 Error:', error);
  
  switch (error.error) {
    case 'access_denied':
      return 'Access was denied. Please try signing in again.';
    case 'unauthorized':
      return 'Unauthorized access. Please check your credentials.';
    case 'consent_required':
      return 'Additional consent is required to access this application.';
    case 'interaction_required':
      return 'Additional authentication is required.';
    default:
      return 'An authentication error occurred. Please try again.';
  }
};
