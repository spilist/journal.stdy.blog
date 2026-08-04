# Quality Review
Date: 2026-08-05
Title: 3차 전체 품질 점검 — 배포 경계와 과정 낭비

## Scope

잠재 버그·유사 패턴·테스트/코드 속도·중복·불필요한 부트스트랩을 다시 점검하고,
이번 세션의 배포 전 Access/Worker 경계와 서비스워커 갱신 경계를 포함했다. 이미
handoff에 닫힌 항목은 반복하지 않았다.

과정 낭비도 범위에 넣었다: 이번에는 어댑터를 `--dry-run`으로만 확인했고, fresh-eye
능력 부재를 같은 에이전트 검토로 포장하지 않았으며, packet 생성과 fingerprint snapshot을
병렬로 부른 실수를 바로 폐기했다. 수정 후에는 gate → commit/push → deploy → HTTP
readback → handoff 기록 순서로 닫는다.

## Current Gates

- `npm run gate`: 177/177 test, reach 22개 중 11개 도달, lint 문서 23개, svelte-check
  0 warning/error, worker `tsc`, Vite 130 modules/build 통과.
- `npm audit --omit=optional --audit-level=high`: 0 vulnerabilities.
- `git diff --check`: 통과.
- 배포: commit `705849e047c2a976405ec153b737820c2fa760b7`, Worker version
  `e5ba9779-dad7-42a9-9ac8-6d5fc5f14799`; 이전 version은
  `fa1eee2d-781f-486c-8247-650462b8e4d6`이다.

## Runtime Signals

- runtime source: timing capture is missing; command: `render_runtime_summary.py`가
  구조화된 timing source가 없다고 보고했다.
- runtime hot spots: unavailable until structured runtime metrics have samples.
- runtime visibility: weak because runtime budget/startup probe가 없다. 단일 게이트가
  1.6초 수준이어서 새 timing runner를 추가하지 않았다.
- coverage gate: reach는 모듈 도달성 ratchet이고 line-coverage floor는 없다.
- evaluator depth: 결정론적 gate·inventory·배포 HTTP readback을 수행했고, Cautilus와
  인증 브라우저 수용 확인은 실행하지 않았다. parent-spawned reviewer 3건은 받았고
  1건은 timeout이라 fresh-eye 증거는 부분 전달이다.

## Healthy

- `inventory_structural_waste.py`: command/Python/duplicate-discovery/broad-scanner/
  repeated-read 후보 0개.
- `inventory_doc_duplicates.py`: 새 Markdown 중복 family 0개. `npm audit`도 깨끗하다.
- `inventory_adapter_gate_design.py`: review-fields-missing 0개. 품질 어댑터의 빈 리뷰
  큐를 명시한 상태를 유지한다.
- Access/Worker dry-run: D1 binding, Access vars, assets가 예상대로 연결되고
  `ALLOWED_EMAIL` secret 이름이 계정에 존재한다 (`command: npx wrangler secret list`).
- 별도 HTTP readback은 `/`, `/api/pull`, `/sw.js` 모두 Access 302와 no-store를 확인했다
  (`artifact: ../probe/2026-08-05-deploy-verification.json`).
- 서비스워커가 완전한 ASSETS 목록에 없는 SPA fallback을 캐시하지 않고, 부분 설치본을
  즉시 활성화하지 않는 실행 회귀 테스트를 추가했다 (`scripts/gen-sw.test.js`).

## Weak

- 구조화된 runtime sample과 CI/local parity가 없다. CI workflow 0개는 CI 건강의 증거가
  아니다.
- `inventory_standing_test_economics.py`의 `node_test_isolation_unknown`은 advisory다.
  177개 테스트가 1.6초 수준이므로 테스트 삭제나 새 runner는 이득이 입증되지 않았다.
- `inventory_nose_clones.py`와 dead-code advisory는 도구 출력이 비어 있거나 호환성 오류라
  저장소 결함의 증거로 쓰지 않았다.

## Missing

- 인증 브라우저·두 기기 수용(AC-12·AC-19·AC-23·AC-25·AC-26·AC-27), 대량 D1 push,
  두 탭 동작은 사람 확인이 없다.
- parent `multi_agent_v1`가 4개 reviewer를 수락했고 3개 보고서를 전달했지만, 1개는
  timeout이었다. 보고서 자체가 lineage를 검증하지 못한다고 밝혀 fresh-eye 완전성은
  blocked/partial로 기록한다.

## Deferred

