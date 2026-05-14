import React, { useState, useMemo } from 'react';
import { Property, DIRECTION_LABELS, TRADE_TYPE_LABELS, VERIFICATION_LABELS } from '../types';
import { formatPrice, exportCSV, exportJSON } from '../services/api';

interface ResultTableProps {
  properties: Property[];
}

type SortKey =
  | 'complexName' | 'dongName' | 'tradeType' | 'dealPrice'
  | 'supplySpace' | 'floorInfo' | 'direction' | 'verificationType';
type SortDir = 'asc' | 'desc';

const PAGE_SIZE = 50;

// ── 컴포넌트 외부: 렌더마다 재생성되지 않음 ──────────────────────────
function SortIcon({ active, dir }: { active: boolean; dir: SortDir }) {
  if (!active) return <span className="sort-icon">↕</span>;
  return <span className="sort-icon active">{dir === 'asc' ? '↑' : '↓'}</span>;
}

interface ThProps {
  label: string;
  sortK?: SortKey;
  curSortKey: SortKey;
  curSortDir: SortDir;
  onSort: (k: SortKey) => void;
}
function Th({ label, sortK, curSortKey, curSortDir, onSort }: ThProps) {
  return (
    <th
      style={{ cursor: sortK ? 'pointer' : 'default', userSelect: 'none' }}
      onClick={sortK ? () => onSort(sortK) : undefined}
    >
      {label}
      {sortK && <SortIcon active={curSortKey === sortK} dir={curSortDir} />}
    </th>
  );
}

function getSortValue(p: Property, key: SortKey): number | string {
  // 가격: 거래유형별 실제 가격 필드 사용
  if (key === 'dealPrice') {
    if (p.tradeType === 'A1') return p.dealPrice;
    return p.warrantyPrice; // B1, B2
  }
  // 층: "5/15" 형식에서 숫자만 추출해 수치 정렬
  if (key === 'floorInfo') {
    const m = p.floorInfo.match(/^(\d+)/);
    return m ? parseInt(m[1], 10) : 0;
  }
  const v = p[key as keyof Property];
  return (v as number | string) ?? '';
}

function priceDisplay(p: Property): string {
  if (p.tradeType === 'A1') return formatPrice(p.dealPrice);
  if (p.tradeType === 'B1') return formatPrice(p.warrantyPrice);
  if (p.tradeType === 'B2') return `${formatPrice(p.warrantyPrice)} / ${formatPrice(p.rentPrice * 10000)}`;
  return '-';
}
// ─────────────────────────────────────────────────────────────────────

