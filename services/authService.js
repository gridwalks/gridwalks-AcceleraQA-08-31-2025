// Initialize Netlify Identity
let netlifyIdentity = null;
if (typeof window !== 'undefined' && window.netlifyIdentity) {
  netlifyIdentity = window.netlifyIdentity;
}

export const initializeAuth = (setUser, setIsLoadingAuth, initializeWelcomeMessage) => {
  if (netlifyIdentity) {
    netlifyIdentity.init();
    
    // Get current user
    const currentUser = netlifyIdentity.currentUser();
    setUser(currentUser);
    setIsLoadingAuth(false);

    // Listen for authentication events
    netlifyIdentity.on('login', (user) => {
      setUser(user);
      netlifyIdentity.close();
      // Initialize welcome message for new user
      initializeWelcomeMessage();
    });

    netlifyIdentity.on('logout', () => {
      setUser(null);
    });

    netlifyIdentity.on('close', () => {
      // Modal closed
    });
  } else {
    setIsLoadingAuth(false);
  }
};

export const handleLogin = () => {
  if (netlifyIdentity) {
    netlifyIdentity.open();
  }
};

export const handleLogout = () => {
  if (netlifyIdentity) {
    netlifyIdentity.logout();
  }
};
