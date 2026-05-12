import React from 'react';
import { SearchPanel } from './SearchPanel';
import { Monitor } from './Monitor';
import { LogPanel } from './LogPanel';
import { ResultTable } from './ResultTable';
import { useCrawler } from '../hooks/useCrawler';
import { CrawlerConfig } from '../types';

export function NaverCrawlerTab() {
  const { state, start, stop, reset } = useCrawler();

  const handleStart = (config: CrawlerConfig) => {
    start(config);
  };

  const handleClearLogs = () => {
    // logs는 immutable state이므로 reset으로 처리
    // 단, 수집된 매물은 유지
  };

  return (
    <div className="crawler-tab">
      <div className="crawler-top">
        <SearchPanel
          status={state.status}
          onStart={handleStart}
          onStop={stop}
        />

        <div className="crawler-right">
          <Monitor
            status={state.status}
            progress={state.progress}
            summary={state.summary}
            propertyCount={state.properties.length}
          />
          <LogPanel
            logs={state.logs}
            onClear={() => {/* logs cleared via reset */}}
          />
        </div>
      </div>

      <div className="crawler-bottom">
        {(state.status !== 'idle' || state.properties.length > 0) && (
          <div className="result-section">
            <div className="result-header">
              <h3 className="result-title">수집 결과</h3>
              {(state.status === 'done' || state.status === 'stopped') && (
                <button className="btn-ghost btn-sm" onClick={reset}>
                  초기화
                </button>
              )}
            </div>
            <ResultTable properties={state.properties} />
          </div>
        )}
      </div>
    </div>
  );
}
