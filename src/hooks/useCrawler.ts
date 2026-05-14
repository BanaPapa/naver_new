import { useState, useRef, useCallback } from 'react';
import { Property } from '../types';
import { CrawlerService, LogEntry, ProgressInfo, DoneSummary } from '../services/crawler';
import { CrawlerConfig } from '../types';

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

  const crawlerRef = useRef<CrawlerService | null>(null);

  const start = useCallback((config: CrawlerConfig) => {
    crawlerRef.current?.stop();
    crawlerRef.current = null;

    setState({
      status: 'running',
      logs: [],
      progress: null,
      properties: [],
      summary: null,
      errorMessage: null,
    });

    const crawler = new CrawlerService({
      legalDivisionCode: config.legalDivisionCode,
      legalDivisionName: config.legalDivisionName,
      tradeType: config.tradeType,
      realEstateType: config.realEstateType,
      spcMin: config.spcMin,
      spcMax: config.spcMax,
      onLog: (msg: LogEntry) => {
        setState((prev) => ({
          ...prev,
          logs: [...prev.logs.slice(-499), msg],
        }));
      },
      onProgress: (progress: ProgressInfo) => {
        setState((prev) => ({ ...prev, progress }));
      },
      onProperty: (property: Property) => {
        setState((prev) => ({
          ...prev,
          properties: [...prev.properties, property],
        }));
      },
      onDone: (summary: DoneSummary) => {
        setState((prev) => ({
          ...prev,
          status: 'done',
          summary,
        }));
      },
      onError: (err: string) => {
        setState((prev) => ({
          ...prev,
          status: 'error',
          errorMessage: err,
        }));
      },
    });

    crawlerRef.current = crawler;
    crawler.start().catch((err: unknown) => {
      const message = err instanceof Error ? err.message : String(err);
      setState((prev) => ({
        ...prev,
        status: 'error',
        errorMessage: message,
      }));
    });
  }, []);

  const stop = useCallback(() => {
    crawlerRef.current?.stop();
    setState((prev) => ({ ...prev, status: 'stopped' }));
  }, []);

  const reset = useCallback(() => {
    crawlerRef.current?.stop();
    crawlerRef.current = null;
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
