import React, { memo } from 'react';
import {
  MessageSquare,
  BookOpen,
  FileText,
  ClipboardList
} from 'lucide-react';

const navItems = [
  { name: 'AI Chat', href: '/', icon: MessageSquare },
  { name: 'Notebook', href: '/notebook', icon: BookOpen },
  { name: 'Policies', href: '/policies', icon: FileText },
  { name: 'SOPs', href: '/sops', icon: ClipboardList }
];

const Sidebar = memo(({ currentResources = [], className = 'lg:col-span-3' }) => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <div className={className}>
      {/* Sidebar content goes here */}
    </div>
  );
});


Sidebar.displayName = 'Sidebar';

export default Sidebar;
