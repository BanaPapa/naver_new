import React from 'react';
import { Sidebar } from './Sidebar';
import { TabDefinition } from '../types';

interface LayoutProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (id: string) => void;
  children: React.ReactNode;
}

export function Layout({ tabs, activeTab, onTabChange, children }: LayoutProps) {
  return (
    <div className="app-layout">
      <Sidebar tabs={tabs} activeTab={activeTab} onTabChange={onTabChange} />
      <main className="content-area">{children}</main>
    </div>
  );
}