export function ResultTable({ properties }: ResultTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('dealPrice');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterText, setFilterText] = useState('');
  const [complexFilter, setComplexFilter] = useState('');
  const [page, setPage] = useState(0);

  const handleSort = (key: SortKey) => {
    if (key === sortKey) {
      // 같은 컬럼 클릭 → 방향만 토글
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      // 다른 컬럼 클릭 → 새 키로 변경 + 오름차순 초기화
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  // 단지명 목록
  const complexNames = useMemo(
    () =>
      [...new Set(properties.map((p) => p.complexName))]
        .filter(Boolean)
        .sort((a, b) => a.localeCompare(b, 'ko')),
    [properties],
  );

  // 모든 파생 데이터를 단일 useMemo로 계산 → 항상 일관성 보장
  const { filtered, paginated, totalPages, safePage } = useMemo(() => {
    // 1. 필터
    let fil = properties;
    if (complexFilter) {
      fil = fil.filter((p) => p.complexName.trim() === complexFilter.trim());
    }
    if (filterText.trim()) {
      const q = filterText.trim().toLowerCase();
      fil = fil.filter(
        (p) =>
          p.complexName.toLowerCase().includes(q) ||
          p.dongName.toLowerCase().includes(q) ||
          p.address.toLowerCase().includes(q) ||
          p.articleFeature.toLowerCase().includes(q),
      );
    }

    // 2. 정렬
    const srt = [...fil].sort((a, b) => {
      const av = getSortValue(a, sortKey);
      const bv = getSortValue(b, sortKey);
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'ko');
      return sortDir === 'asc' ? cmp : -cmp;
    });

    // 3. 페이지네이션
    const total = Math.ceil(srt.length / PAGE_SIZE);
    const safe = Math.min(page, Math.max(0, total - 1));
    const pag = srt.slice(safe * PAGE_SIZE, (safe + 1) * PAGE_SIZE);

    return { filtered: fil, paginated: pag, totalPages: total, safePage: safe };
  }, [properties, complexFilter, filterText, sortKey, sortDir, page]);

  return (
    <div className="result-table-container">
      <div className="result-toolbar">
        <div className="result-info">
          <span className="result-count">
            총 <strong>{properties.length.toLocaleString()}</strong>건
            {(complexFilter || filterText) &&
              ` → 필터: ${filtered.length.toLocaleString()}건`}
          </span>
        </div>

        <div className="result-actions">
          <select
            className="form-select"
            style={{ width: 'auto', minWidth: '140px' }}
            value={complexFilter}
            onChange={(e) => { setComplexFilter(e.target.value); setPage(0); }}
          >
            <option value="">전체 단지</option>
            {complexNames.map((name) => (
              <option key={name} value={name}>{name}</option>
            ))}
          </select>
          <input
            className="search-input"
            type="text"
            placeholder="단지명/주소 검색..."
            value={filterText}
            onChange={(e) => { setFilterText(e.target.value); setPage(0); }}
          />
          <button
            className="btn-outline btn-sm"
            onClick={() => exportCSV(filtered)}
            disabled={filtered.length === 0}
          >
            CSV 내보내기
          </button>
          <button
            className="btn-outline btn-sm"
            onClick={() => exportJSON(filtered)}
            disabled={filtered.length === 0}
          >
            JSON 내보내기
          </button>
        </div>
      </div>

      <div className="table-wrapper">
        <table className="result-table">
          <thead>
            <tr>
              <Th label="단지명"   sortK="complexName"    curSortKey={sortKey} curSortDir={sortDir} onSort={handleSort} />
              <Th label="동"       sortK="dongName"       curSortKey={sortKey} curSortDir={sortDir} onSort={handleSort} />
              <Th label="거래"     sortK="tradeType"      curSortKey={sortKey} curSortDir={sortDir} onSort={handleSort} />
              <Th label="가격"     sortK="dealPrice"      curSortKey={sortKey} curSortDir={sortDir} onSort={handleSort} />
              <Th label="공급/전용" sortK="supplySpace"   curSortKey={sortKey} curSortDir={sortDir} onSort={handleSort} />
              <Th label="층"       sortK="floorInfo"      curSortKey={sortKey} curSortDir={sortDir} onSort={handleSort} />
              <Th label="방향"     sortK="direction"      curSortKey={sortKey} curSortDir={sortDir} onSort={handleSort} />
              <Th label="주소"     curSortKey={sortKey} curSortDir={sortDir} onSort={handleSort} />
              <Th label="특징"     curSortKey={sortKey} curSortDir={sortDir} onSort={handleSort} />
              <Th label="확인"     sortK="verificationType" curSortKey={sortKey} curSortDir={sortDir} onSort={handleSort} />
            </tr>
          </thead>
          <tbody>
            {paginated.length === 0 ? (
              <tr>
                <td colSpan={10} className="table-empty">
                  {properties.length === 0 ? '수집된 매물이 없습니다' : '검색 결과가 없습니다'}
                </td>
              </tr>
            ) : (
              paginated.map((p) => (
                <tr key={`${p.complexNumber}-${p.articleNumber}-${p.brokerageName}`}>
                  <td className="td-complex">
                    <span className="complex-name">{p.complexName}</span>
                    {p.realtorCount > 1 && (
                      <span className="realtor-badge">+{p.realtorCount - 1}</span>
                    )}
                  </td>
                  <td>{p.dongName || '-'}</td>
                  <td>
                    <span className={`trade-badge trade-${p.tradeType}`}>
                      {TRADE_TYPE_LABELS[p.tradeType] ?? p.tradeType}
                    </span>
                  </td>
                  <td className="td-price">
                    <span className="price-value">{priceDisplay(p)}</span>
                    {p.priceChangeStatus === 1 && <span className="price-up">↑</span>}
                    {p.priceChangeStatus === -1 && <span className="price-down">↓</span>}
                  </td>
                  <td className="td-space">
                    <span>{p.supplySpace}㎡</span>
                    <span className="space-sub">({p.exclusiveSpace}㎡)</span>
                  </td>
                  <td>{p.floorInfo || '-'}</td>
                  <td>{(DIRECTION_LABELS[p.direction] ?? p.direction) || '-'}</td>
                  <td className="td-address">{p.address || '-'}</td>
                  <td className="td-feature">{p.articleFeature || '-'}</td>
                  <td>
                    <span className="verify-badge">
                      {(VERIFICATION_LABELS[p.verificationType] ?? p.verificationType) || '-'}
                    </span>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="pagination">
          <button
            className="btn-ghost btn-sm"
            onClick={() => setPage((p) => Math.max(0, p - 1))}
            disabled={safePage === 0}
          >
            ← 이전
          </button>
          <span className="page-info">
            {safePage + 1} / {totalPages}
          </span>
          <button
            className="btn-ghost btn-sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={safePage >= totalPages - 1}
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}
