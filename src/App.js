// Updated App.js layout section with improved column widths

// ... existing imports and component logic ...

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

        {/* IMPROVED LAYOUT WITH BETTER COLUMN PROPORTIONS */}
        <div className="max-w-full mx-auto px-4 sm:px-6 py-4 sm:py-8 h-[calc(100vh-64px)]">
          <div className="h-full min-h-0 flex flex-col lg:flex-row gap-4 lg:gap-6">
            
            {/* CHAT AREA - Takes majority of space on desktop */}
            <div className="flex-1 lg:flex-[2] min-w-0 order-1 lg:order-1">
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
            
            {/* SIDEBAR - Takes smaller portion, collapses on mobile */}
            <div className="w-full lg:w-80 lg:flex-shrink-0 order-2 lg:order-2">
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

// Alternative layout option using CSS Grid with explicit column sizes
const AlternativeGridLayout = () => (
  <div className="max-w-full mx-auto px-4 sm:px-6 py-4 sm:py-8 h-[calc(100vh-64px)]">
    <div className="grid grid-cols-1 lg:grid-cols-[1fr_320px] xl:grid-cols-[1fr_360px] gap-4 lg:gap-6 h-full min-h-0">
      
      {/* CHAT AREA - Flexible width */}
      <div className="min-w-0 order-1 lg:order-1">
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
      
      {/* SIDEBAR - Fixed width */}
      <div className="order-2 lg:order-2">
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
);

// Additional responsive breakpoint improvements for even better control
const ResponsiveLayout = () => (
  <div className="max-w-full mx-auto h-[calc(100vh-64px)]">
    {/* Mobile/Tablet Layout */}
    <div className="lg:hidden h-full flex flex-col">
      <div className="flex-1 p-4">
        <ChatArea {...chatProps} />
      </div>
      <div className="border-t bg-white">
        <Sidebar {...sidebarProps} />
      </div>
    </div>
    
    {/* Desktop Layout */}
    <div className="hidden lg:flex h-full">
      <div className="flex-1 min-w-0 p-6">
        <ChatArea {...chatProps} />
      </div>
      <div className="w-80 xl:w-96 flex-shrink-0 border-l bg-white p-6">
        <Sidebar {...sidebarProps} />
      </div>
    </div>
  </div>
);
