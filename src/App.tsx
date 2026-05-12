import React, { useState } from 'react';
import { Layout } from './components/Layout';
import { NaverCrawlerTab } from './components/NaverCrawlerTab';
import { CookieSettings } from './components/CookieSettings';
import { TabDefinition } from './types';

const TABS: TabDefinition[] = [
  { id: 'naver', label: '네이버 매물', icon: '🏠' },
  { id: 'settings', label: '설정', icon: '⚙️' },
];

export default function App() {
  const [activeTab, setActiveTab] = useState('naver');

  return (
    <Layout tabs={TABS} activeTab={activeTab} onTabChange={setActiveTab}>
      {activeTab === 'naver' && <NaverCrawlerTab />}
      {activeTab === 'settings' && <CookieSettings />}
    </Layout>
  );
}
