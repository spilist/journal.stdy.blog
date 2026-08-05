# Handoff

섹션 제목은 기계가 검증하므로 영어로 둔다. 본문은 한국어다 (AGENTS.md `언어`).

## Workflow Trigger

**사용자가 신호를 줄 때까지 기다린다 — 픽업으로 새 작업을 시작하지 않는다.**

사용자 결정 (2026-08-03, 여섯째 라운드 끝):
- **수용 확인은 사용자가 직접 쓰면서 한다.** 「불편하면 내가 리포트하겠다」 —
  `AC-12`·`AC-19`·`AC-23`·`P-6`를 **에이전트가 재촉하지 않는다.** 미확인 상태로
  남아 있는 게 정상이다.
- **퍼블릭 오픈은 사용자가 신호를 준다.** 준비는 끝났고 `origin`은 아직 private이다.
  **에이전트가 먼저 뒤집지 않는다.**

그래서 이 리포의 다음 세션은 **사용자가 가져오는 것**으로 시작한다 — 불편 리포트,
공개 신호, 또는 새 슬라이스. 그게 없으면 [로드맵](./roadmap.md)과 아래 `Discuss`를
읽고 무엇을 할지 **물어본다.** 사용자가 「한 라운드 더」를 명시하면 아래 모양 그대로
돌린다(자동으로 잡을 수 있는 것은 여섯 라운드에서 대부분 걷었다 — 수확 체감 구간이다).

### 먼저 알아야 할 것 — 2026-08-03에 무슨 일이 있었나

하루에 라운드를 여섯 번 돌렸다. 앞의 다섯은 매번 **직전 라운드의 수정이 만든 새 결함**을
잡았고(자초한 결함 다섯, 둘은 재현된 글자 유실), 그래서 다섯째 끝에 **하네스를 만들었다.**

**여섯째(공격적 라운드)가 그 하네스로 값을 뽑았다.** 확정 13건 / 반증 8건, 회귀 테스트
12개 추가(135 → 147), **결함을 되돌려 넣어 빨간불을 확인한 것 9건.** 전체 기록은
[품질 아티팩트](../charness-artifacts/quality/2026-08-03-aggressive-round.md)에 있다.
글자 유실 경로 다섯을 닫았다 — 가져오기의 낡은 미리보기 · 다른 탭 덮어쓰기 ·
워커의 비원자적 push · 로컬 부분 실패 뒤의 pull · NFD 차원 이름.

**다음에 또 돌린다면 규칙은 그대로다: 지적을 리포트로 끝내지 말고 그 자리에서 회귀
테스트로 고정하고, 반드시 결함을 되돌려 넣어 빨간불을 확인할 것.**

### 이 라운드의 모양 (다섯 번 돌려 정착한 것)

1. **독립 렌즈 넷** — 서로 모르게 병렬로 돌린다. 렌즈마다 관점이 확실히 달라야 한다.
2. **각 지적에 반증 패스** — 「동의하라」가 아니라 **「틀렸음을 보여라」**. 기본값은
   `REFUTED`. 이게 과장·오탐을 실제로 많이 걷어냈다.
3. **예외 하나**: **글자 유실 가능성이 있는 지적은 반증 실패 시 `CONFIRMED`로 올린다.**
   "드물다"는 이유로 내리지 말 것 — 빈도는 따로 적으면 된다.
4. 지적마다 `파일:행` · 실패 시나리오(입력/상태 → 잘못된 결과) · **추측한 수치 금지.**

### 이미 쓴 렌즈 — 다시 쓰지 말고 새 각도를 잡을 것

보안·신뢰경계 · 데이터유실 · 처음 온 기여자 · 개념무결성 · 접근성/모바일 ·
동기화 정확성 · 회귀/계약 · 운영/UX · 런타임 성능 · 개발 루프 속도 · 단순화(9항) ·
완결성 비평 · 청크 push 적대 · 전체 diff 상호작용 · 테스트 공백.

2026-08-03 여섯째 라운드에서 **넷을 더 썼다**: 시간 축(첫 사용/1년/5년)과 저장소 압박 ·
여러 탭·기기 동시성 · 되돌리기와 복구 경로 + 한국어 IME · 문서와 코드의 인과 역전.

**2026-08-05 5차에서 새로 검토한 각도**: 의존성 업그레이드 내성 · 서비스워커 판올림 중의
옛 탭 · 접근성 재점검 · 국제화 일반(IME 말고). 새 출하 차단은 없었고, dependency·old-tab
재시도는 별도 증거가 생길 때까지 보류한다.

