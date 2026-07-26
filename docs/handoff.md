# Handoff

섹션 제목은 기계가 검증하므로 영어로 둔다. 본문은 한국어다 (AGENTS.md `언어`).

## Workflow Trigger

`charness:impl` — **폰 확인 뒤 결정.** S2는 구현·리뷰·배포가 끝났다. 다음은
사용자가 폰에서 보고 오는 `P-6`·`AC-19`·`AC-12`이고, 그 답에 따라 창 기본값을
손본다.

먼저 아래 `Next Session` 1번(사람만 할 수 있는 확인)을 사용자에게 상기시킬 것.

## Continuation Capability

읽고 나면 **폰 확인 결과를 받아 바로 손볼 수 있어야 한다** — 무엇이 새로 생겼는지
(에너지 그래프), 무엇을 폰에서 봐야 하는지(`P-6`), 그리고 **`S-2`가 왜 철회됐는지**
(같은 실수를 다시 하지 않기 위해).

## Current State

**S1·S2 배포됨 — https://journal.stdy.blog** (Cloudflare Access, 허용 이메일 하나).
S2 배포는 2026-07-26. 배포 직후 `AC-9` 재확인함
(인증 없이 `/api/pull` → Access가 302).

- 게이트 확인: **`npm run gate`** (= `test` 60개 · `lint` · `check` · `build`).
  `lint`는 eslint와 마크다운 링크 검사를 둘 다 돈다
- **S2에서 새로 생긴 것** — 계약은
  [spec-first-slice.md](./spec-first-slice.md) `## S2 — 에너지 그래프`
  - 에너지 그래프. SVG 직접, 차트 라이브러리 없음. 런타임 의존성은 여전히 0개.
    **에너지 헤더 우측의 「그래프」 버튼으로 펼친다** — 기본은 접힘 (`P-7`, 사용자 제안)
  - 탭하면 이유, 다시 탭하면 그날로 이동 (날짜 이동의 조합이지 새 기능이 아니다)
  - **「전체 내려받기」는 S1 그대로 전량이다.** 그래프 창을 범위로 쓰는 결합을
    넣었다가 **사용자 판정으로 철회했다** (`S-2`) — 강결합이었다
- 프레시아이 리뷰 둘을 돌리고 지적을 반영했다(구현 정확성 · 설계 계약 정합).
  고치지 않기로 한 셋은 `S-5`의 「알고도 두는 것」에 있다
- D1 `journal-db` + 원격 스키마 적용 완료. 재적용은 `npm run db:schema`.
  **S2는 스키마를 건드리지 않았다** — 배포에 DB 작업이 없다
- 원격은 `origin`(GitHub **private**). 상태 확인은 `git status -sb`

## Next Session

1. **수용 확인 — 사람만 할 수 있다.** 절차는
   [operator-acceptance.md](./operator-acceptance.md) `## 수용 확인`.
   `AC-9`·`AC-10`·`AC-11`은 닫혔고 **`AC-12`(`sample.md` 왕복)와
   `AC-19`(폰에서 그래프 탭)가 남았다.**
   `AC-12`는 **S1과 같은 절차**다 (`S-2` 철회로 되돌아갔다).
2. **폰에서 볼 것** — `P-6`(30일 창에서 점을 짚을 수 있는가). 단일 출처는
   [spec-first-slice.md](./spec-first-slice.md) `## Probe Questions`.
   **나쁘면 손볼 자리는 정해져 있다**: `Graph.svelte`의 `STEP`을 14로 내린다.
   `P-7`은 해소됐다 (에너지 헤더의 「그래프」 버튼).
3. **접힘이 세션마다 초기화되는 게 귀찮은지.** 귀찮으면 열림 상태를 `journal`로
   올린다 — `pinnedOpen`이 이미 그 형태다.
4. 남은 프로브 `P-2`·`P-3`.

## Discuss

- **10점 척도를 유지할지**(`A1`). 며칠 써보고 6과 7을 구분해 매기지 않으면 5점으로
  내린다. 스키마는 안 바뀌고 그래프도 `MIN_SCORE`/`MAX_SCORE`만 바뀐다.
- **날짜 범위 export가 정말 필요한지.** `S-2`를 철회하면서 다시 미룬 결정이 됐다.
  전량이 불편하다는 신호가 오면 그때 만든다 — 다만 **그래프 창에 묶는 형태는
  아니다.**
- **주·월 회고 화면** — 그래프를 써본 뒤 판단하기로 했다. **이제 써볼 수 있다.**
- `conflict` 사본을 서버로 올릴지 — 지금은 로컬 전용(의도적 보류).

## References

- [spec-first-slice.md](./spec-first-slice.md) — **구현 정본.** 스키마·동기화
  프로토콜·수용 기준·프로브. S2 계약은 `## S2 — 에너지 그래프`
- [roadmap.md](./roadmap.md) — 순서. 결정을 재선언하지 않는다
- [operator-acceptance.md](./operator-acceptance.md) — 사람이 하는 확인. `## 1`에
  **로컬 개발에는 API가 없다**는 제약이 있다(동기화는 배포본에서 본다)
- [2026-07-26-concept-ideation.md](../charness-artifacts/ideation/2026-07-26-concept-ideation.md)
  — 결정 `D1`~`D20`의 근거
