# Session Retro
Date: 2026-08-05

## Context

이번 단위는 5차 repo-wide 품질 검사, 충돌 사본 저장 경계 수정, push와 배포다. 사용자가
unknown-unknown과 과정 낭비까지 요청했으므로 넓은 탐색은 의도된 비용으로 보고, 실행 증거는
로컬 gate·inventory·fresh-eye 보고·배포 header readback만 사실로 삼았다. 코드 결함 판정은
strong, 과정 비용의 정확한 tool/token 양은 unavailable이다.

## Window

clean `ea6797a`에서 시작해 구현 커밋 `2e3de6c`, origin push, Worker
`0bb51f21-c35e-43c0-b6a1-9a52e0ba35e9` 배포와 header-only readback까지를 본다.

## Evidence Summary

- `npm run check`가 최초에 `#loading` 타입 오류를 잡았고, 수정 뒤 `npm run gate`가 182/182,
  reach 22/11, lint/docs, Svelte·Worker check, build를 통과했다.
- fresh-eye 보고 3건이 반환됐다. 한 보고서가 충돌 사본 숨김·재시도 중복을 재현했고, 두
  보고서는 capability 한계를 명시한 counterweight였다. 구현 후 회귀 테스트 3개가 추가됐다.
- `npm audit`은 0 vulnerabilities, quality inventories의 새 구조적 후보는 0개다.
- `mine_closeout_telemetry.py --detail`은 stream missing/records 0이다. 다른 리포의 비용이나
  누적 추세는 주장하지 않는다.
- 배포 후 `/`, `/api/pull?since=0`, `/sw.js`는 모두 Access 302/no-store였고 본문은 읽지 않았다.

## Waste

- **gate-before-reviewer (recurrence-class: gate-before-reviewer):** 탐색 후 fresh-eye를 먼저
  기다리고 나서 `npm run check`를 실행했다. 이미 존재하던 `#loading` 타입 오류는 reviewer가
  찾기 전에 값싼 check로 닫을 수 있었다. 비용은 reviewer attention의 재사용 가능한 일부였고
  정확한 token/tool 비용은 unavailable이다. 다음에는 adapter/primer 직후 `check`와 최소 gate
  packet을 먼저 실행한다.
- **reviewer-boundary-snapshot-collision (recurrence-class: reviewer-boundary-snapshot-collision):**
  parent snapshot 뒤 child가 같은 `.charness/reviewer-boundary/snapshot.json`을 써서 첫
  verify가 window-id mismatch가 됐다. 실제 tree drift는 없었지만 재-snapshot과 추가 확인이
  필요했다. child prompt에서 parent bookkeeping을 쓰지 않게 하고, reviewer별 window/path를
  parent가 소유하는 순서로 고친다. 정확한 시간·토큰 비용은 unavailable이다.
- **artifact-validator-repair (recurrence-class: artifact-validator-repair):** round-5 품질
  artifact와 critique를 만든 뒤 validator가 runtime prefix, passive 이유, enum 상태를 각각
  잡았다. 이는 낭비라기보다 검증 가능한 기록을 만드는 verification 비용이지만, 다음에는
  scaffold의 canonical field vocabulary를 먼저 읽어 한 번에 작성한다.
- **broad exploration은 waste로 분류하지 않음:** 사용자가 전체 품질과 unknown-unknown을
  직접 요청했으므로 exploration은 의도됐다. triage lock에서 fix-now는 타입 오류와 conflict
  persistence였고, service-worker old tab·tombstone·dependency major·새 runner는 deferred,
  false positive는 없었다.
- **gate-baseline runtime:** measured `/usr/bin/time -p npm run gate` real 11.99s, Node test
  1.60s, Vite build 0.89s. 현재 budget 초과나 느린 gate recurrence는 관찰되지 않아 제거·병렬
  runner를 만들지 않았다.

## Critical Decisions

- 충돌 사본을 본체보다 먼저 저장하는 순서는 유지하고, `#persistMerge()`가 read-back과 본체
  저장을 소유하게 했다. 이는 사본을 잃지 않으면서 화면 인출도 즉시 보장한다.
- 저장소 dedupe는 state의 관습이 아니라 IndexedDB read-write transaction 안에 두었다. 두 탭이
  재시도해도 같은 `(target,text,at)` 사본을 중복하지 않도록 경계를 실제 owner로 옮겼다.
- `packet_sections: []`를 읽고 critique packet은 만들지 않았다. customized quality adapter는
  dry-run만 실행했다. 정상 bootstrap과 major dependency update는 별도 변경으로 만들지 않았다.