### 다시 지적하지 말 것 (전부 처리·기록됨)

그래프 눈금 사다리 · 자정 넘김(`refreshToday`) · `goTo` 날짜 가드 · 가져오기 중복 키 ·
첫 날짜 이후 비-날짜 H1 파서 규칙 · 서비스워커 부분 캐시와 캐시 우선순위 ·
`verifyAccess` try · 쓰기 Origin 검사 · 에너지 시각 날짜 접두 · 토스트
`pointer-events` · 저장 실패 시 `syncState` · 디바운스 `#pending` · `SC-6` 사본 경로 ·
raced의 `syncedAt` · push 청킹 · 충돌 사본 저장 순서 · 왕복 중 편집 보호 ·
`pushNow` 재진입 가드 · 내려받기 토스트의 사본 개수 · 열린 `dim`의 export 보존 ·
로드 중 디바운스 입력 보존 · 같은 밀리초 로컬 탭 경합 · 10점 키보드 상한 ·
Access redirect의 서비스워커 캐시 · 메타 저장소와 네트워크 오류 구분 ·
영속화 Promise 처리.

**결정으로 닫힌 것(제안 금지)**: 충돌 사본을 D1에 올리거나 export 형식에 넣기 ·
CI/훅 자동화 · TypeScript 이관 · Prettier · 차트 라이브러리 · 앱 내 LLM · 멀티유저 ·
줄 커버리지 래칫(`reach`가 도달 가능성을 대신 잰다).

### 여섯째 라운드가 고친 것 — 다시 지적하지 말 것

가져오기 미리보기의 낡은 판정(`importCollides`) · 다른 탭 덮어쓰기(`reload()`) ·
워커 UPSERT의 LWW 조건 · `#loadFailed` 뒤의 pull 가드 · dim·섹션 이름의 NFC 정규화 ·
`goTo`의 20xx 연도 가드 · 가져오기 중복 키의 O(n^2) · AC ID 중복 린트(`scanAcIds`).

**고치지 않기로 한 둘**(근거는 품질 아티팩트 `## Deferred`): pull 커서의 전부-아니면-전무
고정 · 충돌 사본 삭제의 되돌리기.

### 아직 아무도 확인 못 한 것 — 여기가 가장 위험하다

- **`AC-23`** (applied 방향 사본, 예전 번호 `AC-22` — spec의 unit 기준과 부딪혀 옮겼다)
  — 단위 테스트가 클라이언트·워커를 각각 고정했지만
  **종단은 사람이 두 기기로 돌려야 한다.** 절차는 [운영자 인수](./operator-acceptance.md).
  **여섯째 라운드가 이 경로를 더 건드렸다**(워커 UPSERT가 조건부가 됐다) — 확인이 더 급하다
- **`reload()`(다른 탭 병합)를 두 탭으로 돌려본 적이 없다.** 단위 테스트 둘이 규칙을
  고정했지만, 실제 브라우저 탭 둘에서 사본이 붙는 건 사람만 볼 수 있다
- **청크 push를 실제 D1에 대고 큰 가져오기로 돌려본 적이 없다.** 200일치쯤 지어낸
  마크다운으로 시험하면 된다
- **`*.svelte` 7개와 `store.js`·`sync.js`·`autogrow.js`·`main.js`는 여전히 테스트가
  안 닿는다** ([기준선](../scripts/reach-baseline.txt)). 전부 브라우저 API가 본체라
  하네스 값이 비싸다고 판단해 멈췄다 — 그 판단을 다시 볼 수 있다

## Continuation Capability

읽고 나면 **공격적 품질 라운드를 바로 시작할 수 있어야 한다** — 어떤 각도가 이미
소진됐는지, 무엇을 다시 지적하면 안 되는지, 그리고 **지적을 테스트로 고정하는 게
이번 라운드의 산출물**이라는 것.

사람이 하는 확인(`AC-12`·`AC-19`·`AC-23`·폰에서 `P-6`)은 아래 `Next Session`에 있고,
**에이전트가 대신할 수 없다.** 라운드를 시작하면서 사용자에게 한 번 상기시킬 것.

## Current State

**S1·S2 배포됨 — https://journal.stdy.blog** (Cloudflare Access, 허용 이메일 하나).
S2 배포는 2026-07-26. 배포 직후 `AC-9` 재확인함
(인증 없이 `/api/pull` → Access가 302).

