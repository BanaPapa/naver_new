// =============================================
// 지역 선택 타입
// =============================================
export interface RegionItem {
  code: string;
  name: string;
  level: 1 | 2 | 3;
}

export interface RegionSelection {
  large: RegionItem | null;
  mid: RegionItem | null;
  small: RegionItem | null;
}

// =============================================
// 크롤링 필터 타입
// =============================================
export interface RealEstateTypeOption {
  label: string;
  value: string;
}

export interface TradeTypeOption {
  label: string;
  value: string;
}

export interface SpaceOption {
  label: string;
  spcMin: number;
  spcMax: number;
}

// =============================================
// 매물 데이터 모델
// =============================================
export interface Property {
  complexNumber: number;
  complexName: string;
  dongName: string;
  articleNumber: string;
  realEstateType: string;
  tradeType: string;
  dealPrice: number;
  warrantyPrice: number;
  rentPrice: number;
  managementFee: number;
  priceChangeStatus: number;
  priceChangeHistories?: Array<{ modifiedDate: string; dealPrice: number }>;
  supplySpace: number;
  exclusiveSpace: number;
  supplySpaceName: string;
  exclusiveSpaceName: string;
  direction: string;
  floorInfo: string;
  targetFloor: string;
  totalFloor: string;
  address: string;
  lat: number;
  lng: number;
  articleFeature: string;
  brokerageName: string;
  brokerName: string;
  confirmDate: string;
  buildDate: string;
  realtorCount: number;
  verificationType: string;
}

// =============================================
// SSE 이벤트 타입
// =============================================
export type LogLevel = 'info' | 'warn' | 'error' | 'success';

export interface LogEntry {
  level: LogLevel;
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

export type SSEEvent =
  | { type: 'log'; payload: LogEntry }
  | { type: 'progress'; payload: ProgressInfo }
  | { type: 'property'; payload: Property }
  | { type: 'done'; payload: DoneSummary }
  | { type: 'error'; payload: string };

// =============================================
// 크롤러 설정
// =============================================
export interface CrawlerConfig {
  legalDivisionCode: string;
  legalDivisionName: string;
  tradeType: string;
  realEstateType: string;
  spcMin: number;
  spcMax: number;
}

// =============================================
// 탭 정의
// =============================================
export interface TabDefinition {
  id: string;
  label: string;
  icon: string;
}

// =============================================
// 코드표 상수
// =============================================
export const REAL_ESTATE_TYPES: RealEstateTypeOption[] = [
  { label: '아파트/재건축/재개발', value: 'APT:JGC:JGB' },
  { label: '아파트 분양권', value: 'ABYG' },
  { label: '오피스텔', value: 'OPST' },
  { label: '오피스텔 분양권', value: 'OBYG' },
  { label: '빌라', value: 'VL' },
  { label: '단독/다가구', value: 'DDDGG' },
  { label: '사무실', value: 'SMS' },
  { label: '지식산업센터', value: 'APTHGJ' },
];

// 전용면적 기준으로 필터링하는 상품 유형
export const EXCLUSIVE_SPACE_TYPES = ['OPST', 'OBYG', 'SMS', 'APTHGJ'];

export function isExclusiveSpaceType(realEstateType: string): boolean {
  return realEstateType.split(':').some((t) => EXCLUSIVE_SPACE_TYPES.includes(t));
}

// UI 코드 → Naver API 상품 유형 코드 매핑
export const NAVER_TYPE_MAP: Record<string, string[]> = {
  'APT:JGC:JGB': ['A01', 'A04', 'F01'],
  'ABYG':        ['B01'],
  'OPST':        ['A02'],
  'OBYG':        ['B02'],
  'VL':          ['A05', 'A06', 'A07', 'C02'],
  'DDDGG':       ['C03'],
  'SMS':         [],       // TODO: Naver API 코드 미확인
  'APTHGJ':      [],       // TODO: Naver API 코드 미확인
};

export const TRADE_TYPES: TradeTypeOption[] = [
  { label: '매매', value: 'A1' },
  { label: '전세', value: 'B1' },
  { label: '월세', value: 'B2' },
];

export const SPACE_OPTIONS: SpaceOption[] = [
  { label: '전체', spcMin: 0, spcMax: 1000 },
  { label: '59미만', spcMin: 0, spcMax: 79.3 },
  { label: '59타입', spcMin: 79.4, spcMax: 89.2 },
  { label: '74타입', spcMin: 89.3, spcMax: 105.7 },
  { label: '84타입', spcMin: 105.8, spcMax: 119 },
  { label: '85초과', spcMin: 119.1, spcMax: 1000 },
];

export const DIRECTION_LABELS: Record<string, string> = {
  SS: '남향',
  NN: '북향',
  ES: '동향',
  WS: '서향',
};

export const TRADE_TYPE_LABELS: Record<string, string> = {
  A1: '매매',
  B1: '전세',
  B2: '월세',
};

export const VERIFICATION_LABELS: Record<string, string> = {
  OWNER: '집주인',
  DOC: '서류',
  MOBL: '모바일',
  NDOC1: '미확인1',
  NDOC2: '미확인2',
  NONE: '미확인',
};
