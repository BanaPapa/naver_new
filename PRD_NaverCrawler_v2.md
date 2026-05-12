# PRD: 네이버 부동산 크롤러 (fin.land.naver.com)

> **Version**: 2.0  
> **Date**: 2026-05-12  
> **Status**: Ready for Development  
> **변경 이력**: v1.0 → v2.0 (API 파라미터 확정, 코드표 완성, 웹앱 아키텍처 전환)

---

## 1. 개요

### 1.1 목적
네이버 부동산(`fin.land.naver.com`)의 모바일 API를 활용하여 특정 지역의 부동산 매물 정보를 수집하는 **독립형 웹 앱**을 구축한다.

### 1.2 배경
- 기존 PC API(`new.land.naver.com`)는 네이버의 보안 강화(nfront 엔진)로 차단됨 (429 에러)
- 신규 모바일 API(`fin.land.naver.com/front-api/v1/`)는 쿠키 기반 인증으로 접근 가능 확인 완료
- KB Land API(`api.kbland.kr`)를 활용한 3단계 지역 선택 검증 완료

### 1.3 기술 스택
| 항목 | 선택 |
|------|------|
| 프레임워크 | Vite + React |
| 언어 | TypeScript |
| 스타일 | Vanilla CSS (다크 테마) |
| 백엔드 | Express.js (API 프록시) |
| HTTP | axios |

### 1.4 확장 계획
현재는 네이버 매물 크롤링 탭만 개발하지만, 추후 여러 크롤링 기능(상가 매물, 청약 데이터, 실거래 다운로드, 입주민 리뷰, 입지 분석, 학군 분석, 중개업소 분석 등)을 하나의 앱에 담을 예정이므로 **탭 기반 확장 가능 구조**로 설계한다.

---

## 2. 지역 선택 API (KB Land)

**Base URL**: `https://api.kbland.kr/land-price/price/areaName`

3단계 캐스케이딩 선택: 대지역(시/도) → 중지역(시/군/구) → 소지역(읍/면/동)

### 2.1 대지역 (Step 1)
```
GET https://api.kbland.kr/land-price/price/areaName
```
- 파라미터 없음
- 응답: 17개 시/도 (서울, 부산, 경기도 등)

### 2.2 중지역 (Step 2)
```
GET https://api.kbland.kr/land-price/price/areaName?법정동코드={code}
```
- `법정동코드`: 대지역의 2자리 코드 (예: `41` = 경기도)
- 응답: 해당 시/도의 시/군/구 목록

### 2.3 소지역 (Step 3)
```
GET https://api.kbland.kr/land-price/price/areaName?법정동코드={code}
```
- `법정동코드`: 중지역의 5자리 코드 (예: `41450` = 하남시)
- 응답: 해당 시/군/구의 읍/면/동 목록

### 2.4 KB Land 응답 구조
```json
{
  "dataHeader": { "resultCode": "10000", "message": "NO_ERROR" },
  "dataBody": {
    "data": [
      {
        "대지역명": "경기도",
        "중지역명": "하남시 ",
        "소지역명": "망월동",
        "법정동코드": "41450109"
      }
    ]
  }
}
```

> ⚠️ **주의**: `중지역명`에 후행 공백이 포함됨 (예: `"하남시 "`). 반드시 `.trim()` 처리 필요.

### 2.5 키워드 조합 규칙
선택된 지역 정보를 조합하여 네이버 검색 키워드로 사용:
```
대지역명.trim() + " " + 중지역명.trim() + " " + 소지역명.trim()
→ "경기도 하남시 망월동"
```
또는 중지역명+소지역명만 사용: `"하남시 망월동"`

---

## 3. 네이버 모바일 API 명세

**Base URL**: `https://fin.land.naver.com/front-api/v1`

### 3.1 단지 목록 검색

```
GET /search/autocomplete/complexes?keyword={keyword}&size={size}&page={page}
```

| 파라미터 | 타입 | 설명 | 예시 |
|---|---|---|---|
| keyword | string | 검색어 (URL 인코딩) | `하남시 망월동` |
| size | number | 페이지당 결과 수 | `10` |
| page | number | 페이지 번호 (0-based) | `0` |

**응답 구조:**
```json
{
  "isSuccess": true,
  "result": {
    "hasNextPage": true,
    "totalCount": 47,
    "list": [
      {
        "complexNumber": 121257,
        "complexName": "미사랑데르Ⅲ",
        "type": "A02",
        "legalDivisionName": "경기도 하남시 망월동",
        "coordinates": { "xCoordinate": 127.193334, "yCoordinate": 37.561066 }
      }
    ]
  }
}
```

