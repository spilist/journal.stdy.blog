# Session Retro
Date: 2026-08-05

## Context

이번 단위는 6차 repo-wide 품질 검사, UI 인출·접근성 경계 수정, push·배포 전 closeout이다.
사용자가 잠재 버그뿐 아니라 유사 패턴·속도·부트스트랩·테스트·과정 낭비까지 요청했으므로,
넓은 inventory는 **strong하게 의도된 exploration**으로 분류한다. 코드·게이트는 strong,
브라우저 체감·cross-run 비용은 unavailable 또는 moderate로 구분한다.

## Window

`973ef1a`의 디자인 문서 착지 뒤 quality planner·broad inventory·bounded review를 거쳐,
Graph/ImportPanel/Energy과 테스트 명령 문서를 고치고 최종 gate·배포하는 구간이다.

## Evidence Summary

- broad inventory에서 구조적 waste·dual implementation·lint ignore 후보는 0개였다.
- `npm test` 182개, `npm run check`, `npm run lint`는 변경 후 통과했다. 최종 gate는 closeout에서 다시 실행한다.
- `npm audit`은 0 vulnerabilities. `npm outdated`는 별도 dependency slice 후보만 보였다.
- runtime summary는 structured source·budget·startup probe가 없다고 보고했다. 단일 실행으로 추세를 주장하지 않는다.
- bounded review는 동기식으로 요청했고 두 보고서와 counterweight를 받았으며, 두 reviewer window는 host capability/전달 문제로 보고 없이 종료됐다. 부모 `/tmp` boundary verify는 clean이었다.

## Waste

- **위임 기록 범위를 한 번에 쓰지 못했다** (recurrence-class: delegation-scope-overwrite): resolver가
  AGENTS 계약과 기록의 critique-only 불일치를 보여줬다. 첫 `record --scope quality`가 기존
  critique를 덮어쓴 뒤 두 번째 호출로 복원했다. 다음에는 계약의 전체 scope를 읽고 한 번만
  기록한다. 정확한 tool/token 비용은 unavailable이다.
- **inventory 병렬 출력이 너무 커 재구성됐다** (recurrence-class: broad-output-reconstruction):
  Promise.all 한 번의 출력이 잘려 남은 결과를 개별 명령으로 다시 읽었다. broad exploration 자체는
  사용자 요청상 waste가 아니지만, 출력 운반은 낭비였다. 다음에는 명령별 summary를 별도 읽거나
  처음부터 결과를 작은 묶음으로 나눈다.
- **artifact validator 왕복** (recurrence-class: artifact-validator-repair): quality 기록이
  advisory evidence·executed status·slow-gate 렌즈를 한 번씩 보강한 뒤 통과했다. 검증 비용은
  정직한 기록에 필요했지만, scaffold의 canonical field와 validator coupling을 먼저 체크했으면
  재작성은 줄었다.
- **reviewer 전달 실패 뒤 대기 반복** (recurrence-class: delegated-review-delivery): host의
  Ceal Gateway 거부와 일부 no-delivery를 확인한 뒤에도 wait를 반복했다. 두 report를 받은 뒤
  더 기다리지 않고 capability failure를 closeout에 남기는 편이 낫다. 같은 에이전트 pass로
  대체하지 않은 것은 올바른 경계였다.
- **bootstrap 경고는 waste로 승격하지 않음**: `bootstrap_adapter.py --dry-run`이 재직렬화와
  주석 손실을 경고했지만, upstream #507과 연결된 재현 가능한 위험이라 같은 명령을 반복하는 대신
  실제 bootstrap을 하지 않았다.
- **넓은 탐색은 waste로 분류하지 않음**: 사용자가 unknown-unknown과 과정 낭비까지 명시했으며,
  triage lock 뒤 fix-now는 네 가지로 좁혔다. runtime budget·새 runner·inventory wrapper·테스트
  삭제는 deferred, 명백한 오탐은 반증했다.

## Critical Decisions

- 그래프 이유는 ellipsis를 무조건 제거하지 않고 `min-width: 0`·`overflow-wrap: anywhere`로
  bounded wrapping했다. 전문 보존과 좁은 화면의 overflow 방지를 동시에 소유한다.
- ImportPanel은 `prefers-reduced-motion`에서 `auto`, 그 외에는 `smooth`를 선택한다. 기존
  `block: nearest`와 패널 인출은 유지하고 새 모션 추상화는 만들지 않았다.
