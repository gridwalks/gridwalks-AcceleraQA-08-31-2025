import React, { useState, useEffect, useRef, useCallback, useMemo } from 'react';

// ... rest of your imports

// Add this useEffect to replace your existing auto-save logic
useEffect(() => {
  const performAutoSave = async () => {
    // Don't save if conditions aren't met
    if (!user || !isInitialized || !isServerAvailable || messages.length === 0) {
      console.log('Auto-save skipped - conditions not met:', {
        hasUser: !!user,
        isInitialized,
        isServerAvailable,
        messageCount: messages.length
      });
      return;
    }
    
    // Skip welcome-only conversations
    if (messages.length === 1 && messages[0].content.includes('Welcome to AcceleraQA')) {
      console.log('Auto-save skipped - welcome message only');
      return;
    }
    
    // Only save if we have a meaningful conversation (at least user + AI exchange)
    const nonWelcomeMessages = messages.filter(msg => 
      !(msg.type === 'ai' && msg.content.includes('Welcome to AcceleraQA'))
    );
    
    if (nonWelcomeMessages.length < 2) {
      console.log('Auto-save skipped - not enough meaningful messages:', nonWelcomeMessages.length);
      return;
    }

    try {
      setIsSaving(true);
      console.log('🔄 Starting auto-save to Neon...', { 
        totalMessages: messages.length,
        meaningfulMessages: nonWelcomeMessages.length,
        userId: user.sub
      });
      
      const metadata = {
        sessionId: Date.now().toString(),
        userAgent: navigator.userAgent,
        timestamp: new Date().toISOString(),
        ragEnabled: ragEnabled,
        autoSave: true,
        meaningfulMessageCount: nonWelcomeMessages.length
      };
      
      // Use the fixed autoSaveConversation function
      await autoSaveConversation(messages, metadata);
      
      setLastSaveTime(new Date());
      console.log('✅ Conversation auto-saved successfully to Neon database');
      
    } catch (error) {
      console.error('❌ Failed to auto-save conversation to Neon:', error);
      
      // If it's an authentication error, try to refresh the user
      if (error.message.includes('Authentication failed') || error.message.includes('401')) {
        console.log('🔄 Authentication error during save, attempting to refresh user...');
        try {
          const refreshedUser = await authService.getUser();
          if (refreshedUser) {
            setUser(refreshedUser);
          }
        } catch (refreshError) {
          console.error('Failed to refresh user:', refreshError);
        }
      }
    } finally {
      setIsSaving(false);
    }
  };

  // Debounce auto-save - only trigger after user stops typing for 3 seconds
  const timeoutId = setTimeout(performAutoSave, 3000);
  
  // Cleanup timeout if component unmounts or dependencies change
  return () => {
    clearTimeout(timeoutId);
  };
}, [messages, user, isInitialized, isServerAvailable, ragEnabled]);

// ALSO ADD: Enhanced error handling for manual save
const handleManualSave = async () => {
  if (!user || !isInitialized || messages.length === 0) {
    alert('Cannot save: Not properly initialized or no messages to save');
    return;
  }

  try {
    setIsSaving(true);
    console.log('🔄 Manual save initiated...');
    
    const metadata = {
      sessionId: Date.now().toString(),
      userAgent: navigator.userAgent,
      timestamp: new Date().toISOString(),
      ragEnabled: ragEnabled,
      manualSave: true
    };
    
    const result = await saveConversation(messages, metadata);
    
    setLastSaveTime(new Date());
    console.log('✅ Manual save successful:', result);
    
    // Show success feedback to user
    alert('Conversation saved successfully!');
    
  } catch (error) {
    console.error('❌ Manual save failed:', error);
    alert(`Save failed: ${error.message}`);
  } finally {
    setIsSaving(false);
  }
};
