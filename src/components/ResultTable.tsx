import React, { useState, useMemo } from 'react';
import { Property, DIRECTION_LABELS, TRADE_TYPE_LABELS, VERIFICATION_LABELS } from '../types';
import { formatPrice, exportCSV, exportJSON } from '../services/api';

interface ResultTableProps {
  properties: Property[];
}

type SortKey = keyof Property;
type SortDir = 'asc' | 'desc';

export function ResultTable({ properties }: ResultTableProps) {
  const [sortKey, setSortKey] = useState<SortKey>('dealPrice');
  const [sortDir, setSortDir] = useState<SortDir>('asc');
  const [filterText, setFilterText] = useState('');
  const [page, setPage] = useState(0);
  const PAGE_SIZE = 50;

  const handleSort = (key: SortKey) => {
    if (sortKey === key) {
      setSortDir((d) => (d === 'asc' ? 'desc' : 'asc'));
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
    setPage(0);
  };

  const filtered = useMemo(() => {
    if (!filterText.trim()) return properties;
    const q = filterText.toLowerCase();
    return properties.filter(
      (p) =>
        p.complexName.toLowerCase().includes(q) ||
        p.address.toLowerCase().includes(q) ||
        p.articleFeature.toLowerCase().includes(q),
    );
  }, [properties, filterText]);

  const sorted = useMemo(() => {
    return [...filtered].sort((a, b) => {
      const av = a[sortKey];
      const bv = b[sortKey];
      const cmp =
        typeof av === 'number' && typeof bv === 'number'
          ? av - bv
          : String(av).localeCompare(String(bv), 'ko');
      return sortDir === 'asc' ? cmp : -cmp;
    });
  }, [filtered, sortKey, sortDir]);

  const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
  const paginated = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

  const SortIcon = ({ k }: { k: SortKey }) => {
    if (sortKey !== k) return <span className="sort-icon">↕</span>;
    return <span className="sort-icon active">{sortDir === 'asc' ? '↑' : '↓'}</span>;
  };

  const priceDisplay = (p: Property) => {
    if (p.tradeType === 'A1') return formatPrice(p.dealPrice);
    if (p.tradeType === 'B1') return formatPrice(p.warrantyPrice);
    if (p.tradeType === 'B2') {
      const w = formatPrice(p.warrantyPrice);
      const r = formatPrice(p.rentPrice * 10000);
      return `${w} / ${r}`;
    }
    return '-';
  };

  return (
    <div className="result-table-container">
      <div className="result-toolbar">
        <div className="result-info">
          <span className="result-count">
            총 <strong>{properties.length.toLocaleString()}</strong>건
            {filterText && ` (필터: ${filtered.length.toLocaleString()}건)`}
          </span>
        </div>

        <div className="result-actions">
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
              <th onClick={() => handleSort('complexName')}>
                단지명 <SortIcon k="complexName" />
              </th>
              <th onClick={() => handleSort('dongName')}>동</th>
              <th onClick={() => handleSort('tradeType')}>거래</th>
              <th onClick={() => handleSort('dealPrice')}>
                가격 <SortIcon k="dealPrice" />
              </th>
              <th onClick={() => handleSort('supplySpace')}>
                공급/전용 <SortIcon k="supplySpace" />
              </th>
              <th onClick={() => handleSort('targetFloor')}>층</th>
              <th onClick={() => handleSort('direction')}>방향</th>
              <th onClick={() => handleSort('address')}>주소</th>
              <th>특징</th>
              <th onClick={() => handleSort('verificationType')}>확인</th>
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
                <tr key={`${p.articleNumber}-${p.brokerageName}`}>
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
            disabled={page === 0}
          >
            ← 이전
          </button>
          <span className="page-info">
            {page + 1} / {totalPages}
          </span>
          <button
            className="btn-ghost btn-sm"
            onClick={() => setPage((p) => Math.min(totalPages - 1, p + 1))}
            disabled={page >= totalPages - 1}
          >
            다음 →
          </button>
        </div>
      )}
    </div>
  );
}