- Energy graph 토글의 32px 예외를 44px로 되돌렸다. 전역 조작면 계약을 컴포넌트 예외가
  덮어쓰지 않게 했다.
- AGENTS/spec의 테스트 명령은 파일 glob이 아니라 실제 `npm test`를 정본으로 삼았다. 이로써
  워커 테스트 누락을 문서가 초록으로 보이는 문제를 닫았다.
- Vulture/nose의 zero-scope 오류는 이 리포에 fake path·adapter wrapper를 추가하지 않고 upstream
  inventory owner의 후속으로 보류했다. quality adapter/runtime 계측도 현재 비용 증거가 없어 보류했다.

## Trends vs Last Retro

지난 retro의 empty-packet-preflight·artifact-before-gate 교훈은 이번에 packet을 만들지 않고,
artifact validator와 current-pointer를 gate 전에 처리해 개선됐다. 다만 delegation scope 기록의
부분 overwrite와 broad-output reconstruction이라는 새 과정 낭비가 생겼다. reviewer boundary는
부모 소유 `/tmp` snapshot으로 collision을 피했지만 host no-delivery 후 대기 종료 규칙은 더 좁혀야 한다.

## North Star Alignment

`AGENTS.md`의 설계 기준을 다시 읽고 판정했다. 기능보다 가능성(1항)과 적을수록 좋음(9항)에
맞게 새 tooltip·chart·runner·동기화 수단을 넣지 않고 기존 graph/date 조합과 CSS 경계만 고쳤다.
비직교성(2항)과 기록보다 인출(15항)은 그래프에서 이유 전문을 보존하고 전역 44px 계약을 회복한
데서 지켰다. 사용자의 글자를 잃지 않는 불변식도 변경하지 않았다.

잘못 적용하기 쉬웠던 지점은 “잘린 이유를 없애자”를 곧바로 무제한 펼치기로 해석할 뻔한 것과,
quality inventory 오류를 리포 안 wrapper로 덮으려 한 유혹이다. counterweight가 bounded wrapping과
upstream disposition을 강제했다. 이번 failure signature는 **인출을 돕는 요약이 좁은 화면에서
전문을 숨기거나 폭을 밀 수 있음**이다.

## Expert Counterfactuals

- **Engelbart의 system-improving-itself 렌즈:** H+LAM+T를 함께 설계한다면 코드 수정뿐 아니라
  `resolver 전체 scope 읽기 → parent snapshot → bounded review → 결과별 verify → artifact
  validator`를 하나의 실행 도구 계약으로 먼저 잠갔을 것이다. 다음에는 위임 기록과 boundary
  절차를 한 번의 preflight 출력으로 확인한다.
- **Ousterhout의 복잡도 렌즈:** 그래프·import·global button의 작은 예외는 새 abstraction보다
  각 owner에서 의도를 직접 선언하는 편이 낫다. 반대로 저장소 transaction boilerplate는 다음
  IndexedDB 경계를 건드릴 때만 공통 helper가 실제 복잡도를 줄이는지 증명해야 한다.

## Sibling Search

- same layer: `AGENTS.md`·`docs/spec-first-slice.md`·`.agents/subagent-delegation.json` | decision: same waste, fix now | proof: 테스트 명령과 위임 scope를 실제 resolver/npm test 결과와 맞췄다.
- abstraction up: Charness delegation resolver/bootstrap | decision: valid follow-up outside the slice | proof: scope overwrite와 bootstrap dry-run 경고를 재현했다 | follow-up: deferred docs/handoff.md#이번-6차-라운드의-운영-교훈
- specialization down: broad inventory output and validator payloads | decision: same waste, fix now | proof: per-command evidence and validator feedback were separated before closeout.
- mental-model siblings: reviewer spawn/wait/verify and quality/retro artifact flow | decision: valid follow-up outside the slice | proof: two no-delivery windows and partial report delivery were recorded without same-agent substitution | follow-up: deferred docs/handoff.md#이번-6차-라운드의-운영-교훈

## Next Improvements

- workflow: adapter/delegation resolver를 먼저 읽고 full scope를 한 번 기록한 뒤, reviewer별 parent-owned snapshot과 즉시 verify를 사용한다.
- capability: Charness #507 이후에만 bootstrap preservation과 zero-scope inventory handling을 재검토한다. 이 리포에 local wrapper는 만들지 않는다.
- memory: handoff에 이번 fix·deferred·browser acceptance·host delivery 한계를 round-6 교훈으로 남긴다.

## Persisted

Persisted: yes: charness-artifacts/retro/2026-08-05-session-retro-round-6.md