- JWKS key rotation, 서비스워커 이전 탭 전환, IndexedDB versionchange/blocked는 기존
  handoff의 운영/브라우저 확인 대상으로 유지한다. 이번에는 부분 설치와 SPA fallback
  캐시 오염만 코드로 닫았다.
- runtime timing과 CI/hook 추가는 현재 빠른 게이트와 리포 계약상 새 부트스트랩을 만들지
  않고 passive로 둔다.
- `bootstrap_adapter.py`의 주석/기본값 재직렬화는 Charness [#507](https://github.com/corca-ai/charness/issues/507)
  상류 수정으로 둔다. 이번에는 `--dry-run`만 실행했다.

## Advisory

- Act Before Ship: SPA fallback 자산 캐시 오염과 부분 설치본 즉시 활성화를 고쳤다 — evidence: command: `node --test scripts/gen-sw.test.js`.
  `scripts/gen-sw.mjs:46-61,94-149`에서 실행 테스트로 고정했다. malformed JWT·exp 경계·비정상 cursor·
  API 오류 상세 노출도 이미 경계에서 닫혔고 현재 version으로 배포했다.
- Bundle Anyway: release readback과 handoff를 같은 기록 커밋으로 묶었다 — evidence: artifact: `../probe/2026-08-05-deploy-verification.json`.
- Over-Worry: plugin release adapter/manifest를 이 웹 앱에 새로 만드는 것은 — evidence: command: `plan_release_run.py --repo-root . --detail`.
  `plan_release_run.py`가 plugin surface를 찾지 못한 사실을 뒤집지 못한다
  (`command: plan_release_run.py --repo-root . --detail`).
- Valid but Defer: 인증된 UI·두 기기와 key rotation은 사람이 관찰해야 한다 — evidence: artifact: `docs/operator-acceptance.md`.
- `bootstrap_adapter.py --dry-run`은 기존 주석 14줄과 기본 field/sub-key 재생성 위험을 — evidence: command: `bootstrap_adapter.py --dry-run`.
  다시 보고했다. 실제 부트스트랩을 실행하지 않은 것이 이번 과정의 낭비 방지다
  (`command: bootstrap_adapter.py --dry-run`).

## Delegated Review

- Delegated Review: executed (partial) — tool signal: `multi_agent_v1` accepted four parent-spawned
  read-only reviewers; three reports were received and one wait returned `timed_out=true`.
  Reviewers self-reported that their context could not prove lineage, so the report content
  is used as bounded evidence but not as a claim of complete fresh-eye satisfaction.

## Commands Run

- `plan_quality_run.py`, `scaffold_quality_artifact.py`, `resolve_adapter.py`,
  `bootstrap_adapter.py --dry-run`.
- `npm run gate`, `npm audit --omit=optional --audit-level=high`, focused worker/SW tests,
  quality inventories, `git diff --check`.
- 첫 전체 gate는 새 관찰 아티팩트가 아직 git 추적 전이라 문서 링크 검사에서 멈췄고,
  그 원인을 발견했다. 아티팩트를 추적한 뒤 gate를 재실행해 닫았다.
- `npx wrangler whoami`, `npx wrangler secret list`, `npx wrangler deploy --dry-run`,
  `npm run deploy`, `npx wrangler deployments list`, unauthenticated curl readbacks.
- 배포 후 `/`, `/api/pull?since=0`, `/sw.js`를 본문 없이 조회해 모두 Access 302와
  no-store를 확인했다 (`artifact: ../probe/2026-08-05-deploy-verification.json`).

## Recommended Next Quality Moves

- active 사람 수용 확인 — capability_needed=인증된 배포 브라우저와 두 기기; next_center=`docs/operator-acceptance.md`;
  transformation=AC-12·19·23·25·26·27 관찰; proof_boundary=사람의 실제 결과; enforcement_posture=NON_AUTOMATABLE.
- passive 구조화 timing source because 단발 실행 시간으로 추세를 말할 수 없다 — capability_needed=repo-owned timing capture;
  next_center=`charness-artifacts/quality/`; transformation=반복 gate sample 기록; proof_boundary=여러 실행의 비교; enforcement_posture=advisory.
- passive Charness bootstrap 후속 until #507이 해결된다 — capability_needed=Charness maintainer; next_center=upstream issue;
  transformation=주석/설정 보존과 diff 없음 확인; proof_boundary=재현 dry-run; enforcement_posture=upstream advisory.

## History

- [2차 품질 점검](./2026-08-05-quality-review-round-2.md)
- [기준선 품질 점검](./history/2026-07-26-quality-review.md)
