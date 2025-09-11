// src/services/serviceInitializer.js - Coordinates all service initialization

import neonService, { initializeNeonService } from './neonService';
import { getToken } from './authService';

// Service initialization coordinator
export class ServiceInitializer {
  constructor() {
    this.initialized = false;
    this.currentUser = null;
    this.services = new Map();
  }

  // Initialize all services with proper dependencies
  async initializeServices(user) {
    if (!user || !user.sub) {
      throw new Error('Valid user object required for service initialization');
    }

    console.log('🚀 Starting service initialization for user:', user.sub);
    this.currentUser = user;

    try {
      // 1. Initialize Neon service with auth provider
      console.log('📡 Initializing Neon service...');
      await neonService.initialize(user, getToken);
      this.services.set('neon', neonService);

      // 2. Initialize other services that depend on Neon
      await this.initializeDependentServices(user);

      this.initialized = true;
      console.log('✅ All services initialized successfully');
      
      return {
        success: true,
        services: Array.from(this.services.keys())
      };

    } catch (error) {
      console.error('❌ Service initialization failed:', error);
      throw error;
    }
  }

  // Initialize services that depend on core services
  async initializeDependentServices(user) {
    try {
      // Initialize learning suggestions service if it exists
      if (window.learningSuggestionsService) {
        console.log('🎓 Initializing Learning Suggestions service...');
        await window.learningSuggestionsService.initialize(user, getToken);
        this.services.set('learning', window.learningSuggestionsService);
      }

      // Initialize admin service if it exists
      if (window.adminService) {
        console.log('👑 Initializing Admin service...');
        await window.adminService.initialize(user, getToken);
        this.services.set('admin', window.adminService);
      }

      // Initialize RAG service if it exists
      if (window.ragService) {
        console.log('🔍 Initializing RAG service...');
        await window.ragService.initialize(user, getToken);
        this.services.set('rag', window.ragService);
      }

    } catch (error) {
      console.warn('⚠️ Some dependent services failed to initialize:', error);
      // Don't throw - core functionality can still work
    }
  }

  // Get initialized service
  getService(name) {
    return this.services.get(name);
  }

  // Check if services are initialized
  isInitialized() {
    return this.initialized;
  }

  // Reset all services
  reset() {
    console.log('🔄 Resetting all services...');
    
    // Reset each service
    this.services.forEach((service, name) => {
      if (service.reset && typeof service.reset === 'function') {
        service.reset();
      }
    });

    this.services.clear();
    this.initialized = false;
    this.currentUser = null;
  }

  // Get current user
  getCurrentUser() {
    return this.currentUser;
  }
}

// Create singleton instance
const serviceInitializer = new ServiceInitializer();

// Helper functions for easy access
export const initializeAllServices = async (user) => {
  return await serviceInitializer.initializeServices(user);
};

export const getInitializedService = (name) => {
  return serviceInitializer.getService(name);
};

export const areServicesInitialized = () => {
  return serviceInitializer.isInitialized();
};

export const resetAllServices = () => {
  serviceInitializer.reset();
};

export const getCurrentServiceUser = () => {
  return serviceInitializer.getCurrentUser();
};

export default serviceInitializer;
