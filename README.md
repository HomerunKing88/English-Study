# English OS

> 한 사람을 위한 개인용 영어 **운영체제(operating system)**.
> ChatGPT Voice가 대화 엔진이고, 이 앱은 그 주위를 감싸는 OS입니다. 매 세션의
> 커리큘럼을 설계하고, 결과를 기록하며, 그것을 장기 유창성으로 복리처럼 쌓아 올립니다.

English OS는 대화 자체를 대체하지 않습니다. ChatGPT Voice가 남기는 빈틈을 메웁니다 —
아무것도 기억되지 않고, 복습이 예약되지 않으며, 어떤 커리큘럼도 한 세션을 다음
세션으로 이어주지 않는 그 빈틈을요.

## 핵심 루프 (The core loop)

```
1. TODAY    → 오늘의 세션 브리핑 생성 (시나리오 × 난이도 × 복습 예정 표현 3개),
              코칭 규칙으로 감싸서. 한 번 탭으로 복사.
2. TALK     → ChatGPT 앱에서 10분 음성 세션. 마지막에 교정 요약을
              하나의 펜스 JSON 블록(아래 계약)으로 출력.
3. CAPTURE  → 대화 전체(또는 JSON 블록만) 붙여넣기. 앱이 파싱하여
              표현을 저장하고, 세션을 기록하고, 복습 일정을 등록.
4. REVIEW   → FSRS가 매일 복습 예정 카드를 띄움. Speak-it 카드는 Web Speech
              API를 사용해 응답 지연 시간(automaticity 지표)을 측정.
5. COMPOUND → 내일의 브리핑이 복습 예정 표현을 다시 대화에 엮어 넣음.
```

## Phase 1 모듈 (이번 빌드)

| 모듈 | 역할 |
|---|---|
| **Today** | 브리핑 생성기(전체 또는 compact/Custom-GPT), 스트릭, 복습 예정 수, 한 번 탭 복사 |
| **Capture** | 대화/JSON 붙여넣기 → zod 검증 파싱 → 표현 저장 + 세션 기록 + FSRS 갱신 |
| **Explore** | Finance Academy: 저장소에 커밋된 금융 개념 20개, 3단계 정의, 관련 개념 이동, 복습에 추가 |
| **Review** | `ts-fsrs` 스케줄러; 카드 유형: 인식, 빈칸 채우기, 문장 만들기, 영어로 설명, Speak-it(지연 측정) |
| **My English** | 영구 표현 메모리에 대한 전체 메타데이터 CRUD |
| **Progress** | 스트릭, 세션 수, 표현 수, 정확도, Speak-it 지연 시간 중앙값, 숙련도 분포 |
| **Settings** | 일일 계획 설정 + **JSON 내보내기/가져오기** (출시 필수 요건 — 데이터가 곧 자산) |
| **PWA** | 서비스 워커 기반 설치형, 오프라인 셸 |

## ChatGPT 계약 (§7)

모든 브리핑은 ChatGPT에게 세션을 정확히 하나의 펜스 JSON 블록으로 끝내도록
지시합니다:

```json
{
  "session": { "topic": "...", "mode": "...", "difficulty": "..." },
  "corrections": [
    { "user_said": "...", "corrected": "...", "natural": "...", "note_en": "..." }
  ],
  "new_expressions": [
    { "expression": "...", "meaning_en": "...", "example": "..." }
  ],
  "target_expression_usage": [
    { "expression": "...", "used_correctly": true }
  ],
  "focus_next": "one sentence"
}
```

파서는 **마지막** 펜스 JSON 블록을 찾아 zod 스키마로 검증하며, 데이터를 조용히
잃지 않습니다 — 실패 시 원본 블록을 그대로 보여줍니다.

## 아키텍처

- **Next.js (App Router) + TypeScript (strict) + TailwindCSS**
- 얇은 타입드 래퍼(`src/lib/db.ts`)를 통한 **IndexedDB** — localStorage 아님
- 간격 반복(spaced repetition)에는 **`ts-fsrs`** (`src/lib/fsrs.ts`가 유일한 브릿지)
- 대화/JSON 계약 및 개념 콘텐츠 검증에는 **zod**
- Speak-it 카드와 지연 시간 측정에는 **Web Speech API**
- 모든 데이터 접근은 클라이언트 사이드; 필요한 페이지는 SSR을 방어 처리
- **반복 비용 0** — 어디에도 유료 API 없음

### 소스 맵

```
src/
  lib/
    types.ts        표준 데이터 모델 (단일 진실 공급원)
    db.ts           타입드 IndexedDB 래퍼
    backup.ts       JSON 내보내기 / 가져오기
    fsrs.ts         ts-fsrs 어댑터 (ISO <-> Card)
    mastery.ts      FSRS에서 파생되는 숙련도 사다리
    expressions.ts  표현 저장소 (중복 제거, 복습, 예정)
    sessions.ts     세션 + 복습 로그 저장소
    settings.ts     설정 + 스트릭
    contract.ts     §7 zod 스키마 + 마지막-JSON-블록 추출기
    capture.ts      페이로드 -> 영구 메모리
    briefing.ts     Today 브리핑 생성기
    scenarios.ts    금융 + 일반 시나리오 카탈로그
    review.ts       카드 구성
    speech.ts       Web Speech 래퍼
    concepts.ts     개념 콘텐츠 로더 + 복습에 추가
    stats.ts        최소 진행 통계
  content/concepts.json   커밋된 금융 개념 20개
  components/       Nav, UI 프리미티브, 서비스 워커 등록
  app/             Today / Capture / Explore / Review / My English / Progress / Settings
```

## 개발

```bash
npm install
npm run dev        # http://localhost:3000
```

### 품질 게이트 (커밋 전 항상 실행)

```bash
npm run lint && npm run typecheck && npm test
```

## 콘텐츠 파이프라인

개념 콘텐츠는 오프라인에서 생성하고, 검토한 뒤, `Concept` 스키마를 따르는 JSON으로
커밋합니다 (로드 시 `src/lib/concepts.ts`가 검증). 최초 배치인 금융 개념 20개는
`related[]`를 통해 서로 연결되어 위키백과식 탐색이 가능합니다
(Bond → Coupon → Yield → Duration → …). 검토 후 100~200개로 확장합니다.

## 로드맵

- **Phase 1 (이번 빌드):** 오프라인·단일 기기에서 매일의 전체 루프.
- **Phase 2 (실사용 30일 이상 이후):** Custom GPT 개선, Supabase 무료 티어 인증 +
  클라우드 동기화/백업, 지연 시간 추이, English Brain 대시보드.

로드맵에서 **명시적으로 제외**: 앱 내 실시간 음성, 모든 유료 API, 멀티유저/기업용 기능.

---

> **UI 언어에 관하여:** 이 앱의 화면은 의도적으로 **영어**로 되어 있습니다. 핵심
> 학습 원칙이 "영어로 사고하기(English First)" — 한국어를 머릿속에서 번역하는 습관을
> 끊는 것 — 이기 때문입니다. 이 README만 한국어로 제공됩니다.
