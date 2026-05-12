import axios from 'axios';

const KB_BASE = 'https://api.kbland.kr/land-price/price/areaName';
const KB_HEADERS = { 'User-Agent': 'Mobile' };

export interface RegionItem {
  code: string;
  name: string;
  level: 1 | 2 | 3;
}

interface KBRawItem {
  대지역명: string;
  중지역명?: string;
  소지역명?: string;
  법정동코드: string;
}

export async function getRegions(step: number, parentCode?: string): Promise<RegionItem[]> {
  const params: Record<string, string> = {};
  if (step > 1 && parentCode) {
    params['법정동코드'] = parentCode;
  }

  const resp = await axios.get(KB_BASE, {
    headers: KB_HEADERS,
    params,
    timeout: 10000,
  });

  const items: KBRawItem[] = resp.data?.dataBody?.data ?? [];

  const seen = new Set<string>();
  const result: RegionItem[] = [];

  for (const item of items) {
    if (step === 1) {
      const name = item.대지역명.trim();
      // 대지역 코드는 법정동코드의 첫 2자리
      const code = item.법정동코드.substring(0, 2);
      if (!seen.has(code)) {
        seen.add(code);
        result.push({ code, name, level: 1 });
      }
    } else if (step === 2) {
      const name = (item.중지역명 || '').trim();
      const code = item.법정동코드.substring(0, 5);
      if (!seen.has(code)) {
        seen.add(code);
        result.push({ code, name, level: 2 });
      }
    } else if (step === 3) {
      const name = (item.소지역명 || '').trim();
      const code = item.법정동코드;
      if (!seen.has(code)) {
        seen.add(code);
        result.push({ code, name, level: 3 });
      }
    }
  }

  return result;
}
