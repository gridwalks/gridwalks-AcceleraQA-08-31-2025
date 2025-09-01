import React from 'react';

const LoadingScreen = () => {
  return (
    <div className="min-h-screen bg-black text-white flex items-center justify-center">
      <div className="text-center">
        <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-white mx-auto mb-4"></div>
        <p className="text-lg">Loading AcceleraQA...</p>
      </div>
    </div>
  );
};

export default LoadingScreen;
