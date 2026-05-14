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

interface RawClusterItem {
  complexNumber: number;
  realEstateType: string;
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

type BBox = { left: number; right: number; top: number; bottom: number };

// 시/도 fallback bbox — legalDivisions API가 좌표를 못 찾을 때만 사용
// complexClusters는 지도 뷰포트 기반이라 시/도 전체 bbox는 너무 넓어 0건 반환됨

// 시/도 fallback bbox (시/군/구 코드 없을 때)
const PROVINCE_BBOX: Record<string, BBox> = {
  '11': { left: 126.73, right: 127.19, top: 37.71, bottom: 37.42 },
  '26': { left: 128.73, right: 129.34, top: 35.40, bottom: 35.04 },
  '27': { left: 128.38, right: 128.80, top: 36.02, bottom: 35.76 },
  '28': { left: 125.96, right: 126.85, top: 37.78, bottom: 37.23 },
  '29': { left: 126.77, right: 127.00, top: 35.26, bottom: 35.07 },
  '30': { left: 127.28, right: 127.55, top: 36.50, bottom: 36.20 },
  '31': { left: 129.07, right: 129.53, top: 35.68, bottom: 35.39 },
  '36': { left: 127.18, right: 127.48, top: 36.67, bottom: 36.40 },
  '41': { left: 126.32, right: 127.90, top: 38.30, bottom: 36.90 },
  '42': { left: 127.08, right: 129.40, top: 38.63, bottom: 37.07 },
  '43': { left: 127.27, right: 128.58, top: 37.40, bottom: 36.42 },
  '44': { left: 126.18, right: 127.68, top: 37.17, bottom: 35.99 },
  '45': { left: 126.45, right: 127.84, top: 36.08, bottom: 35.38 },
  '46': { left: 126.08, right: 127.64, top: 35.29, bottom: 33.96 },
  '47': { left: 128.26, right: 129.61, top: 37.33, bottom: 35.54 },
  '48': { left: 127.93, right: 129.44, top: 35.72, bottom: 34.59 },
  '50': { left: 126.08, right: 127.00, top: 33.98, bottom: 33.10 },
};

// Naver 웹앱 기본 zoom(14.693) 기준 bbox 반경
// 실제 Naver 요청에서 역산: center±(0.02079lng, 0.00885lat)
const BBOX_HALF_W_DONG  = 0.021;  // 읍/면/동 선택 시 (좁은 범위)
const BBOX_HALF_H_DONG  = 0.009;
const BBOX_HALF_W_SIGUNGU = 0.10; // 시/군/구만 선택 시 (넓은 범위)
const BBOX_HALF_H_SIGUNGU = 0.05;
const NAVER_PRECISION   = 14.693; // Naver 웹앱 기본 precision

export interface ComplexClustersParams {
  tradeTypes: string[];
  naverTypes: string[];
  legalDivisionCode: string;  // 10자리 법정동코드
  legalDivisionName: string;  // 지역명 (legalDivisions 검색용, 예: "원문동")
  filtersExclusiveSpace: boolean;
}

// legalDivisions 자동완성 API로 지역 좌표 조회
async function fetchLegalDivisionCoords(
  name: string,
  targetCode: string,
): Promise<{ x: number; y: number } | null> {
  try {
    const data = await naverFetch('/search/autocomplete/legalDivisions', { keyword: name, page: 0 }) as {
      result?: {
        list?: Array<{
          legalDivisionNumber: string;
          coordinates?: { xCoordinate: number; yCoordinate: number };
        }>;
      };
    };
    const list = data?.result?.list ?? [];
    // 코드가 정확히 일치하는 항목 우선, 없으면 첫 번째
    const match = list.find(item => item.legalDivisionNumber === targetCode) ?? list[0];
    if (!match?.coordinates) return null;
    return { x: match.coordinates.xCoordinate, y: match.coordinates.yCoordinate };
  } catch {
    return null;
  }
}

export async function getComplexClusters(
  params: ComplexClustersParams,
): Promise<ComplexItem[]> {
  const hasSpecificDong = !params.legalDivisionCode.endsWith('00000');

  // 1단계: legalDivisions API로 지역 중심 좌표 취득
  const coords = await fetchLegalDivisionCoords(
    params.legalDivisionName,
    params.legalDivisionCode,
  );

  // 2단계: 좌표 기반 bbox 계산 (좌표 없으면 시/도 fallback)
  let bbox: BBox;
  if (coords) {
    const hw = hasSpecificDong ? BBOX_HALF_W_DONG  : BBOX_HALF_W_SIGUNGU;
    const hh = hasSpecificDong ? BBOX_HALF_H_DONG  : BBOX_HALF_H_SIGUNGU;
    bbox = {
      left:   coords.x - hw,
      right:  coords.x + hw,
      top:    coords.y + hh,
      bottom: coords.y - hh,
    };
  } else {
    const provinceCode = params.legalDivisionCode.substring(0, 2);
    bbox = PROVINCE_BBOX[provinceCode] ?? { left: 124.0, right: 132.0, top: 38.9, bottom: 33.0 };
  }

  // 읍/면/동 선택 시만 legalDivisionNumbers 필터 사용
  const legalDivisionFilter = hasSpecificDong
    ? { legalDivisionNumbers: [params.legalDivisionCode], legalDivisionType: 'EUP' }
    : {};

  return withRetry(async () => {
    await randomDelay(500, 1500);

    const body = {
      filter: {
        tradeTypes: params.tradeTypes,
        realEstateTypes: params.naverTypes,
        roomCount: [],
        bathRoomCount: [],
        optionTypes: [],
        oneRoomShapeTypes: [],
        moveInTypes: [],
        filtersExclusiveSpace: params.filtersExclusiveSpace,
        floorTypes: [],
        directionTypes: [],
        hasArticlePhoto: false,
        isAuthorizedByOwner: false,
        parkingTypes: [],
        entranceTypes: [],
        hasArticle: false,
        ...legalDivisionFilter,
      },
      boundingBox: bbox,
      precision: NAVER_PRECISION,
      userChannelType: 'PC',
    };

    const data = (await naverPost('/complex/complexClusters', body)) as {
      isSuccess?: boolean;
      result?: {
        totalCount?: number;
        clusters?: RawClusterItem[];
        points?: RawClusterItem[];
      };
    };

    const result = data?.result ?? {};
    const all = [...(result.clusters ?? []), ...(result.points ?? [])];

    // 중복 complexNumber 제거
    const seen = new Set<number>();
    return all
      .filter((c) => {
        if (seen.has(c.complexNumber)) return false;
        seen.add(c.complexNumber);
        return true;
      })
      .map((c) => ({
        complexNumber: c.complexNumber,
        complexName: '',   // complexClusters 응답에 단지명 없음 → article에서 채워짐
        type: c.realEstateType,
        legalDivisionName: '',
        coordinates: c.coordinates,
      }));
  });
}

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