**핵심 필드:**
- `complexNumber` → 단지 고유번호 (후속 모든 API의 키)
- `type` → 부동산 유형 코드 (아래 코드표 참조)
- `hasNextPage` → `true`이면 page+1로 추가 요청 필요

---

### 3.2 개별 매물 리스트 (핵심 API) ✅ 확정

```
GET /complex/article/list?complexNumber={complexNumber}&tradeType={tradeType}&realEstateType={realEstateType}&spcMin={spcMin}&spcMax={spcMax}&order=prc&page=0&size=20
```

| 파라미터 | 타입 | 설명 | 예시 |
|---|---|---|---|
| complexNumber | number | 단지 고유번호 | `106200` |
| tradeType | string | 거래유형 | `A1` |
| realEstateType | string | 부동산유형 | `APT:JGC:JGB` |
| spcMin | number | 최소 공급면적 | `0` |
| spcMax | number | 최대 공급면적 | `1000` |
| order | string | 정렬 기준 | `prc` |
| page | number | 페이지 번호 | `0` |
| size | number | 페이지당 결과 수 | `20` |

#### 페이지네이션 (커서 기반) ✅ 확정

첫 페이지 응답에서 `seed`와 `lastInfo`가 반환됨:
```json
{
  "seed": "67416e14-f59e-427a-a7ba-3c3c11858e49",
  "lastInfo": [0, -579.5408896613259, "2620241462"],
  "hasNextPage": false,
  "totalCount": 23,
  "list": [...]
}
```

다음 페이지 요청 시 `seed`와 `lastInfo`를 쿼리 파라미터로 전달.

#### 응답 항목 구조 (실제 캡처 데이터 기반)

```json
{
  "representativeArticleInfo": {
    "complexName": "미사강변루나리움",
    "articleNumber": "2625707386",
    "dongName": "511동",
    "tradeType": "A1",
    "realEstateType": "A01",
    "spaceInfo": {
      "supplySpace": 112.58,
      "contractSpace": 162.64,
      "exclusiveSpace": 84.99,
      "supplySpaceName": "112B1",
      "exclusiveSpaceName": "84B1",
      "nameType": "B1"
    },
    "buildingInfo": {
      "buildingConjunctionDate": "20150930",
      "approvalElapsedYear": 11
    },
    "verificationInfo": {
      "verificationType": "OWNER",
      "exposureStartDate": "2026-05-12",
      "articleConfirmDate": "2026-05-12"
    },
    "brokerInfo": {
      "cpId": "bizmk",
      "brokerageName": "푸르지오비비(031-793-3000)공인중개사사무소",
      "brokerName": "매경부동산"
    },
    "articleDetail": {
      "direction": "WS",
      "directionStandard": "거실 기준",
      "articleFeatureDescription": "비비강추입주매물 내부컨디션 우수해요",
      "directTrade": false,
      "floorInfo": "중/20",
      "floorDetailInfo": {
        "targetFloor": "중",
        "totalFloor": "20"
      }
    },
    "address": {
      "city": "경기도",
      "division": "하남시",
      "sector": "망월동",
      "coordinates": { "xCoordinate": 127.18156, "yCoordinate": 37.567345 }
    },
    "priceInfo": {
      "dealPrice": 1350000000,
      "warrantyPrice": 0,
      "rentPrice": 0,
      "managementFeeAmount": 300000,
      "priceChangeStatus": 0,
      "priceChangeHistories": []
    }
  },
  "duplicatedArticleInfo": {
    "representativePriceInfo": {
      "dealPrice": { "minPrice": 1350000000, "maxPrice": 1350000000 }
    },
    "realtorCount": 4,
    "directTradeCount": 0,
    "articleInfoList": [ /* 동일 매물 다른 중개사 목록 (같은 구조) */ ]
  }
}
```

---

### 3.3 단지 요약 정보 (보조)

```
GET /complex/mapComplexSummaryInfo?complexNumber={complexNumber}
```

---

### 3.4 단지별 매물 수 (보조)

```
GET /complex/article/count?complexNumber={complexNumber}
```

---

## 4. 코드표 ✅ 확정

### 4.1 상품종류 (realEstateType)

| 코드 | 설명 | 비고 |
|------|------|------|
| APT | 아파트 | APT:JGC:JGB 병기 사용 |
| JGC | 재건축 | 아파트와 함께 사용 |
| JGB | 재개발 | 아파트와 함께 사용 |
| ABYG | 아파트 분양권 | |
| OPST | 오피스텔 | |
| OBYG | 오피스텔 분양권 | |
| VL | 빌라 | |
| DDDGG | 단독/다가구 | |
| JWJT | 전원주택 | |
| SGJT | 상가주택 | |
| SMS | 사무실 | |
| APTHGJ | 지식산업센터 | |

