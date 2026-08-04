# Critique Review
Date: 2026-08-04

## Decision Under Review

원복된 텍스트 편집을 dirty/revision에서 제거하고, 선택한 날짜의 달을 고정 노트와 함께
복사하며, 기존 UI에 hover/focus·accessible name·정확한 동기화 시각을 보강한다.

추가로 고정 노트의 변경 내역을 우상단 토글 버튼으로 diff 화면에서 읽게 하고, 날짜 이동을
브라우저 URL·뒤로/앞으로와 연결한다. 그래프 범위, Markdown 형식, 자동 push는 건드리지
않는다.

## Failure Angles

- 문제 정의/export: 현재 달은 실제 오늘이 아니라 화면에서 선택한 `journal.date`의
  `YYYY-MM`이어야 한다. 기존 `assemble`과 `datesInRange`를 재사용하고 revision·그래프
  창은 제외해야 한다.
- 진단/상태: `nextText`와 `#commit`은 직전 값만 비교하므로 저장 경계를 넘은 A→B→A가
  고정 노트 본체와 새 revision을 남긴다. 기준값은 `Journal` 텍스트 편집 세션이 소유해야
  하며 push/UI에서 숨기는 방식은 데이터 상태를 고치지 못한다.
- 접근성/인터페이스: hover만 추가하면 모바일·키보드에서는 설명이 없다. 버튼의 명시적
  이름, `aria-expanded`, `focus-visible`, 입력창의 accessible name, radiogroup 키보드
  조작을 함께 다뤄야 한다. title은 보조 수단이다.
- 운영/URL: 월 경계와 선택 날짜, pending flush, URL 직접 진입·잘못된 날짜·뒤로/앞으로를
  테스트해야 한다. 변경 내역 diff는 기존 revision을 읽기 전용으로 보여야 하고 수정
  동작이나 export 형식과 섞이면 안 된다.

## Counterweight Pass

- Act Before Ship: A→B→A 본체·revision 원복, push/reload 경계, 월 경계, URL history
  roundtrip, diff의 읽기 전용 경계, 입력 accessible name.
- Bundle Anyway: 기존 export 조합 재사용, 공통 timestamp 포맷, hover/focus 스타일,
  pinned 토글 ARIA 상태와 변경 내역 버튼.
- Over-Worry: 그래프 점을 전부 개별 버튼으로 바꾸기, tooltip 의존성, 새 export 포맷,
  전체 WCAG 감사, 그래프와 월 복사 결합.
- Valid but Defer: 모든 브라우저·스크린리더 조합의 종단 수동 감사. 이번에는 명백한
  DOM 이름·키보드·포커스·URL 상태를 고정한다.

## Structured Findings

- F1 | bin: act-before-ship | evidence: strong | ref: src/lib/state.svelte.js:376,512,910 | action: fix | note: 편집 세션 기준값으로 A→B→A의 본체와 이번 revision을 함께 원복한다
- F2 | bin: act-before-ship | evidence: strong | ref: src/lib/state.svelte.js:630,660; src/lib/series.js:146 | action: fix | note: 선택 날짜의 달만 기존 assemble 조합으로 복사하고 revision·그래프 창은 제외한다
- F3 | bin: act-before-ship | evidence: moderate | ref: src/App.svelte:110-117; src/lib/state.svelte.js:570-625 | action: fix | note: URL 직접 진입과 뒤로/앞으로를 날짜 상태와 연결한다
- F4 | bin: act-before-ship | evidence: moderate | ref: src/lib/Pinned.svelte:54-68 | action: fix | note: 변경 내역은 고정 노트 안의 읽기 전용 diff 토글로 인출한다
- F5 | bin: bundle-anyway | evidence: strong | ref: src/App.svelte:143; src/app.css:82-103 | action: fix | note: 동적 timestamp title과 hover/focus-visible 상태를 함께 보강한다
- F6 | bin: bundle-anyway | evidence: moderate | ref: src/lib/Pinned.svelte:29-49; src/lib/LogBlock.svelte:37-44; src/lib/Energy.svelte:174-205 | action: fix | note: 토글·입력·점수 표면에 명시적 accessible name/state를 붙인다
- F7 | bin: valid-but-defer | evidence: moderate | ref: n/a | action: defer | note: 전체 브라우저·스크린리더 조합의 종단 감사는 운영자 수용으로 남긴다
- F8 | bin: act-before-ship | evidence: strong | ref: src/lib/state.svelte.js:257,501,972,1028-1211 | action: fix | note: [resolved] push 중인 현재 chunk 키만 원복 보호하고 verdict 없는 실패 뒤 메타데이터를 정리한다
- F9 | bin: act-before-ship | evidence: strong | ref: src/lib/state.test.js:312-390 | action: fix | note: [resolved] 같은 키의 push·pull 경합, 다른 키 원복, relogin 재시도 회귀를 추가했다

