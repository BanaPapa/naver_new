import React from 'react';
import { REAL_ESTATE_TYPES, TRADE_TYPES, SPACE_OPTIONS } from '../types';

interface FilterSelectProps {
  realEstateType: string;
  tradeType: string;
  spaceIndex: number;
  onRealEstateTypeChange: (v: string) => void;
  onTradeTypeChange: (v: string) => void;
  onSpaceIndexChange: (i: number) => void;
  disabled?: boolean;
}

export function FilterSelect({
  realEstateType,
  tradeType,
  spaceIndex,
  onRealEstateTypeChange,
  onTradeTypeChange,
  onSpaceIndexChange,
  disabled,
}: FilterSelectProps) {
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
    </div>
  );
}
