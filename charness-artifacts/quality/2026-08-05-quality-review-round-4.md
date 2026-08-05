# Quality Review
Date: 2026-08-05
Title: 4차 전체 품질 검사 — 온라인 복귀와 과정 낭비

## Scope

repo-wide quality: 잠재 버그, 유사 패턴의 근본원인, 테스트·코드 속도, 중복, 부트스트랩,
불필요한 테스트와 이번 세션의 재작업. 이미 닫힌 handoff 항목은 재신고하지 않았다.

Ambient repo findings: 이번 수정은 제품의 오프라인·수동 동기화 불변식에 직접 닿았고,
새 의존성·런너·CI·자동 동기화를 추가하지 않았다.

## Current Gates

- focused `node --test src/lib/state.test.js`: 28/28 통과.
- `npm test`: 179/179 통과. 기준선 177개에서 회귀 테스트 2개만 늘었다.
- `npm run lint`: eslint와 문서 검사 통과, 문서 25개·링크/수용 기준 ID clean.
- `npm run check`: Svelte와 Worker 타입 검사 통과. `git diff --check` 통과.
- `npm audit --omit=optional --audit-level=high`: 취약점 0개.
- `npm run gate`: `test` 179, `reach` 22개 중 11개 도달, lint 29개 문서, check/build 통과.
- `npm run deploy`: Worker version `b3cdc37b-e12b-4b7b-adfa-091fdeb2920c`; 비인증 `/`,
  `/api/pull?since=0`, `/sw.js`가 모두 302/no-store ([readback](../probe/2026-08-05-deploy-verification-round-4.json)).

## Runtime Signals

- runtime source: 구조화 timing source와 startup probe는 없다 (`command: render_runtime_summary.py`). <!-- reproduction-source -->
- runtime hot spots: unavailable. 이번 로컬 전체 테스트는 약 1.8초였고 새 runner/cache를 정당화할 정도의 비용 신호는 없다.
- coverage gate: line coverage가 아니라 `reach` ratchet을 사용한다. 최종 gate에서 22개 중 도달 파일 수를 확인한다.
- evaluator depth: 결정론적 gate + bounded fresh-eye critique와 header-only deploy readback;
  Cautilus와 인증 브라우저 수용은 미실행.

## Healthy

- 실제 결함을 세 리뷰어가 독립적으로 같은 시나리오로 확인했다. `online`이 IndexedDB를
  먼저 읽지 않아 다른 탭의 미동기화 글자를 서버 값으로 덮을 수 있었다.
- `Journal.lifecyclePull()`이 load 완료 대기, reload 성공 여부, online/visibility 직렬화를
  소유한다. App은 이벤트와 옵션만 연결하고 새 동기화 수단은 만들지 않는다.
- 2개 회귀 테스트가 다른 탭 판본 보존과 reload 실패 시 원격 적용 차단을 고정했다.
- 구조적 waste inventory·문서 중복·dual implementation·lint ignore는 새 finding 0개.

## Weak

- 구조화 runtime sample·CI parity·브라우저 UI 경계 proof가 없다. 빠른 로컬 gate와 리포의
  CI/hooks 금지 계약 때문에 이번에는 새 부트스트랩을 만들지 않았다.
- `node_test_isolation_unknown`, nose/dead-code advisory는 도구가 주는 약한 신호일 뿐,
  테스트 삭제나 새 런너를 결정할 근거로 사용하지 않았다.
- Maintainer-Local Enforcement: `npm run gate`를 push 전 명령형으로 실행했다. hook은
  리포 계약상 의도적으로 없으며, 이 생략은 [AGENTS](../../AGENTS.md)에 명시돼 있다.

## Missing

- 인증 브라우저·두 탭/두 기기·대량 push의 사람 수용 확인은 아직 없다. 코드 테스트가 대신할
  수 없는 경계는 [operator acceptance](../../docs/operator-acceptance.md)에 남긴다.
- 이번 lifecycle API를 실제 브라우저 `online` 이벤트에서 읽어 보는 자동 smoke는 없다.
  `reach`가 UI 셸을 모두 덮지 않는다는 기존 제한도 유지된다.

