# Quality Review
Date: 2026-08-03
Title: 공격적 품질 라운드 — 독립 렌즈 넷 + 반증 패스

## Scope

Target boundary: repo-wide. [핸드오프](../../docs/handoff.md) `## Workflow Trigger`가
지정한 라운드다 — 아직 안 쓴 각도 넷을 잡고, **지적을 리포트로 끝내지 말고 회귀
테스트로 고정하는 것**이 산출물이다. skills 디렉터리가 없어 target-skill 범위는
비적용(`skills_in_scope: false`).

렌즈 넷: 시간 축·저장소 압박 / 여러 탭·기기 동시성 / 되돌리기·복구 경로와 한국어 IME /
문서와 코드의 인과 역전. 25개 에이전트(렌즈 4 + 지적별 반증 21).

Ambient repo findings: `bootstrap_adapter.py`가 손으로 다듬은 어댑터를 덮어썼다(아래
`## Weak`). 렌즈와 무관하며 되돌렸다.

## Current Gates

- `npm run gate` = `test` → `reach` → `lint` → `check` → `build`, `&&` 사슬. 훅 없음.
- 라운드 시작 시점: 테스트 135개 전부 초록. 종료 시점 **147개**.
- `reach`는 커버리지 퍼센트가 아니라 **도달 가능성**을 잰다 — 21개 중 10개, 변동 없음.
- `lint` = eslint + [문서 검사](../../scripts/check-docs.mjs). 이번에 **AC ID 중복
  선언 검사**(`scanAcIds`)가 붙었다.

## Runtime Signals

- runtime source: timing capture is missing — 어댑터의 `command_timing_log`가 비어 있어
  구조화된 런타임 메트릭 아티팩트가 없고, 이번 라운드도 만들지 않았다. 게이트 전체가
  초 단위라 계측이 대상보다 크다 (`command: npm run gate`). <!-- reproduction-source -->
- runtime hot spots: 게이트 전체 왕복이 사람이 기다릴 수 있는 범위다(`command: npm run gate`).
  `state.harness.js`가 svelte 컴파일 결과를 소스 해시로 디스크 캐시해 반복 실행을 막는다.
- coverage gate: 줄 커버리지 래칫은 **결정으로 닫혀 있다**. `reach`가 대신 잰다.
- evaluator depth: deterministic gates + 다중 렌즈 서브에이전트. Cautilus 미사용.

## Healthy

- **하네스가 값을 했다.** 2026-08-03에 만든 `state.harness.js`·`d1.harness.js`가 이번
  라운드 회귀 테스트 9개 중 7개를 그대로 받았다. 새 하네스를 만들 필요가 없었다.
- **반증 패스가 과장을 실제로 걷어냈다.** 21건 중 8건이 `REFUTED`. 특히 문서 렌즈의
  4건은 「같은 파일이 이미 교정한다」가 근거였고, 확인해 보니 옳았다.
- **주석이 설계 결정의 단일 출처로 살아 있다.** 렌즈가 「이건 이미 의도된 것」을 스스로 판별했다.

## Weak

