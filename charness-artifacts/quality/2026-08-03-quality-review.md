# Quality Review
Date: 2026-08-03
Title: 오픈소스 공개 전 최종 점검

## Scope

Target boundary: repo-wide. 사용자 질문 둘 — (1) 공개 준비에서 놓친 것 (2) 코드 전반의
성능·테스트 속도·중복·죽은 코드. 이 리포에는 skills 디렉터리가 없어 target-skill 범위는
비적용(`skills_in_scope: false`).

Ambient repo findings: 직전 3커밋(그래프 눈금 변경, sample.md 교체, 공개 표면)이 남긴
문서 드리프트와, 그와 무관하게 `state.svelte.js`에 있던 동기화 표시 결함 하나.

## Current Gates

- `npm run gate` = `test` → `lint` → `check` → `build`, `&&` 사슬. 훅 없음(명령형 버튼만).
- `lint`는 eslint + [마크다운 링크 검사](../../scripts/check-docs.mjs)를 함께 돈다.
- 테스트 86개 전부 순수 함수 계층(파서·병합·그래프·날짜·문서 링크).

## Runtime Signals

- runtime source: `render_runtime_summary.py --repo-root .`를 실제로 돌렸고 **`not configured`를 반환했다** — 이 리포는 구조적 타이밍 캡처를 두지 않는다(`command_timing_log` 어댑터 키 없음). 그래서 아래 수치는 헬퍼가 렌더한 것이 아니라 **게이트 넷을 `date +%s%N`으로 직접 감싼 1회 측정**이고, 추세가 아니라 스냅샷이다. <!-- reproduction-source -->
- runtime hot spots: unavailable — `render_runtime_summary.py`가 `unavailable until structured runtime metrics have samples`를 반환했다. **추세로 주장할 수 있는 hot spot이 없다.** 1회 스냅샷은 아래 `## Advisory`에 측정 방법과 함께 두었고, 예산 부재는 헬퍼가 `runtime_visibility_missing_budgets`로 함께 보고했다.
- coverage gate: 없음. 커버리지 도구를 두지 않기로 한 리포다(의존성 최소).
- evaluator depth: 결정론적 게이트 + 바운디드 프레시아이 리뷰 2회. Cautilus 미실행(미설치).

## Healthy

- **죽은 코드 없음.** export 단위 미사용 0건(전수 스캔). `run_dead_code_advisory` 0건.
- **구조적 중복 없음.** `inventory_structural_waste` 0건, `inventory_dual_implementation` 0건, `inventory_doc_duplicates` 0건.
- **린트 억제 0건.** `eslint-disable`·`noqa` 계열이 하나도 없다.
- **런타임 의존성 0개.** 그래프도 SVG 직접. `package.json`에 `dependencies` 없음.
- **비밀값 노출 없음.** `ALLOWED_EMAIL`은 `vars`에서 빠졌고 [worker/access.js](../../worker/access.js)의 `no-allowlist` 가드가 부재 시 닫는다. 추적 파일에 `.env`·덤프·`dist/` 없음.
- **눈금 사다리가 전 구간에서 성립.** 창 1~1500일에서 라벨 유일·개수 ≤9를 성질 테스트가 못 박는다.

## Weak

- **테스트 파일 하나가 스위트를 지배했다 — 고침.** `series.test.js` 1201ms(나머지 합 584ms). 원인은 새 스윕 테스트가 창을 1500번 다시 만든 것(`windowDates` 875ms). 창은 오늘에 붙어 있어 `full.slice(-n)`과 같으므로 한 번만 만들게 바꿨다. **커버리지 손실 없음**(등가를 6개 자리에서 assert). 1201ms → 306ms, 스위트 1371ms → 441ms.
- **`AC-12`(왕복 확인)가 여전히 사람 몫이다.** `sample.md`가 이제 지어낸 픽스처라 자동 테스트로 승격할 수 있는데 안 했다. 사람이 하는 수용 항목이 하나 줄어드는 자리다.
- **`worker/` 테스트 0개.** `access.js`의 JWT 검증(가드 포함)과 `index.js`의 라우팅이 전부 미검증이다. 배포본에서만 확인된다.

## Missing

- **비-git 체크아웃에서 `lint`가 깨진다** (`PLAUSIBLE`, 미실행 확인). [check-docs.mjs](../../scripts/check-docs.mjs)가 존재 검사를 `git ls-files`로 한다. zip 다운로드로 받은 기여자는 게이트를 못 돈다. README는 clone을 전제하므로 거짓은 아니지만, 안내가 없다.
- **Maintainer-Local Enforcement: `missing`(명시적 결정).** 게이트를 훅으로 걸지 않는 것은 이 리포의 명시적 방침이다(명령형 버튼만 허용). 커밋 전 호출은 사람/에이전트가 한다.

## Deferred

- **`state.svelte.js` 809줄의 구조적 접기.** blank 에너지 리터럴이 4곳에 하드코딩돼 있고, "energy면 `nextEnergy` 아니면 `nextText`" 분기가 4곳에 흩어져 있으며 `flush()`만 키 문자열로 kind를 되추론한다. `blank(key)` 팩토리 + `commitPending()` 하나로 접힌다. **공개 직전에 손대지 않는다** — 동기화 경로 한복판이고 테스트가 없다.

## Advisory

