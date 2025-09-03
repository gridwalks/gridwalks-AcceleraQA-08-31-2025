import React, { memo } from 'react';

const LoadingScreen = memo(() => {
  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="relative mb-8">
          <div className="animate-spin rounded-full h-16 w-16 border-b-2 border-primary-light mx-auto"></div>
          <div className="animate-pulse rounded-full h-12 w-12 bg-primary-light opacity-20 absolute top-2 left-1/2 transform -translate-x-1/2"></div>
        </div>
        <img
          src="/AceleraQA_logo.png"
          alt="AcceleraQA logo"
          width="200"
          height="40"
          className="mx-auto mb-4"
        />
        <p className="text-lg text-gray-300 mb-2">Loading your pharmaceutical AI assistant...</p>
        <p className="text-sm text-gray-500">Initializing secure authentication</p>
      </div>
    </div>
  );
});

LoadingScreen.displayName = 'LoadingScreen';

export default LoadingScreen;
