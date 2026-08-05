# journal.stdy.blog UI 개선 계획

> 기준일: 2026-08-05
> 원칙 정본: [`design-principles.md`](./design-principles.md)
> 구현 정본: [`spec-first-slice.md`](./spec-first-slice.md)

## 목표

화면에 기능을 더 담는 것이 아니라, 앱의 두 제품 outcome을 여러 맥락에서 안정적으로
제공한다. 접근성·오프라인·검증은 별도 제품 outcome이 아니라 기존 불변식과 증거 조건이다.

1. 메모장에 쓴 내용을 저널에 다시 복붙하지 않고 바로 기록한다.
2. 텍스트에 묻힌 에너지 점수와 이유를 다시 읽고 변화로 인출한다.

기존 불변식과 증거 조건은 위 outcome을 지키는 경계다. 현재 SPA는 JavaScript 실행이
전제이며, 오프라인은 서비스워커가 설치·활성화된 뒤의 warm-cache만 이 계획에서 다룬다.

## 현재 상태와 판단

- 화면은 날짜 이동, 동기화 상태/수동 올리기, 고정 노트, 세 에너지 차원, 어제·오늘
  텍스트, 그래프, import/export, conflict를 한 표면에 조합한다.
- CSS에는 44px 조작 표면, `color-scheme`, 다크 팔레트, 포커스 outline, 자동 높이
  textarea가 이미 있다. 이를 전면 재작성하지 않고 의도와 예외의 소유권을 먼저 드러낸다.
- 로컬 IndexedDB가 작업 정본이고, D1은 동기화 대상이다. UI 개선이 이 경계를 뒤집으면
  디자인 개선이 아니라 제품 결정 변경이므로 별도 결정 없이는 하지 않는다.
- 최초 방문 cold offline, SSR/no-JS fallback, RTL·다국어 일반화는 현재 계약에 없다.
- 실제 사용자 수용(폰, 두 탭, 두 기기)은 아직 사람이 해야 한다. 정적 검사나 에이전트가
  이를 대신 확인했다고 쓰지 않는다.

## 우선순위

| 순서 | capability | 먼저 다룰 seam | 최소 증거 |
| --- | --- | --- | --- |
| P0 | 복붙 없는 기록과 재방문 | 기록·에너지·저장 상태 ↔ 좁은 화면/입력 | fabricated end-to-end 수용 |
| P1 | 에너지 인출 | 그래프·긴 이유·날짜 이동 ↔ keyboard/touch | 이유 전문·날짜 이동 수용 |
| P2 | 맥락에서의 지속성 | warm-cache 오프라인·큰 글씨·모션·색 | 수동 환경 proof |
| P3 | 간섭 없는 스타일 | 실제 반복 override ↔ component/state/context | 조건 충족 시에만 ownership |
| P4 | 안전한 위임 | 변경 ↔ 기존 gate·사람 수용·배포 | 매 slice 증거 표 |

모든 조합을 한 번에 다룬다는 약속이 아니다. 실패했을 때 제품 outcome이 사라지는
맥락부터 고른다.

## Slice 0 — UI 의도와 선택된 증거 고정

코드보다 먼저 표면별 의도를 한 문장으로 고정한다.

- 날짜 줄: “오늘 쓸 날짜를 잃지 않고 가장 짧은 조작으로 이동한다.”
- 기록 블록: “복붙 없이 바로 쓰고, 저장 시각과 실패 상태를 정직하게 안다.”
- 에너지: “세 점수와 이유를 함께 입력하고 어제와의 차이를 읽는다.”
- 그래프: “이미 쓴 에너지 기록에서 흐름을 발견하고 해당 날짜로 돌아간다.”
- import/export: “원문 형식과 사용자의 글자를 잃지 않고 왕복한다.”
- conflict/sync: “무엇이 갈렸고 무엇을 다음에 누를지 안다. 자동으로 결정되지 않는다.”

아래는 후보 inventory가 아니라, 첫 구현에서 실제로 선택할 세 가지 case다. 다른 조합을
전부 검사하지 않는다.

| ID | setup / fixture | action | expected | owner | evidence | status |
| --- | --- | --- | --- | --- | --- | --- |
| UI-1 | [`references/sample.md`](../references/sample.md) 형식 + 지어낸 긴 한국어/영문 이유; 320px + 200% | keyboard로 오늘 기록·에너지 점수/이유 입력·재방문 | 복붙 없이 입력되고 focus/overflow 없이 다시 읽힘 | 사람 | 기존 배포본 브라우저 수용 | 미실행 |
| UI-2 | 온라인에서 앱 로드·서비스워커 설치/활성화·한 번 재로드 후 오프라인 | 기록·날짜 이동·그래프·export | warm-cache에서 로컬 작업이 살아 있고 cold offline은 주장하지 않음 | 사람 | [`operator-acceptance.md`](./operator-acceptance.md)에 결과 기록 | 미실행 |
| UI-3 | 점수 있음/없음·이유만 있음·긴 이유가 있는 지어낸 여러 날짜 | 그래프에서 keyboard/touch로 날짜 이동 | 점수와 이유 전문이 색/hover 없이 읽히고 해당 날짜로 이동 | 사람 | P1 수용 기록 + 회귀 테스트 | 미실행 |
| G-1 | 변경된 순수 함수·서비스워커·문서 | `npm run gate` | 테스트·reach·lint·check·build가 통과 | 게이트 | 명령 출력 | 현재 통과 |