- structural review result: not_applicable — 이 리포에 `skills/` 디렉터리가 없어 planner가 `structural_review_packet`을 내지 않았다 (`command: plan_quality_run.py --repo-root .` → `skills_in_scope: false`).
- prose review result: 진입 문서 넷이 자기완결적이다. `inventory_entrypoint_docs_ergonomics`가 `AGENTS.md`(185줄)와 `docs/spec-first-slice.md`(502줄)에 `long_entrypoint`를 붙였으나, 전자는 15항 인라인이 공개를 위해 **의도적으로 추가된 것**이고 후자는 구현 정본이라 길이가 역할과 맞는다.
- 앱 성능은 이 규모에서 문제 없다 — `Graph.svelte`의 파생 체인이 매 변경마다 레코드 전량(연 ~1800건)을 재스캔하지만 파생 재계산 시에만 돌고 스캔당 마이크로초다. `command: grep -n 'derived' src/lib/Graph.svelte`
- **게이트 1회 스냅샷(추세 아님, 예산 없음):** `check` 3.9s · `build` 2.1s · `lint` 1.4s · `test` 0.44s = 총 **7.9s**. `date +%s%N`으로 직접 감싼 단일 측정이라 회귀 판정에 쓸 수 없다 — 그러려면 구조적 타이밍 캡처가 먼저다. `check`가 최대인 건 `svelte-check` + `tsc` 둘을 도는 값이라 정상. `command: npm run check`
- `charness-artifacts/`가 이 리포에 없는 도구 이름으로 차 있어 외부인이 "빠진 파일"로 읽는다 → [README](../README.md)를 새로 붙여 기록임을 밝혔다.

## Delegated Review

- Delegated Review: executed — **채널: `charness:bounded-reviewer` 바운디드 서브에이전트(읽기 전용), 동기 실행 2회.** 반환된 처분은 아래와 같다. 1회차(그래프+공개 준비)는 **눈금 사다리의 실제 결함 둘**을 잡았다: 541일 창에서 눈금이 양 끝 둘로 붕괴(1월이 창에 하나뿐일 때), 월 눈금이 12개까지 나와 폰 폭에서 겹침. 둘 다 재현 후 수정. 2회차(공개 관점)는 `handoff.md`가 히스토리 잔여물의 존재를 공개 문서로 알리는 것, 이슈 템플릿의 상대 링크가 이슈 본문에서 404가 되는 것, `state.svelte.js`의 동기화 표시 고착을 잡았다 — 전부 수정. 2회차의 지적 2·3번(AGENTS.md가 낡았다)은 **낡은 상태를 읽은 오탐**으로 판정했다(`command: grep -c cmanki AGENTS.md` → 0).
- Slow-gate lenses (fixture-economics, parallel-critical-path, duplicated-proof): 재위임하지 않았다 — 전체 게이트가 7.9s라 slow-gate 범위가 아니다.

## Commands Run

- `plan_quality_run.py` · `resolve_adapter.py` · `bootstrap_adapter.py` · `resolve_quality_artifact.py`
- `inventory_standing_test_economics` · `inventory_structural_waste` · `run_dead_code_advisory` · `inventory_dual_implementation` · `inventory_doc_duplicates` · `inventory_entrypoint_docs_ergonomics` · `inventory_lint_ignores` · `inventory_gitignore_scan_hygiene`
- `npm test` · `npm run lint` · `npm run check` · `npm run build` (각각 계측), 파일별 `node --test`
- 사적 정보 스윕: `git ls-files -z | xargs -0 grep -lniE ...`

## Recommended Next Quality Moves

- active `AC-12`를 자동 테스트로 승격 — capability_needed=지어낸 `sample.md`를 `node --test`가 직접 읽어 `assemble(parse(f))` 왕복을 검사; next_center=`src/lib/markdown.test.js`; transformation=사람이 하는 수용 항목 하나를 결정론적 게이트로 옮긴다; proof_boundary=EOF 개행 차이는 명시적으로 허용; enforcement_posture=candidate-floor. 북극성: 형식 정본이 회귀 테스트로 고정된다. 절제 확인: 새 도구·의존성 0개, 이미 있는 두 수단의 조합이다.
- active `wrangler secret put ALLOWED_EMAIL` — capability_needed=배포 전 시크릿 주입; next_center=[운영자 인수](../../docs/operator-acceptance.md) `## 3`; transformation=없으면 전 요청 401이 되는 미결을 닫는다; proof_boundary=배포 후 `/api/pull` 왕복; enforcement_posture=advisory (사람만 할 수 있다).
- passive `worker/` 테스트 — capability_needed=JWT 검증의 인프로세스 검증; next_center=`worker/access.test.js`; transformation=배포본에서만 확인되는 경로를 로컬로 내린다; proof_boundary=서명·`aud`·`exp`·`iss`·허용 이메일·`no-allowlist`; enforcement_posture=no-gate because 공개 직전에 새 표면을 늘리지 않는다.
- passive `state.svelte.js` 접기 — capability_needed=blank/commit 규칙의 단일 소유; next_center=`src/lib/state.svelte.js`; transformation=4중 분기를 팩토리 하나로; proof_boundary=동기화 경로 테스트가 먼저 필요하다; enforcement_posture=no-gate until 테스트가 붙기 전까지 손대지 않는다.

## History

- [2026-07-26 quality review](./history/2026-07-26-quality-review.md)
