import React, { memo } from 'react';
import ResourcesView from './ResourcesView';
import LearningPanel from './LearningPanel';

const Sidebar = memo(({ currentResources }) => {
  return (
    <div className="lg:col-span-1 flex flex-col gap-8 h-full">
      <div className="flex-1 min-h-0">
        <ResourcesView currentResources={currentResources} />
      </div>
      <div className="flex-1 min-h-0">
        <LearningPanel />
      </div>
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
