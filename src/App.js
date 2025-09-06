// Complete layout fix for App.js with optimal column widths

import React, { useState, useEffect, useRef, useMemo, useCallback } from 'react';

// Components
import Header from './components/Header';
import ChatArea from './components/ChatArea';
import Sidebar from './components/Sidebar';
import AuthScreen from './components/AuthScreen';
import LoadingScreen from './components/LoadingScreen';
import ErrorBoundary from './components/ErrorBoundary';
import RAGConfigurationPage from './components/RAGConfigurationPage';
import AdminScreen from './components/AdminScreen';

// ... other imports remain the same ...

function App() {
  // ... all your existing state and logic remains the same ...

  return (
    <ErrorBoundary>
      {!isAuthenticated ? (
        <AuthScreen />
      ) : loading ? (
        <LoadingScreen />
      ) : showRAGConfig ? (
        <RAGConfigurationPage 
          onClose={handleCloseRAGConfig}
          user={user}
        />
      ) : showAdmin ? (
        <AdminScreen 
          onClose={handleCloseAdmin}
          user={user}
        />
      ) : (
        <div className="min-h-screen bg-gray-50">
          {/* Header remains the same */}
          <Header
            user={user}
            showNotebook={showNotebook}
            setShowNotebook={setShowNotebook}
            clearChat={clearChat}
            exportNotebook={handleExport}
            clearAllConversations={clearAllConversations}
            isServerAvailable={isServerAvailable}
            onShowRAGConfig={handleShowRAGConfig}
            isAdmin={isAdmin}
            onShowAdmin={handleShowAdmin}
            isSaving={isSaving}
            lastSaveTime={lastSaveTime}
            onRefresh={handleRefreshConversations}
          />

          {/* IMPROVED LAYOUT SECTION */}
          <div className="h-[calc(100vh-64px)]">
            
            {/* Mobile Layout (stacked vertically) */}
            <div className="lg:hidden h-full flex flex-col">
              {/* Chat takes most space on mobile */}
              <div className="flex-1 min-h-0 p-4">
                <ChatArea
                  messages={messages}
                  inputMessage={inputMessage}
                  setInputMessage={setInputMessage}
                  isLoading={isLoading}
                  handleSendMessage={handleSendMessage}
                  handleKeyPress={handleKeyPress}
                  messagesEndRef={messagesEndRef}
                  ragEnabled={ragEnabled}
                  setRAGEnabled={setRAGEnabled}
                  isSaving={isSaving}
                />
              </div>
              
              {/* Sidebar is collapsible on mobile */}
              <div className="flex-shrink-0 border-t bg-white max-h-60 overflow-hidden">
                <Sidebar 
                  showNotebook={showNotebook}
                  messages={messages}
                  thirtyDayMessages={thirtyDayMessages}
                  selectedMessages={selectedMessages}
                  setSelectedMessages={setSelectedMessages}
                  exportSelected={handleExportSelected}
                  clearSelected={clearSelectedMessages}
                  clearAllConversations={clearAllConversations}
                  isServerAvailable={isServerAvailable}
                  onRefresh={handleRefreshConversations}
                />
              </div>
            </div>

            {/* Desktop Layout (side by side) */}
            <div className="hidden lg:flex h-full">
              {/* Chat Area - Takes majority of space */}
              <div className="flex-1 min-w-0 p-6">
                <ChatArea
                  messages={messages}
                  inputMessage={inputMessage}
                  setInputMessage={setInputMessage}
                  isLoading={isLoading}
                  handleSendMessage={handleSendMessage}
                  handleKeyPress={handleKeyPress}
                  messagesEndRef={messagesEndRef}
                  ragEnabled={ragEnabled}
                  setRAGEnabled={setRAGEnabled}
                  isSaving={isSaving}
                />
              </div>
              
              {/* Sidebar - Fixed optimal width */}
              <div className="w-80 xl:w-96 flex-shrink-0 border-l bg-white p-6">
                <Sidebar 
                  showNotebook={showNotebook}
                  messages={messages}
                  thirtyDayMessages={thirtyDayMessages}
                  selectedMessages={selectedMessages}
                  setSelectedMessages={setSelectedMessages}
                  exportSelected={handleExportSelected}
                  clearSelected={clearSelectedMessages}
                  clearAllConversations={clearAllConversations}
                  isServerAvailable={isServerAvailable}
                  onRefresh={handleRefreshConversations}
                />
              </div>
            </div>
          </div>
        </div>
      )}
    </ErrorBoundary>
  );
}

export default App;

/* 
EXPLANATION OF THE LAYOUT IMPROVEMENTS:

1. **Mobile-First Responsive Design**:
   - Mobile: Stacked layout with chat taking most space
   - Desktop: Side-by-side layout with optimal proportions

2. **Better Column Proportions**:
   - Chat Area: flex-1 (takes all available space)
   - Sidebar: w-80 xl:w-96 (320px on lg, 384px on xl+)

3. **Improved Space Usage**:
   - Removed max-width constraint that was limiting the layout
   - Chat area now uses full available width
   - Sidebar has consistent, readable width

4. **Better Mobile Experience**:
   - Vertical stacking prevents cramped horizontal layout
   - Sidebar becomes a collapsible bottom panel
   - Chat gets priority on small screens

5. **Flexbox vs Grid Benefits**:
   - More precise control over sizing
   - Better handling of content overflow
   - Easier responsive adjustments

ALTERNATIVE CSS GRID APPROACH:
If you prefer CSS Grid, you can use:
```
<div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_384px] gap-6 h-full">
```

This gives you:
- Mobile: Single column (full width)
- Large: Chat (flexible) + Sidebar (320px)
- XL: Chat (flexible) + Sidebar (384px)
*/
