# UI 디자인 원칙·개선 계획 critique
Date: 2026-08-05

## Decision Under Review

g15e의 선언적 디자인·CSS aspect·AI 위임 논의를 저널의 기존 불변식에 통합하고,
UI 개선을 오늘 기록 → 에너지 점수/이유 → 재방문 인출의 작은 slice로 시작한다.
`design-principles.md`는 파생 UI 해석이며 `ui-improvement-plan.md`가 실행 순서를 갖는다.

## Spec Path

- [`docs/design-principles.md`](../../docs/design-principles.md)
- [`docs/ui-improvement-plan.md`](../../docs/ui-improvement-plan.md)
- [`charness-artifacts/narrative/2026-08-05-journal-ui-design-alignment.md`](../narrative/2026-08-05-journal-ui-design-alignment.md)

## Failure Angles

- first-reader / Minto: 두 제품 outcome과 파생 UI 해석의 권위 경계가 나중에도 오해 없이
  읽히는가.
- problem framing / Jackson + Weinberg: blog/garden의 정적·no-JS 전제를 SPA 저널에
  잘못 옮기지 않고 실제 복붙·에너지 인출 문제를 첫 slice가 소유하는가.
- operational / Gawande: UI proof가 기존 gate·operator acceptance·사람 수용 중 어디서
  닫히는지, fixture·상태·owner가 실행 가능한가.

## Findings

세 각도 reviewer와 별도 counterweight가 문서·코드·기존 계약을 읽었다. 네 reviewer 모두
파일·Git·`.charness`를 변경하지 않았고, 각 반환 직후 parent boundary verify는 clean이었다.

- no-JS/no-hydrate 보장은 빈 `#app`을 mount하는 현재 SPA와 충돌한다.
- 오프라인은 서비스워커 설치 뒤 warm-cache와 최초 cold offline을 구분해야 한다.
- 첫 구현이 geometry 중심이면 복붙 제거와 에너지 인출을 놓친다.
- 그래프 선택 날짜의 긴 이유가 잘리면 “에너지를 다시 읽는다”는 목표가 깨진다.
- context matrix·forced colors·reduced motion·200%·keyboard proof에는 실행 주체와 상태가
  필요하다. 새 browser runner를 먼저 만드는 것은 이 리포의 최소주의와 맞지 않는다.
- CSS ownership/aspect 정리는 현재 반복 override 증거가 없으므로 독립 리팩터링이 아니다.
- sibling gather의 `stdy.blog` 전용 문맥은 원문 참고용으로만 남기고 저널 결정과 분리해야 한다.
- 문서는 추적 상태에 착지한 뒤 lint를 다시 실행해야 closeout proof가 된다.

## Counterweight Pass

- `act-before-ship`: SPA와 충돌하는 no-JS 주장, cold/warm offline 혼동, geometry-first 순서,
  그래프 긴 이유 손실, untracked 문서의 검증 착시는 구현 전 문서를 바꿔야 한다.
- `bundle-anyway`: UI case별 owner/evidence/status 표와 sibling gather 참고 전용 라벨은
  지금 문서에 싸게 넣는다.
- `over-worry`: 모든 맥락 조합을 permutation으로 검사하거나 별도 runner·CI를 만드는 것은
  근거가 없다. 첫 proof는 세 case로 제한한다.
- `valid-but-defer`: 실제 반복 override가 생긴 뒤 CSS ownership을 정리한다. RTL·다국어
  일반화, SSR/no-JS fallback, cold offline도 별도 제품 결정 없이는 열지 않는다.

## Structured Findings