- 구현 커밋을 먼저 push하고 배포했으며, 배포 관찰값과 품질 기록은 후속 기록 커밋으로 묶는다.

## Trends vs Last Retro

4차 retro의 empty-packet-preflight는 이번에 반복하지 않았다. artifact-before-gate도 이번에는
quality/critique validator를 먼저 통과시킨 뒤 final gate를 부르는 방향으로 개선했다. 다만
sequential-review-boundary의 변형인 child snapshot collision이 남았고, gate를 reviewer보다
늦게 실행해 type 오류가 review phase에서 발견된 새 순서 낭비가 생겼다. 즉 packet 순서는
개선됐지만 boundary ownership과 early gate 순서는 아직 완전히 닫히지 않았다.

## North Star Alignment

AGENTS.md의 오프라인 작업 정본·수동 push·사용자 글자 보존 불변식을 유지했다. 설계 취향
1·2·9·15항에 맞게 새 동기화 수단을 늘리지 않고 기존 conflict surface를 공통 helper로
줄였으며, 저장된 사본이 화면에 인출되도록 했다. 잘못 적용한 지점은 process 단계에서 먼저
싼 check를 실행하지 않은 것과 reviewer boundary의 bookkeeping owner를 분리하지 않은 것이다.
이번 라운드의 failure signature는 “먼저 저장된 부수 결과가 뒤의 저장 실패로 화면에서 숨고,
재시도마다 중복된다”였고, state/store 경계 양쪽의 유사 패턴을 한 구조로 고쳤다.

## Expert Counterfactuals

- Engelbart의 system-improving-itself 렌즈라면 H+LAM+T를 함께 보고, 코드 helper만이 아니라
  `early gate → parent-owned reviewer boundary → per-return verify`를 하나의 실행 방법으로
  설계했을 것이다. 다음에는 reviewer prompt와 parent snapshot ownership을 preflight 출력에
  포함한다.
- Ousterhout식 복잡도 렌즈라면 `reload()`와 `push()`의 “사본 먼저/본체 나중/화면 갱신” 중복을
  먼저 공통화하고, 새 테스트·새 runner를 추가하기 전에 저장 transaction의 멱등성이라는
  작은 구조적 seam을 요구했을 것이다.

## Next Improvements

- workflow: adapter/primer 다음에 `npm run check`와 최소 deterministic gate를 먼저 실행하고,
  그 결과를 reviewer prompt에 고정한다.
- workflow: parent가 reviewer별 boundary window를 만들고, child는 `.charness` bookkeeping을
  쓰지 않도록 명시한다. 반환 직후 해당 window만 verify한다.
- capability: critique runner가 reviewer별 snapshot 경로와 application/delivery 상태를
  자동으로 분리 기록하게 한다. 현재 host capability가 없으므로 이 리포에 wrapper를 만들지 않는다.
- memory: 이번 fix·deferred·사람 수용 잔여를 `docs/handoff.md`의 5차 교훈 섹션에 기록한다.

## Sibling Search

- same layer: `charness-artifacts/quality`, `charness-artifacts/critique` | decision: same waste, fix now | proof: 두 artifact validator를 실행하고 canonical field를 보완했다.
- abstraction up: Charness reviewer boundary snapshot/verify helper | decision: valid follow-up outside the slice | proof: child snapshot이 parent 파일을 덮어 window mismatch를 만들었다 | follow-up: deferred docs/handoff.md#이번-5차-라운드의-운영-교훈
- specialization down: 각 reviewer의 spawn/wait/verify 호출 | decision: same waste, fix now | proof: 첫 mismatch 뒤 남은 reviewer는 별도 window를 re-snapshot하고 반환별 clean을 확인했다.
- mental-model siblings: adapter bootstrap, critique packet, retro persistence | decision: intentional boundary | proof: packet은 빈 설정이면 생략하고, quality adapter는 dry-run만 하며, retro summary는 helper에 맡겼다.

## Portable Candidate

- pattern: parent-owned reviewer boundary bookkeeping with per-reviewer snapshot identity; child
  reviewers must return reports without mutating the parent's boundary state.
- triggering evidence: child snapshot overwrote the parent window and caused a false verify mismatch.
- intended consumer: adapter-driven critique/quality workflows using shared worktrees.
- destination: create-skill — first-prompt acceptance claim: “spawn 전에 parent window을 만들고,
  각 reviewer 반환 직후 같은 window만 verify하며 child가 parent snapshot을 쓰지 않는다.”

## Persisted

Persisted: yes: charness-artifacts/retro/2026-08-05-session-retro-round-5.md

## Packet Consumed

n/a (no adapter sections)
