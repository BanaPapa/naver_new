import { RawArticleInfo } from './naverApi.js';

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

export function normalizeArticleInfo(
  info: RawArticleInfo,
  complexNumber: number,
  realtorCount = 1,
): Property {
  const sp = info.spaceInfo ?? {};
  const bi = info.buildingInfo ?? {};
  const vi = info.verificationInfo ?? {};
  const br = info.brokerInfo ?? {};
  const ad = info.articleDetail ?? {};
  const addr = info.address ?? {};
  const pi = info.priceInfo ?? {};

  const addressStr = [addr.city, addr.division, addr.sector].filter(Boolean).join(' ');

  return {
    complexNumber,
    complexName: info.complexName ?? '',
    dongName: info.dongName ?? '',
    articleNumber: info.articleNumber,
    realEstateType: info.realEstateType,
    tradeType: info.tradeType,
    dealPrice: pi.dealPrice ?? 0,
    warrantyPrice: pi.warrantyPrice ?? 0,
    rentPrice: pi.rentPrice ?? 0,
    managementFee: pi.managementFeeAmount ?? 0,
    priceChangeStatus: pi.priceChangeStatus ?? 0,
    priceChangeHistories: pi.priceChangeHistories,
    supplySpace: sp.supplySpace ?? 0,
    exclusiveSpace: sp.exclusiveSpace ?? 0,
    supplySpaceName: sp.supplySpaceName ?? '',
    exclusiveSpaceName: sp.exclusiveSpaceName ?? '',
    direction: ad.direction ?? '',
    floorInfo: ad.floorInfo ?? '',
    targetFloor: ad.floorDetailInfo?.targetFloor ?? '',
    totalFloor: ad.floorDetailInfo?.totalFloor ?? '',
    address: addressStr,
    lat: addr.coordinates?.yCoordinate ?? 0,
    lng: addr.coordinates?.xCoordinate ?? 0,
    articleFeature: ad.articleFeatureDescription ?? '',
    brokerageName: br.brokerageName ?? '',
    brokerName: br.brokerName ?? '',
    confirmDate: vi.articleConfirmDate ?? '',
    buildDate: bi.buildingConjunctionDate ?? '',
    realtorCount,
    verificationType: vi.verificationType ?? '',
  };
}
