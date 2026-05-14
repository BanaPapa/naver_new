import { getComplexClusters, getArticleList, ComplexItem } from './naverApi';
import { normalizeArticleInfo } from './normalizer';
import { Property, NAVER_TYPE_MAP, isExclusiveSpaceType } from '../types';

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
  legalDivisionCode: string;
  legalDivisionName: string;
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
    const { legalDivisionCode, legalDivisionName, tradeType, realEstateType } = this.opts;

    const naverTypes = NAVER_TYPE_MAP[realEstateType] ?? [];
    if (naverTypes.length === 0) {
      const msg = `상품 유형 코드 미확인: ${realEstateType}`;
      log(this.opts.onLog, 'error', msg);
      this.opts.onError(msg);
      this._running = false;
      return;
    }

    const filtersExclusiveSpace = isExclusiveSpaceType(realEstateType);
    let totalProperties = 0;

    // ─── Phase 1: complexClusters로 단지 목록 수집 ───
    log(
      this.opts.onLog,
      'info',
      `🔍 단지 검색 시작 (유형: ${naverTypes.join('/')}, 법정동: ${legalDivisionCode})`,
    );

    let complexes: ComplexItem[] = [];
    try {
      complexes = await getComplexClusters({
        tradeTypes: [tradeType],
        naverTypes,
        legalDivisionCode,
        legalDivisionName,
        filtersExclusiveSpace,
      });
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      log(this.opts.onLog, 'error', `단지 검색 오류: ${message}`);
      this.opts.onError(message);
      this._running = false;
      return;
    }

    if (this._stopRequested) {
      this.opts.onDone({ totalComplexes: 0, totalProperties: 0, duration: Date.now() - startTime });
      return;
    }

    this.opts.onProgress({
      phase: 'search',
      current: complexes.length,
      total: complexes.length,
      propertyCount: 0,
    });

    log(this.opts.onLog, 'success', `✅ 총 ${complexes.length}개 단지 수집 완료`);

    // ─── Phase 2: 각 단지별 매물 수집 ───
    for (let i = 0; i < complexes.length; i++) {
      if (this._stopRequested) break;

      const complex = complexes[i];
      log(
        this.opts.onLog,
        'info',
        `📦 [${i + 1}/${complexes.length}] 단지 #${complex.complexNumber} 매물 수집 중...`,
      );

      this.opts.onProgress({
        phase: 'crawl',
        current: i + 1,
        total: complexes.length,
        complexName: complex.complexName || `#${complex.complexNumber}`,
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
            if (!complex.complexName && property.complexName) {
              complex.complexName = property.complexName;
            }

            this.opts.onProperty(property);
            totalProperties++;

            const dupList = item.duplicatedArticleInfo?.articleInfoList ?? [];
            for (const dupInfo of dupList) {
              const dupProperty = normalizeArticleInfo(dupInfo, complex.complexNumber, 1);
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
            `  ⚠️ 단지 #${complex.complexNumber} 매물 오류: ${message} — 스킵`,
          );
          break;
        }
      }

      log(
        this.opts.onLog,
        'info',
        `  → ${complex.complexName || `#${complex.complexNumber}`} 완료, 누적 매물: ${totalProperties}건`,
      );

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
    this.opts.onDone({ totalComplexes: complexes.length, totalProperties, duration });
  }
}