**UI 드롭다운 구성:**
| 표시명 | 전송값 |
|--------|--------|
| 아파트/재건축/재개발 | `APT:JGC:JGB` |
| 아파트 분양권 | `ABYG` |
| 오피스텔 | `OPST` |
| 오피스텔 분양권 | `OBYG` |
| 빌라 | `VL` |
| 단독/다가구 | `DDDGG` |
| 전원주택 | `JWJT` |
| 상가주택 | `SGJT` |
| 사무실 | `SMS` |
| 지식산업센터 | `APTHGJ` |

### 4.2 거래종류 (tradeType)

| 코드 | 설명 |
|------|------|
| A1 | 매매 |
| B1 | 전세 |
| B2 | 월세 |

### 4.3 면적 필터 (공급면적 기준)

| spcMin | spcMax | UI 표시명 |
|--------|--------|-----------|
| 0 | 1000 | 전체 |
| 0 | 79.3 | 59미만 |
| 79.4 | 89.2 | 59타입 |
| 89.3 | 105.7 | 74타입 |
| 105.8 | 119 | 84타입 |
| 119.1 | 1000 | 85초과 |

### 4.4 기타 코드

| 항목 | 코드 | 의미 |
|------|------|------|
| direction | SS | 남향 |
| | NN | 북향 |
| | ES | 동향 |
| | WS | 서향 |
| priceChangeStatus | 0 | 변동 없음 |
| | 1 | 가격 상승 |
| | -1 | 가격 하락 |
| verificationType | OWNER | 집주인 확인 |
| | DOC | 서류 확인 |
| | MOBL | 모바일 확인 |
| | NDOC1 | 미확인1 |
| | NDOC2 | 미확인2 |
| | NONE | 미확인 (협회) |

---

## 5. 공통 HTTP 요청 설정

### 5.1 네이버 API 필수 헤더

```javascript
const NAVER_HEADERS = {
  'Host': 'fin.land.naver.com',
  'Accept': 'application/json, text/plain, */*',
  'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/148.0.0.0 Safari/537.36',
  'Referer': 'https://fin.land.naver.com/map',
  'Cookie': '<.env에서 로드>',
  'Sec-Fetch-Dest': 'empty',
  'Sec-Fetch-Mode': 'cors',
  'Sec-Fetch-Site': 'same-origin',
  'sec-ch-ua-platform': '"Windows"',
  'Accept-Language': 'ko-KR,ko;q=0.9',
};
```

### 5.2 KB Land API 헤더

```javascript
const KBLAND_HEADERS = {
  'User-Agent': 'Mobile'
};
```

### 5.3 차단 회피 전략

| 항목 | 설정 |
|---|---|
| 요청 간 딜레이 | 500ms ~ 1500ms (랜덤) |
| 단지 간 딜레이 | 1000ms ~ 3000ms (랜덤) |
| 429 에러 시 | 5초 대기 후 최대 3회 재시도 |
| 쿠키 만료 시 | 수동 갱신 (설정 페이지에서 입력) |

---

## 6. 크롤링 플로우

```
[KB Land 3단계 지역 선택]
    │  대지역 → 중지역 → 소지역
    ▼
[키워드 조합: "하남시 망월동"]
    │
    ▼
Step 1: GET /search/autocomplete/complexes?keyword=하남시+망월동&size=10&page=0..N
        → 모든 complexNumber 수집 (페이지네이션 순회)
        → type 필터링 (APT:JGC:JGB 등)
    │
    ▼
Step 2: 각 complexNumber에 대해 (순차 실행 + 딜레이)
    │
    └─ GET /complex/article/list?complexNumber=X&tradeType=A1&realEstateType=APT:JGC:JGB&spcMin=0&spcMax=1000
       → 커서 페이지네이션 (seed + lastInfo)
       → 매물 상세 정보 전체 수집
    │
    ▼
Step 3: 데이터 정규화 → Property 객체로 변환
    │
    ▼
Step 4: 결과 표시 (테이블 UI) + 내보내기 (CSV/JSON)
```

---

## 7. 데이터 모델

### 7.1 Property 인터페이스

```typescript
interface Property {
  // 단지 정보
  complexNumber: number;
  complexName: string;
  dongName: string;

  // 매물 정보
  articleNumber: string;
  realEstateType: string;
  tradeType: string;

  // 가격 정보
  dealPrice: number;
  warrantyPrice: number;
  rentPrice: number;
  managementFee: number;
  priceChangeStatus: number;
  priceChangeHistories?: Array<{ modifiedDate: string; dealPrice: number }>;

  // 면적 정보
  supplySpace: number;
  exclusiveSpace: number;
  supplySpaceName: string;
  exclusiveSpaceName: string;

  // 위치/건물 정보
  direction: string;
  floorInfo: string;
  targetFloor: string;
  totalFloor: string;
  address: string;
  lat: number;
  lng: number;

  // 부가 정보
  articleFeature: string;
  brokerageName: string;
  brokerName: string;
  confirmDate: string;
  buildDate: string;
  realtorCount: number;
  imageCount: number;
  verificationType: string;
}
```

