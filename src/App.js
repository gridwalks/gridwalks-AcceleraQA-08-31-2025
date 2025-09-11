// App.js - SERVICE INTEGRATION FIX
// Add this to your existing App.js file

import { initializeAllServices, resetAllServices } from './services/serviceInitializer';
import neonService from './services/neonService';
import { getToken } from './services/authService';

// Replace your existing service initialization useEffect with this:

useEffect(() => {
  const initializeConversations = async () => {
    if (!user || isInitialized) return;

    console.log('🔄 User authenticated, initializing services...');

    try {
      // Initialize all services properly
      await initializeAllServices(user);
      
      // Check if Neon service is available
      const serviceAvailable = await neonService.isServiceAvailable();
      setIsServerAvailable(serviceAvailable);
      
      if (!serviceAvailable) {
        console.warn('⚠️ Neon database not available, using session-only mode');
        initializeWelcomeMessage();
        setIsInitialized(true);
        return;
      }
      
      console.log('📥 Loading conversations from Neon database...');
      const loadedMessages = await neonService.loadConversations();
      
      if (loadedMessages && loadedMessages.length > 0) {
        console.log(`✅ Successfully loaded ${loadedMessages.length} messages from Neon database`);
        setStoredMessages(loadedMessages);
        
        const lastAiMessage = loadedMessages
          .filter(msg => msg.type === 'ai' && msg.resources && msg.resources.length > 0)
          .pop();
        
        if (lastAiMessage) {
          setCurrentResources(lastAiMessage.resources);
        } else {
          setCurrentResources(DEFAULT_RESOURCES);
        }
      } else {
        console.log('📝 No stored conversations found in Neon, initializing welcome message');
        initializeWelcomeMessage();
      }
      
      setIsInitialized(true);
      
    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      setIsServerAvailable(false);
      initializeWelcomeMessage();
      setIsInitialized(true);
    }
  };

  if (user && !isInitialized) {
    initializeConversations();
  }
}, [user, isInitialized]);

// Add this cleanup effect as well:
useEffect(() => {
  return () => {
    // Cleanup services when component unmounts or user changes
    if (!user) {
      resetAllServices();
    }
  };
}, [user]);

/* 
ALTERNATIVE APPROACH - If you want to update your existing code:

1. Find your existing useEffect that initializes Neon service
2. Replace the line that looks like:
   await initializeNeonService(user);
   
   With:
   await initializeAllServices(user);

3. Add this import at the top:
   import { initializeAllServices } from './services/serviceInitializer';

4. Remove the old neonService initialization if you have it:
   // Remove: await neonService.initialize(user);
*/