- **`bootstrap_adapter.py`가 손으로 다듬은 어댑터를 되돌린다.** 이전 세션이
  `.agents/quality-adapter.yaml`에서 없는 표면(lefthook·CI 워크플로·pytest·커버리지
  플로어)을 잘라내고 **왜 잘랐는지를 한국어 주석으로 남겼는데**, 부트스트랩이 그 주석과
  함께 전부 다시 써 넣었다. 파일 첫 줄이 정확히 그 상황을 경고하고 있었다("없는 게이트를
  선언해두면 다음 세션이 그걸 찾으러 다닌다"). `git checkout`으로 되돌렸다.
  **리포가 고칠 수 있는 자리가 아니다** — 스킬 쪽 문제다.
- **`*.svelte` 7개와 `store.js`·`sync.js`·`autogrow.js`·`main.js`에 여전히 테스트가
  안 닿는다** ([기준선](../../scripts/reach-baseline.txt)). 이번 라운드의 확정 지적
  13건 중 **5건이 그 파일들과 맞닿은 경계**에서 났다(가져오기 패널의 비-모달 배치,
  `visibilitychange` 순서, IME). 지적은 순수 함수 쪽으로 밀어 고정했지만, 경계 자체는
  여전히 사람 눈에만 보인다.

## Missing

- **여러 탭 동시성에 대한 계약이 문서에 없다.** 이번에 `reload()`를 넣어 코드로는
  닫았지만, [구현 정본](../../docs/spec-first-slice.md)의 동기화 프로토콜은 여전히
  기기 간(pull/push)만 서술한다. 로컬-로컬 경로가 계약에 없으면 다음 변경이 조용히
  깬다. `## Recommended Next Quality Moves`의 첫 항목.
- **`AC-23`(applied 방향 사본)의 종단 확인.** 이번 라운드가 그 경로를 **더 건드렸다**
  (워커 UPSERT를 조건부로 바꿨다). 단위 테스트는 양쪽을 고정했지만 두 기기 확인은
  사람만 할 수 있고 아직 아무도 안 했다.

## Deferred

- **pull 커서의 전부-아니면-전무 고정** (`nextPullCursor`). 더티 레코드 하나가 커서를
  붙잡아, 대량 가져오기 직후 매 자동 pull이 전 이력을 다시 받는다. 확정됐지만
  **고치지 않았다** — 글자 유실이 아니고(재수신분은 `stale`로 떨궈진다), 사람이 push를
  한 번 누르면 자가 치유되며, 키 단위 커서로 바꾸는 건 `F-9`가 정리한 축 문제를 다시
  여는 일이다. 200일치 시험(`Next Session` 6번)에서 실제로 아프면 그때 본다.
- **충돌 사본 삭제의 되돌리기.** 한 번의 탭으로 영구적이다. UI 판단이라 회귀 테스트로
  고정할 대상이 아니고, 사용자가 불편하다고 말하면 그때 넣는다.

## Advisory

- structural review result: `structural_review_packet` 미발행 — `command: plan_quality_run.py
  --repo-root .` 가 `skills_in_scope: false` 를 냈다(skills/public·skills/support 없음). 대신
  이번 라운드의 구조적 판단은 **「기능을 늘리지 말고 조합한다」**(설계 취향 1항)로
  일관했다 — 다른 탭 덮어쓰기의 진 쪽은 **이미 있는 충돌 사본 표면**에 붙였고,
  잘못된 연도는 **이미 있는 `goTo` 문**에서 막았다. 새 화면도 새 저장소도 없다.
- prose review result (`artifact: charness-artifacts/quality/2026-08-03-aggressive-round.md`
  `## Delegated Review`): 문서 렌즈가 낸 7건 중 3건 확정 · 4건 반증. 반증된 넷은 전부
  「같은 파일/같은 절이 이미 교정한다」였다. 그중 README의 `reach` 누락만은 실패 경로가
  없어도 표기 드리프트라 같이 고쳤다(설계 취향 12항 — 낡은 부분을 다시 쓴다).
- **AC ID 검사를 넣으며 `check-docs.mjs`의 200줄 트립와이어를 밟았다** (`command: wc -l
  scripts/check-docs.mjs` → 184줄에서 238줄). 근거를 다시 세워 파일 안에 적었다 — 이 규칙은 마크다운 문법이 아니라
  **리포의 계약 ID 네임스페이스**라 markdownlint이 대신할 수 있는 종류가 아니다.
  **반대 의견**: 문서 두 개짜리 n=1 리포에 40줄 게이트는 과할 수 있다. 다음에 또
  트립와이어를 밟으면 이 판단부터 다시 볼 것.

## Delegated Review

- Delegated Review: executed — 독립 렌즈 4개(`charness:bounded-reviewer` 상당,
  읽기 전용)가 21건을 냈고, **지적마다 별도 반증 에이전트**가 「틀렸음을 보여라」로
  돌아 13 `CONFIRMED` / 8 `REFUTED`를 반환했다. 반증이 인용 오류(존재하지 않는 행
  번호)와 방향 오류(어느 쪽이 건너뛰어지는가)를 실제로 잡아 시나리오를 교정했다.
  기록: `command: /workflows` 런 `wf_a36fad0b-f77`.
- **호스트 제약을 하나 겪었다:** `Agent` 툴을 `run_in_background: false`로 불렀는데도
  호스트가 백그라운드로 띄웠고, **리포트 본문이 유실됐다**(idle 신호만 도착, `TaskOutput`
  조회는 `No task found`). CLAUDE.md `Subagent Delegation`이 경고한 그대로다.
  `Workflow` 경로로 갈아타 본문을 스크립트로 받아 해결했다.
- Slow-gate lenses (fixture-economics, parallel-critical-path, duplicated-proof):
  재위임하지 않았다 — 느린 게이트가 없어 범위 밖이다.

## Commands Run

- `npm run gate` (라운드 시작·중간·종료 3회) · `npm test`
- 결함 되돌리기 검증 9회: 수정마다 결함을 다시 넣어 **의도한 테스트만** 빨간불이
  나는지 확인 (goTo 연도 가드 · applyImport 재판정 · reload 병합 · reload 사본 ·
  `#loadFailed` 가드 · 워커 LWW · dim NFC · 섹션 NFC · AC ID 충돌). 9건 모두 확인.
- `plan_quality_run.py` · `bootstrap_adapter.py` · 인벤토리 9종 — 전부 0건 또는 미설정.
- `git log --oneline` · `git ls-files` · `wc -l`

## Recommended Next Quality Moves

- active 여러 탭 동시성을 구현 정본에 계약으로 적는다 — capability_needed=로컬-로컬
  병합 규칙의 단일 출처; next_center=[spec-first-slice.md](../../docs/spec-first-slice.md)
  `### F-3`; transformation=`reload()`의 규칙(디스크 vs 메모리 LWW, 진 쪽은 사본,
  디바운스 중인 키는 건드리지 않음)을 `SC` 항목으로 승격; proof_boundary=이미
  `state.test.js`의 회귀 테스트 둘이 고정하고 있다; enforcement_posture=advisory.
- active `AC-23`을 두 기기로 확인한다 — capability_needed=사람만 할 수 있는 종단 확인;
  next_center=[운영자 인수](../../docs/operator-acceptance.md) `## 수용 확인`;
  transformation=이번 라운드가 워커 UPSERT를 조건부로 바꿨으므로 **확인이 더 급해졌다**;
  proof_boundary=단위 테스트는 양쪽을 고정했지만 종단은 못 한다;
  enforcement_posture=no-gate because 에이전트가 대신할 수 없다.
- passive `*.svelte`와 `store.js`·`sync.js`에 하네스를 붙일지 다시 본다 — 지금은 미룬다 because 하네스 값이 비싸다는 판단이 아직 안 뒤집혔고 이번 지적도 전부 순수 함수 쪽으로 밀어 고정할 수 있었다.
  capability_needed=브라우저 API 경계의 도달; next_center=[기준선](../../scripts/reach-baseline.txt);
  transformation=이번 확정 13건 중 5건이 그 경계에서 났다는 사실이 새 근거다;
  proof_boundary=`reach`가 못 닿는 파일 목록을 이미 보이게 한다;
  enforcement_posture=no-gate.

## History

- [2026-08-03 오픈소스 공개 전 최종 점검](./2026-08-03-quality-review.md)
- [2026-07-26 quality review](./history/2026-07-26-quality-review.md)
