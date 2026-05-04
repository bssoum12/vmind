'use client';

import React, { useState } from 'react';
import { Topbar } from './Topbar';
import { Sidebar } from './Sidebar';

interface ShellProps {
  children: React.ReactNode;
  currentView: string;
  onNavigate: (view: string) => void;
  activeCategory: string;
  onSelectCategory: (category: string) => void;
}

export const Shell: React.FC<ShellProps> = ({ children, currentView, onNavigate, activeCategory, onSelectCategory }) => {
  return (
    <div style={{ height: '100vh', display: 'flex', flexDirection: 'column' }}>
      <Topbar currentView={currentView} onNavigate={onNavigate} />
      <div className="shell" style={{ flex: 1, display: 'flex', overflow: 'hidden' }}>
        <Sidebar 
          currentView={currentView} 
          onNavigate={onNavigate} 
          activeCategory={activeCategory}
          onSelectCategory={onSelectCategory}
        />
        <div className="content">
          {children}
        </div>
      </div>
    </div>
  );
};
