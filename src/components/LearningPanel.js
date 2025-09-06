
import React, { memo, useState } from 'react';
import { PlayCircle, ChevronRight } from 'lucide-react';

const mockModules = [
  { id: 1, title: 'GMP Basics', duration: '15m', progress: 0.3 },
  { id: 2, title: 'Deviation Handling', duration: '20m', progress: 0.7 },
  { id: 3, title: 'CAPA Fundamentals', duration: '10m', progress: 0.1 },
];

const LearningPanel = memo(({ modules = mockModules }) => {
  return (
    <div className="bg-white rounded-lg border border-gray-200 p-6 h-full shadow-sm flex flex-col">
      <div className="flex items-center justify-between mb-4">
        <h3 className="text-lg font-bold text-gray-900">Training Modules</h3>
        <PlayCircle className="h-6 w-6 text-gray-400" />
      </div>
      <div className="space-y-4 overflow-y-auto">
        {modules.map(module => (
          <ModuleCard key={module.id} module={module} />
        ))}
        {modules.length === 0 && (
          <p className="text-sm text-gray-500">No modules available.</p>
        )}
      </div>
    </div>
  );
});

const ModuleCard = memo(({ module }) => {
  const [isHovered, setIsHovered] = useState(false);

  return (
    <div
      className="group border border-gray-200 rounded-lg hover:border-gray-400 hover:shadow-sm transition-all duration-300 cursor-pointer"
      onMouseEnter={() => setIsHovered(true)}
      onMouseLeave={() => setIsHovered(false)}
    >
      <div className="p-4">
        <div className="flex items-start justify-between mb-2">
          <h4 className="font-semibold text-gray-900 group-hover:text-black">{module.title}</h4>
          <span className="text-sm text-gray-500">{module.duration}</span>
        </div>
        <div className="h-2 bg-gray-200 rounded-full overflow-hidden">
          <div
            className="h-full bg-blue-500 rounded-full"
            style={{ width: `${Math.round(module.progress * 100)}%` }}
          ></div>
        </div>
        <div className="flex items-center justify-between text-xs text-gray-500 mt-2">
          <span>{Math.round(module.progress * 100)}% complete</span>
          <ChevronRight
            className={`h-4 w-4 text-gray-400 group-hover:text-black transition-all ml-2 flex-shrink-0 ${isHovered ? 'translate-x-1' : ''}`}
          />
        </div>

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


ModuleCard.displayName = 'ModuleCard';

LearningPanel.displayName = 'LearningPanel';

export default LearningPanel;
