import React from 'react';
import { TabDefinition } from '../types';

interface SidebarProps {
  tabs: TabDefinition[];
  activeTab: string;
  onTabChange: (id: string) => void;
}

export function Sidebar({ tabs, activeTab, onTabChange }: SidebarProps) {
  return (
    <aside className="sidebar">
      <div className="sidebar-logo">
        <span className="sidebar-logo-icon">🏠</span>
        <div className="sidebar-logo-text">
          <span className="sidebar-logo-title">부동산</span>
          <span className="sidebar-logo-sub">크롤러</span>
        </div>
      </div>

      <nav className="sidebar-nav">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`sidebar-tab ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => onTabChange(tab.id)}
          >
            <span className="sidebar-tab-icon">{tab.icon}</span>
            <span className="sidebar-tab-label">{tab.label}</span>
          </button>
        ))}
      </nav>

      <div className="sidebar-footer">
        <span className="sidebar-footer-text">v2.0</span>
      </div>
    </aside>
  );
}
