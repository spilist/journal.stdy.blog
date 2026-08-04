# Quality Review
Date: 2026-08-05
Title: 2차 전체 품질 점검 — 코드 표면과 품질 과정의 낭비

## Scope

이번 라운드는 잠재적 버그, 유사 패턴, 테스트·코드 속도, 중복, 불필요한 부트스트랩과
지난 라운드의 작업 과정 자체를 점검했다. 이미 `docs/handoff.md`에 닫힌 항목은 다시
열지 않고, 서비스워커 판올림·의존성 내성·접근성/국제화·운영 절차를 새 각도로 삼았다.

지난 라운드의 낭비는 실제 부트스트랩이 어댑터 주석 14줄과 의도적으로 뺀 기본값을
덮어써서 복구가 필요했던 일, fresh-eye 능력을 확인하지 않은 위임 결과를 해석하는 일,
아티팩트 validator를 뒤늦게 맞추느라 반복한 일이다. 이번에는 dry-run·능력 선확인·초기
아티팩트 scaffold 순서를 적용했다.

## Current Gates

- `npm run gate`: 테스트 174개 통과, reach 22개 중 11개 도달, 문서 22개 링크 검사,
  svelte-check 0 warning/error, worker TypeScript 검사 통과, Vite 130 modules와
  asset 5개 생성.
- `npm audit --omit=optional --audit-level=high`: 취약점 0개.
- `git diff --check`: 통과.

## Runtime Signals

- runtime source: timing capture is missing; command: `render_runtime_summary.py`가
  구조화된 timing source가 없다고 보고했다. 이번 게이트의 Node test는 1.569초,
  Vite build는 약 0.924초였지만 단발 수치다.
- runtime hot spots: unavailable until structured runtime metrics have samples.
- runtime visibility: weak because runtime budgets와 startup probes가 없다. 현재 게이트가
  빠르고 추세 근거가 없어 새 timing runner는 추가하지 않았다.
- coverage gate: reach는 22개 중 11개 도달로 통과했고, 이 리포에는 line-coverage floor가
  없다. reach는 행동 coverage가 아니라 production module 도달 가능성 ratchet이다.
- evaluator depth: 결정론적 gate와 정적 inventory를 수행했고, bounded delegated review는
  아래 tool timeout으로 blocked였다. Cautilus와 브라우저 수용 확인은 실행하지 않았다.

## Healthy

- `inventory_structural_waste.py`는 command snippet·Python source·중복 discovery·
  반복 source read 후보를 모두 0개로 보고했다.
- `inventory_doc_duplicates.py`는 변경된 Markdown 중복 family를 0개로 보고했고,
  `npm audit`도 0 vulnerabilities였다.
- 어댑터에 `recommendation_defaults_version`과 세 리뷰 큐를 명시해
  `inventory_adapter_gate_design.py`의 review-fields-missing을 제거했다. 빈 배열은
  미결정 상태가 아니라 이 리포가 리뷰 소스를 선택하지 않았다는 사실을 기록한다.
- `bootstrap_adapter.py --dry-run`은 실제 파일을 쓰지 않았고, 현재 어댑터의 의도적 축약과
  주석 손실 위험을 그대로 보고했다.

## Weak

- 구조화된 runtime sample·budget이 없고 test isolation은 `node_test_isolation_unknown`이다.
  다만 현재 standing test가 빠르므로 테스트 삭제나 새 실행기는 정당화되지 않는다.
- CI/local parity는 workflow 0개라 CI 건강을 말할 근거가 없다. CI와 hook은 리포 계약상
  의도적으로 없다.
- dead-code 보조기는 Python 3.9에서 Charness 스크립트의 `match` 문법으로 SyntaxError가
  나 결과를 내지 못했다. 이는 저장소 dead code의 증거가 아니라 도구 호환성 advisory다.

## Missing

- 인증된 배포 브라우저와 두 기기가 필요한 AC-12·AC-19·AC-23·AC-25·AC-26·AC-27,
  대량 D1 push, 두 탭 동작은 여전히 사람이 확인해야 한다.
- IndexedDB versionchange/blocked, JWKS key rotation, 실제 persistence denial은 브라우저와
  외부 상태가 필요해 자동 게이트에 없다.

## Deferred

- runtime timing 계측은 현재 빠른 게이트에 새 bootstrap을 더하지 않기 위해 passive로 둔다.
- 서비스워커의 옛 탭 전환과 Access 키 회전은 fresh-eye에서 재현 가능한 신규 결함이
  확인되지 않아 브라우저 수용 및 운영 증거로 넘긴다.
- `bootstrap_adapter.py`의 기존 설정 재직렬화는 로컬에서 억지로 우회하지 않고
  [Charness #507](https://github.com/corca-ai/charness/issues/507)의 상류 수정으로 둔다.

## Advisory

- `inventory_adapter_gate_design.py`는 리뷰 큐 필드가 명시된 뒤 findings 0개였다.
- command: `bootstrap_adapter.py --dry-run`은 7개 field, 7개 sub-key, 주석 14줄의
  재생성 위험을 여전히 보고한다. 실제 부트스트랩은 설정 diff를 검토할 때만 허용한다.
- artifact: 이전 라운드의 delegated report는 실제 fresh-eye가 아니라고 스스로 밝혔으므로
  이번 라운드는 능력 확인 뒤 동기 bounded review 한 번만 수행한다.
- command: `run_dead_code_advisory.py`는 Python 3.9 호환성 오류로 advisory를 반환했다.
  이 저장소에 새 Python runner나 의존성을 추가하는 근거로 삼지 않는다.

## Delegated Review

- 범위: 서비스워커 판올림 중 옛 탭, 의존성 업그레이드 내성, 국제화/접근성, 품질 과정의
  중복과 bootstrap 낭비.
- 결과: `blocked`. tool signal: `multi_agent_v1__wait_agent`가
  `timed_out=true`로 120초 뒤 반환했고, agent
  `019fcf0c-18e4-7a13-9598-e4e25c5a078f`의 close 시점 status는 `running`이었다. report가
  없으므로 fresh-eye 증거와 신규 finding을 주장하지 않는다.

## Commands Run

- `plan_quality_run.py`, `scaffold_quality_artifact.py`, `resolve_adapter.py`,
  `resolve_quality_artifact.py`, `bootstrap_adapter.py --dry-run`.
- quality inventories, `npm audit`, 코드·문서 pattern scan, `git diff --check`.
- 최종 `npm run gate`: 174/174 test, reach 22/11, lint 문서 22개, check 0 warning/error,
  build 130 modules 통과.

## Recommended Next Quality Moves

- active 사람 수용 확인 — capability_needed=인증된 배포 브라우저와 두 기기;
  next_center=`docs/operator-acceptance.md`; proof_boundary=사람의 실제 관찰;
  enforcement_posture=NON_AUTOMATABLE/advisory.
- passive 구조화 timing source because 단발 실행 시간만으로 회귀 추세를 말할 수 없다 —
  capability_needed=repo-owned timing capture; next_center=`charness-artifacts/quality/`;
  proof_boundary=반복된 gate samples; enforcement_posture=advisory/no new gate.
- passive 어댑터 bootstrap 후속 until Charness #507이 해결된다 —
  capability_needed=Charness maintainer; next_center=upstream issue;
  proof_boundary=재실행 시 주석·의도적 부재·설정이 보존되고 diff가 없음;
  enforcement_posture=upstream issue.

## History

- [이전 품질 점검](./2026-08-05-quality-review.md)
- [2026-07-26 품질 점검](./history/2026-07-26-quality-review.md)
