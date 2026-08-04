# Critique Review
Date: 2026-08-04

## Decision Under Review

품질 점검에서 발견한 동시성·서비스 워커 복구·날짜 파싱·diff 계산 비용 문제를
보강한 `d706f00`을 배포하고, 공개 전 검증을 마친다.

## Failure Angles

- 동시성: 다른 탭의 최신 로컬 기록이나 D1의 최신 기록을 늦게 도착한 쓰기가 덮어쓸 수
  있는지 검토했다.
- 오프라인 복구: 서비스 워커가 오래된 캐시를 현재 캐시로 오염시키거나, 온라인 복구
  응답을 캐시하지 않아 다음 오프라인 요청에서 다시 실패할 수 있는지 검토했다.
- 결과 정합성: 잘못된 push 레코드가 뒤의 유효한 레코드의 적용 결과 인덱스를 밀거나,
  조건부 SQL이 0행을 바꿨는데도 적용 성공으로 보고할 수 있는지 검토했다.
- 운영·접근성: 배포 후 공개 진입점과 인증 UI를 확인할 수 있는지, 이전 탭의 서비스 워커
  업데이트 UX와 사람이 해야 하는 수용 확인이 남아 있는지 검토했다.

## Counterweight Pass

- 실제 출하 전 조치였던 서비스 워커 캐시 승격, 온라인 복구 캐시, D1 조건부 쓰기 결과,
  malformed winner 정렬, import의 최신 메모리 보호는 구현과 테스트로 반영했다.
- 비동기 캐시 쓰기를 응답 경로와 분리해 응답 지연을 늘리지 않도록 했다.
- Wrangler/miniflare의 버전 상태, 그래프 경로의 추가 추상화, CI·훅·커버리지 확대는 현재
  게이트와 audit이 통과하고 리포 계약상 범위가 아니므로 이번 배포의 blocker로 보지 않는다.
- 이전 탭의 서비스 워커 업데이트 안내와 두 브라우저·D1 충돌 수용은 유효하지만 이번
  코드 변경을 막을 결함으로 확정할 증거가 없어 배포 후 운영 확인으로 남긴다.

## Structured Findings

- F1 | bin: act-before-ship | evidence: strong | ref: scripts/gen-sw.mjs; scripts/gen-sw.test.js | action: fix | note: 오래된 캐시 fallback을 현재 캐시에 넣지 않고, 온라인 복구 응답과 navigation shell은 waitUntil로 현재 캐시에 저장하도록 보강했다.
- F2 | bin: act-before-ship | evidence: strong | ref: worker/index.js; worker/index.test.js | action: fix | note: 유효한 writable statement 기준으로 결과를 정렬하고 changes가 0이면 적용 실패로 재판정하도록 보강했다.
- F3 | bin: bundle-anyway | evidence: moderate | ref: src/lib/state.svelte.js; src/lib/store.js | action: fix | note: reload와 import의 로컬 쓰기를 조건부 최신성 장벽으로 바꿔 다른 탭의 최신 데이터를 보호했다.
- F4 | bin: bundle-anyway | evidence: moderate | ref: src/lib/Pinned.svelte | action: fix | note: 닫힌 변경 내역 패널에서는 diff를 계산하지 않도록 지연했다.
- F5 | bin: bundle-anyway | evidence: strong | ref: src/lib/date.js; src/lib/date.test.js | action: fix | note: 달력에 존재하지 않는 날짜를 H1 파싱 결과로 받아들이지 않도록 했다.
- F6 | bin: valid-but-defer | evidence: moderate | ref: docs/operator-acceptance.md; docs/handoff.md | action: document | note: 배포 후 인증 UI, 날짜 URL, 월치 복사, 변경 내역 diff, 동기화 시각의 사람 수용 확인을 운영 기록으로 남긴다.
- F7 | bin: valid-but-defer | evidence: moderate | ref: src/lib/sw-register.js | action: defer | note: 이미 열린 이전 탭에 새 서비스 워커가 준비됐다는 안내 UX는 별도 작은 슬라이스로 남긴다.
- F8 | bin: over-worry | evidence: weak | ref: package.json; package-lock.json | action: defer | note: Wrangler 업데이트와 undici override는 gate와 npm audit 0을 통과했으므로 추가 구조 변경은 하지 않는다.

## Reviewer Tier Evidence

- Requested tier: synchronous fresh-eye and counterweight reviewers.
- Requested spawn fields: read-only repository review, explicit failure angles, run_in_background: false.
- Host exposure state: applied
- Application state: host-confirmed: three fresh-eye angle reports and Aristotle counterweight report were received synchronously.
- Delivery state: findings-received

## Fresh-Eye Satisfaction

parent-delegated

## Reviewed Input Identity

<!-- No prepared critique packet was consumed. The review used the repository working tree,
     the fresh-eye reports, and the post-fix gate result directly. -->

## Boundary Ownership

- Producer: IndexedDB reload/import writes, D1 conditional push, and service worker fetch/cache handlers.
- Consumer: journal state shown by the SPA and subsequent offline/network reads.
- Owning surface: local store/state, Worker push protocol, and generated service worker source/tests.
- Verdict: owned-correctly
