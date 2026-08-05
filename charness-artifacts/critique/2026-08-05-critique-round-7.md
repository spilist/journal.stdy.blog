# 전체 품질 라운드 7 비평
Date: 2026-08-05

## Decision Under Review

일시적인 IndexedDB open 실패가 세션 전체의 영구 저장소 장애가 되지 않도록 실패한
Promise cache만 해제하고, 실제 `store.js` 경계를 통과하는 최소 회귀 테스트를 추가한다.
자동 재시도·백오프, fake-indexeddb 의존성, transaction 전체 추상화는 이번 범위 밖이다.

## Failure Angles

- 데이터 보존·복구: `indexedDB.open()` 실패 뒤 모든 읽기·쓰기가 영구 거절되는가.
- 테스트 경계: 메모리 harness가 아니라 실제 `store.js`를 호출하고 첫 실패→재시도 성공을 증명하는가.
- 경제성·구조: 단일 결함에 새 의존성·runner·transaction abstraction을 과잉 도입하는가.
- 반증: 성공 연결 cache와 동시 호출 semantics를 깨뜨리거나 실패를 무한 자동화하는가.

## Counterweight Pass

`opening = null`은 실패한 연결만 재시도 가능하게 하며 수동 동기화 정책을 바꾸지 않는다.
두 번의 open 요청만 필요한 테스트 대역으로 충분하고, 실제 브라우저 quota/private-mode는
사람 수용으로 남긴다. transaction 보일러플레이트·dependency major·CI·새 browser runner는
현재 측정상 출하 차단 근거가 없다.

## Structured Findings

- F1 | bin: act-before-ship | evidence: strong | ref: ../../src/lib/store.js:15-38 | action: fix | note: 실패한 open Promise가 영구 cache되어 새로고침 전 복구를 막는다. 실패 시 cache를 비우고 다음 접근이 새 시도를 하게 했다.
- F2 | bin: bundle-anyway | evidence: strong | ref: ../../src/lib/store.test.js:1-49 | action: fix | note: 실제 store 모듈에서 첫 실패와 두 번째 성공을 고정한다. 전체 IndexedDB 대역이나 의존성은 만들지 않는다.
- F3 | bin: over-worry | evidence: moderate | ref: ../../package.json:8-26 | action: defer | note: 183개 테스트의 measured runtime과 audit 0을 감안하면 runner 삭제·병렬화·일괄 dependency upgrade는 이번 출하의 증거가 아니다.
- F4 | bin: valid-but-defer | evidence: strong | ref: ../../.agents/quality-adapter.yaml,https://github.com/corca-ai/charness/issues/507 | action: defer | note: zero-scope inventory와 bootstrap 재직렬화는 upstream 소유이며 이 리포에 fake wrapper를 만들지 않는다.

## Reviewer Tier Evidence

- Requested tier: n/a — host-defaulted synchronous bounded reviewers.
- Requested spawn fields: `fork_context=true`, read-only scope, no host addressing/name, no file or `.charness` writes.
- Host exposure state: host-defaulted
- Application state: one probe and one counterweight delivered concrete findings; other angles and repaired-surface probe timed out without delivery. Parent boundary checks were clean.
- Delivery state: findings-received — partial; additional `spawn-accepted-no-delivery` occurred on the current Codex wait channel after timeout.

## Fresh-Eye Satisfaction

parent-delegated — received reports were used; no-delivery windows were not treated as approvals and no same-agent review substituted for them.

## Boundary Ownership

- Producer: IndexedDB connection attempt and its cached Promise.
- Consumer: `allRecords()`/Journal local load and every store access.
- Owning surface: `src/lib/store.js` with `src/lib/store.test.js` as its direct proof.
- Verdict: owned-correctly
