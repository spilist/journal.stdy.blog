# Energy Nested Bullet Copy Debug
Date: 2026-08-06

## Problem

사용자가 에너지 이유를 여러 줄의 불렛으로 쓴 뒤 하루치/월치 복사를 누르면 첫 불렛은
점수 줄 뒤에 붙고 다음 불렛은 최상위 에너지 줄처럼 나간다. 사용자가 보고한 증상은
“복사가 이상합니다”이며, 실제 저널 본문은 기록하지 않았다.

## Correct Behavior

Given an energy reason beginning with `- ` and containing multiple lines, when day/month export
is assembled, then the score line closes first and every reason line is indented by two spaces.
Given that nested output, when it is parsed, then the indented lines join the preceding energy
entry's reason without appearing in `unparsed`.

## Observed Facts

- `src/lib/markdown.js:193-201` previously appended the whole reason after `score.` and did not
  format continuation lines.
- `src/lib/markdown.js:125-141` previously parsed every nonblank energy line independently;
  an unindented second `- ...` could not belong to the preceding reason.
- `src/App.svelte:142-145` forwards the assembled string directly to `navigator.clipboard`; it
  does not and should not own Markdown formatting.

## Reproduction

- Small fabricated input: `{dim: '인지', score: 10, reason: '- 지어낸 첫 항목\\n- 지어낸 둘째 항목'}`.
- Before the fix, `assembleEnergyLine` returned `- 인지: 10. - 지어낸 첫 항목\\n- 지어낸 둘째 항목`.
- Parsing that output kept only the first reason line and put the second line in `unparsed`.
- No real journal text or browser clipboard contents were used in the reproduction.

## Candidate Causes

- The serializer treats a multiline reason as one inline suffix instead of Markdown continuation.
- The energy parser has no continuation state, so nested lines cannot rejoin their parent entry.
- The clipboard adapter could have altered line endings or list markers.
- The single-string `reason` model could require a new array/list data shape.

## Hypothesis

- The failure is local to the Markdown producer/consumer seam: serializing bullet-starting reasons
  as a two-space continuation and teaching the parser to consume that continuation will make the
  roundtrip lossless | disconfirmer: call `assembleEnergyLine` with two fabricated bullet lines,
  parse the result, and assert `unparsed.length === 0` and the original reason string.

## Verification

- confirmed — the pre-fix reproduction produced an unindented second line and `unparsed` held
  that line. After the smallest serializer/parser change, the new roundtrip test passes and the
  fabricated `references/sample.md` roundtrip also passes.

## Root Cause

1. `reason` is intentionally stored as one text string, so a newline can occur inside it.
2. `assembleEnergyLine` assumed the string was a single inline sentence and appended it after the
   score (`src/lib/markdown.js:193-201`).
3. The resulting newline escaped the Markdown list item; the parser's line-by-line loop then
   treated the following bullet as a separate malformed energy line.
4. The contract specified single-line energy examples but had no multiline bullet fixture, so the
   boundary stayed implicit.

## Invariant Proof

- Invariant: n/a — this is a pure Markdown serialization/parsing boundary, not propagated workflow status.
- Producer Proof: fabricated `assembleEnergyLine` output before/after the fix and the unit test at
  `src/lib/markdown.test.js:88-112`.
- Final-Consumer Proof: `parse` consumes the nested lines and `npm test` passes 190 tests.
- Interface-Shape Sibling Scan: the clipboard call is a pass-through, not a second formatter.
- Non-Claims: browser permission behavior, rendered Markdown in an external editor, and deployed
  clipboard behavior were not exercised.

## Detection Gap

- `src/lib/markdown.test.js:80-86` covered only single-line energy reasons; adding a nested
  bullet input/output roundtrip was the smallest missing assertion and now fires.
- `references/sample.md` had only single-line energy reasons; adding a fabricated nested example
  makes the public format surface exercise the contract.
- `npm run lint`, `npm run check`, and `npm run build` could not catch this semantic formatting
  mismatch; no runtime monitoring is appropriate for a pure local copy string.

## Sibling Search

- Mental model: “a text field is opaque content, so its newlines need no container-level Markdown
  structure.” The fix keeps the text model and makes the container boundary explicit.
- same layer: `src/lib/markdown.js:211-218` (`assembleDay`) delegates all energy formatting to
  `assembleEnergyLine` | decision: same class, diagnostic-only for this slice | proof: static scan.
- abstraction up: `src/lib/markdown.js:222-232` (`assemble`) reuses `assembleDay` rather than
  duplicating export formatting | decision: intentional plain-text or non-rendering boundary |
  proof: local payload proof.
- specialization down: `src/lib/markdown.js:125-141` is the energy-section continuation parser |
  decision: same bug, fix now | proof: runtime/provider roundtrip at unit-test scope.
- mental-model sibling: `src/App.svelte:142-145` sends returned text to the clipboard without
  reformatting | decision: intentional plain-text or non-rendering boundary | proof: static scan.
- cross-file: `src/lib/state.svelte.js:960-974` supplies parsed/export records to the shared
  Markdown seam and has no independent list formatter | decision: intentional plain-text or
  non-rendering boundary | proof: static scan.

## Seam Risk

- Interrupt ID: none
- Risk Class: none
- Seam: local pure serializer/parser; browser clipboard is a pass-through after serialization
- Disproving Observation: fabricated parser/assembler roundtrip passes, including the canonical sample
- What Local Reasoning Cannot Prove: a real browser's clipboard permission and external renderer
- Generalization Pressure: monitor

## Interrupt Decision

- Resolution: resolved
- Critique Required: yes
- Next Step: impl
- Handoff Artifact: none

## Prevention

Keep nested bullet syntax in the shared Markdown assembler/parser, not in `App.svelte` or state
code. Retain the fabricated nested roundtrip test and the canonical sample example; future export
format changes must update both together. The opposing concern is that indenting every multiline
reason continuation may normalize a user's intentionally unusual indentation; this is bounded by
removing only the serializer's own two-space prefix on import, while preserving the reason text
inside that boundary.