---

## 8. 앱 아키텍처

### 8.1 파일 구조

```
c:\Dev2\naver_new\
├── package.json
├── vite.config.ts
├── tsconfig.json
├── .env                          # NAVER_COOKIE 등
├── server/
│   ├── index.ts                  # Express 서버 진입점
│   ├── routes/
│   │   ├── region.ts             # KB Land 프록시
│   │   └── naver.ts              # Naver API 프록시 (쿠키 주입)
│   └── services/
│       ├── kbland.ts             # KB Land 3단계 지역 API
│       ├── naverApi.ts           # Naver 모바일 API 호출
│       ├── crawler.ts            # 크롤링 메인 로직
│       └── normalizer.ts         # 응답 → Property 변환
├── src/
│   ├── App.tsx
│   ├── main.tsx
│   ├── index.css                 # 다크 테마
│   ├── types/
│   │   └── index.ts
│   ├── components/
│   │   ├── Layout.tsx            # 탭 기반 레이아웃 (확장 대비)
│   │   ├── Sidebar.tsx
│   │   ├── SearchPanel.tsx
│   │   ├── RegionSelect.tsx      # 3단계 드롭다운
│   │   ├── FilterSelect.tsx      # 상품/방식/면적
│   │   ├── Monitor.tsx
│   │   ├── LogPanel.tsx
│   │   ├── ResultTable.tsx
│   │   └── CookieSettings.tsx    # 쿠키 설정
│   ├── services/
│   │   └── api.ts                # 프론트→백엔드 API 호출
│   └── hooks/
│       └── useCrawler.ts
└── CLAUDE.md
```

### 8.2 확장 가능 구조 설계

```
Layout.tsx
├── Sidebar (탭 메뉴)
│   ├── 네이버 매물 ← 현재 개발 대상
│   ├── 상가 매물 (추후)
│   ├── 청약 데이터 (추후)
│   ├── 실거래 다운로드 (추후)
│   └── ...
├── ContentArea (선택된 탭의 컨텐츠)
│   └── NaverCrawlerTab/
│       ├── SearchPanel + RegionSelect + FilterSelect
│       ├── Monitor + LogPanel
│       └── ResultTable
└── Settings (쿠키 등 공통 설정)
```

---

## 9. UI 디자인 사양

### 9.1 컬러 팔레트 (다크 테마)

| 용도 | 색상 |
|------|------|
| 배경 | `#0d1117` |
| 사이드바 배경 | `#161b22` |
| 카드 배경 | `#1c2128` |
| 포인트 (시안/틸) | `#00d4aa` |
| 텍스트 (기본) | `#e6edf3` |
| 텍스트 (보조) | `#8b949e` |
| CTA 버튼 | 블루→시안 그라디언트 |
| 에러 | `#f85149` |

### 9.2 레이아웃 참고

검색 조건 패널 (왼쪽) + Monitor/Logs (오른쪽) 2컬럼 구성.
하단에 결과 테이블.

---

## 10. 에러 처리

| 상황 | 대응 |
|---|---|
| HTTP 429 | 5초 대기 → 재시도 (최대 3회) |
| HTTP 4xx | 로그 출력, 해당 단지 스킵 |
| 네트워크 에러 | 3초 대기 → 재시도 (최대 3회) |
| 빈 응답 (list: []) | 정상 처리 (매물 0건) |
| 쿠키 만료 | 에러 메시지 + 설정 페이지로 유도 |

---

## 11. 기존 코드 참조

### 11.1 VBA 지역 선택 로직 (Area_Select)

기존 VBA 매크로에서 KB Land API를 호출하는 3단계 로직:
```vba
' 대지역 (num=1): https://api.kbland.kr/land-price/price/areaName
' 중지역 (num=2): ?법정동코드=XX
' 소지역 (num=3): ?법정동코드=XXXXX
```

### 11.2 기존 NaverCrawlerService (TypeScript, 차단됨)

기존 PC API 기반 코드 구조 참조:
- `NaverCrawlerService` 클래스 패턴 (logCallback + statusCallback)
- `run()` → `getRegionMeta()` → `getMarkers()` → `getArticlesByComplex()` 흐름
- `mapToProperty()` 데이터 변환 패턴

> ⚠️ 기존 코드는 `new.land.naver.com/api` (PC API)를 사용하므로 **엔드포인트와 응답 구조가 다름**.
> 전체 흐름 패턴만 참고하고, API 호출부는 본 PRD v2.0 기준으로 새로 작성할 것.
