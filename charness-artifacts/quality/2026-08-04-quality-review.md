# Quality Review
Date: 2026-08-04
Title: 전체 품질 점검 — 동시성·복구·공급망

## Scope

Target boundary: repo-wide 품질·버그·속도 점검 및 배포 전 증거 수집. 공개 저장소에
실제 저널 데이터가 들어가지 않는지 함께 확인했다.

Ambient repo findings: quality 어댑터 bootstrap이 손으로 다듬은 주석과 실제 표면을
덮어쓰는 도구 문제가 재현됐고, 원래 어댑터로 복구했다.

## Current Gates

- `npm run gate` 통과: 테스트 165개, `reach` 프로덕션 22개 중 11개 도달, lint 문서
  검사 통과, `svelte-check`·Worker 타입 검사 0건, Vite build 통과.
- `npm audit`와 `npm audit --omit=dev` 모두 0 vulnerabilities. `wrangler`를 최신
  4.x로 올리고 `undici` 7.29.0 override를 추가했다.

## Runtime Signals

- runtime source: timing capture is missing; `npm test`와 `npm run build`를 직접
  한 번 감싼 단일 실행 스냅샷이다 (`command: /usr/bin/time -p npm test`). <!-- reproduction-source -->
- runtime hot spots: 닫힌 고정 노트 diff를 계산하지 않도록 지연했다. Graph 전량
  재계산은 합성 5년 자료에서 약 172ms로 측정됐지만 현재 규모에서는 보류했다.
- coverage gate: 줄 커버리지 래칫 없음. `reach`가 파일 도달 가능성만 검사한다.
- evaluator depth: 결정론적 gate + fresh-eye 바운디드 리뷰 2명. Cautilus는 미사용.

## Healthy

- reload/import의 IndexedDB 쓰기를 조건부 최신 판본으로 통일해 다른 탭의 최신 글을
  덮지 않는다. 두 경쟁 시나리오를 회귀 테스트로 고정했다.
- Worker가 조건부 UPSERT의 실제 `changes`를 확인한 뒤에만 `applied`를 반환한다.
  D1 대역 경합 테스트가 거절 판정과 서버 판본을 확인한다.
- 서비스 워커가 온라인에서 복구한 정적 자산을 현재 캐시에 저장한다. 부분 설치 뒤
  오프라인 재진입 테스트가 통과한다.
- 잘못된 캘린더 H1을 날짜로 해석하지 않으며, 닫힌 diff는 계산하지 않는다.

## Weak

- 브라우저 경계(`*.svelte`, IndexedDB 실제 구현, 서비스 워커 실제 브라우저)는 reach
  22/11로 부분만 자동 검증한다. 현재 수치는 수용 확인의 대체가 아니다.
- 구조화된 성능 추세·예산이 없어 속도 수치는 이번 실행의 관찰값일 뿐이다.

## Missing

- 실제 두 탭·두 기기에서 reload 경합, Worker `applied` 방향, 큰 D1 청크 push를 아직
  사람이 확인하지 않았다.
- 배포 후 인증된 UI·오프라인·서비스 워커 갱신은 이 환경에서 세션 없이 종단 확인할
  수 없다. 공개 URL의 비인증 접근만 HTTP 응답으로 확인한다.

## Deferred

- 서비스 워커가 이미 열린 옛 탭에 새 버전 알림을 보여주는 UI는 추가하지 않았다.
  자동 새로고침은 입력 유실 위험이 있어, 수동 새로고침 경로를 유지한다.
- Graph의 전체 레코드 재계산은 현재 규모와 측정값상 새 추상화를 만들지 않고 보류한다.

## Advisory

- structural review result: not_applicable — `plan_quality_run.py`가 `skills_in_scope:
  false`를 반환했다. 구조적 낭비·이중 구현·문서 중복·lint ignore 인벤토리는 0건.
- prose review result: 진입 문서가 의도적으로 길다 (`inventory_entrypoint_docs_ergonomics`).
  `AGENTS.md`는 공개를 위한 설계 철학을 인라인하고, spec/handoff는 구현 정본·픽업
  문서라 분리만으로 줄이지 않는다.
- Maintainer-local enforcement는 명시적 결정대로 missing이다 (`AGENTS.md`의 Commit
  Discipline·게이트 조항). gate를 훅으로 자동화하지 않고 명령형 `npm run gate`를 유지한다.

## Delegated Review

- Delegated Review: executed — 읽기 전용 fresh-eye 2명이 동기 실행됐다. 데이터 경합
  2건·서비스 워커 복구·Worker 허위 applied·날짜 검증·diff 지연을 확인했고 모두 수정
  또는 회귀 테스트로 닫았다. 반환 후 boundary fingerprint는 clean이었다.
- Slow-gate lenses (fixture-economics, parallel-critical-path, duplicated-proof): 별도
  재위임하지 않았다. 테스트·build 시간이 짧아 해당 범위가 아니었다.

## Commands Run

- `plan_quality_run.py`, 품질 인벤토리, `npm audit`, `npm run gate`
- `node --test worker/index.test.js scripts/gen-sw.test.js src/lib/date.test.js src/lib/state.test.js`
- `git diff --check`, fresh-eye boundary snapshot/verify, 배포 전 `git status`

## Recommended Next Quality Moves

- active 사람 수용 확인 — capability_needed=인증 세션과 두 기기; next_center=`docs/operator-acceptance.md`;
  transformation=AC-23·AC-25·AC-26·AC-27과 큰 push를 실제로 확인; proof_boundary=배포 후
  글자 보존·URL·diff·복사; enforcement_posture=advisory.
- passive because 현재는 사용자 보고가 없는 서비스 워커 업데이트 안내 — capability_needed=새 버전 알림 UX 판단;
  next_center=`src/main.js`와 `src/App.svelte`; transformation=입력 유실 없는 수동 갱신
  안내; proof_boundary=새 배포 중 열린 탭; enforcement_posture=no-gate until 사용자가
  불편을 보고한다.

## History

- [2026-07-26 quality review](./history/2026-07-26-quality-review.md)
