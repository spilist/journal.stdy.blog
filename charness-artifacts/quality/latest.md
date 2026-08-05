# Quality Review
Date: 2026-08-05
Title: nose 중복 분류와 IndexedDB transaction 경계 정리

## Scope

Target boundary: `inventory_nose_clones.py`의 실제 저장소 범위(`src`, `worker`, `scripts`)와 그중 구조적으로 처리 가능한 중복.

Ambient repo findings: 기존 UI·인증 브라우저 수용, Charness adapter/bootstrap은 이 슬라이스의 소유가 아니다.

## Current Gates

- `node --test src/lib/store.test.js`: 6/6 pass.
- `npm run gate`: 188/188 pass; reach 22개 중 12개, lint/docs, Svelte·Worker check, 130-module build, service worker 생성 pass.
- `npm run lint`: pass, 문서 47개.
- `npm run check`: Svelte 0 errors/0 warnings, Worker TypeScript pass.
- nose 0.20.0: exit 0, baseline 없음. 수정 전 35 가족/상위 20개 441줄, 수정 후 34 가족/상위 20개 401줄.

## Runtime Signals

- runtime source: timing capture is missing; command: `node --test src/lib/store.test.js` 단일 측정만 있어 전체 게이트 추세를 주장하지 않는다.
- runtime hot spots: 이번 변경은 IndexedDB helper 1개와 격리된 경계 테스트이며 standing gate 범위를 넓히지 않았다. `npm run gate`는 1.58초 test phase를 포함해 pass했다.
- coverage gate: 줄 커버리지 없음; `reach`가 도달 가능성만 래칫한다.
- evaluator depth: deterministic gate와 bounded critique만 실행; 인증 브라우저/Cautilus는 미실행.

## Healthy

- 세 IndexedDB readwrite 호출자의 transaction 완료 대기를 `transactionDone` 한 곳으로 소유시켰다.
- `oncomplete`, `onerror`, request error가 없는 explicit `onabort` 모두 caller를 끝내도록 했다.
- fake-IDB가 open 재시도, 성공 저장, newer 판정, conflict dedupe, transaction error/abort를 실제 public 함수 경계로 실행한다.
- nose는 advisory로만 사용했고 total_dup_lines를 목표로 삼지 않았다. baseline도 생성하지 않았다.

## Weak

- reach는 기존처럼 production 22개 중 12개 도달이며 IndexedDB 실제 브라우저 동작은 Node 대역보다 약하다.
- fake-IDB는 quota/private mode와 브라우저별 abort 세부 동작을 증명하지 않는다.

## Missing

- 배포된 인증 브라우저에서 IndexedDB abort/retry와 UI 수용을 사람이 확인하는 증거.

## Deferred

- state.svelte.js의 pull/push 적용 루프(F11·F12·F18·F22)는 같은 stale guard처럼 보여도 side effect가 달라 이번에 일반화하지 않았다.
- store.js의 1~3줄 우연 중복(F30·F31), series/worker/harness의 작은 wrapper는 소유권을 흐릴 만큼 이득이 없어 보류했다.
- UI CSS·컴포넌트 boilerplate와 테스트 scenario setup은 디자인/행동 경계가 달라 공통 스타일·fixture로 합치지 않았다.
- `onabort`의 실제 브라우저별 오류 의미와 quota/private-mode는 별도 operator acceptance로 남긴다.

## Advisory

- structural review result: planner의 `structural_review_packet`은 null. evidence: `plan_quality_run.py --repo-root .`; nose 35개를 다음처럼 전부 분류했다.
  - 행동별 테스트 setup 유지: F1·F2·F3·F5·F7·F9·F13·F14·F17·F24·F29·F35. evidence: nose detail command.
  - 컴포넌트/입력 modality 국소 스타일·호출: F4·F6·F15·F20·F23·F26. evidence: nose detail command와 해당 source locations.
  - sync/state 및 harness의 서로 다른 실패·경계 경로: F8·F11·F12·F16·F18·F19·F21·F22·F25·F27·F28·F32·F33·F34. evidence: nose detail command와 source inspection.
  - 실제 구조적 중복 처리: F10(`store.js` transaction wait). F30·F31은 우연히 비슷한 짧은 wrapper로 분류해 보류. evidence: nose detail command와 `src/lib/store.js`.
- nose command: `inventory_nose_clones.py --repo-root . --path src --path worker --path scripts --detail`; lexical clone proxy라 semantic 중복을 보장하지 않는다.
- prose review result: `inventory_nose_clones.py --detail`과 source inspection을 근거로 전체 후보를 삭제/추출하지 않고 ownership, behavior boundary, test economics로 triage했다.

## Delegated Review

- Delegated Review: executed — pre-change 두 angle과 별도 counterweight, post-change round-2, repair 후 round-3 본문을 받았다. round-2가 shared state/rollback proof 결함을 잡았고 round-3가 동적 import 격리와 pending rollback을 확인했다.
- Packets: `nose-store-round-1-packet.md`(초기), round-2 markdown SHA-256 `b35f71bab52afa02e4977fb1f6e1e6d822da8e092a14d8826a31f78f0c92e730`, round-3 markdown SHA-256 `3e109338f755bef4ba8b1c8eccf2238f47eaa3be25e5b7440eafe78cbcc49ee3`.
- boundary verify: counterweight·round-2·round-3는 모두 `clean` (각 `/tmp/nose-store-*.json`). 초기 두 angle은 병렬 spawn 중 parent가 기본 snapshot을 덮어써 window mismatch가 났으므로 boundary clean을 주장하지 않는다. 이 절차 낭비는 기록한다.
- Slow-gate lenses (fixture-economics, parallel-critical-path, duplicated-proof): test setup을 더 복제하지 않고 helper seam 1개와 caller 고유 동작 2개만 추가했다.

## Commands Run

- `inventory_nose_clones.py` default-path error 확인 후 explicit `--path src --path worker --path scripts`로 detail/summary 실행.
- `npm run gate`, `npm audit --omit=optional --audit-level=high`, `git diff --check`.
- `npm run lint`, `npm run check`, `node --test src/lib/store.test.js`.
- critique adapter/packet/delegation resolver, three bounded reviewers, boundary snapshot/verify.

## Recommended Next Quality Moves

- active capability_needed=authenticated browser; next_center=배포된 IndexedDB abort/retry; transformation=operator acceptance 실행; proof_boundary=인증 브라우저; enforcement_posture=manual because 사람 판단과 인증 세션이 필요하다.
- passive capability_needed=upstream Charness adapter preservation; next_center=#507; transformation=다음 upstream 재현 때 dry-run 비교; proof_boundary=upstream issue; enforcement_posture=advisory because local wrapper는 만들지 않는다.

## History

- [7차 품질 점검](./2026-08-05-quality-review-round-7.md)
- [기준선 품질 점검](./history/2026-07-26-quality-review.md)
