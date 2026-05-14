// 개발: Vite 프록시 경유 → CORS 우회 + 쿠키 주입
// 프로덕션(Vercel): 추후 /api 라우트로 교체 예정
const NAVER_BASE = '/naver-api';
const COOKIE_KEY = 'naver_cookie';

export function getStoredCookie(): string {
  return localStorage.getItem(COOKIE_KEY) ?? '';
}

export function setStoredCookie(cookie: string): void {
  localStorage.setItem(COOKIE_KEY, cookie);
}

export function clearStoredCookie(): void {
  localStorage.removeItem(COOKIE_KEY);
}

function getNaverHeaders(): Record<string, string> {
  const cookie = getStoredCookie();
  const headers: Record<string, string> = {
    Accept: 'application/json, text/plain, */*',
  };
  // Cookie를 커스텀 헤더로 전송 → Vite proxy가 Cookie 헤더로 변환
  if (cookie) {
    headers['X-Naver-Cookie'] = cookie;
  }
  return headers;
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
      const status = (err as { status?: number })?.status;
      if (status === 429 && attempt < retries) {
        console.warn(`[NaverAPI] 429 Too Many Requests — 5초 대기 후 재시도 (${attempt + 1}/${retries})`);
        await new Promise((r) => setTimeout(r, 5000));
        continue;
      }
      throw err;
    }
  }
  throw new Error('Max retries exceeded');
}

// GET 요청 (search/autocomplete 등)
async function naverFetch(path: string, params: Record<string, unknown>): Promise<unknown> {
  const query = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) {
    if (v !== undefined && v !== null) {
      query.set(k, String(v));
    }
  }

  const url = `${NAVER_BASE}${path}?${query.toString()}`;
  const resp = await fetch(url, {
    method: 'GET',
    headers: getNaverHeaders(),
    credentials: 'omit',
  });

  if (!resp.ok) {
    const err = new Error(`Naver API 오류: ${resp.status}`) as Error & { status: number };
    err.status = resp.status;
    throw err;
  }

  return resp.json();
}

// POST 요청 (complex/article/list)
async function naverPost(path: string, body: unknown): Promise<unknown> {
  const url = `${NAVER_BASE}${path}`;
  const resp = await fetch(url, {
    method: 'POST',
    headers: {
      ...getNaverHeaders(),
      'Content-Type': 'application/json',
    },
    body: JSON.stringify(body),
    credentials: 'omit',
  });

  if (!resp.ok) {
    const err = new Error(`Naver API 오류: ${resp.status}`) as Error & { status: number };
    err.status = resp.status;
    throw err;
  }

  return resp.json();
}


// ====================================================
// 타입 정의
// ====================================================

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

export interface ArticleListParams {
  complexNumber: number;
  tradeTypes: string[];       // 실제 API: 배열 (예: ["A1"])
  lastInfoCursor: unknown[];  // 첫 요청: [], 이후: 이전 응답의 lastInfo
  size?: number;
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

// ====================================================
// API 함수
// ====================================================

export async function searchComplexes(
  keyword: string,
  page = 0,
  size = 10,
): Promise<ComplexSearchResult> {
  return withRetry(async () => {
    await randomDelay(500, 1500);
    const data = await naverFetch('/search/autocomplete/complexes', { keyword, size, page }) as {
      result?: {
        hasNextPage?: boolean;
        totalCount?: number;
        list?: ComplexItem[];
      };
    };
    const result = data?.result ?? {};
    return {
      hasNextPage: result.hasNextPage ?? false,
      totalCount: result.totalCount ?? 0,
      list: result.list ?? [],
    };
  });
}

export async function getArticleList(params: ArticleListParams): Promise<ArticleListResult> {
  return withRetry(async () => {
    await randomDelay(500, 1500);

    // 실제 Naver 앱 캡처 기준 POST body 포맷
    const body = {
      complexNumber: String(params.complexNumber),
      tradeTypes: params.tradeTypes,
      pyeongTypes: [],
      dongNumbers: [],
      userChannelType: 'PC',
      articleSortType: 'RANKING_DESC',
      lastInfo: params.lastInfoCursor,
      size: params.size ?? 20,
    };

    const data = await naverPost('/complex/article/list', body) as {
      result?: {
        seed?: string;
        lastInfo?: unknown[];
        hasNextPage?: boolean;
        totalCount?: number;
        list?: RawArticleItem[];
      };
    };

    const result = data?.result ?? {};
    return {
      seed: result.seed ?? '',
      lastInfo: result.lastInfo ?? [],
      hasNextPage: result.hasNextPage ?? false,
      totalCount: result.totalCount ?? 0,
      list: result.list ?? [],
    };
  });
}
