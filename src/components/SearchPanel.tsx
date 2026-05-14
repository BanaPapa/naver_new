import React, { useState } from 'react';
import { RegionSelect } from './RegionSelect';
import { FilterSelect } from './FilterSelect';
import { RegionSelection, SPACE_OPTIONS } from '../types';
import { CrawlerStatus } from '../hooks/useCrawler';

interface SearchPanelProps {
  status: CrawlerStatus;
  onStart: (config: {
    keyword: string;
    tradeType: string;
    realEstateType: string;
    spcMin: number;
    spcMax: number;
  }) => void;
  onStop: () => void;
}

export function SearchPanel({ status, onStart, onStop }: SearchPanelProps) {
  const [region, setRegion] = useState<RegionSelection>({
    large: null,
    mid: null,
    small: null,
  });
  const [realEstateType, setRealEstateType] = useState('APT:JGC:JGB');
  const [tradeType, setTradeType] = useState('A1');
  const [spaceIndex, setSpaceIndex] = useState(0);

  const isRunning = status === 'running';
  const disabled = isRunning;

  const handleStart = () => {
    if (!region.large) {
      alert('시/도를 선택해주세요');
      return;
    }

    // PRD §6: keyword는 중지역명+소지역명만 사용 (대지역명 제외)
    // 예: "하남시 망월동" (서울특별시 등 대지역명 포함 시 검색 결과 0건)
    const parts: string[] = [];
    if (region.mid) parts.push(region.mid.name.trim());
    if (region.small) parts.push(region.small.name.trim());
    if (parts.length === 0 && region.large) parts.push(region.large.name.trim());
    const keyword = parts.join(' ');

    const space = SPACE_OPTIONS[spaceIndex];
    onStart({
      keyword,
      tradeType,
      realEstateType,
      spcMin: space.spcMin,
      spcMax: space.spcMax,
    });
  };

  const getKeywordPreview = () => {
    const parts: string[] = [];
    if (region.mid) parts.push(region.mid.name.trim());
    if (region.small) parts.push(region.small.name.trim());
    if (parts.length === 0 && region.large) parts.push(region.large.name.trim());
    return parts.length > 0 ? parts.join(' ') : null;
  };

  const keyword = getKeywordPreview();

  return (
    <div className="search-panel">
      <div className="panel-header">
        <span className="panel-title">검색 조건</span>
      </div>

      <div className="panel-body">
        <RegionSelect value={region} onChange={setRegion} disabled={disabled} />

        {keyword && (
          <div className="keyword-preview">
            <span className="keyword-label">검색어:</span>
            <span className="keyword-value">{keyword}</span>
          </div>
        )}

        <FilterSelect
          realEstateType={realEstateType}
          tradeType={tradeType}
          spaceIndex={spaceIndex}
          onRealEstateTypeChange={setRealEstateType}
          onTradeTypeChange={setTradeType}
          onSpaceIndexChange={setSpaceIndex}
          disabled={disabled}
        />
      </div>

      <div className="panel-footer">
        {!isRunning ? (
          <button
            className="btn-primary"
            onClick={handleStart}
            disabled={!region.large}
          >
            <span className="btn-icon">▶</span>
            데이터 수집 시작
          </button>
        ) : (
          <button className="btn-danger" onClick={onStop}>
            <span className="btn-icon">■</span>
            수집 중지
          </button>
        )}
      </div>
    </div>
  );
}