공통 fixture의 기본은 [`references/sample.md`](../references/sample.md)다. 부족한 긴
이유·이유만 있는 날·conflict 상태는 별도의 실제 저널을 복사하지 않고 지어낸 입력으로
만든다.

**Exit:** 각 실패가 단순히 “깨짐”이 아니라 잃은 제품 outcome과 UI case ID로 연결된다.

## Slice 1 — 오늘 기록 → 에너지 → 재방문을 먼저 닫는다

첫 구현은 CSS 대개조가 아니라 제품 outcome의 end-to-end 흐름이다.

- 오늘 화면에서 메모장 없이 로그와 에너지 점수·이유를 입력한다.
- 저장·오프라인 재방문 뒤 사용자가 친 글자와 점수·이유를 다시 읽는다.
- 이 흐름을 막는 좁은 화면·큰 글씨·keyboard/focus·overflow만 고친다. 고정 `width`를
  바로 없애지 말고 `max-inline-size`·`ch`·`clamp()` 후보를 실제 case에서 비교한다.
- 논리적 속성 전환은 이 흐름에 필요한 규칙부터 한다. RTL 일반화는 목표로 삼지 않는다.

**Proof:** UI-1의 fabricated 기록을 320px과 200% 확대에서 브라우저로 보고,
keyboard-only focus loss·horizontal overflow·입력 중 화면 확대·점수 조작 실패를
기록한다.

## Slice 2 — 에너지 인출 경로를 다듬는다

새 기록 수단을 만들지 않고 이미 있는 값의 읽기 비용을 낮춘다.

- 점수와 이유의 시각적 계층을 확인한다. 숫자만 남고 이유가 사라지거나, 이유가 길어
  점수 입력을 밀어내지 않게 한다.
- 그래프의 선택 날짜 요약에서 긴 이유가 ellipsis로 잘리지 않고 전문으로 읽히게 한다.
  새 tooltip 체계나 차트 의존성 대신 줄바꿈 또는 현재 날짜 이동 조합을 우선 비교한다.
- 전날의 오늘과 현재의 어제를 함께 볼 때 각 시각의 뜻이 같은 자리에 읽히는지 확인한다.
- 그래프의 범례·툴팁·날짜 이동은 색이나 pointer hover 하나에 의존하지 않는다. keyboard와
  touch에서 같은 날짜로 갈 수 있어야 한다.
- 그래프 창, 전체 export, 월치 export를 새 상태 축으로 강결합하지 않는다. 기존 조합이
  충분한지 먼저 본다.

**Proof:** UI-3의 지어낸 기록으로 graph→date→record 경로, 이유 전문, 그래프가 닫혀도
기록과 export가 살아 있는지를 확인한다. 현재 Graph의 긴 이유 truncation은 이 slice의
구체적인 출발점이다.

## Slice 3 — 맥락 실패를 실제 문제만큼만 다룬다

동기화는 사람이 누르는 명령형 동작이고, 자동화는 상태를 알려주는 데 그친다.

- `offline`, `relogin`, `storageError`, `diverged`, `conflict`를 색만으로 구분하지
  않고 문장과 다음 행동으로 설명한다.
- 로컬 저장이 먼저이고, 실패한 저장을 네트워크 오류처럼 보이지 않게 한다.
- 충돌 사본의 개수·대상 날짜·다음 행동이 보이되, 앱이 사용자의 문장을 자동으로
  삭제·병합·서버 업로드하지 않는다.
- 설치된 서비스워커의 warm-cache에서 기록·그래프·export·날짜 이동이 멈추지 않는지,
  온라인 복귀 후 상태가 정직하게 회복되는지 확인한다. 최초 cold offline은 이 slice의
  성공 조건이 아니다.
- `prefers-reduced-motion`과 forced colors는 현재 지원한다고 쓰지 않고, UI-2에서
  “패널 이동 없음·색 없이 상태 식별”을 사람이 확인할 때만 다음 수정으로 승격한다.

**Proof:** UI-2의 warm-cache 조건과 기존 operator acceptance를 사용한다. 네트워크 차단,
저장 실패, 두 fabricated 탭/기기의 분기 상황은 각각 자동 harness와 배포 브라우저 수용의
소유자를 나눠 기록한다.

## Slice 4 — 반복될 때만 CSS aspect 경계를 정리한다

