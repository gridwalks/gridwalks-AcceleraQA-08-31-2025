import React, { memo } from 'react';
import { ArrowLeft } from 'lucide-react';

const AdminScreen = memo(({ onBack }) => {
  return (
    <div className="min-h-screen bg-gray-50 p-8">
      <header className="flex justify-between items-center mb-8">
        <h1 className="text-2xl font-bold">Admin Panel</h1>
        {onBack && (
          <button
            onClick={onBack}
            className="flex items-center space-x-2 px-4 py-2 bg-gray-800 text-white rounded hover:bg-gray-700 transition-colors"
            aria-label="Back to app"
          >
            <ArrowLeft className="h-4 w-4" />
            <span>Back to App</span>
          </button>
        )}
      </header>
      <div className="space-y-4">
        <p className="text-gray-600">Administrative controls and diagnostics go here.</p>
      </div>
    </div>
  );
});

AdminScreen.displayName = 'AdminScreen';

export default AdminScreen;
