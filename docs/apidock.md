# Mosquito Snatch – API 명세서 (MVP)

* **Base URL**: `https://port-0-goat-practice-back2-mhfztudd556964ed.sel3.cloudtype.app`
* **총 2개 API**

  1. 유저가 파리(모기 등) 잡는 데 걸린 시간 포함 **게임 결과 저장**
  2. 난이도 별 **현재 랭킹 불러오기** (1위~5위)

> ⚙️ MVP 규칙
>
> * 서버: Nest.js / **인메모리 저장**(프로세스 재시작 시 초기화)
> * 인증/권한 없음(봇/어뷰징은 간단한 요청 제한으로만 제어)
> * 모든 응답은 `application/json; charset=utf-8`

---

## 1) 게임 결과 저장 (시간 포함)

유저 한 판(60초) 결과를 저장합니다.
**평균 한 마리 잡는 데 소요된 시간(`avgCatchMs`)**과 **총 플레이 시간(`durationMs`)**을 함께 기록하며, **랭킹은 `score`(점수)** 기준으로 산정됩니다.

### Endpoint

```
POST /api/record
```

### Request Headers

```
Content-Type: application/json
```

### Request Body (JSON)

| 필드         | 타입                         | 필수 | 설명                 | 제약                                 |
| ---------- | -------------------------- | -- | ------------------ | ---------------------------------- |
| name       | string                     | ✅  | 유저 이름              | 1~12자, 공백 허용, 이모지/특수문자 일부 제한 가능    |
| difficulty | "easy" | "medium" | "hard" | ✅  | 난이도                | 지정 값만 허용                           |
| score      | number                     | ✅  | 최종 점수              | 정수, -999~999 (MVP 제한)              |
| durationMs | number                     | ✅  | 실제 플레이 시간(ms)      | 기본 60000ms(60초), 1000~120000 범위 권장 |
| avgCatchMs | number                     | ✅  | **평균 포획 시간(ms)**   | 정수, 1 이상. 포획이 0이면 0 또는 누락 불가(0 허용) |
| caught     | number                     | ✅  | 총 포획 수(클릭 유효 히트 수) | 정수, 0 이상                           |

> 참고
>
> * `avgCatchMs = (개별 포획 소요 시간의 평균)`을 클라이언트에서 계산해 전달(반드시 포획 수 `caught`와 일관성 유지).
> * 서버는 기본적으로 `score`로만 랭킹을 계산합니다. 시간 지표는 분석/추후 확장용으로 저장됩니다.

### 성공 응답

```
201 Created
```

```json
{
  "stored": true,
  "id": "a5f5c4c6-0c8d-4d1a-9a4c-4b1f1f2c2a01",
  "rankPreview": {
    "difficulty": "hard",
    "score": 21,
    "estimatedRank": 3
  }
}
```

### 오류 응답

* 잘못된 입력(스키마/값 범위 위반)

  ```
  422 Unprocessable Entity
  ```

  ```json
  {
    "error": "UNPROCESSABLE_ENTITY",
    "message": "invalid payload: score must be an integer between -999 and 999"
  }
  ```
* 과도한 연속 제출(간단 레이트리밋 예: 3초 내 중복)

  ```
  429 Too Many Requests
  ```

  ```json
  {
    "error": "TOO_MANY_REQUESTS",
    "retryAfterSec": 3
  }
  ```

### 예시 (cURL)

```bash
curl -X POST \
  https://port-0-goat-practice-back2-mhfztudd556964ed.sel3.cloudtype.app/api/record \
  -H "Content-Type: application/json" \
  -d '{
    "name": "Klang",
    "difficulty": "hard",
    "score": 21,
    "durationMs": 60000,
    "avgCatchMs": 820,
    "caught": 17
  }'
```

---

## 2) 난이도 별 현재 랭킹 불러오기 (TOP 5)

난이도별 **점수 상위 1~5위**를 반환합니다.
동점 정렬 규칙(권장): `score` 내림차순 → `durationMs` 오름차순 → `createdAt` 오름차순.

### Endpoint

```
GET /api/leaderboard?difficulty=<easy|medium|hard>
```

### Query Parameters

| 파라미터       | 타입     | 필수 | 설명                              |
| ---------- | ------ | -- | ------------------------------- |
| difficulty | string | ✅  | `easy` / `medium` / `hard` 중 하나 |

> **항상 5개 이하**(실제 데이터가 5개 미만이면 있는 만큼만) 반환합니다.

### 성공 응답

```
200 OK
```

```json
{
  "difficulty": "hard",
  "top": [
    { "rank": 1, "name": "BeeHunter", "score": 26, "durationMs": 60000, "avgCatchMs": 740, "caught": 19, "createdAt": 1730448000000 },
    { "rank": 2, "name": "Klang",      "score": 21, "durationMs": 60000, "avgCatchMs": 820, "caught": 17, "createdAt": 1730448054321 },
    { "rank": 3, "name": "Min",        "score": 19, "durationMs": 60000, "avgCatchMs": 900, "caught": 15, "createdAt": 1730448100123 }
  ]
}
```

### 오류 응답

* 난이도 미전달/오류

  ```
  400 Bad Request
  ```

  ```json
  {
    "error": "BAD_REQUEST",
    "message": "difficulty is required (easy|medium|hard)"
  }
  ```

### 예시 (cURL)

```bash
curl \
  "https://port-0-goat-practice-back2-mhfztudd556964ed.sel3.cloudtype.app/api/leaderboard?difficulty=medium"
```

---

## 공통 스키마(참고)

```ts
type Difficulty = 'easy' | 'medium' | 'hard';

interface RecordRequest {
  name: string;          // 1~12자
  difficulty: Difficulty;
  score: number;         // -999 ~ 999
  durationMs: number;    // 1000 ~ 120000
  avgCatchMs: number;    // >= 0 (포획 0일 때 0 허용)
  caught: number;        // >= 0
}

interface LeaderboardEntry {
  rank: number;          // 1..5
  name: string;
  score: number;
  durationMs: number;
  avgCatchMs: number;
  caught: number;
  createdAt: number;     // epoch ms
}
```

---

## 정렬/보관 규칙(서버 내부)

* **정렬**: `score`(desc) → `durationMs`(asc) → `createdAt`(asc)
* **보관**: 난이도별로 **최대 상위 100**까지 메모리에 유지(권장), 응답은 항상 TOP 5
* **초기화**: 서버 재시작 시 데이터 리셋(MVP 공지)

---

## 상태 점검(선택)

### Health Check

```
GET /api/health
→ 200 { "ok": true, "ts": 1730448000000 }
```

> 배포/모니터링 편의를 위한 선택 API로, 총 2개 API 요구사항에는 포함되지 않으므로 필요 시만 구현하세요.

---

### 구현 참고 (Nest.js 라우팅 예시)

* `POST /api/record` → `RecordController.create()`
* `GET /api/leaderboard` → `LeaderboardController.getTop5()`

DTO/파이프에서 **필드 유효성**(길이/범위) 검증을 강제하고, 서비스 계층에서 난이도별 메모리 배열에 삽입→정렬→슬라이싱 합니다.

---