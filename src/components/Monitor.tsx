import React from 'react';
import { ProgressInfo, DoneSummary } from '../types';
import { CrawlerStatus } from '../hooks/useCrawler';

interface MonitorProps {
  status: CrawlerStatus;
  progress: ProgressInfo | null;
  summary: DoneSummary | null;
  propertyCount: number;
}

export function Monitor({ status, progress, summary, propertyCount }: MonitorProps) {
  const getStatusBadge = () => {
    switch (status) {
      case 'idle': return { label: '대기', cls: 'badge-idle' };
      case 'running': return { label: '수집 중', cls: 'badge-running' };
      case 'done': return { label: '완료', cls: 'badge-done' };
      case 'stopped': return { label: '중지됨', cls: 'badge-stopped' };
      case 'error': return { label: '오류', cls: 'badge-error' };
    }
  };

  const badge = getStatusBadge();

  const progressPct = progress && progress.total > 0
    ? Math.round((progress.current / progress.total) * 100)
    : 0;

  const phaseLabel = progress?.phase === 'search' ? '단지 검색 중' : '매물 수집 중';

  return (
    <div className="monitor-panel">
      <div className="panel-header">
        <span className="panel-title">모니터</span>
        <span className={`status-badge ${badge.cls}`}>{badge.label}</span>
      </div>

      <div className="monitor-stats">
        <div className="stat-card">
          <span className="stat-label">수집된 매물</span>
          <span className="stat-value highlight">{propertyCount.toLocaleString()}</span>
        </div>

        {progress && (
          <>
            <div className="stat-card">
              <span className="stat-label">{phaseLabel}</span>
              <span className="stat-value">
                {progress.current} / {progress.total}
              </span>
            </div>
          </>
        )}

        {summary && (
          <>
            <div className="stat-card">
              <span className="stat-label">완료 단지</span>
              <span className="stat-value">{summary.totalComplexes}</span>
            </div>
            <div className="stat-card">
              <span className="stat-label">소요 시간</span>
              <span className="stat-value">{Math.round(summary.duration / 1000)}초</span>
            </div>
          </>
        )}
      </div>

      {progress && status === 'running' && (
        <div className="progress-section">
          {progress.complexName && (
            <div className="progress-complex-name">
              {progress.complexName}
            </div>
          )}
          <div className="progress-bar-wrapper">
            <div
              className="progress-bar-fill"
              style={{ width: `${progressPct}%` }}
            />
          </div>
          <div className="progress-pct">{progressPct}%</div>
        </div>
      )}
    </div>
  );
}