## Reviewer Tier Evidence

- Requested tier: high-leverage
- Requested spawn fields: n/a (호스트 spawn surface가 tier 필드를 노출하지 않음)
- Host exposure state: metadata-hidden
- Application state: n/a
- Delivery state: findings-received

## Fresh-Eye Satisfaction

parent-delegated

## Reviewed Input Identity

- Packet consumed: charness-artifacts/critique/2026-08-04-002405-packet.md
- Packet path: charness-artifacts/critique/2026-08-04-002405-packet.json
- Packet SHA256: 5b4b14ced76d85b189a5aed30ddc9ca23a018df3b798a22572e6c818f898836d
- Identity SHA256: b99aabef87f0651384ad9f911d1f379f1602fbe5e53bf5205a57c433d4f687e1

## Boundary Ownership

- Producer: `Journal` 텍스트 커밋·revision 생성, 선택 날짜, URL 상태
- Consumer: dirty push, `assemble` 기반 export, diff 렌더러, 브라우저 history와 보조기술
- Owning surface: `state.svelte.js` 상태·내보내기, `Pinned.svelte` diff, `App.svelte` URL/버튼,
  `app.css` 공통 상호작용
- Verdict: owned-correctly

## Post-Implementation Disposition

초기 critique의 F1~F6은 구현과 회귀 테스트로 닫혔다. 구현 중 fresh-eye에서 나온 추가
경합도 반영했다: 반복 줄 diff의 LCS 정렬, 동일 밀리초 `updatedAt`, push 응답 전 원복과
자동 pull/reload의 상호작용, 다른 키를 올리는 동안의 원복, verdict 없는 relogin/network
실패 뒤 재시도, 로그-only 월 export의 빈 에너지 섹션을 각각 테스트로 고정했다. 오류·진행
중 동기화 상태의 visible text, title, ARIA도 상태별로 분리했다.

서버가 이미 accepted한 revision은 append-only 계약상 되돌릴 수 없다. 따라서 **아직 서버에
전달되지 않은 A→B→A 시험 revision은 제거**하지만, 서버가 받아들인 revision은 committed
history로 남긴다. 이를 철회하려면 revision tombstone/delete 프로토콜이 필요하므로 이번
슬라이스에는 넣지 않았다.

사람이 해야 하는 AC-12·AC-19·AC-23·AC-25·AC-26·AC-27과 실제 브라우저·D1 종단 확인은
아직 미검증이다. 현재 작업 트리는 게이트를 통과했지만 이 슬라이스는 배포하지 않았다.

## Final Fresh-Eye Review

최종 final7 fresh-eye는 두 개의 읽기 전용 렌즈로 수행했다. state/sync 렌즈는
`parent-delegated`로 Act Before Ship blocker 없음, UI/docs 렌즈도 check·lint와 문서
정합성을 확인했다. 한 호스트 응답은 별도 reviewer spawn 노출이 없다고 보고했지만, 다른
렌즈의 부모 위임 검토와 경계 지문 검증은 완료됐다. final7 경계 지문은 `clean`이었다.

최종 게이트 결과: `npm test` 161개 통과, `npm run lint` 통과, `npm run check` 통과.
