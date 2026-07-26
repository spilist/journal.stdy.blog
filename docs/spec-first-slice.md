# 첫 슬라이스 구현 계약 (S1)

정본 개념 모델은
[아이데이션 기록](../charness-artifacts/ideation/2026-07-26-concept-ideation.md)이고,
이 문서는 그 `D1`~`D20`을 **구현이 바로 착수할 수 있는 계약**으로 고정한 것이다.
구현 중 사실이 바뀌면 **이 문서를 고친다.**

## Problem

지금 루프는 **메모장에 쓴다 → 저널 마크다운에 복붙한다**이다. 두 번째 손을 없애고,
텍스트에 박혀 보이지 않는 에너지 점수를 값으로 꺼낸다.

## Capability Contract

| | |
|---|---|
| 액터 | 사용자 한 명 (폰 + 데스크톱) |
| 능력 델타 | 폰에서 바로 쓰면 그게 정본이 된다. 복붙이 사라진다 |
| 수용 경계 | 하루치 기록을 앱에서 쓰고, 오프라인에서 쓰고, 두 기기가 같은 내용을 보고, `sample.md` 형식으로 다시 나온다 |

## Current Slice

S1은 **에너지 그래프를 뺀 전부**다. 그래프는 S2이고, 입력이 먼저인 이유는 데이터가
없으면 그래프에 볼 게 없기 때문이다.

## Fixed Decisions

### F-1. 저장 스키마 — 로컬과 D1이 같은 모양이다

```sql
-- 'YYYY-MM-DD'는 전부 KST 캘린더 날짜다 (D16).
-- updated_at / scored_at / created_at 은 epoch ms (UTC 순간). 날짜와 순간을 섞지 않는다.

CREATE TABLE energy (
  date       TEXT    NOT NULL,           -- 'YYYY-MM-DD'
  dim        TEXT    NOT NULL,           -- '인지'|'정서'|'육체' (D20: 스키마는 열려 있음)
  score      INTEGER,                    -- 1..10, NULL = 미입력
  reason     TEXT    NOT NULL DEFAULT '',
  scored_at  INTEGER,                    -- D15: score 값이 바뀔 때만 갱신
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (date, dim)
);

CREATE TABLE log (
  date       TEXT NOT NULL,
  kind       TEXT NOT NULL,              -- '어제'|'오늘'
  text       TEXT NOT NULL DEFAULT '',   -- 사용자가 친 그대로. 불릿 '- '도 사용자 글자다
  updated_at INTEGER NOT NULL,
  PRIMARY KEY (date, kind)
);

CREATE TABLE pinned (                    -- 「잊지 않을 것」 싱글톤 (D10)
  id         INTEGER PRIMARY KEY CHECK (id = 1),
  text       TEXT NOT NULL DEFAULT '',   -- 자기 제목('# ...')을 텍스트에 포함한다
  updated_at INTEGER NOT NULL
);

CREATE TABLE revision (                  -- D11: 하루 1개. 키가 곧 제약이다
  day        TEXT PRIMARY KEY,           -- 'YYYY-MM-DD'
  text       TEXT NOT NULL,              -- 그날 첫 편집 직전의 pinned 내용
  created_at INTEGER NOT NULL
);
```

**로컬(IndexedDB)은 같은 이름의 오브젝트 스토어를 같은 키로 갖고, 두 가지를 더 갖는다:**

- 모든 동기화 대상 레코드에 `syncedAt`(로컬 전용). **더티 = `updatedAt > (syncedAt ?? 0)`.**
  미동기화 배지가 세는 값이 이것이다 (`D17`).
- `conflict` 스토어 — `{ id, target, text, at }`. `target`은 `'log:2026-07-25:오늘'`
  같은 문자열. **로컬 전용이고 서버로 가지 않는다.**

**D1은 질의 엔진이 아니라 동기화 대상이다.** 그래프는 로컬에서 계산한다(오프라인 우선).
따라서 D1에 인덱스를 더 붙이지 않는다.

### F-2. Export / Import 계약

**조립(export)** — 하루치와 전체가 같은 함수, 날짜 범위만 다르다 (`D13`).

```
# 26-07-25
                            ← H1은 'YY-MM-DD'. 뒤에 빈 줄 하나
## 에너지
- 인지: 7. 스터디 설계만 하고 실행을 못했군.
- 정서: 7. ...
- 육체: 5. ...

## 어제
{log.어제.text 그대로}

## 오늘
{log.오늘.text 그대로}
```