## Deferred

- `npm outdated`의 wanted patch/minor와 major 최신화는 보안·게이트 결함이 아니므로 이번
  동기화 수정과 묶지 않았다. 다음 의존성 갱신 slice에서 별도 gate한다.
- IndexedDB `versionchange`/`blocked`, JWKS rotation, service-worker 구버전 탭 전환은
  기존 운영 확인 범위다. 이번 결함의 원인으로 과잉 확장하지 않았다.
- closeout telemetry stream은 이 리포에 없어 cross-run 비용·반복 waste를 주장하지 않는다.

## Advisory

- structural review result: `skills_in_scope=false`; evidence: command: plan_quality_run.py --repo-root .가 repo-local
  skill surface를 찾지 못했다. 기능 조합과 기존 conflict surface를 유지했다.
- prose review result: evidence: artifact: ../critique/2026-08-05-critique.md — 이번 critique가 새 lifecycle 경계를 확인했고, 같은 문제를 다시
  두 이벤트 핸들러에 복제하지 않도록 state owner로 이동했다. evidence: artifact: ../critique/2026-08-05-critique.md.
- bootstrap은 evidence: command: bootstrap_adapter.py --dry-run — customized adapter를 덮는
  경고를 보고 실제 부트스트랩은 생략했다. evidence: command: bootstrap_adapter.py --dry-run.
- critique `packet_sections: []`라 packet을 만들지 않았다. evidence: artifact: .agents/critique-adapter.yaml — 이전 라운드의 불필요한 packet
  생성·fingerprint 경합을 이번 순서에서 제거했다.

## Delegated Review

- Delegated Review: executed — `multi_agent_v1` parent spawn 3건, completed report 3건
  수령. 2건은 P1 결함을 확인했고 1건은 단순 then 연결의 실패 조건을 반증했다.
- boundary fingerprint verify: clean. reviewer는 read-only였고 shared tree drift가 없었다.
- slow-gate lenses: 재위임하지 않았다. 현재 gate/runtime 신호가 느린 게이트 범위를 만들지 않는다.
- Slow-gate lenses (fixture-economics, parallel-critical-path, duplicated-proof): not re-delegated;
  현재 느린 게이트 범위가 없어 적용하지 않았다.

## Commands Run

- `plan_quality_run.py`, `scaffold_quality_artifact.py`, `resolve_quality_artifact.py`,
  `bootstrap_adapter.py --dry-run`, quality inventories.
- `npm test`, `npm run lint`, `npm run check`, `npm audit`, focused state test.
- `plan_retro_run.py`, closeout telemetry/auto-trigger probes, critique scaffold/validator.
- `git diff --check`, boundary fingerprint snapshot/verify, `git status`.
- `npm run deploy`, `npx wrangler deployments list`, header-only curl readback.

## Recommended Next Quality Moves

- active 사람 수용 확인 — capability_needed=인증된 배포 브라우저와 두 탭; next_center=../../docs/operator-acceptance.md; transformation=온라인 복귀·다른 탭 미동기화 판본 관찰; proof_boundary=사람의 실제 결과; enforcement_posture=no-gate because 에이전트가 대신할 수 없다.
- passive 구조화 timing source because 현재 단일 로컬 측정만 있다 — capability_needed=repo-owned timing capture; next_center=./; transformation=여러 gate 실행의 비교 가능 샘플; proof_boundary=반복 측정; enforcement_posture=advisory.
- passive Charness packet/bootstrap preflight until upstream adapter contract가 고쳐진다 — capability_needed=adapter dry-run diff guard; next_center=https://github.com/corca-ai/charness/issues/507; transformation=빈 packet skip·custom field 보존; proof_boundary=bootstrap dry-run; enforcement_posture=upstream advisory.

## History

- [3차 품질 점검](./2026-08-05-quality-review-round-3.md)
- [2차 품질 점검](./2026-08-05-quality-review-round-2.md)
- [기준선 품질 점검](./history/2026-07-26-quality-review.md)
