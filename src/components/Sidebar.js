import React, { memo } from 'react';
import {
  MessageSquare,
  BookOpen,
  FileText,
  ClipboardList
} from 'lucide-react';
import ResourcesView from './ResourcesView';

const navItems = [
  { name: 'AI Chat', href: '/', icon: MessageSquare },
  { name: 'Notebook', href: '/notebook', icon: BookOpen },
  { name: 'Policies', href: '/policies', icon: FileText },
  { name: 'SOPs', href: '/sops', icon: ClipboardList }
];

const Sidebar = memo(({ currentResources = [] }) => {
  const currentPath = typeof window !== 'undefined' ? window.location.pathname : '';

  return (
    <aside className="lg:col-span-1">
      <nav className="flex flex-col space-y-1 mb-4" aria-label="Primary">
        {navItems.map(({ name, href, icon: Icon }) => {
          const isActive = currentPath === href;
          return (
            <a
              key={name}
              href={href}
              aria-label={name}
              className={`flex items-center space-x-3 px-4 py-2 rounded-md transition-colors focus:outline-none focus:ring-2 focus:ring-primary-dark ${
                isActive
                  ? 'bg-primary text-white'
                  : 'text-gray-700 hover:bg-primary-light hover:text-white'
              }`}
            >
              <Icon className="h-5 w-5" aria-hidden="true" />
              <span className="hidden md:inline">{name}</span>
            </a>
          );
        })}
      </nav>
      <div className="hidden lg:block">
        <ResourcesView currentResources={currentResources} />
      </div>
    </aside>
  );
});

Sidebar.displayName = 'Sidebar';

export default Sidebar;
