# Quality Review
Date: 2026-08-05
Title: 전체 품질 검사와 비용·중복 재분류

## Scope

Target boundary: 저장소 전체의 correctness, 중복 소유권, 테스트·게이트 비용, bootstrap 및 배포 전 품질.

Ambient repo findings: 인증 브라우저 수용과 upstream Charness adapter 보존은 이 리포의 자동 게이트 밖이다.

## Current Gates

- `npm run gate`: 188/188 pass, reach 22개 중 12개, lint/docs pass, Svelte 0 errors/0 warnings, Worker check pass, 130-module build와 service worker 생성 pass. test phase 1.58초, 전체 `npm test` wall 1.80초.
- `npm audit --omit=optional --audit-level=high`: 0 vulnerabilities. `git diff --check`: pass.
- nose 0.20.0: explicit `src`, `worker`, `scripts` 범위에서 exit 0, baseline 없음, 35 family/상위 20개 401 duplicate lines. advisory이며 총량은 목표로 삼지 않았다.

## Runtime Signals

- runtime source: structured timing capture가 없고 `render_runtime_summary.py`가 `runtime_visibility_missing_budgets`와 `runtime_visibility_missing_startup_probes`를 weak으로 보고했다; 새 러너를 만들 근거가 될 hot spot은 관측되지 않았다. <!-- reproduction-source -->
- runtime hot spots: `npm test` 1.80초 wall, build 약 0.92초; 현재 규모에서 startup/bootstrap 최적화보다 측정 부재를 기록하는 편이 싸다.
- coverage gate: 줄 커버리지는 없고 `reach`만 production 도달 가능성을 래칫한다. JS mutation은 Stryker 미설치로 실행하지 못했다.
- evaluator depth: 결정론 gate·정적 inventory·audit·이전 라운드의 실제 bounded review; 인증 브라우저와 Cautilus는 미실행.

## Healthy

- 최근 `store.js`의 `transactionDone` 추출과 fake-IDB rollback/abort 격리가 현재 gate에서 회귀 없이 유지된다.
- `inventory_dual_implementation`, brittle source guard, lint-ignore, gitignore scan hygiene, hardcoded discovery, structural waste에서 추가 구조적 후보가 없었다.
- standing test economics는 12개 JS test file, nested CLI 0개로 확인했다. 새 test runner·fixture bootstrap·runtime dependency를 추가하지 않았다.
- `npm` runtime dependency 0개 취향을 유지했고, CI workflow도 없어 local/CI 중복 게이트는 없다.

## Weak

- reach는 22개 production 중 12개 도달이며 IndexedDB·Svelte 실제 브라우저 경계는 Node 대역보다 약하다.
- Vulture는 git-visible Python 파일 0개 상태에서 primary/sweep 모두 exit 2라 dead-code clean으로 해석할 수 없다.
- mutation proof는 Stryker 미설치로 비어 있다. 설치 자체가 runtime dependency 정책과 맞는지는 별도 판단이다.

## Missing

- 배포된 인증 브라우저에서 IndexedDB abort/retry, warm-cache, UI-1~3과 두 탭/두 기기 수용을 사람이 확인한 증거.
- 구조화된 runtime timing log와 이에 근거한 budget/startup probe.

## Deferred

- nose 35 family 중 행동별 테스트 setup(F1·F2·F3·F5·F7·F9·F13·F14·F17·F24·F29·F35), 컴포넌트/입력별 국소 스타일·호출(F4·F6·F15·F20·F23·F26), 서로 다른 sync/state/harness 실패 경계(F8·F11·F12·F16·F18·F19·F21·F22·F25·F27·F28·F32·F33·F34)는 소유권이 달라 유지했다.
- F10의 `store.js` transaction wait만 공통 owner로 처리했다. F30·F31의 짧은 wrapper, state stale guard, UI CSS/test setup은 추출 이득보다 경계 손실이 커 보류했다.
- Vulture zero-scope, Stryker 미설치, runtime budget/startup probe 부재는 upstream/운영 선택의 advisory로 남겼다. 어댑터는 쓰기 bootstrap하지 않았다.

