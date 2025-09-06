import React, { memo } from 'react';
import ResourcesView from './ResourcesView';

const Sidebar = memo(({ currentResources }) => {
  return (
    <div className="lg:col-span-1">
      <ResourcesView currentResources={currentResources} />
    </div>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
