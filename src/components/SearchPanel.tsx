import React, { useState } from 'react';
import { RegionSelect } from './RegionSelect';
import { FilterSelect } from './FilterSelect';
import { RegionSelection, SPACE_OPTIONS, isExclusiveSpaceType } from '../types';
import { CrawlerStatus } from '../hooks/useCrawler';

const PYEONG_TO_SQM = 3.30579;

interface SearchPanelProps {
  status: CrawlerStatus;
  onStart: (config: {
    legalDivisionCode: string;
    legalDivisionName: string;
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
  const [exclusivePyeongMin, setExclusivePyeongMin] = useState(0);
  const [exclusivePyeongMax, setExclusivePyeongMax] = useState(0);
  const [spaceUnit, setSpaceUnit] = useState<'pyeong' | 'sqm'>('pyeong');

  const handleRealEstateTypeChange = (v: string) => {
    setRealEstateType(v);
    setSpaceIndex(0);
    setExclusivePyeongMin(0);
    setExclusivePyeongMax(0);
  };

  const isRunning = status === 'running';
  const disabled = isRunning;

  const getLegalDivisionCode = (): string => {
    const code = region.small?.code ?? region.mid?.code ?? region.large?.code ?? '';
    if (code.length === 8) return code + '00';
    if (code.length === 5) return code + '00000';
    if (code.length === 2) return code + '00000000';
    return code;
  };

  const buildPreview = (): string => {
    const large = region.large?.name.trim() ?? '';
    const mid = region.mid?.name.trim() ?? '';
    const small = region.small?.name.trim() ?? '';
    const parts: string[] = [];
    if (mid && mid !== large) parts.push(mid);
    else if (large) parts.push(large);
    if (small) parts.push(small);
    return parts.join(' ');
  };

  const handleStart = () => {
    if (!region.large) {
      alert('시/도를 선택해주세요');
      return;
    }
    const legalDivisionCode = getLegalDivisionCode();
    let spcMin: number;
    let spcMax: number;
    if (isExclusiveSpaceType(realEstateType)) {
      spcMin = exclusivePyeongMin > 0 ? exclusivePyeongMin * PYEONG_TO_SQM : 0;
      spcMax = exclusivePyeongMax > 0 ? exclusivePyeongMax * PYEONG_TO_SQM : 99999;
    } else {
      const space = SPACE_OPTIONS[spaceIndex];
      spcMin = space.spcMin;
      spcMax = space.spcMax;
    }
    const legalDivisionName = (region.small?.name ?? region.mid?.name ?? region.large?.name ?? '').trim();
    onStart({ legalDivisionCode, legalDivisionName, tradeType, realEstateType, spcMin, spcMax });
  };

  const regionPreview = region.large ? buildPreview() : null;
  const codePreview = region.large ? getLegalDivisionCode() : null;

  return (
    <div className="search-panel">
      <div className="panel-header">
        <span className="panel-title">검색 조건</span>
      </div>

      <div className="panel-body">
        <RegionSelect value={region} onChange={setRegion} disabled={disabled} />

        {regionPreview && (
          <div className="keyword-preview">
            <span className="keyword-label">지역:</span>
            <span className="keyword-value">{regionPreview}</span>
            <span className="keyword-code">{codePreview}</span>
          </div>
        )}

        <FilterSelect
          realEstateType={realEstateType}
          tradeType={tradeType}
          spaceIndex={spaceIndex}
          exclusivePyeongMin={exclusivePyeongMin}
          exclusivePyeongMax={exclusivePyeongMax}
          spaceUnit={spaceUnit}
          onRealEstateTypeChange={handleRealEstateTypeChange}
          onTradeTypeChange={setTradeType}
          onSpaceIndexChange={setSpaceIndex}
          onExclusivePyeongMinChange={setExclusivePyeongMin}
          onExclusivePyeongMaxChange={setExclusivePyeongMax}
          onSpaceUnitChange={setSpaceUnit}
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
