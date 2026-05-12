import React, { useEffect, useRef } from 'react';
import { LogEntry } from '../types';

interface LogPanelProps {
  logs: LogEntry[];
  onClear: () => void;
}

export function LogPanel({ logs, onClear }: LogPanelProps) {
  const bottomRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [logs]);

  const levelClass = (level: LogEntry['level']) => {
    switch (level) {
      case 'info': return 'log-info';
      case 'warn': return 'log-warn';
      case 'error': return 'log-error';
      case 'success': return 'log-success';
    }
  };

  const levelIcon = (level: LogEntry['level']) => {
    switch (level) {
      case 'info': return '●';
      case 'warn': return '▲';
      case 'error': return '✕';
      case 'success': return '✓';
    }
  };

  const formatTime = (iso: string) => {
    try {
      const d = new Date(iso);
      return d.toLocaleTimeString('ko-KR', { hour12: false });
    } catch {
      return '';
    }
  };

  return (
    <div className="log-panel">
      <div className="panel-header">
        <span className="panel-title">로그</span>
        <button className="btn-ghost btn-sm" onClick={onClear}>
          지우기
        </button>
      </div>

      <div className="log-body">
        {logs.length === 0 ? (
          <div className="log-empty">로그가 없습니다</div>
        ) : (
          logs.map((entry, i) => (
            <div key={i} className={`log-entry ${levelClass(entry.level)}`}>
              <span className="log-time">{formatTime(entry.time)}</span>
              <span className="log-icon">{levelIcon(entry.level)}</span>
              <span className="log-msg">{entry.message}</span>
            </div>
          ))
        )}
        <div ref={bottomRef} />
      </div>
    </div>
  );
}
