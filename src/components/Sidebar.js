import React, { memo } from 'react';
import {
  MessageSquare,
  BookOpen,
  FileText,
  ClipboardList
} from 'lucide-react';
import ResourcesView from './ResourcesView';
import LearningPanel from './LearningPanel';

const navItems = [
  { name: 'AI Chat', href: '/', icon: MessageSquare },
  { name: 'Notebook', href: '/notebook', icon: BookOpen },
  { name: 'Policies', href: '/policies', icon: FileText },
  { name: 'SOPs', href: '/sops', icon: ClipboardList }
];

const Sidebar = memo(({ currentResources = [] }) => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (


    </div>
  );
});


Sidebar.displayName = 'Sidebar';

export default Sidebar;
