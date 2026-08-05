# 전체 품질 라운드 5 비평
Date: 2026-08-05

## Decision Under Review

충돌 사본과 본체 레코드의 저장 순서를 공통 `Journal.#persistMerge()`로 소유하고,
충돌 저장을 `(target, text, at)` 기준으로 멱등화한다. 초기 `#loading` 타입 회귀도
출하 전에 고친다.

## Failure Angles

- 본체 저장 실패 뒤 충돌 사본이 화면에서 숨거나 재시도마다 중복되는가.
- 충돌 read-back 실패가 저장 오류를 무음 또는 오프라인으로 바꾸는가.
- `#loading` 타입·서비스워커 옛 탭·의존성·테스트 경제성에서 새 출하 차단이 있는가.

## Counterweight Pass

- 충돌 저장을 먼저 하는 기존 순서는 사용자 글자 보존 때문에 유지한다. read-back을
  그 직후로 옮기고 저장소 dedupe를 transaction 안에 두는 것이 최소 구조 수정이다.
- 서비스워커 재시도, tombstone, major 의존성 업그레이드, 새 테스트 러너는 이번 결함의
  재현 증거가 없어 보류한다.

## Structured Findings

- F1 | bin: act-before-ship | evidence: strong | ref: ../../src/lib/state.svelte.js:187-218 | action: fix | note: `#loading = null`이 Promise 대입과 양립하지 않아 `npm run check`를 깨뜨렸다. JSDoc 타입을 추가했다.
- F2 | bin: act-before-ship | evidence: strong | ref: ../../src/lib/state.svelte.js:312-337,1297-1320; ../../src/lib/store.js:120-150 | action: fix | note: 충돌 사본은 디스크에 남는데 메모리에는 안 붙고, 본체 저장 실패 뒤 재시도하면 중복됐다. 공통 저장 helper·read-back·transaction dedupe와 회귀 테스트로 닫았다.
- F3 | bin: act-before-ship | evidence: strong | ref: ../../src/lib/state.test.js:216-303 | action: fix | note: reload/push의 본체 저장 실패·재시도·conflict read-back 실패를 하네스로 재현하고 3개 회귀 테스트를 추가했다.
- F4 | bin: valid-but-defer | evidence: moderate | ref: ../../scripts/gen-sw.mjs:53-75; ../../src/main.js:1-20 | action: defer | note: 부분 설치 뒤 같은 버전 재시도와 옛 탭 전환은 실제 브라우저 증거가 없다. 옛 캐시 fallback은 기존 계약대로 유지한다.
- F5 | bin: valid-but-defer | evidence: moderate | ref: command: npm outdated --json | action: defer | note: wanted patch/minor와 major 최신화는 audit·gate 결함이 아니므로 별도 의존성 slice로 분리한다.
- F6 | bin: over-worry | evidence: weak | ref: inventory: test economics, structural waste, doc duplicates, dual implementation | action: defer | note: 현재 test 182개와 약 1.60초 실행은 runner 재구성·테스트 삭제 근거가 아니다.

## Reviewer Tier Evidence

- Requested tier: n/a — adapter tier names are host-specific and parent used host-defaulted synchronous spawn.
- Requested spawn fields: `fork_context=true`, read-only prompts, synchronous waits.
- Host exposure state: host-defaulted
- Reviewer reports: three bounded `multi_agent_v1` reports returned; one substantive code report and two explicit counterweights were received.
- Application state: parent received all three reports; no reviewer edited the worktree, and the substantive report confirmed the persistence bug before implementation.
- Delivery state: findings-received; no reviewer edited the worktree.

## Fresh-Eye Satisfaction

parent-delegated — one reviewer independently reproduced the conflict persistence/duplicate bug;
the other reports disclosed their own capability limit and were not misrepresented as deeper
fresh-eye execution. Boundary verification was clean for the counterweight window and the
remaining-review window. The original parent snapshot was overwritten by a child snapshot once;
that ordering waste is recorded in the retro.

## Boundary Ownership

- Producer: `reload()`/`push()` merge outcomes and IndexedDB conflict store.
- Consumer: `Journal.conflicts` and the visible conflict copy components.
- Owning surface: `src/lib/state.svelte.js` for ordering/read-back, `src/lib/store.js` for
  transaction-level idempotency.
- Verdict: owned-correctly
