# Text Revert Dirty Debug
Date: 2026-08-04

## Problem

고정 노트의 본문을 시험 삼아 수정한 뒤 원래 내용으로 되돌렸는데도 화면에 `올리기 2`가
남는다. 사용자가 의미 있게 남기지 않은 시험 편집과 그 자동 이력이 동기화 대상에 남지 않아야
한다.

## Correct Behavior

동기화 완료된 고정 노트 A에 대해 A → B → A를 올리기 전에 수행하면, 최종 내용은 서버와
같으므로 본체와 자동 revision 모두 더티가 아니어야 한다. 사용자가 실제로 남긴 B는 기존
고정 노트 이력 계약에 따라 별도로 보존될 수 있지만, 원복된 시험 편집은 이력으로 남기지 않는
것이 이번 증상의 기대 동작이다.

## Observed Facts

- `src/lib/merge.js:36-38`의 더티 판정은 내용이 아니라 `updatedAt > syncedAt`이다.
- `src/lib/state.svelte.js:224-227`의 `nextText`는 직전 값과만 비교한다. B 다음 A는
  직전 값 B와 다르므로 새 `updatedAt`을 만든다.
- `src/lib/state.svelte.js:376-396`의 `#commit`도 직전 레코드와 새 레코드가 같은 객체인지
  만 확인한다.
- 고정 노트 첫 실제 커밋은 `src/lib/state.svelte.js:380-382,512-528`에서 그 직전
  내용을 오늘의 `revision`으로 밀봉한다. revision도 `syncedAt: 0`으로 시작한다.
- `src/lib/state.svelte.js:910-913`은 revision을 포함한 모든 더티 레코드를 올리기 후보로
  모은다. 따라서 본체 1건 + revision 1건이 `올리기 2`가 된다.

## Reproduction

- 동기화된 고정 노트 A를 준비한다.
- `setPinned(B); flush()` 후 `setPinned(A); flush()`를 실행한다.
- 실제 하네스에서 원복 뒤 `dirtyCount() === 2`가 확인됐다. 레코드는 `pinned`(A, 새
  updatedAt)와 `revision:2026-08-04`(A, syncedAt 0)였다.
- `node --test src/lib/merge.test.js`는 통과했다. `state.test.js`는 기존 날짜 고정 키와
  현재 날짜의 불일치로 `다시 읽기가 디바운스 중인 입력을 디스크 판본으로 밀지 않는다`가
  실패했으며, 이번 재현과는 별개다.

## Candidate Causes

- 텍스트 원복을 최초 기준값과 비교하지 않고 직전 값과만 비교한다.
- 고정 노트의 자동 revision이 원복 여부와 무관하게 첫 커밋에서 생성된다.
- push 후보 필터가 내용 동등성을 보지 않고 시각 필드만 본다.

## Hypothesis

- 텍스트 원복에는 점수 취소와 같은 기준값 복구 경로가 없어서, A → B → A가 두 개의 더티
  레코드를 남긴다 | disconfirmer: 하네스에서 동기화된 A에 대해 A → B → A 후 레코드별
  `updatedAt`, `syncedAt`, `kind`를 확인한다.

## Verification

- confirmed — 하네스 재현에서 `pinned.updatedAt`은 기존 `syncedAt`보다 새로워졌고,
  당일 revision이 `syncedAt: 0`으로 생성되어 두 레코드 모두 `isDirty`가 됐다.

## Root Cause

1. 사용자가 텍스트를 바꾼다 → `nextText`가 B에 새 시각을 준다.
2. 고정 노트 커밋이 자동 revision을 만든다 → revision도 새 미동기화 레코드가 된다.
3. 사용자가 A로 되돌려도 현재값만 직전 B와 비교한다 → pinned의 새 시각이 유지된다.
4. push는 시각 기준 더티 레코드를 전부 세므로 → 내용상 변화가 없는 A와 revision까지
   `올리기 2`로 보인다.

## Invariant Proof

- Invariant: 최종 내용이 이미 동기화된 값과 같다면 그 레코드는 올리기 후보가 아니어야 한다.
- Producer Proof: `nextText`와 `#commit`이 직전 값 기준으로 새 시각을 만든다.
- Final-Consumer Proof: `#push`가 `Object.values(this.records).filter(isDirty)`로 본체와
  revision을 모두 후보에 넣는다.
- Interface-Shape Sibling Scan: 점수 취소에는 기준 스냅샷을 되돌리는 별도 경로가 있다.
- Non-Claims: 실제 배포 데이터나 사용자 저널 내용은 조사하지 않았다.

## Detection Gap

- `src/lib/merge.test.js:224-227`의 `nextText` 테스트는 같은 값을 즉시 다시 넣는 경우만
  검사한다 | A → B → A 왕복과 dirtyCount를 검사하도록 fixture/assertion을 추가하면 fire.
- `src/lib/state.test.js`에는 `setPinned` → 원복 → revision/dirtyCount 시나리오가 없다 |
  고정 노트의 로컬 커밋 경계를 하네스로 고정해야 fire.
- 런타임 버튼은 더티 레코드 수만 보여준다(`src/App.svelte:122-125`) | 이 증상은 현재
  사람의 사용 흐름에서만 드러난다.

## Sibling Search

- Mental model: “원복은 마지막 값이 같으면 자동으로 없던 일이 된다”는 가정을 텍스트에도
  적용할 수 있다고 보는 것.
- same layer: `src/lib/merge.js:238-243`의 `nextEnergy`도 직전 레코드 기준이지만,
  점수 조작은 `restoreScore`가 별도 기준 스냅샷을 복구한다 | decision: intentional
  plain-text or non-rendering boundary | proof: static scan only.
- abstraction up: `src/lib/merge.js:36-59`의 모든 dirty 판정이 시각 기준이다 | decision:
  same class, diagnostic-only for this slice | proof: local payload proof.
- specialization down: `src/lib/state.svelte.js:406-429`의 점수 취소는 이유가 같을 때
  레코드 시각까지 복구한다 | decision: same class, diagnostic-only for this slice |
  proof: static scan only.
- mental-model sibling: `src/lib/state.svelte.js:512-528`의 자동 revision은 “첫 실제
  커밋”을 기준으로 하므로 원복 후에도 남는다 | decision: valid follow-up outside the
  slice | proof: local payload proof | follow-up: deferred docs/handoff.md Discuss.
- cross-file: `src/lib/merge.js`와 `src/lib/state.svelte.js` — dirty 판정과 revision 생성이
  서로 다른 파일에서 결합된다.

## Seam Risk

- Interrupt ID: none
- Risk Class: none
- Seam: none
- Disproving Observation: n/a
- What Local Reasoning Cannot Prove: n/a
- Generalization Pressure: monitor

## Interrupt Decision

- Resolution: resolved
- Critique Required: no
- Next Step: impl
- Handoff Artifact: none

## Prevention

수정한다면 텍스트 블록에도 편집 시작 전 기준값을 두고, 커밋 시 최종 텍스트가 그 기준값과
같으면 레코드와 고정 노트 revision을 원상복구하는 가장 작은 경로가 적절하다. 먼저 A → B → A
회귀 테스트를 만들고, 고정 노트와 일반 로그에 적용 범위를 분리해 검토해야 한다. 단순히
`revision`만 올리기 수에서 숨기면 본체의 가짜 더티가 남아 다른 기기와 동기화될 수 있으므로
필터만 UI에 두는 것은 불충분하다.
