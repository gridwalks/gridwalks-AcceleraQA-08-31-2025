import React, { memo } from 'react';

const LearningPanel = memo(() => {
  return (
    <div className="lg:col-span-3">
      <div className="rounded-lg border border-gray-200 p-6 h-full shadow-sm bg-white">
        <h2 className="text-lg font-semibold mb-4 text-gray-900">Learning Panel</h2>
        <p className="text-gray-600">Select a topic to start learning.</p>
      </div>
    </div>
  );
});

LearningPanel.displayName = 'LearningPanel';

export default LearningPanel;
