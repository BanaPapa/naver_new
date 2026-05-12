import { useState, useRef, useCallback } from 'react';
import { Property, LogEntry, ProgressInfo, DoneSummary, CrawlerConfig } from '../types';
import { startCrawler, stopCrawler } from '../services/api';

export type CrawlerStatus = 'idle' | 'running' | 'done' | 'stopped' | 'error';

export interface CrawlerState {
  status: CrawlerStatus;
  logs: LogEntry[];
  progress: ProgressInfo | null;
  properties: Property[];
  summary: DoneSummary | null;
  errorMessage: string | null;
}

export function useCrawler() {
  const [state, setState] = useState<CrawlerState>({
    status: 'idle',
    logs: [],
    progress: null,
    properties: [],
    summary: null,
    errorMessage: null,
  });

  const abortRef = useRef<AbortController | null>(null);

  const start = useCallback((config: CrawlerConfig) => {
    abortRef.current = new AbortController();

    setState({
      status: 'running',
      logs: [],
      progress: null,
      properties: [],
      summary: null,
      errorMessage: null,
    });

    startCrawler(
      config,
      (event) => {
        if (event.type === 'log') {
          setState((prev) => ({
            ...prev,
            logs: [...prev.logs.slice(-499), event.payload],
          }));
        } else if (event.type === 'progress') {
          setState((prev) => ({ ...prev, progress: event.payload }));
        } else if (event.type === 'property') {
          setState((prev) => ({
            ...prev,
            properties: [...prev.properties, event.payload],
          }));
        } else if (event.type === 'done') {
          setState((prev) => ({
            ...prev,
            status: 'done',
            summary: event.payload,
          }));
        } else if (event.type === 'error') {
          setState((prev) => ({
            ...prev,
            status: 'error',
            errorMessage: event.payload,
          }));
        }
      },
      abortRef.current.signal,
    );
  }, []);

  const stop = useCallback(async () => {
    abortRef.current?.abort();
    await stopCrawler();
    setState((prev) => ({ ...prev, status: 'stopped' }));
  }, []);

  const reset = useCallback(() => {
    setState({
      status: 'idle',
      logs: [],
      progress: null,
      properties: [],
      summary: null,
      errorMessage: null,
    });
  }, []);

  return { state, start, stop, reset };
}
