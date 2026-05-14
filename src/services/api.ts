import { Property } from '../types';

// =============================================
// 가격 포맷
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

// =============================================
// CSV 내보내기
// =============================================
export function exportCSV(properties: Property[]): void {
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

// =============================================
// JSON 내보내기
// =============================================
export function exportJSON(properties: Property[]): void {
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