- 에너지 줄 = `- ${dim}:` + (score != null ? ` ${score}.` : '') +
  (reason ? ` ${reason}` : '')
  → 둘 다 비면 `- 인지:` (sample.md 26-07-26과 일치)
- **하루치 export에 `pinned`는 들어가지 않는다** (`D13`, 사용자 명시)
- 전체 export는 `pinned.text`를 맨 위에 두고, 그 아래 날짜를 **내림차순**으로
  (sample.md와 같은 순서)
- **로그 본문 안의 `## ` 소제목은 그 로그의 일부다.** 새 블록으로 자르면 앱에서 쓴 글을
  자기 export로 다시 읽을 때 그 아래가 통째로 사라진다
- 원본에 `## 에너지`가 없던 날짜에는 **빈 섹션을 만들어내지 않는다** (없던 줄을 더하면
  왕복이 깨진다). 반대로 앱의 하루치 복사는 늘 3차원 2블록 template을 낸다
- 블록 사이는 빈 줄 하나, 파일 끝은 **개행 하나로 정규화**한다.
  **파일 끝 빈 줄 개수는 왕복에서 보존되지 않는 유일한 항목이다** — 실제
  `references/sample.md`로 확인했다(2일치, 해석 실패 0줄, 차이는 EOF 개행 1개)

**파싱(import)**

- `^# ` 로 H1 분할. H1이 `^\d{2}-\d{2}-\d{2}$` 면 날짜 항목, 아니면 **`pinned`**
  (그 섹션을 `# ` 제목 줄까지 포함해 통째로 텍스트로 — `D10`: 제목을 앱이 모른다)
- 날짜 항목 안에서 `^## ` 로 분할. `에너지`는 줄 단위 파싱,
  `어제`/`오늘`은 **본문 그대로** 저장
- 에너지 줄: `/^-\s*([^:]+):\s*(?:(\d{1,2})\.\s*)?([\s\S]*)$/`
  → `dim`, `score`(없으면 `null`), `reason`
- **파싱 실패는 조용히 버리지 않는다** (불변식 3). import는 **미리보기**를 먼저 낸다 —
  "N일치, 해석 못한 줄 M개"와 그 줄 원문. 사용자가 확인 버튼을 눌러야 쓴다
- **빈 값은 쓰지 않는다.** `- 인지:` 같은 빈 줄을 지금 시각으로 더티 레코드로 만들면,
  다른 기기가 이미 올려둔 점수를 올리기 한 번에 NULL로 덮는다
- **`scoredAt`은 `null`로 둔다.** 마크다운에 기록 시각이 없다. 지금 시각을 넣으면
  과거 점수 전부가 오늘 매긴 것처럼 보여 `D15`가 지키려던 값이 사라진다
- 두 자리 연도는 `20YY`로 편다

### F-3. 동기화 프로토콜

레코드 키:
`energy:{date}:{dim}` · `log:{date}:{kind}` · `pinned` · `revision:{day}`

**`GET /api/pull?since={ms}`** — 앱 열 때 온라인이면 자동 (`D3`)

- 서버는 `updated_at > since` 인 레코드 전부와 `now`를 준다
- 클라이언트 적용 규칙:
  - 로컬이 **더티면 건너뛴다.** ← **pull은 절대 충돌을 만들지 않는다.**
    사람이 push를 눌렀을 때만 충돌이 생긴다
  - 아니면 서버 값으로 덮고 `syncedAt = updatedAt`
  - **디바운스 중이라 아직 레코드에 안 들어간 입력도 더티로 친다.** `pullNow`는
    진입 시 `flush()`하고, 응답 적용 시 `#pending`/`#timers`에 있는 키는 건너뛴다.
    이게 빠지면 뒤늦게 뜬 타이머가 방금 받아온 원격 글자를 지운다 — 사용자는
    그 문단을 본 적도 없이 잃는다

**`POST /api/push`** — 버튼을 눌렀을 때만 (`D3`)

