# Session Retro
Date: 2026-08-05

## Context

이번 단위는 4차 repo-wide 품질 검사와 온라인 복귀 동기화 수정이다. 사용자 요구가
잠재 버그뿐 아니라 과정 낭비까지 포함했으므로, 코드 증거·결정론적 gate·3건의
bounded fresh-eye 보고를 사용했다. 테스트/게이트 수치는 strong, host telemetry 부재와
cross-run trend는 unavailable이다.

## Window

2026-08-05 세션 시작의 clean worktree와 `3d0ae50` 구현 커밋부터 최종 배포 closeout까지.
이전 라운드의 packet/fingerprint 재작업과 untracked artifact gate 실패도 원인 분석 창에
포함했다.

## Evidence Summary

- `npm test`: 179/179; state focused test 28/28; lint/check 통과.
- `mine_closeout_telemetry.py --detail`: stream missing, records 0. 이 리포 밖의 비용은
  보이지 않으므로 cross-repo 반복 낭비를 주장하지 않는다.
- fresh-eye 3건 모두 completed report를 냈고, reviewer boundary verify는 clean이었다.
- 이전 라운드의 observed waste: 빈 `packet_sections`인데 packet을 만들었고, packet과
  fingerprint snapshot을 병렬 실행해 재작업이 생겼으며, 새 링크 산출물을 추적하기 전
  gate를 실행해 한 번 멈췄다.

## Waste

- **불필요한 packet 생성** (recurrence-class: empty-packet-preflight): adapter가
  `packet_sections: []`라고 이미 말했는데 packet을 생성했다. 이번에는 adapter를 먼저
  읽고 생략했다. 비용은 command/attention 재작업으로 관찰됐지만 정확한 token 비용은
  unavailable이다.
- **순서가 만드는 경계 재작업** (recurrence-class: sequential-review-boundary):
  fingerprint snapshot과 packet 생성/리뷰 준비를 병렬화해 boundary drift를 만들었다.
  이번에는 snapshot→spawn→wait→verify 순서를 지켰고, 다만 여러 reviewer 완료 뒤 한 번에
  verify한 것은 남은 절차 개선점이다.
- **파일 추적 전 gate** (recurrence-class: artifact-before-gate): 문서가 가리키는 새
  산출물을 먼저 git 추적하지 않아 문서 gate가 한 번 실패했다. 이번 round는 artifact
  validation을 먼저 마치고 최종 gate 전에 status를 확인한다.
- **낭비로 분류하지 않은 탐색**: 사용자가 unknown-unknown 전체 검사를 요청했으므로 넓은
  스캔·counterweight는 exploration 단계의 의도된 비용이다. triage lock 뒤에는 online
  lifecycle 한 건만 fix-now로 남기고 의존성·브라우저 경계는 defer했다.

## Critical Decisions

- `online`과 `visibilitychange`를 App에 각각 고치지 않고 `Journal.lifecyclePull()`로
  load 대기·reload 성공 확인·직렬화를 state owner에 모았다. 이 결정이 유사 패턴 재발을
  줄이고, 수동 push/오프라인 불변식을 바꾸지 않았다.
- reload 실패 뒤 pull을 막는 boolean 계약을 추가했다. 단순 `then` 연결은 안전하지 않다는
  fresh-eye 반증을 반영했다.
- patch/minor dependency 업데이트와 새 runner/CI/E2E는 이번 fix-now에서 제외했다. 현재
  보안·게이트 결함이 아니며, 결합하면 검증 경계가 흐려진다.

## North Star Alignment

`docs/design-north-star.md`는 없으므로 [AGENTS](../../AGENTS.md)에 인라인된 설계 기준을
읽었다. 오프라인을 작업 정본으로 두고 수동 push를 유지했으며, 다른 탭의 글자를 버리지
않는 불변식 3을 회귀 테스트로 강화했다. 기능보다 가능성·조합(1항)과 적을수록 좋음(9항)은
기존 conflict surface와 한 lifecycle API를 재사용한 데서 지켰다.

잘못 적용한 지점은 같은 동기화 목적을 `visibilitychange`와 `online`에 비직교적으로
나눠 두고 local reload를 한 경로에서 빠뜨린 것이다(2항). 과정에서도 adapter 조건을
읽기 전에 packet을 만들고, 순서가 중요한 boundary 작업을 병렬화했다. 이 두 실패 서명은
다음 run의 triage/preflight checklist로 승격한다.

## Expert Counterfactuals

- Engelbart의 system-improving-itself 렌즈라면 H+LAM+T를 함께 설계하라고 하며, lifecycle
  API뿐 아니라 “어떤 이벤트가 어떤 순서로 state owner를 통과하는가”와 그 review preflight를
  같은 단위로 만들었을 것이다. 다음에는 구현·테스트·리뷰 순서를 한 contract로 잠근다.
- Ousterhout식 복잡도 렌즈라면 두 이벤트 핸들러의 비슷한 코드를 먼저 공통 경계로 모으고,
  브라우저 E2E를 추가하기 전에 in-process observable contract를 요구했을 것이다.

## Next Improvements

- workflow: adapter `packet_sections`·reviewer boundary 상태를 spawn 전에 확인하고,
  snapshot→spawn→각 결과 수령 후 verify를 고정한다.
- workflow: 문서 링크가 새 파일을 가리키면 파일 생성·validator·git status를 gate보다
  먼저 실행한다.
- capability: Charness upstream #507에 custom adapter 보존과 empty-packet preflight를
  후속한다. 이 리포 안에 숨은 bootstrap wrapper를 만들지 않는다.
- memory: [quality round 4](../quality/2026-08-05-quality-review-round-4.md)와
  [handoff](../../docs/handoff.md)에 이번 lifecycle 계약과 deferred 경계를 남긴다.

## Sibling Search

- same layer: `charness-artifacts/quality`·`charness-artifacts/critique` | decision: same waste, fix now | proof: 두 artifact validator와 current-pointer refresh를 순서대로 실행했다.
- abstraction up: Charness adapter bootstrap/packet preparation | decision: valid follow-up outside the slice | proof: `.agents/quality-adapter.yaml` dry-run이 custom field 재생성을 경고했다 | follow-up: deferred Charness #507
- specialization down: 문서 링크가 새 artifact를 가리키는 gate 입력 | decision: same waste, fix now | proof: 이번 artifact를 validator 통과시킨 뒤 git status에서 추적 상태를 확인한다.
- mental-model siblings: reviewer spawn·wait·fingerprint lifecycle | decision: same waste, fix now | proof: 3 completed reports와 clean boundary verify를 closeout에 기록했다.

## Portable Candidate

- pattern: adapter가 빈 packet 섹션을 선언하면 packet 생성과 fingerprint 입력을 건너뛰고,
  reviewer 결과마다 boundary를 검증하는 preflight.
- triggering evidence: 이전 라운드의 불필요한 packet/순서 경합과 이번 round의 validator
  재작업.
- intended consumer: adapter-driven quality/critique/retro workflows.
- destination: create-skill — first-prompt acceptance claim: “packet_sections가 비어 있으면
  packet을 생성하지 않고, spawn 전후 경계 검증 순서를 출력에 명시한다.”

## Persisted

Persisted: yes: charness-artifacts/retro/2026-08-05-session-retro.md
