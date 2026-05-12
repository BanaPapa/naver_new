import axios, { AxiosError } from 'axios';

const NAVER_BASE = 'https://fin.land.naver.com/front-api/v1';

function getNaverHeaders(): Record<string, string> {
  const cookie = process.env.NAVER_COOKIE || '';
  return {
    Host: 'fin.land.naver.com',
    Accept: 'application/json, text/plain, */*',
    'User-Agent':
      'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
    Referer: 'https://fin.land.naver.com/map',
    Cookie: cookie,
    'Sec-Fetch-Dest': 'empty',
    'Sec-Fetch-Mode': 'cors',
    'Sec-Fetch-Site': 'same-origin',
    'sec-ch-ua-platform': '"Windows"',
    'Accept-Language': 'ko-KR,ko;q=0.9',
  };
}

function randomDelay(min: number, max: number): Promise<void> {
  const ms = Math.floor(Math.random() * (max - min + 1)) + min;
  return new Promise((r) => setTimeout(r, ms));
}

async function withRetry<T>(fn: () => Promise<T>, retries = 3): Promise<T> {
  for (let attempt = 0; attempt <= retries; attempt++) {
    try {
      return await fn();
    } catch (err) {
      const axiosErr = err as AxiosError;
      if (axiosErr.response?.status === 429 && attempt < retries) {
        console.warn(`[NaverAPI] 429 Too Many Requests — 5초 대기 후 재시도 (${attempt + 1}/${retries})`);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

export interface ComplexItem {
  complexNumber: number;
  complexName: string;
  type: string;
  legalDivisionName: string;
  coordinates: { xCoordinate: number; yCoordinate: number };
}

export interface ComplexSearchResult {
  hasNextPage: boolean;
  totalCount: number;
  list: ComplexItem[];
}

export async function searchComplexes(
  keyword: string,
  page = 0,
  size = 10,
): Promise<ComplexSearchResult> {
  return withRetry(async () => {
    await randomDelay(500, 1500);
    const resp = await axios.get(`${NAVER_BASE}/search/autocomplete/complexes`, {
      headers: getNaverHeaders(),
      params: { keyword, size, page },
      timeout: 15000,
    });

    const result = resp.data?.result ?? {};
    return {
      hasNextPage: result.hasNextPage ?? false,
      totalCount: result.totalCount ?? 0,
      list: result.list ?? [],
    };
  });
}

export interface ArticleListParams {
  complexNumber: number;
  tradeType: string;
  realEstateType: string;
  spcMin: number;
  spcMax: number;
  page: number;
  size: number;
  seed?: string;
  lastInfo?: string;
}

export interface ArticleListResult {
  seed: string;
  lastInfo: unknown[];
  hasNextPage: boolean;
  totalCount: number;
  list: RawArticleItem[];
}

export interface RawArticleItem {
  representativeArticleInfo: RawArticleInfo;
  duplicatedArticleInfo?: {
    representativePriceInfo?: unknown;
    realtorCount?: number;
    directTradeCount?: number;
    articleInfoList?: RawArticleInfo[];
  };
}

export interface RawArticleInfo {
  complexName?: string;
  articleNumber: string;
  dongName?: string;
  tradeType: string;
  realEstateType: string;
  spaceInfo?: {
    supplySpace?: number;
    contractSpace?: number;
    exclusiveSpace?: number;
    supplySpaceName?: string;
    exclusiveSpaceName?: string;
    nameType?: string;
  };
  buildingInfo?: {
    buildingConjunctionDate?: string;
    approvalElapsedYear?: number;
  };
  verificationInfo?: {
    verificationType?: string;
    exposureStartDate?: string;
    articleConfirmDate?: string;
  };
  brokerInfo?: {
    cpId?: string;
    brokerageName?: string;
    brokerName?: string;
  };
  articleDetail?: {
    direction?: string;
    directionStandard?: string;
    articleFeatureDescription?: string;
    directTrade?: boolean;
    floorInfo?: string;
    floorDetailInfo?: {
      targetFloor?: string;
      totalFloor?: string;
    };
  };
  address?: {
    city?: string;
    division?: string;
    sector?: string;
    coordinates?: { xCoordinate?: number; yCoordinate?: number };
  };
  priceInfo?: {
    dealPrice?: number;
    warrantyPrice?: number;
    rentPrice?: number;
    managementFeeAmount?: number;
    priceChangeStatus?: number;
    priceChangeHistories?: Array<{ modifiedDate: string; dealPrice: number }>;
  };
}

export async function getArticleList(params: ArticleListParams): Promise<ArticleListResult> {
  return withRetry(async () => {
    await randomDelay(500, 1500);

    const queryParams: Record<string, unknown> = {
      complexNumber: params.complexNumber,
      tradeType: params.tradeType,
      realEstateType: params.realEstateType,
      spcMin: params.spcMin,
      spcMax: params.spcMax,
      order: 'prc',
      page: params.page,
      size: params.size,
    };

    if (params.seed) queryParams.seed = params.seed;
    if (params.lastInfo) queryParams.lastInfo = params.lastInfo;

    const resp = await axios.get(`${NAVER_BASE}/complex/article/list`, {
      headers: getNaverHeaders(),
      params: queryParams,
      timeout: 15000,
    });

    const result = resp.data?.result ?? resp.data ?? {};
    return {
      seed: result.seed ?? '',
      lastInfo: result.lastInfo ?? [],
      hasNextPage: result.hasNextPage ?? false,
      totalCount: result.totalCount ?? 0,
      list: result.list ?? [],
    };
  });
}