> **왕복 중 편집 규칙 (2026-07-26 리뷰).** 판정은 **보낸 판본에 대한 것**이다. 응답이
> 오는 사이 사용자가 그 블록을 또 고쳤으면(`local.updatedAt !== 보낸 updatedAt`)
> **판정을 적용하지 않고 더티로 남긴다.** 안 그러면 보낸 뒤 친 글자가 동기화된
> 것으로 표시되고, 다음 pull에서 조용히 사라진다.
>
> 그리고 **`pushNow`는 `lastPulledAt`을 옮기지 않는다.** push 응답은 내가 보낸 키의
> 판정만 담고 있어서, 커서를 밀면 그 사이 서버에 생긴 다른 기기의 변경을 영영 건너뛴다.

- 본문은 더티 레코드 배열. 서버는 레코드마다 `updated_at`을 비교한다
  - 클라이언트가 더 크면 → 쓰고 `applied`
  - 아니면 → 쓰지 않고 `rejected` + 서버의 현재 레코드를 함께 반환
- 클라이언트가 `rejected`를 받으면 (`D12`):
  1. 서버 레코드를 라이브 값으로 채택하고 `syncedAt` 갱신
  2. **자기 텍스트를 `conflict` 사본으로 남긴다** — 불변식 3
  3. 해당 블록에 접힌 `▸ ⚠ 충돌 사본` 배지를 띄운다. **push를 막지 않는다**
- `revision`은 추가 전용이고 키가 날짜라 충돌 개념이 없다 —
  **먼저 쓴 쪽이 남는다**(`INSERT ... ON CONFLICT DO NOTHING`). 개정 스냅샷은
  사용자가 그 순간 작성한 문장이 아니라 자동 밀봉본이므로 사본을 만들지 않는다

### F-4. 인증 경계

- Cloudflare Access가 `journal.stdy.blog` 앞을 막는다. 허용 이메일
  `bae.hwidong@gmail.com` 하나, 세션 1개월 (`D2`·`D9`)
- **Worker는 `Cf-Access-Jwt-Assertion`을 검증한다** (`D18`) — Access는 커스텀 도메인
  앞만 막으므로 이게 없으면 우회된다. JWKS는
  `https://{TEAM}.cloudflareaccess.com/cdn-cgi/access/certs`, 메모리 캐시.
  `aud`·`exp`·`iss`·서명을 확인하고 `email` 클레임이 허용 이메일과 같아야 한다
- **실패는 JSON 401** (`{"error":"unauthenticated"}`). HTML을 돌려주지 않는다.
  **다만 배포 환경에서는 Access가 Worker보다 먼저 막으므로 이 401은 밖에서 관측되지
  않는다** — origin 직접 접근 같은 우회 경로에 대한 두 번째 겹이다
- `wrangler.jsonc`에 `workers_dev: false`
- **클라이언트 쪽 계약**: 동기화 응답이 `res.redirected` 이거나 `content-type`이
  `application/json`이 아니면 **재로그인 상태**로 전환하고 안내를 띄운다.
  Access 세션이 만료되면 401이 아니라 로그인 HTML로 302가 오기 때문이다

### F-5. 자동저장과 시각 필드

- 텍스트 블록은 **타이핑이 1초 멈추면 로컬에 쓴다** (`D6`). `blur`와
  `visibilitychange`에서도 즉시 flush 한다
- `updated_at`은 **내용이 실제로 달라졌을 때만** 갱신한다. 포커스만 옮기거나 같은
  값을 다시 쓰면 갱신하지 않는다 (안 그러면 가짜 더티가 쌓이고 LWW가 오염된다)
- `scored_at`은 **`score` 값이 바뀔 때만** 갱신한다 (`D15`). 이유 문장 수정은
  `updated_at`만 건드린다
- `pinned` 개정: **실제로 커밋되는 시점**(내용이 달라졌을 때)에 마지막 `revision.day`를
  본다. 그게 **오늘(KST)이 아니면** 직전 `pinned.text`를 그날 키로 밀봉한다 (`D11`).
  입력 이벤트마다 밀봉하면 **되돌린 편집이 개정 이력과 더티를 남긴다**
- `load()`는 레코드 맵을 통째로 갈아끼우지 않는다. 콜드 스타트에서 로드 완료 전에 친
  글자가 사라진다

## Probe Questions

- **P-1.** 10점 1행 56px에서 오터치가 실제로 나는가 (`A1`·`D7`). 폰으로 며칠 써 보고
  거슬리면 5×2행이나 5점으로 내린다. **스키마는 안 바뀐다**(`score`는 그대로 정수)
