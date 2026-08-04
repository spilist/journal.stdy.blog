# Critique Review
Date: 2026-08-05

## Decision Under Review

서비스워커의 배포 경계를 보강한 현재 작업트리를 출하한다. 기존 품질·인증 경계
수정은 `cf53f3a`에 이미 배포되어 있고, 이번 출하는 그 위에 서비스워커 회귀 수정과
품질 기록을 더한다.

## Failure Angles

- SPA fallback: 존재하지 않는 JS/CSS 경로에도 Cloudflare가 셸 HTML을 200으로 줄 수
  있어, 이를 자산 캐시에 넣으면 온라인·오프라인 모두 MIME 오류가 난다.
- 부분 설치: 하나라도 자산을 받지 못한 워커가 `skipWaiting`/`clients.claim`하면 새
  셸과 옛 자산이 섞여 오프라인 실행이 깨질 수 있다.
- 회귀 경계: 문자열 검사만으로 서비스워커 생명주기를 검증하면 서로 상쇄되는 캐시
  규칙을 놓칠 수 있으므로 실행 대역 테스트가 실제 호출 결과를 확인해야 한다.
- 출하 과정: 품질 아티팩트, 위임 검토, push, deploy, HTTP readback이 서로 다른
  상태를 가리키면 배포됐다고 잘못 보고할 수 있다.

## Counterweight Pass

- 첫 두 항목은 코드와 실행 테스트로 고친다. 완전한 자산 목록만 현재 캐시에 넣고,
  부분 설치본은 즉시 활성화하지 않는다.
- 현재 서비스워커 테스트는 13개로 빠르고 이미 실제 생성 소스를 실행하므로 새
  테스트 러너·커버리지 부트스트랩은 추가하지 않는다.
- 인증 브라우저 수용과 이전 탭·두 기기 시나리오는 코드 게이트로 대체할 수 없어
  운영자 인수 항목으로 남긴다.
- 이 앱은 Cloudflare Worker 웹 앱이지 플러그인 릴리스 표면이 아니므로 별도 release
  adapter/manifest를 만드는 것은 문제를 해결하지 않는다.

## Structured Findings

- F1 | bin: act-before-ship | evidence: strong | ref: scripts/gen-sw.mjs:44-60; scripts/gen-sw.test.js:133-154 | action: fix | note: 부분 설치본의 skipWaiting을 막아 기존 워커와 캐시를 보존한다.
- F2 | bin: act-before-ship | evidence: strong | ref: scripts/gen-sw.mjs:94-149; scripts/gen-sw.test.js:188-208 | action: fix | note: 생성된 ASSETS에 없는 경로의 SPA fallback HTML은 응답하되 캐시하지 않는다.
- F3 | bin: bundle-anyway | evidence: moderate | ref: scripts/gen-sw.test.js | action: fix | note: 서비스워커 생명주기와 fallback 캐시 오염을 실행 결과로 고정해 문자열 검사의 허점을 줄인다.
- F4 | bin: bundle-anyway | evidence: moderate | ref: docs/handoff.md; charness-artifacts/probe/ | action: document | note: 배포 후 version ID와 비인증 Access readback을 같은 관찰 기록으로 묶는다.
- F5 | bin: over-worry | evidence: weak | ref: package.json; .agents/release-adapter.yaml | action: defer | note: 앱 릴리스 표면이 없다는 planner 결과를 새 플러그인 어댑터로 뒤집지 않는다.
- F6 | bin: valid-but-defer | evidence: moderate | ref: docs/operator-acceptance.md; docs/handoff.md | action: document | note: 인증 브라우저·두 기기·이전 탭 수용은 사람 확인으로 남긴다.

## Reviewer Tier Evidence

- Requested tier: synchronous bounded fresh-eye reviewers and counterweight.
- Requested spawn fields: `fork_context: true`, read-only distinct lenses, no child spawning.
- Host exposure state: metadata-hidden
- Application state: host-confirmed: parent `multi_agent_v1` accepted four reviewer IDs; three reports were received and one wait timed out, then all agents were closed.
- Delivery state: findings-received

## Fresh-Eye Satisfaction

parent-delegated (partial: three reports were received; reviewer self-reports could not independently verify parent lineage, so that claim is not used as stronger evidence.)

## Reviewed Input Identity

패킷은 소비하지 않았다. critique adapter의 `packet_sections`가 비어 있어 packet 생성은
불필요했고, 한 차례 fingerprint와 packet 생성 순서를 병렬로 실행해 만든 미추적 packet은
삭제했다. 이후 boundary fingerprint verify는 clean이었다.

## Boundary Ownership

- Producer: `scripts/gen-sw.mjs`가 생성하는 ASSETS와 서비스워커 생명주기.
- Consumer: 브라우저의 ServiceWorker/CacheStorage와 오프라인 앱 셸.
- Owning surface: `scripts/gen-sw.mjs`와 `scripts/gen-sw.test.js`.
- Verdict: owned-correctly

## Operator Action Required

`npm run gate`를 현재 커밋에서 통과시킨 뒤 clean 상태를 확인하고 push한다. 그 다음
`npm run deploy`를 실행하고, version ID와 `/`, `/api/pull`, `/sw.js`의 비인증 302
readback을 관찰 아티팩트에 기록한다. 인증 본문이나 저널 데이터는 읽지 않는다.

## Upgrade Path

실제 브라우저에서 이전 탭을 열어 둔 채 새 배포 후 오프라인 reload를 수행하는 수용
확인은 `docs/operator-acceptance.md`에서 진행한다. 재현 가능한 추가 장애가 생길 때만
서비스워커 업데이트 안내 UX를 별도 슬라이스로 연다.

## Deliberately Not Doing

CI·hook·새 timing runner·coverage floor·플러그인 release adapter·자동 동기화는 이번
출하에 추가하지 않는다. 현재 게이트가 빠르고, 리포의 오프라인·명령형 동기화 계약과
맞지 않거나 근거가 없다.

## Next Move

현재 코드 수정과 기록을 게이트로 확인한 다음 push → deploy → Access readback →
handoff/version 기록 순서로 닫는다.
