import { searchComplexes, getArticleList, ComplexItem } from './naverApi';
import { normalizeArticleInfo } from './normalizer';
import { Property } from '../types';

export interface LogEntry {
  level: 'info' | 'warn' | 'error' | 'success';
  message: string;
  time: string;
}

export interface ProgressInfo {
  phase: 'search' | 'crawl';
  current: number;
  total: number;
  complexName?: string;
  propertyCount: number;
}

export interface DoneSummary {
  totalComplexes: number;
  totalProperties: number;
  duration: number;
}

export interface CrawlerOptions {
  keyword: string;
  tradeType: string;
  realEstateType: string;
  spcMin: number;
  spcMax: number;
  onLog: (msg: LogEntry) => void;
  onProgress: (progress: ProgressInfo) => void;
  onProperty: (property: Property) => void;
  onDone: (summary: DoneSummary) => void;
  onError: (err: string) => void;
}

function log(onLog: (msg: LogEntry) => void, level: LogEntry['level'], message: string) {
  onLog({ level, message, time: new Date().toISOString() });
}

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

export class CrawlerService {
  private opts: CrawlerOptions;
  private _running = false;
  private _stopRequested = false;

  constructor(opts: CrawlerOptions) {
    this.opts = opts;
  }

  isRunning(): boolean {
    return this._running;
  }

  stop(): void {
    this._stopRequested = true;
    this._running = false;
  }

  async start(): Promise<void> {
    this._running = true;
    this._stopRequested = false;
    const startTime = Date.now();
    const { keyword, tradeType } = this.opts;

    let totalProperties = 0;
    const complexes: ComplexItem[] = [];

    // Phase 1: 단지 목록 수집
    log(this.opts.onLog, 'info', `🔍 단지 검색 시작: "${keyword}"`);
    let page = 0;
    let hasNextPage = true;

    while (hasNextPage && !this._stopRequested) {
      try {
        const result = await searchComplexes(keyword, page, 10);
        complexes.push(...result.list);
        hasNextPage = result.hasNextPage;

        this.opts.onProgress({
          phase: 'search',
          current: complexes.length,
          total: result.totalCount,
          propertyCount: totalProperties,
        });

        log(
          this.opts.onLog,
          'info',
          `  단지 ${complexes.length}/${result.totalCount} 수집됨 (페이지 ${page + 1})`,
        );

        page++;
        if (hasNextPage) await randomDelay(500, 1500);
      } catch (err: unknown) {
        const message = err instanceof Error ? err.message : String(err);
        log(this.opts.onLog, 'error', `단지 검색 오류: ${message}`);
        break;
      }
    }

    if (this._stopRequested) {
      this.opts.onDone({
        totalComplexes: complexes.length,
        totalProperties,
        duration: Date.now() - startTime,
      });
      return;
    }

    log(this.opts.onLog, 'success', `✅ 총 ${complexes.length}개 단지 수집 완료`);

    // Phase 2: 각 단지별 매물 수집
    for (let i = 0; i < complexes.length; i++) {
      if (this._stopRequested) break;

      const complex = complexes[i];
      log(
        this.opts.onLog,
        'info',
        `📦 [${i + 1}/${complexes.length}] ${complex.complexName} (${complex.complexNumber}) 매물 수집 중...`,
      );

      this.opts.onProgress({
        phase: 'crawl',
        current: i + 1,
        total: complexes.length,
        complexName: complex.complexName,
        propertyCount: totalProperties,
      });

      let artHasNext = true;
      let lastInfoCursor: unknown[] = [];

      while (artHasNext && !this._stopRequested) {
        try {
          const artResult = await getArticleList({
            complexNumber: complex.complexNumber,
            tradeTypes: [tradeType],
            lastInfoCursor,
            size: 20,
          });

          for (const item of artResult.list) {
            const mainInfo = item.representativeArticleInfo;
            const realtorCount = item.duplicatedArticleInfo?.realtorCount ?? 1;

            const property = normalizeArticleInfo(mainInfo, complex.complexNumber, realtorCount);
            if (!property.complexName) property.complexName = complex.complexName;

            this.opts.onProperty(property);
            totalProperties++;

            // duplicatedArticleInfo의 중개사별 매물도 개별 Property로 변환
            const dupList = item.duplicatedArticleInfo?.articleInfoList ?? [];
            for (const dupInfo of dupList) {
              const dupProperty = normalizeArticleInfo(dupInfo, complex.complexNumber, 1);
              if (!dupProperty.complexName) dupProperty.complexName = complex.complexName;
              this.opts.onProperty(dupProperty);
              totalProperties++;
            }
          }

          artHasNext = artResult.hasNextPage;
          lastInfoCursor = artResult.lastInfo ?? [];

          if (artHasNext) await randomDelay(500, 1500);
        } catch (err: unknown) {
          const message = err instanceof Error ? err.message : String(err);
          log(
            this.opts.onLog,
            'warn',
            `  ⚠️ ${complex.complexName} 매물 오류: ${message} — 스킵`,
          );
          break;
        }
      }

      log(this.opts.onLog, 'info', `  → 누적 매물: ${totalProperties}건`);

      // 단지 간 딜레이
      if (i < complexes.length - 1 && !this._stopRequested) {
        await randomDelay(1000, 3000);
      }
    }

    const duration = Date.now() - startTime;
    log(
      this.opts.onLog,
      'success',
      `🎉 크롤링 완료: ${complexes.length}개 단지, ${totalProperties}건 매물, ${Math.round(duration / 1000)}초 소요`,
    );

    this._running = false;
    this.opts.onDone({
      totalComplexes: complexes.length,
      totalProperties,
      duration,
    });
  }
}