- **P-2.** 「어제」 위 전날 「오늘」 병치가 세로를 너무 먹는가 (`D8`). 먹으면 접어둔다
- **P-3.** 개정 타임라인을 어디에 두나 — 고정 블록을 펼쳤을 때 하단인지 별도 화면인지.
  **먼저 하단에 붙여보고** 거슬리면 옮긴다

## Deferred Decisions

- 주·월 회고 화면 — 그래프를 실제로 써본 뒤 판단
- 전체 export의 날짜 범위 선택 UI — 지금은 전체 하나만
- `conflict` 사본을 서버로 올릴지 — 지금은 로컬 전용. 폰을 잃으면 사라지지만,
  사본은 이미 해소하라고 띄워둔 것이라 오래 살 물건이 아니다

## Non-Goals

멀티유저 · 공유 · 유료화 · 앱 내 LLM · 회원가입 · E2E 암호화 · CLI · 에너지 그래프(S2)

## Deliberately Not Doing

- **순수 텍스트 정본을 쓰지 않는다** — 라디오와 텍스트가 같은 문자열을 두 방식으로
  건드리는 비직교성 때문. 되돌리려면 아이데이션 `쟁점 1`을 다시 읽을 것
- **자체 ID/PW를 짜지 않는다** — Access가 인증 코드를 0에 가깝게 만든다
- **차트 라이브러리를 넣지 않는다** (S2에서) — 라인 3개에 SVG면 충분하다
- **상시 자동 push를 넣지 않는다** — 불변식 2
- **pull에서 충돌을 만들지 않는다** — 자동 동작이 사용자 글자를 옆으로 밀면 놀란다

## Constraints

- Svelte 5(룬) + Vite, SvelteKit 아님 / `.js` + JSDoc + `checkJs`, TypeScript 아님
- Prettier 없음. eslint + eslint-plugin-svelte 권장 설정만
- **런타임 의존성 0개를 목표로 한다** (cmanki는 1개)
- 테스트는 `node --test src/lib/*.test.js` — 순수 함수에 집중
- Cloudflare Workers + D1, 커스텀 도메인 `journal.stdy.blog`, `workers_dev: false`
- **테스트 픽스처는 지어낸 문장을 쓴다.** `references/sample.md`의 본문을 복사하지
  않는다 (AGENTS.md `사용자 데이터를 다룰 때`)

## Success Criteria

| | 기준 |
|---|---|
| **SC-1** | 폰에서 오늘 날짜 화면이 바로 뜨고, 네 블록에 쓰면 새로고침 후에도 남아 있다 |
| **SC-2** | **비행기 모드에서 앱을 열고 쓰고 닫아도 잃지 않는다** |
| **SC-3** | 점수는 한 번 눌러 들어가고, 다시 누르면 해제된다. 이유는 텍스트로만 편집된다 |
| **SC-4** | 하루치 export를 누르면 `sample.md`와 같은 형식이 클립보드에 있다 (고정 블록 제외) |
| **SC-5** | `sample.md`를 import하면 과거 기록이 들어오고, 그걸 전체 export하면 원본과 같다 |
| **SC-6** | 두 기기에서 같은 블록을 고치고 둘 다 push하면, **진 쪽 글자가 남아 있다** |
| **SC-7** | 허용 이메일이 아닌 사람은 API에 닿지 못한다 |
| **SC-8** | 새벽 3시(KST)에 쓴 기록이 그날 날짜에 붙는다 |
| **SC-9** | 미동기화 블록이 있으면 화면에서 보인다 |

## Acceptance Checks

