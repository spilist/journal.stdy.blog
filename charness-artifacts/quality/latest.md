# Quality Review
Date: 2026-08-05
Title: 7차 전체 품질 검사 — IndexedDB 재시도 복구와 품질 루프 낭비 정리

## Scope

Target boundary: repo-wide quality — 잠재 버그, 유사 패턴의 구조적 원인, 테스트·코드 속도,
중복, 부트스트랩·inventory와 이번 과정의 낭비.

Ambient repo findings: Charness adapter/inventory 오류와 사람 브라우저 수용은 이 리포의
소유가 아니거나 자동 증명이 불가능한 별도 경계로 분리했다.

## Current Gates

- 구현 후 `npm test`: 183/183 pass.
- `npm run reach`: 기준선 갱신 후 production 22개 중 12개 도달, 미도달 10개.
- focused `node --test src/lib/store.test.js`와 `npm run lint`: pass.
- 최종 `npm run gate`: 183/183, reach 22/12, lint/docs 47개, Svelte 0/0, Worker tsc, build 130 modules pass.
- `npm run deploy`: pass — Worker `6d2a285c-4366-4777-b496-5abf8b19960a`; 비인증 `/`·`/api/pull?since=0`·`/sw.js`는 302/no-store.
- `npm audit --omit=optional --audit-level=high`: 0 vulnerabilities.

## Runtime Signals

- runtime source: structured timing source가 없어 `render_runtime_summary.py --detail`의
  `runtime-signals.json`은 absent; 단일 측정으로 추세를 주장하지 않는다.
- runtime hot spots: test default 1.71–1.75초, `--test-concurrency=1` 2.83초, concurrency=4
  1.71초. 새 runner·삭제·병렬화의 근거가 없다.
- coverage gate: 줄 커버리지는 없고 `reach`가 도달 가능성 22/12를 래칫한다.
- evaluator depth: deterministic gate와 bounded fresh-eye 일부만 실행; 인증 브라우저·Cautilus는 미실행.

## Healthy

- `store.open()` 실패 뒤 거절된 Promise를 캐시하지 않아 다음 접근이 새 IndexedDB open을 시도한다.
- 최소 경계 테스트가 첫 실패→두 번째 성공과 open 호출 2회를 직접 고정하고 fake 의존성을 추가하지 않는다.
- 183개 테스트, lint, audit가 현재 변경에서 양호하며 reach가 `store.js` 도달로 개선됐다.
- structural waste·dual implementation·brittle guard·lint ignore·hardcoded discovery 후보는 0개였다.

## Weak

- reach는 production 22개 중 12개만 테스트가 로드한다. IndexedDB 실제 브라우저 동작과 Svelte UI는 사람 수용에 남는다.
- runtime budget/startup probe와 CI workflow가 없어 반복 실행 비용과 pre-push enforcement를 자동 판정하지 못한다.
- Node 대역 테스트는 브라우저별 private mode·quota·권한 오류를 증명하지 않는다.

## Missing

- 인증 브라우저에서 IndexedDB 일시 실패 후 세션 내 복구가 실제로 가능한지 확인하는 운영자 수용.
- 기존 UI-1~3, 두 탭·두 기기·대량 D1 push·warm-cache 수동 확인.

## Deferred

- `store.js` transaction 완료 대기 중복은 이번 원인과 별개이며 다음 IndexedDB 변경 때 공통 owner가 실제 복잡도를 줄이는지 재검토한다.
- runtime timing/budget/startup probe, 새 browser runner, 테스트 삭제·병렬화는 측정된 병목이 없어 보류한다.
- npm outdated의 patch/major 후보는 별도 dependency slice로 분리한다.
- Vulture/nose zero-scope 오류와 adapter bootstrap 재직렬화 경고는 upstream Charness #507 소유다. 이 리포에 wrapper나 write bootstrap을 만들지 않는다.

## Advisory

- structural review result: planner의 `structural_review_packet`은 null; `plan_quality_run.py --detail`과 실제 source/경제성 inventory의 0 후보를 heuristic clean으로 과장하지 않고 기록했다.
- prose review result: `inventory_entrypoint_docs_ergonomics.py --summary`가 entrypoint docs 5개에 long/top-level heuristic을 냈으나 source-of-truth 운영 문서라 삭제·분할의 저잡음 규칙이 없어 이번 수정은 보류했다.
- `inventory_standing_test_economics.py`: node isolation unknown은 advisory; default가 단일 프로세스 병목이 아님을 실행 비교로 확인했다.
- `inventory_nose_clones.py`·`run_dead_code_advisory.py`: Python 0개/skills 경로 부재로 error; clean으로 세지 않고 upstream deferred로 분류했다.

## Delegated Review

- executed: bounded synchronous fresh-eye review was attempted; received `store.open()` finding and counterweight, with other windows explicitly recorded as no-delivery.
- Delegated Review: partial — unnamed synchronous bounded reviewers를 시도했고 counterweight와
  `store.open()` finding 본문은 받았으나 여러 angle 및 repaired-surface probe는 host wait timeout으로 no-delivery였다.
- Parent boundary fingerprint는 각 수령 직후 `clean`; no-delivery를 same-agent pass로 대체하지 않았다.
- Slow-gate lenses (fixture-economics, parallel-critical-path, duplicated-proof): test-economics
  inventory와 직접 timing 비교는 실행했지만 no-delivery reviewer의 보고서는 증거로 세지 않았다.

## Commands Run

- quality planner/resolver, adapter dry-run, impl survey, risk interrupt, delegation resolver.
- `npm run gate` pre-change, `npm test`, focused store test, `npm run lint`, `npm run reach --write`.
- runtime/test-economics/structural/source/doc/security inventories, `npm audit`, `npm outdated`.
- synchronous bounded spawn/wait/close, boundary snapshot/verify, `git diff` inspection, deploy probe readback.

## Recommended Next Quality Moves

- active capability_needed=authenticated browser; next_center=IndexedDB recovery와 UI-1~3; transformation=operator acceptance 실행; proof_boundary=deployed authenticated browser; enforcement_posture=manual because 브라우저·사람 판단이다.
- passive capability_needed=upstream Charness inventory/bootstrap fix; next_center=#507 후속; transformation=zero-scope와 adapter preservation 재현 여부 확인; proof_boundary=upstream issue와 fresh dry-run; enforcement_posture=advisory because local owner가 없다.

## History

- [6차 품질 점검](./2026-08-05-quality-review-round-6.md)
- [기준선 품질 점검](./history/2026-07-26-quality-review.md)
