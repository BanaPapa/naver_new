import { RegionItem, CrawlerConfig, SSEEvent } from '../types';

const BASE = '/api';

// =============================================
// 헬스 체크
// =============================================
export async function checkHealth(): Promise<{ status: string; cookie: boolean }> {
  const res = await fetch(`${BASE}/health`);
  return res.json();
}

// =============================================
// 지역 API
// =============================================
export async function getRegions(step: 1 | 2 | 3, code?: string): Promise<RegionItem[]> {
  const params = new URLSearchParams({ step: String(step) });
  if (code) params.set('code', code);
  const res = await fetch(`${BASE}/region?${params}`);
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
  return json.data;
}

// =============================================
// 쿠키 설정 API
// =============================================
export async function getCookieStatus(): Promise<{ hasCookie: boolean; preview: string }> {
  const res = await fetch(`${BASE}/settings/cookie-status`);
  const json = await res.json();
  return json;
}

export async function saveCookie(cookie: string): Promise<void> {
  const res = await fetch(`${BASE}/settings/cookie`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ cookie }),
  });
  const json = await res.json();
  if (!json.ok) throw new Error(json.error);
}

// =============================================
// 크롤러 제어
// =============================================
export function startCrawler(
  config: CrawlerConfig,
  onEvent: (event: SSEEvent) => void,
  signal?: AbortSignal,
): void {
  const ctrl = new AbortController();
  if (signal) {
    signal.addEventListener('abort', () => ctrl.abort());
  }

  fetch(`${BASE}/crawler/start`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(config),
    signal: ctrl.signal,
  }).then(async (res) => {
    if (!res.body) return;
    const reader = res.body.getReader();
    const decoder = new TextDecoder();
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop() ?? '';

      for (const line of lines) {
        const trimmed = line.trim();
        if (trimmed.startsWith('data: ')) {
          try {
            const data = JSON.parse(trimmed.slice(6)) as SSEEvent;
            onEvent(data);
          } catch {
            // ignore parse errors
          }
        }
      }
    }
  }).catch((err) => {
    if (err.name !== 'AbortError') {
      onEvent({ type: 'error', payload: err.message });
    }
  });
}

export async function stopCrawler(): Promise<void> {
  await fetch(`${BASE}/crawler/stop`, { method: 'POST' });
}

// =============================================
// 유틸리티
// =============================================
export function formatPrice(price: number): string {
  if (price === 0) return '-';
  if (price >= 100000000) {
    const eok = Math.floor(price / 100000000);
    const man = Math.round((price % 100000000) / 10000);
    return man > 0 ? `${eok}억 ${man.toLocaleString()}만` : `${eok}억`;
  }
  return `${Math.round(price / 10000).toLocaleString()}만`;
}

export function exportCSV(properties: import('../types').Property[]): void {
  if (properties.length === 0) return;

  const headers = [
    '단지번호', '단지명', '동', '매물번호', '유형', '거래', '매매가', '보증금', '월세',
    '관리비', '공급면적', '전용면적', '면적명', '층', '총층', '방향', '주소',
    '중개업소', '확인유형', '특징', '입주일', '공개일',
  ];

  const rows = properties.map((p) => [
    p.complexNumber, p.complexName, p.dongName, p.articleNumber,
    p.realEstateType, p.tradeType,
    p.dealPrice, p.warrantyPrice, p.rentPrice, p.managementFee,
    p.supplySpace, p.exclusiveSpace, p.supplySpaceName,
    p.targetFloor, p.totalFloor, p.direction,
    p.address, p.brokerageName, p.verificationType, p.articleFeature,
    p.buildDate, p.confirmDate,
  ]);

  const csv = [headers, ...rows]
    .map((row) => row.map((cell) => `"${String(cell).replace(/"/g, '""')}"`).join(','))
    .join('\n');

  const bom = '\uFEFF';
  const blob = new Blob([bom + csv], { type: 'text/csv;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `naver_properties_${new Date().toISOString().slice(0, 10)}.csv`;
  a.click();
  URL.revokeObjectURL(url);
}

export function exportJSON(properties: import('../types').Property[]): void {
  if (properties.length === 0) return;
  const json = JSON.stringify(properties, null, 2);
  const blob = new Blob([json], { type: 'application/json;charset=utf-8;' });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = `naver_properties_${new Date().toISOString().slice(0, 10)}.json`;
  a.click();
  URL.revokeObjectURL(url);
}