`src/app.css`와 컴포넌트 `<style>`을 지금 한 번에 재작성하지 않는다. P0/P1에서 서로
다른 컴포넌트에 같은 override가 두 번 이상 생기거나 소유 경계를 넘는 규칙이 반복될 때만
다음 ownership으로 좁혀서 분류한다.

1. reset/base와 design tokens
2. 입력·읽기 surface와 typography
3. 날짜·동기화 navigation
4. energy·graph·content blocks
5. focus·expanded·warning·sync states
6. context overrides: viewport, reduced motion, forced colors, dark palette

예외 override가 반복되면 selector를 더 세게 만드는 대신 어느 aspect가 잘못된
요소까지 weaving하는지 찾는다. `@layer`는 실제로 경계를 단순하게 만들 때만 probe한다.

**Proof:** 조건이 발생한 slice에서만 selector/component ownership 표, 반복 override 목록,
변경 전후 fabricated 화면, 대표 조합 3개의 회귀 기록을 남긴다. 조건이 없으면 이 slice는
열지 않는다.

## 매 slice의 검증 소유권

AI에게 “접근성을 지켜라”라고 말하는 것으로 끝내지 않고, 아래 소유권을 매 slice에
붙인다.

- 정적 검사 후보: landmark/label/heading, focus, logical property drift, horizontal
  overflow fixture, color token 역할. 현재 dead control/no-JS fallback은 계약 대상이 아니다.
- 기존 `npm run gate`와 중복되지 않는 작은 검사만 추가한다. 현재는 새 browser runner·CI·
  훅을 만들지 않는다.
- 응답 상태·cache·서비스워커·동기화는 코드 존재가 아니라 readback으로 확인한다.
- 각 slice는 선택한 UI case, 잃은 제품 outcome, 회귀 테스트, 사람 수용 여부를 한 기록에
  남긴다.

**Proof:** G-1은 기존 gate가 소유한다. UI-1~3은 사람의 배포 브라우저 수용이 소유하고,
순수 함수·상태·서비스워커 대역은 기존 테스트가 소유한다. 미확인 항목은 `미실행`으로
남기며 pass로 포장하지 않는다.

## 지금 결정하는 것과 미루는 것

### 지금 결정

- 첫 구현 축은 오늘 기록 → 에너지 점수/이유 → 재방문 인출이며, 그 흐름을 깨는 폭·큰
  글씨·keyboard/touch·동기화 상태만 함께 고친다.
- 현재의 단일 화면·3차원 에너지·어제/오늘 구조·수동 push·conflict 보존을 유지한다.
- 새 분류 기능·LLM·차트 의존성·상시 자동 동기화를 추가하지 않는다.
- Slice 0에서 의도와 UI-1~3을 고정한 뒤 P0 → P1 → P2 순서로 작게 구현한다. P3는
  반복 override가 생길 때만 열고, P4는 모든 slice의 stop gate다.

### 구현 중 probe

- 한국어/영문 기록에서 안정적인 measure 값
- 그래프의 keyboard/touch 인출이 별도 목록 없이 현재 날짜 이동 조합으로 충분한지
- forced colors/reduced motion에서 색이 아닌 텍스트·구조와 이동 억제가 충분한지

### 보류

- SSR/no-JS fallback과 최초 방문 cold offline
- 새 dark theme preset과 다수의 사용자 설정
- 새 chart/design dependency
- 새 taxonomy·tag navigator·AI-generated journal/UI
- 첫 slice의 exhaustive context matrix, 새 browser runner·CI·훅
- 사람 수용을 자동화했다는 주장

## 완료 기준

- 기록·에너지 인출의 필수 과업이 UI-1~3의 선택된 case에서 계속 가능하다.
- 사용자 선호를 존중하는 맥락에서 layout·typography·state 간섭이 실제 case에서 재현되지 않는다.
- 설치된 서비스워커의 warm-cache와 실패한 동기화에서도 로컬 기록·그래프·export가 살아 있다.
- 자동 검사가 판정 가능한 부분을 잡고, 브라우저에서만 보이는 위험은 사람 확인으로
  남아 있다.
- 새 기능 수와 데이터 형식은 늘지 않았는데 복붙 제거와 에너지 인출 outcome이 좋아진다.

## 관련 문서

- [`design-principles.md`](./design-principles.md)
- [`spec-first-slice.md`](./spec-first-slice.md)
- [`operator-acceptance.md`](./operator-acceptance.md)
- [`handoff.md`](./handoff.md)
- [`charness-artifacts/ideation/2026-07-26-concept-ideation.md`](../charness-artifacts/ideation/2026-07-26-concept-ideation.md)
- [`charness-artifacts/gather/2026-08-05-g15e-design-sources.md`](../charness-artifacts/gather/2026-08-05-g15e-design-sources.md)

연관 gather 묶음은 원문 보존을 위한 **참고 전용**이다. 그 안의 `stdy.blog` 전용
`public: true`·garden·SRS·POSSE 개념은 이 저널의 제품 결정으로 채택하지 않는다.