**2026-08-05 3차 품질 라운드와 서비스워커 후속 수정의 배포가 끝났다.**
`705849e`가 `origin/main`에 푸시됐고, 테스트 177개와 `test`·`reach`·`lint`·`check`·
`build` 게이트를 통과했다. 잘못 인코딩된
JWT·만료 경계·비정상 pull cursor·API 오류 상세 노출·서비스워커 산출 순서를 각 경계에서
고쳤다. 배포 Version ID는
`e5ba9779-dad7-42a9-9ac8-6d5fc5f14799`이고, 비인증 `/`·`/api/pull`·`/sw.js`가 모두
Access 302임을 [관찰 기록](../charness-artifacts/probe/2026-08-05-deploy-verification.json)으로
남겼다. 인증 브라우저와 사람 수용 확인은 아직 남아 있다. Charness 부트스트랩이 기존
어댑터를 덮어쓰는 문제는 상류 이슈 [#507](https://github.com/corca-ai/charness/issues/507)로
올렸다.

이번 출하에서 SPA fallback 자산 캐시 오염과 부분 설치본 즉시 활성화를 서비스워커
생성기와 실행 테스트에서 닫았다. 배포 Version ID는
`e5ba9779-dad7-42a9-9ac8-6d5fc5f14799`이고 이전 version은
`fa1eee2d-781f-486c-8247-650462b8e4d6`이다.

**2026-08-05 4차 전체 품질 라운드와 온라인 복귀 수정의 배포가 끝났다.** 코드 변경은
`3d0ae50`, 품질·critique·retro 기록은 `456ec5a`에 있고, 배포 Version ID는
`b3cdc37b-e12b-4b7b-adfa-091fdeb2920c` (이전 `e5ba9779-dad7-42a9-9ac8-6d5fc5f14799`)다.
179개 테스트와 `test`·`reach`·`lint`·`check`·`build`가 통과했다. `online`과
`visibilitychange`는 이제 `Journal.lifecyclePull()`을 통해 로컬 reload 성공 확인 뒤
pull하며, 초기 load와 두 이벤트의 중첩도 한 큐에서 처리한다. 비인증 `/`·`/api/pull`·
`/sw.js`는 모두 Access 302와 no-store였다 ([관찰 기록](../charness-artifacts/probe/2026-08-05-deploy-verification-round-4.json)).
인증 브라우저와 사람 수용 확인은 여전히 미확인이다.

### 이번 4차 라운드의 운영 교훈

- `packet_sections: []`이면 critique packet을 만들지 않는다. customized adapter는
  `bootstrap_adapter.py --dry-run`으로만 먼저 본다.
- reviewer boundary는 snapshot → spawn → wait → verify 순서로 처리하고, spawn 성공·수령
  보고서·timeout을 따로 기록한다. 이번에는 3건 모두 completed report를 받았고 verify가 clean이었다.
- 새 artifact를 문서가 링크하면 파일·validator·추적 상태를 먼저 닫고 gate를 부른다.
- 라운드의 낭비와 미측정 비용은 [4차 quality](../charness-artifacts/quality/2026-08-05-quality-review-round-4.md)와
  [session retro](../charness-artifacts/retro/2026-08-05-session-retro.md)에 남겼다.

**2026-08-05 5차 전체 품질 라운드와 충돌 사본 저장 경계 수정의 배포가 끝났다.** 코드
커밋은 `2e3de6c`, 품질·critique·retro 기록은 각각
[5차 quality](../charness-artifacts/quality/2026-08-05-quality-review-round-5.md) ·
[5차 critique](../charness-artifacts/critique/2026-08-05-critique-round-5.md) ·
[5차 retro](../charness-artifacts/retro/2026-08-05-session-retro-round-5.md)다. Worker
Version ID는 `0bb51f21-c35e-43c0-b6a1-9a52e0ba35e9` (이전
`b3cdc37b-e12b-4b7b-adfa-091fdeb2920c`)이고, 182개 테스트와 전체 gate가 통과했다.
`#loading` 타입 회귀를 고쳤고, `reload()`와 `push()`의 충돌 사본 저장을 공통
`#persistMerge()`로 묶어 본체 저장 실패 뒤에도 사본을 화면에 붙이며 재시도 중복을 막는다.
IndexedDB 충돌 저장은 read-write transaction 안에서 `(target, text, at)`를 멱등화한다.
비인증 `/`·`/api/pull`·`/sw.js`는 모두 Access 302/no-store였다
([관찰 기록](../charness-artifacts/probe/2026-08-05-deploy-verification-round-5.json)).
인증 브라우저·두 탭/두 기기·대량 D1 push의 사람 수용 확인은 여전히 미확인이다.

**2026-08-05 g15e 디자인 출처 수집과 UI 개선 계획을 정리했다.** 사용자가 지정한 세
원문과 직접 연관 문서는 [gather 출처 기록](../charness-artifacts/gather/2026-08-05-g15e-design-sources.md)에
보존했고, sibling repo의 성공한 capture를 checksum으로 대조해 재사용했다. destination
재-fetch는 로그인 벽으로 끝났으므로 새 공개 fetch 성공을 주장하지 않는다. 외부 논의를
저널의 오프라인 우선·수동 동기화·글자 보존·앱 내 LLM 금지와 통합한
[디자인 원칙](./design-principles.md)과 [UI 개선 계획](./ui-improvement-plan.md)을
추가했다. [bounded critique](../charness-artifacts/critique/2026-08-05-ui-design-critique.md)를
거쳐 no-JS/cold offline을 현재 계약에서 제외하고, 첫 순서를 오늘 기록 → 에너지
점수/이유 → 재방문 인출로 좁혔다. UI-1~3의 사람 수용과 G-1 gate의 소유권도 계획에
명시했다. 문서 착지 뒤 `npm run gate`는 182개 테스트·reach 22/11·문서 41개·check/build
전부 통과했다. 기능·의존성·자동화를 늘리는 계획은 아니다. 다음 구현은 UI-1 한 slice를
정한 뒤 사람의 브라우저 수용을 포함해 닫는다.

**2026-08-05 6차 전체 품질 라운드와 UI 인출 경계 수정의 배포가 끝났다.** 코드 커밋
`d826a18`을 `origin/main`에 push하고 Worker `249f2dea-0a2b-4744-ae65-5db845cc4aa8`로
배포했다. 그래프에서 선택한 날짜의 긴 이유는 좁은 폭에서 줄바꿈하며, 가져오기 패널은
`prefers-reduced-motion`일 때 즉시 이동한다. 에너지 그래프 진입 버튼이 전역 44px 조작면을
덮어쓰던 32px 예외도 제거했다. 실제 테스트 정본보다 좁은 glob을 가리키던
`AGENTS.md`·`spec-first-slice.md`를 `npm test`로 통일했고, 운영자 인수에 UI-1~3의 수동
확인 절차를 추가했다.

`npm run gate`는 182개 테스트·reach 22/11·lint/docs·Svelte/Worker check·build를 통과했다.
`npm audit`은 0 vulnerabilities다. 배포 후 비인증 `/`·`/api/pull?since=0`·`/sw.js`가 모두
Access 302/no-store임을 [6차 관찰 기록](../charness-artifacts/probe/2026-08-05-deploy-verification-round-6.json)으로
남겼다. 이 readback은 인증 없는 header-only 확인이므로 로그인 브라우저 수용을 대신하지
않는다. quality·critique·retro 기록은 각각 [6차 quality](../charness-artifacts/quality/2026-08-05-quality-review-round-6.md),
[6차 critique](../charness-artifacts/critique/2026-08-05-critique-round-6.md),
[6차 retro](../charness-artifacts/retro/2026-08-05-session-retro-round-6.md)다.

**2026-08-05 7차 전체 품질 라운드의 코드 수정이 push됐다.** 구현 커밋 `8c29d77`을
`origin/main`에 push했다. `store.open()`이 IndexedDB open 실패 Promise를 영구 cache하던
결함을 고쳐, 실패한 연결만 cache에서 풀고 다음 명령형 접근이 새 open을 시도하게 했다.
실제 `store.js`를 부르는 첫 실패→두 번째 성공 회귀 테스트를 추가했고, 테스트는 183개로
늘었다. 새 도달 증거에 맞춰 [reach 기준선](../scripts/reach-baseline.txt)도 22개 중 12개
도달·10개 미도달로 조였다.

최종 `npm run gate`는 183개 테스트·reach 22/12·문서 47개·Svelte/Worker check·build를
통과했다. 배포 당시 코드 포함 HEAD `98b14d0`을 Worker `6d2a285c-4366-4777-b496-5abf8b19960a`로 배포했고, 비인증
`/`·`/api/pull?since=0`·`/sw.js`가 모두 Access 302/no-store임을 [7차 관찰 기록](../charness-artifacts/probe/2026-08-05-deploy-verification-round-7.json)으로
남겼다. 이후 `3167146`은 기록·probe·handoff만 바꾼 문서 커밋이라 재배포하지 않았다. 이
readback은 인증 없는 header-only 확인이다.

quality·critique·retro 기록은
각각 [7차 quality](../charness-artifacts/quality/2026-08-05-quality-review-round-7.md),
[7차 critique](../charness-artifacts/critique/2026-08-05-critique-round-7.md),
[7차 retro](../charness-artifacts/retro/2026-08-05-session-retro-round-7.md)다. 이번에도
IndexedDB 실제 브라우저 복구, UI-1~3, 두 탭·두 기기·대량 D1 push는 사람 수용으로 남는다.

이번 라운드에서 새 inventory·runtime budget·browser runner·테스트 삭제는 만들지 않았다.
Vulture/nose의 zero-scope 오류와 Charness adapter bootstrap 재직렬화 경고는 clean으로 숨기지
않고 upstream 소유의 advisory/deferred로 기록했다. quality 위임 기록의 critique-only 범위는
`AGENTS.md`의 quality 계약과 맞췄다.

### 이번 5차 라운드의 운영 교훈

- adapter/primer 뒤에 `npm run check`와 최소 결정론 gate를 reviewer보다 먼저 부른다. 이번에는
  `#loading` 타입 오류를 reviewer가 먼저 발견해, 싸게 닫을 수 있는 실패가 review phase까지 갔다.
- boundary snapshot은 parent가 소유한다. 이번에는 child가 같은 snapshot 파일을 써서 첫 verify가
  window-id mismatch가 됐고, 이후 reviewer별 window를 다시 잡아 반환 직후 verify했다. 다음에는
  child가 `.charness` bookkeeping을 쓰지 않게 명시한다.
- 충돌 사본처럼 유사한 저장 순서가 둘 이상이면 state helper와 store transaction을 함께 본다.
  한 경로만 고치지 않고 `reload()`·`push()`를 공통 owner로 합쳤다.
- quality·critique·retro artifact는 canonical field를 읽고 작성한 뒤 validator를 통과시키고
  최종 gate를 부른다. `packet_sections: []`이면 packet은 만들지 않는다.

### 이번 6차 라운드의 운영 교훈

- `AGENTS.md`가 quality·critique를 standing-approved로 위임하면 delegation record도 전체
  scope를 한 번에 기록한다. 일부 scope만 쓰면 기존 범위를 덮어쓰는 낭비가 생긴다.
- broad inventory는 사용자 요청상 유지하되, Promise.all의 큰 출력은 잘려 다시 읽게 만들 수
  있다. 다음에는 명령별 결과를 작게 모아 읽고 출력 손실을 quality 결과로 오해하지 않는다.
- 그래프 이유는 “ellipsis 제거”가 아니라 bounded wrapping으로 전문과 폭 제약을 같이 지킨다.
  UI-1~3은 코드 gate가 아닌 사람 브라우저 수용이며, 현재 미실행을 pass로 포장하지 않는다.
- host가 reviewer capability/전달을 막으면 wait를 반복하지 않고 no-delivery를 기록한다. 같은
  에이전트 검토로 대체하지 않으며, 이번 parent boundary fingerprint는 clean이었다.
- runtime budget/startup probe, zero-scope inventory wrapper, 새 test runner는 실제 병목·회귀가
  생길 때까지 보류한다. adapter는 `bootstrap_adapter.py --dry-run`만 확인하고 #507 후속 전에는
  쓰기 bootstrap을 하지 않는다.

### 이번 7차 라운드의 운영 교훈

- 실패한 `indexedDB.open()` Promise는 성공 cache와 다르게 다뤄야 한다. 저장소 오류를 한 번
  겪었다는 사실과 세션 전체가 복구 불가능하다는 사실을 섞지 말고, 다음 명령형 접근의 재시도
  경계를 테스트로 고정한다.
- 실제 브라우저 경계를 보려는 테스트는 메모리 harness에 옵션을 더하는 것으로 대체하지 않는다.
  이번에는 `store.js`를 직접 import하는 최소 fake-IDB만 추가했고, browser quota/private-mode는
  운영자 수용으로 남겼다.
- reviewer는 spawn acceptance가 결과가 아니다. one-shot probe가 본문을 전달한 경우만
  finding으로 쓰고, timeout/no-delivery는 반복 대기나 same-agent pass로 바꾸지 않는다.
- snapshot을 `/tmp`에 저장하면 verify에도 같은 `--before` 경로를 준다. 기본 `.charness`
  snapshot과 섞여 window mismatch가 난 것은 boundary 절차 자체의 낭비였다.
- scaffold script의 실제 help/payload를 먼저 읽는다. 존재하지 않는 `--intent record`·`--detail`
  가정으로 왕복하지 않고, artifact를 추적한 뒤 gate를 부르는 순서를 유지한다.
- zsh에서 `path`는 `$PATH`와 연결된 special 변수이므로 readback loop 변수로 쓰지 않는다. 이번에는
  curl·npx·git이 사라진 것처럼 보이는 낭비를 `route`로 바꿔 즉시 복구했다.

### 이번 3차 라운드의 운영 교훈

- 품질 어댑터는 먼저 `bootstrap_adapter.py --dry-run`으로 재직렬화·주석 손실을 확인하고,
  실제 설정 변경 목적이 없으면 쓰기 모드로 부르지 않는다.
- 사용자 위임이 기록돼도 parent spawn 결과와 전달 여부를 따로 기록한다. 이번 리뷰는
  4개를 수락하고 3개 보고서를 받았으며 1개가 timeout이라 완전한 fresh-eye라고
  과장하지 않았다.
- 배포는 코드 커밋 → origin push → `npm run deploy` → Wrangler version/readback →
  handoff 기록 순서로 닫는다. 인증 브라우저 수용을 자동 검증했다고 말하지 않는다.

### 이번 2차 품질 라운드의 운영 교훈

- 어댑터를 건드리기 전에는 항상 `bootstrap_adapter.py --dry-run`을 먼저 실행한다.
  실제 부트스트랩은 설정 변경이 목적일 때만 출력 diff를 검토한 뒤 실행한다. 이번에는
  기존 어댑터를 쓰지 않고 리뷰 큐의 의도적 빈 상태만 명시했다.
- 위임 리뷰는 capability를 먼저 확인하고, 동기 bounded wait를 한 번만 한다. 호스트가
  fresh-eye를 실제로 수행하지 못했다면 같은 에이전트의 재검토를 fresh-eye라고 기록하지
  않는다.
- 품질 아티팩트는 라운드 초기에 날짜가 붙은 초안을 만들고, 게이트 결과를 채운 뒤
  validator를 마지막에 한 번 확인한다. 실패할 때만 해당 문장을 고친다.
- 런타임 시간은 손으로 잰 한 번의 값으로 추세를 주장하지 않는다. 구조화된 timing source가
  없으면 hot spot은 없다고 쓰고, 현재처럼 빠른 게이트에는 새 러너를 만들지 않는다.

**2026-08-04 품질 개선 슬라이스 배포됨.** 버전
`81e17bfe-db5b-40dd-82be-6c0628787214`. 월치 복사·날짜 URL·변경 내역 diff·접근성,
로컬/D1 동시성, 서비스 워커 오프라인 복구를 포함한다. 배포 후 인증 없는 `/`와
`/api/pull`이 모두 302임을 재확인했다.

**2026-08-03: 오픈소스 공개 준비 + 품질 라운드 여섯 + 하네스 셋 + 배포.** 남은 미결:

- ~~여섯째 라운드의 수정이 배포되지 않았다~~ **배포됨 (2026-08-03).**
  버전 `8674af4b-41fb-4dd3-886f-f9b7c9d054df`. 워커의 UPSERT가 이제 조건부 LWW다.
  스키마는 안 건드렸다. 배포 직후 `AC-9` 재확인함(인증 없이 `/api/pull` → Access가
  302) · `ALLOWED_EMAIL` 시크릿 존재 확인함. **`AC-23` 확인이 이제 의미가 있다**

- ~~`wrangler secret put ALLOWED_EMAIL`~~ **완료 (2026-08-03).** 순서 함정 하나를
  겪었고 [운영자 인수](./operator-acceptance.md) `## 3`에 적었다 — var → secret
  마이그레이션에서는 **배포가 먼저**다
- ~~그래프 눈금 변경이 배포되지 않았다~~ **배포됨 (2026-08-03).** 배포 직후 `AC-9`
  재확인함(인증 없이 `/api/pull` → Access가 302). **폰 확인(`P-6`·`AC-19`)이 이제
  의미가 있다**
- **리포는 아직 private이다.** 공개 전환은 사용자가 판단한다 — **에이전트가 먼저
  뒤집지 않는다.** 준비(라이선스·기여 문서·문서 자기완결화)는 끝났다
- ~~미해결 이슈 둘~~ **둘 다 닫혔다 (2026-08-03, 사용자와 논의).**
  [#2](https://github.com/spilist/journal.stdy.blog/issues/2)는 고쳤다 — push가 이겨도
  못 본 값을 덮었으면 사본을 남긴다(`SC-6`).
  [#3](https://github.com/spilist/journal.stdy.blog/issues/3)은 **결정을 유지**하기로
  했다 — 충돌 사본은 로컬 전용이고 export 형식은 안 바꾼다. 대신 미해소 사본이 있으면
  내려받기 토스트가 그 개수를 말한다
- **`AC-11`의 applied 방향은 사람이 확인한 적이 없다** — `AC-23`으로 신설했다.
  위 `Workflow Trigger`의 「아직 아무도 확인 못 한 것」 참조
- **테스트 168개 · 도달 22개 중 11개** ([기준선](../scripts/reach-baseline.txt)).
  `state.svelte.js`·`gen-sw.mjs`·`worker/` 둘에 하네스가 있다 —
  [state.harness.js](../src/lib/state.harness.js) · [d1.harness.js](../worker/d1.harness.js)

- 게이트 확인: **`npm run gate`** (= `test` 168개 · **`reach`** · `lint` · `check` · `build`).
  `lint`는 eslint와 문서 검사(링크 + **수용 기준 ID 중복**)를 둘 다 돈다
- **S2에서 새로 생긴 것** — 계약은
  [spec-first-slice.md](./spec-first-slice.md) `## S2 — 에너지 그래프`
  - 에너지 그래프. SVG 직접, 차트 라이브러리 없음. 런타임 의존성은 여전히 0개.
    **에너지 헤더 우측의 「그래프」 버튼으로 펼친다** — 기본은 접힘 (`P-7`, 사용자 제안)
  - 탭하면 이유, 다시 탭하면 그날로 이동 (날짜 이동의 조합이지 새 기능이 아니다)
  - **「전체 내려받기」는 S1 그대로 전량이다.** 그래프 창을 범위로 쓰는 결합을
    넣었다가 **사용자 판정으로 철회했다** (`S-2`) — 강결합이었다
- **현재 작업 슬라이스(2026-08-04 배포됨)** — 원복한 텍스트는 같은 편집 세션의 새 revision과
  더티 상태에서 제거하고, 선택한 달의 고정 노트·기록을 복사한다. 고정 노트의
  변경 내역은 우상단 읽기 전용 diff로 보고, 날짜 이동은 `?date=YYYY-MM-DD`와
  브라우저 뒤로/앞으로에 반영한다. 버튼 설명·포커스·정확한 KST 시각도 보강했다.
- 동시성·오프라인 복구 품질 라운드도 반영했다. `npm run gate`는 테스트 168개,
  reach 22개 중 11개, lint·check·build까지 통과했다.
- 프레시아이 리뷰 둘을 돌리고 지적을 반영했다(구현 정확성 · 설계 계약 정합).
  고치지 않기로 한 셋은 `S-5`의 「알고도 두는 것」에 있다
- D1 `journal-db` + 원격 스키마 적용 완료. 재적용은 `npm run db:schema`.
  **S2는 스키마를 건드리지 않았다** — 배포에 DB 작업이 없다
- **2026-07-27에 pull을 자동화했고 배포했다.** 배포 직후 `AC-9` 재확인함
  (인증 없이 `/api/pull` → Access가 302). 계약은
  [spec-first-slice.md](./spec-first-slice.md) `### F-3` 안의 인용 블록
  - `visibilitychange`(visible)·`online` 트리거. **폴링 타이머는 없다.**
    push는 그대로 사람이 누른다 (불변식 2)
  - 못 받은 원격 변경은 **분기 배너**로 뜬다 — 충돌이 아니다
  - **분기와 메아리를 구분한다**(`isDiverged`) — 안 그러면 "올리기 → 계속 편집"만으로
    매번 거짓 배너가 뜬다. 프레시아이 리뷰가 잡았다
- 원격은 `origin`(GitHub **private**). 상태 확인은 `git status -sb`

## Next Session

**아래는 사용자가 자기 속도로 하는 것이다 — 에이전트가 재촉하지 않는다** (위
`Workflow Trigger`의 사용자 결정). 불편이 리포트로 오면 그때 해당 항목을 연다.

1. ~~배포~~ **완료 (2026-08-05).** 위 `Current State` 참조.
2. **수용 확인 — 사람만 할 수 있다.** 절차는
   [operator-acceptance.md](./operator-acceptance.md) `## 수용 확인`.
   `AC-9`·`AC-10`·`AC-11`은 닫혔고 **`AC-12`(`sample.md` 왕복) · `AC-19`(폰에서
   그래프 탭) · `AC-23`(두 기기로 applied 방향 사본) · `AC-25`(월치 복사) ·
   `AC-26`(날짜 URL) · `AC-27`(diff·접근성)가 남았다.**
   `AC-12`는 **S1과 같은 절차**다 (`S-2` 철회로 되돌아갔다).
   **`AC-23`이 가장 중요하다** — 2026-08-03에 새로 만든 경로이고 종단 확인이 없다.
   새 UI의 세 항목은 이번 슬라이스가 배포된 뒤 같은 절차로 사람이 확인한다.
3. **pull 자동화를 두 기기로 확인 — 사람만 할 수 있다.** 볼 것: 폰에서 고치고 PC 탭으로 돌아왔을 때 받아오는가 ·
   양쪽을 같이 고쳐놓고 돌아왔을 때 **분기 배너**가 뜨는가 · **올리기 직후 계속
   편집하다 앱을 갔다 와도 배너가 안 뜨는가**(메아리 회귀).
4. **폰에서 볼 것** — `P-6`(기본 창에서 점을 짚을 수 있는가). **창이 30일에서
   4주(28일)로 바뀌었으니 옛 화면 기준으로 답하지 말 것.** 단일 출처는
   [spec-first-slice.md](./spec-first-slice.md) `## Probe Questions`.
   **나쁘면 손볼 자리는 정해져 있다**: `Graph.svelte`의 `STEP`을 `2 * WEEK`로 내린다.
   `P-7`은 해소됐다 (에너지 헤더의 「그래프」 버튼).
5. **접힘이 세션마다 초기화되는 게 귀찮은지.** 귀찮으면 열림 상태를 `journal`로
   올린다 — `pinnedOpen`이 이미 그 형태다.
6. **청크 push를 큰 가져오기로 시험** — 200일치쯤 지어낸 마크다운을 가져오고
   「올리기」. D1 호출당 쿼리 상한 때문에 넣은 경로인데 실제 D1에 대고 돌려본 적이 없다.
7. 남은 프로브 `P-2`. `P-3`은 우상단 **「변경 내역」** diff로 위치를 결정했다.

## Discuss

- **10점 척도를 유지할지**(`A1`). 며칠 써보고 6과 7을 구분해 매기지 않으면 5점으로
  내린다. 스키마는 안 바뀌고 그래프도 `MIN_SCORE`/`MAX_SCORE`만 바뀐다.
- **날짜 범위 export가 정말 필요한지.** `S-2`를 철회하면서 다시 미룬 결정이 됐다.
  전량이 불편하다는 신호가 오면 그때 만든다 — 다만 **그래프 창에 묶는 형태는
  아니다.**
- **주·월 회고 화면** — 그래프를 써본 뒤 판단하기로 했다. **이제 써볼 수 있다.**
- `conflict` 사본을 서버로 올릴지 — 지금은 로컬 전용(의도적 보류).
- **TypeScript 7은 못 옮긴다** — svelte-check가 업스트림에서 막혀 있다. 조사와 재검토
  트리거는 GitHub 이슈 #1에 있다. **여기서 다시 조사하지 말 것.**

## References

- [spec-first-slice.md](./spec-first-slice.md) — **구현 정본.** 스키마·동기화
  프로토콜·수용 기준·프로브. S2 계약은 `## S2 — 에너지 그래프`
- [roadmap.md](./roadmap.md) — 순서. 결정을 재선언하지 않는다
- [operator-acceptance.md](./operator-acceptance.md) — 사람이 하는 확인. `## 1`에
  **로컬 개발에는 API가 없다**는 제약이 있다(동기화는 배포본에서 본다)
- [2026-07-26-concept-ideation.md](../charness-artifacts/ideation/2026-07-26-concept-ideation.md)
  — 결정의 근거