## Advisory

- structural review result: planner의 `structural_review_packet`은 null. `plan_quality_run.py --repo-root .`와 source inspection에서 target-skill 구조 결함은 발견되지 않았다.
- prose review result: `inventory_nose_clones.py --detail`의 35 family를 ownership·behavior boundary·test economics로 전부 분류했고, total_dup_lines 감소를 목적으로 한 추출은 하지 않았다.
- `run_dead_code_advisory.py --summary`: git-visible Python 0개, vulture exit 2; 도구 실패를 clean으로 숨기지 않았다.
- `inventory_standing_test_economics.py --summary`: node isolation unknown만 advisory. 현재 test phase 측정 후 새 runner는 비용 대비 이득이 없어 보류했다.
- `run_js_mutation.py --mode dry-run`: StrykerJS 미설치(exit 1). mutation dependency를 임의 설치하지 않았다.
- `inventory_doc_duplicates`, `inventory_cli_ergonomics`, `inventory_ci_recoverable_gates`, `inventory_ci_local_gate_parity`, `inventory_lint_ignores`, `inventory_brittle_source_guards`, `inventory_dual_implementation`, `inventory_structural_waste`: 추가 actionable finding 없음.

## Delegated Review

- Delegated Review: blocked no-delivery — high-leverage quality reviewer를 parent-delegated로 spawn했으나 bounded wait 2회에 본문이 전달되지 않아 종료했다. `tool signal: wait_agent timed_out`; 같은 에이전트 재시도나 same-agent pass로 대체하지 않았다. boundary verify는 `/tmp/journal-quality-final-review.json` 기준 clean이다.
- 이전 nose/store 라운드의 실제 수신 review는 `nose-store-round-2-packet.md`와 `nose-store-round-3-packet.md`에 있고, shared state·rollback·module isolation 결함을 잡아 현재 코드에 반영했다.
- Slow-gate lenses (fixture-economics, parallel-critical-path, duplicated-proof): test setup을 더 복제하지 않고 기존 소유 경계를 유지했다.

## Commands Run

- `npm run gate`, `npm test`, `npm audit --omit=optional --audit-level=high`, `git diff --check`.
- `inventory_nose_clones.py --repo-root . --path src --path worker --path scripts --summary|--detail` 및 quality inventory dispatch 전체.
- `render_runtime_summary.py --detail`, `check_runtime_budget.py --summary`, standing test/gate economics, SLOC, dead-code advisory, mutation dry-run.
- `plan_quality_run.py`, adapter resolver, delegation resolver, reviewer boundary snapshot/verify.

## Recommended Next Quality Moves

- active capability_needed=authenticated browser; next_center=배포된 IndexedDB abort/retry와 UI-1~3; transformation=operator acceptance 실행; proof_boundary=인증 브라우저; enforcement_posture=manual because 세션과 사람의 읽기·쓰기 판단이 필요하다.
- passive capability_needed=structured runtime timing; next_center=게이트가 실제로 느려질 때; transformation=timing log를 먼저 만들고 그 뒤 budget/startup probe를 검토; proof_boundary=구조화된 runtime report; enforcement_posture=advisory because 현재 측정된 게이트는 2초 안팎이다.
- passive capability_needed=JS mutation runner; next_center=Stryker 설치/정책 결정; transformation=runtime dependency 0개를 깨지 않는 별도 quality tool 경로 검토; proof_boundary=fresh mutation report; enforcement_posture=no-gate because 현재는 도구 자체가 없다.
- passive capability_needed=upstream adapter preservation; next_center=Charness #507; transformation=다음 upstream 재현 때 dry-run 비교; proof_boundary=upstream issue; enforcement_posture=advisory because local wrapper는 만들지 않는다.

## History

- [nose 중복 분류와 IndexedDB transaction 경계](./2026-08-05-quality-review.md)
- [7차 품질 점검](./2026-08-05-quality-review-round-7.md)
- [기준선 품질 점검](./history/2026-07-26-quality-review.md)