| ID | 유형 | 조건 → 기대 |
|---|---|---|
| **AC-1** | `unit` | 지어낸 픽스처에 대해 `assemble(parse(x)) === x` (바이트 일치). `SC-5` |
| **AC-2** | `unit` | `- 인지:` (점수·이유 없음) → `{score: null, reason: ''}` → 다시 `- 인지:`. `SC-5` |
| **AC-3** | `unit` | `- 인지: 7.` (이유 없음) 왕복. 그리고 `- 인지: 10. 이유` 두 자리 점수. `SC-5` |
| **AC-4** | `unit` | **음성**: 에너지 줄이 형식을 벗어나면 파서가 `unparsed` 목록에 원문을 담고 던지지 않는다. `SC-5` |
| **AC-5** | `unit` | `kstDate(epoch)`가 UTC 18:00 → 다음날 KST 날짜를 준다 (새벽 3시 경계). `SC-8` |
| **AC-6** | `unit` | LWW 병합: 로컬이 더티면 pull이 건너뛴다 / push가 `rejected`면 충돌 사본이 생긴다. `SC-6` |
| **AC-7** | `unit` | `updated_at`은 내용이 같으면 안 바뀌고, `scored_at`은 이유만 고치면 안 바뀐다. `SC-6` |
| **AC-8** | `unit` | 개정 스냅샷이 같은 KST 날짜에 두 번 편집해도 1개다. `D11` |
| **AC-9** | `integration` | 인증 없이 `/api/pull` → **Access가 로그인으로 302**(Worker보다 앞이라 401까지 가지 않는다). 배포 후 관측 확인. `SC-7` |
| **AC-9b** | `unit` | Worker의 JWT 검증(`aud`·`iss`·`exp`·서명·이메일) 자체는 **밖에서 관측 불가** — Access가 먼저 막기 때문이다. 두 번째 겹으로 남는다. `SC-7` |
| **AC-10** | `manual` | 비행기 모드로 폰에서 열고 쓰고 재실행 → 남아 있고 미동기화 배지가 보인다. `SC-2`·`SC-9` |
| **AC-11** | `manual` | 폰·데스크톱에서 같은 블록을 고치고 둘 다 push → 진 쪽이 접힌 사본으로 보인다. `SC-6` |
| **AC-13** | `unit` | 로그 본문의 `## ` 소제목이 왕복에서 보존된다. `SC-5` |
| **AC-14** | `unit` | `## 에너지`가 없는 날짜에 빈 섹션이 생기지 않는다. `SC-5` |
| **AC-12** | `manual` | 실제 `references/sample.md` 왕복이 **파일 끝 개행 개수를 빼고** 일치 (**로컬에서만**. 픽스처로 커밋하지 않는다) |

## Boundary Ownership

| 경계 | 소유 |
|---|---|
| 인증 | **Cloudflare Access**. 앱은 검증만 한다 |
| 정본 | **로컬 IndexedDB.** D1은 동기화 대상 |
| 마크다운 형식 | [references/sample.md](../references/sample.md) — 단일 출처 |
| 충돌 해소 | **사람.** 앱은 사본을 보존하고 보여줄 뿐 병합하지 않는다 |
| 고정 블록 제목 | **사용자.** 앱은 제목을 모른다 (`D10`) |

## Critique

**구현자가 오해하기 쉬운 세 곳:**

1. **`updated_at`을 매 자동저장마다 갱신하는 것.** 그러면 가짜 더티가 쌓이고, 내용이
   같은데도 LWW에서 이겨버려 다른 기기의 진짜 편집을 밀어낸다. **내용 비교가 먼저다.**
2. **pull에서 로컬을 덮는 것.** 더티 레코드는 건너뛴다. 자동 동작이 사용자 글자를
   옆으로 밀면 안 된다.
3. **`log.text`를 정규화하는 것.** 불릿 `- `도 공백도 사용자가 친 글자다.
   trim·정규화하면 `AC-1`이 깨진다.

**과하게 걱정한 것:** 동기화 성능·페이지네이션. 연 1000행대이므로 `since` 필터만으로
충분하고, 전량 pull도 몇십 KB다. 지금 최적화하지 않는다.

## Canonical Artifact

구현 중 정본은 **이 문서**다. 개념적 근거가 필요하면
[아이데이션 기록](../charness-artifacts/ideation/2026-07-26-concept-ideation.md)을 본다.

## First Implementation Slice

1. 부트스트랩 (Svelte 5 + Vite + jsconfig + eslint + wrangler)
2. `src/lib/` 순수 함수 + 테스트 — `parse` · `assemble` · `kstDate` · `merge`
   (`AC-1`~`AC-8`)
3. 로컬 스토어(IndexedDB) + 자동저장 + 개정 스냅샷
4. UI — 날짜 화면 네 블록, 날짜 이동, export/import
5. PWA 오프라인 + `storage.persist()` + 미동기화 배지
6. Worker + D1 + Access JWT 검증 + pull/push + 충돌 사본 (`AC-9`)
7. 배포