- F1 | bin: act-before-ship | evidence: strong | ref: index.html:12-14; src/main.js:1-14 | action: fix | note: 현재 Svelte SPA는 JavaScript 실행 전제이므로 no-JS/no-hydrate 보장을 제거하고 SSR fallback을 별도 비목표로 명시했다.
- F2 | bin: act-before-ship | evidence: strong | ref: src/main.js:5-10; scripts/gen-sw.mjs:49-65 | action: fix | note: 오프라인 proof를 설치된 서비스워커의 warm-cache로 한정하고 최초 cold offline은 주장하지 않도록 고쳤다.
- F3 | bin: act-before-ship | evidence: strong | ref: docs/ui-improvement-plan.md:9-14,77-105 | action: fix | note: 첫 순서를 geometry가 아닌 오늘 기록·에너지·재방문 end-to-end로 재배치했다.
- F4 | bin: act-before-ship | evidence: strong | ref: src/lib/Graph.svelte:452-458 | action: fix | note: 긴 에너지 이유 truncation을 P1 인출 acceptance와 구현 출발점으로 명시했다.
- F5 | bin: bundle-anyway | evidence: strong | ref: docs/ui-improvement-plan.md:48-62,145-158 | action: fix | note: UI-1~3과 G-1에 setup/action/expected/owner/evidence/status를 붙여 prose-only proof를 줄였다.
- F6 | bin: bundle-anyway | evidence: moderate | ref: charness-artifacts/gather/2026-08-05-g15e-design-related.md:6-10,38-45 | action: document | note: 연관 gather는 참고 전용이며 sibling blog의 제품 문맥을 저널 결정으로 채택하지 않는다고 기록했다.
- F7 | bin: valid-but-defer | evidence: moderate | ref: docs/ui-improvement-plan.md:123-140 | action: defer | note: 반복 override가 P0/P1에서 두 번 이상 생길 때만 CSS aspect ownership slice를 연다.
- F8 | bin: over-worry | evidence: weak | ref: AGENTS.md; docs/ui-improvement-plan.md:174-183 | action: document | note: exhaustive matrix, 새 browser runner, CI·훅, RTL 일반화는 현재 사용자 증거가 없어 보류한다.
- F9 | bin: act-before-ship | evidence: strong | ref: scripts/check-docs.mjs:188-225; git status | action: fix | note: 정본 문서를 추적 상태에 착지한 뒤 lint와 최종 gate를 실행한다.

## Fixed/Probe/Defer Coherence Result

- Fixed: UI 문서는 파생 해석이며 AGENTS.md·아이데이션·구현 계약을 넘지 않는다 — pass.
- Fixed: 제품 outcome은 복붙 제거와 에너지 인출 두 개 — pass.
- Probe: 한국어/영문 measure, 그래프 keyboard/touch 인출, forced colors/reduced motion —
  각 답을 해당 구현 slice와 UI-1~3 수용 기록에 쓴다 — pass.
- Defer: SSR/no-JS fallback, 최초 cold offline, 전체 CSS ownership, 새 runner/CI/훅 —
  재개 조건 또는 비목표를 문서에 썼다 — pass.

## Acceptance Check Coverage Result

- 오늘 기록·에너지·재방문 outcome → UI-1, 사람의 배포 브라우저 수용 — covered, 미실행.
- warm-cache 오프라인 기록·그래프·export → UI-2, 기존 operator acceptance에 기록 — covered, 미실행.
- 그래프의 긴 이유·이유만 있는 날·keyboard/touch 날짜 이동 → UI-3와 P1 회귀 테스트 — covered, 미실행.
- 순수 함수·상태·서비스워커 대역·문서 → G-1 `npm run gate` — covered, 현재 통과.

## Pre-Impl Action

1. 문서와 gather/narrative를 Git 추적 상태에 착지한다.
2. `npm run lint`와 전체 gate를 다시 실행해 새 문서까지 검증한다.
3. 다음 구현은 UI-1의 end-to-end 흐름에서 시작하고, UI-2·UI-3은 사람 수용 항목으로
   남긴다. no-JS/cold offline/전체 CSS refactor는 열지 않는다.

## Packet Consumed

n/a (adapter `packet_sections: []`; critique packet skipped)

## Reviewer Tier Evidence

- Requested tier: n/a — host adapter tier selection was not exposed to the spawn surface.
- Requested spawn fields: `fork_context=true`; synchronous waits; read-only named-lens prompts.
- Host exposure state: host-defaulted
- Application state: host-confirmed: three angle reports and one separate counterweight report
  were returned by `multi_agent_v1`; each boundary verification returned `verdict: clean`.
- Delivery state: findings-received

## Fresh-Eye Satisfaction

parent-delegated — three distinct bounded angle reports (first-reader/problem framing/operational)
and one separate counterweight report were received. Reviewers did not edit the shared worktree.

## Reviewed Input Identity

The reviewers read the current worktree paths listed under `Spec Path`; no packet was consumed.

## Boundary Ownership

- Producer: external source ledger plus the journal's existing product and implementation contracts.
- Consumer: UI design principles and the next-slice UI improvement plan.
- Owning surface: `docs/design-principles.md` for interpretation and `docs/ui-improvement-plan.md`
  for execution order; AGENTS/spec/ideation remain higher-order owners.
- Verdict: owned-correctly
