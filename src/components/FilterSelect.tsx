import React from 'react';
import { REAL_ESTATE_TYPES, TRADE_TYPES, SPACE_OPTIONS, isExclusiveSpaceType } from '../types';

const PYEONG_TO_SQM = 3.30579;

interface FilterSelectProps {
  realEstateType: string;
  tradeType: string;
  spaceIndex: number;
  exclusivePyeongMin: number;
  exclusivePyeongMax: number;
  spaceUnit: 'pyeong' | 'sqm';
  onRealEstateTypeChange: (v: string) => void;
  onTradeTypeChange: (v: string) => void;
  onSpaceIndexChange: (i: number) => void;
  onExclusivePyeongMinChange: (v: number) => void;
  onExclusivePyeongMaxChange: (v: number) => void;
  onSpaceUnitChange: (u: 'pyeong' | 'sqm') => void;
  disabled?: boolean;
}

function formatPyeong(val: number, unit: 'pyeong' | 'sqm', isMin: boolean): string {
  if (val === 0) return isMin ? '최소' : '최대';
  if (unit === 'pyeong') return `${val}평`;
  return `${(val * PYEONG_TO_SQM).toFixed(1)}㎡`;
}

export function FilterSelect({
  realEstateType,
  tradeType,
  spaceIndex,
  exclusivePyeongMin,
  exclusivePyeongMax,
  spaceUnit,
  onRealEstateTypeChange,
  onTradeTypeChange,
  onSpaceIndexChange,
  onExclusivePyeongMinChange,
  onExclusivePyeongMaxChange,
  onSpaceUnitChange,
  disabled,
}: FilterSelectProps) {
  const isExclusive = isExclusiveSpaceType(realEstateType);

  const handleMinChange = (v: number) => {
    onExclusivePyeongMinChange(v);
    if (exclusivePyeongMax > 0 && v > exclusivePyeongMax) {
      onExclusivePyeongMaxChange(v);
    }
  };

  const handleMaxChange = (v: number) => {
    if (v > 0 && v < exclusivePyeongMin) {
      onExclusivePyeongMaxChange(exclusivePyeongMin);
    } else {
      onExclusivePyeongMaxChange(v);
    }
  };

  const minDisplay = formatPyeong(exclusivePyeongMin, spaceUnit, true);
  const maxDisplay = formatPyeong(exclusivePyeongMax, spaceUnit, false);

  return (
    <div className="filter-select">
      <div className="form-group">
        <label className="form-label">상품종류</label>
        <div className="select-wrapper">
          <select
            className="form-select"
            value={realEstateType}
            onChange={(e) => onRealEstateTypeChange(e.target.value)}
            disabled={disabled}
          >
            {REAL_ESTATE_TYPES.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {opt.label}
              </option>
            ))}
          </select>
        </div>
      </div>

      <div className="form-group">
        <label className="form-label">거래방식</label>
        <div className="radio-group">
          {TRADE_TYPES.map((opt) => (
            <label key={opt.value} className="radio-label">
              <input
                type="radio"
                name="tradeType"
                value={opt.value}
                checked={tradeType === opt.value}
                onChange={() => onTradeTypeChange(opt.value)}
                disabled={disabled}
              />
              <span>{opt.label}</span>
            </label>
          ))}
        </div>
      </div>

      {isExclusive ? (
        <div className="form-group">
          <div className="space-label-row">
            <label className="form-label" style={{ marginBottom: 0 }}>면적 (전용면적 기준)</label>
            <div className="space-unit-toggle">
              <button
                className={`space-unit-btn ${spaceUnit === 'pyeong' ? 'active' : ''}`}
                onClick={() => onSpaceUnitChange('pyeong')}
                disabled={disabled}
                type="button"
              >
                평
              </button>
              <button
                className={`space-unit-btn ${spaceUnit === 'sqm' ? 'active' : ''}`}
                onClick={() => onSpaceUnitChange('sqm')}
                disabled={disabled}
                type="button"
              >
                ㎡
              </button>
            </div>
          </div>
          <div className="space-slider-wrap">
            <div className="space-slider-label">
              전용 {minDisplay} ~ {maxDisplay}
            </div>
            <div className="space-slider-row">
              <span className="space-slider-text">최소</span>
              <input
                type="range"
                className="space-range"
                min={0}
                max={50}
                step={1}
                value={exclusivePyeongMin}
                onChange={(e) => handleMinChange(Number(e.target.value))}
                disabled={disabled}
              />
              <span className="space-slider-text" style={{ textAlign: 'right' }}>
                {exclusivePyeongMin === 0 ? '전체' : `${exclusivePyeongMin}평`}
              </span>
            </div>
            <div className="space-slider-row">
              <span className="space-slider-text">최대</span>
              <input
                type="range"
                className="space-range"
                min={0}
                max={50}
                step={1}
                value={exclusivePyeongMax}
                onChange={(e) => handleMaxChange(Number(e.target.value))}
                disabled={disabled}
              />
              <span className="space-slider-text" style={{ textAlign: 'right' }}>
                {exclusivePyeongMax === 0 ? '전체' : `${exclusivePyeongMax}평`}
              </span>
            </div>
          </div>
        </div>
      ) : (
        <div className="form-group">
          <label className="form-label">면적 (공급면적 기준)</label>
          <div className="space-buttons">
            {SPACE_OPTIONS.map((opt, i) => (
              <button
                key={i}
                className={`space-btn ${spaceIndex === i ? 'active' : ''}`}
                onClick={() => onSpaceIndexChange(i)}
                disabled={disabled}
              >
                {opt.label}
              </button>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
