# Handoff

섹션 제목은 기계가 검증하므로 영어로 둔다. 본문은 한국어다 (AGENTS.md `언어`).

## Workflow Trigger

`charness:impl` — **폰 확인 뒤 결정.** S2는 구현·리뷰·배포가 끝났다. 다음은
사용자가 폰에서 보고 오는 `P-6`·`P-7`·`AC-19`·`AC-12`이고, 그 답에 따라 창
기본값이나 그래프 위치를 손본다.

먼저 아래 `Next Session` 1번(사람만 할 수 있는 확인)을 사용자에게 상기시킬 것.

## Continuation Capability

읽고 나면 **배포하고 폰에서 확인할 수 있어야 한다** — 무엇이 새로 생겼는지
(에너지 그래프, 내려받기 범위), 무엇을 폰에서 봐야 하는지(`P-6`·`P-7`),
어떤 결정이 되돌릴 준비가 돼 있는지(`S-5`).

## Current State

**S1·S2 배포됨 — https://journal.stdy.blog** (Cloudflare Access, 허용 이메일 하나).
S2 배포는 2026-07-26, 버전 `4ae1b6f4`. 배포 직후 `AC-9` 재확인함
(인증 없이 `/api/pull` → Access가 302).

- 게이트 확인: `npm test` (60개) · `npm run lint` · `npm run check` · `npm run build`
- **S2에서 새로 생긴 것** — 계약은
  [spec-first-slice.md](./spec-first-slice.md) `## S2 — 에너지 그래프`
  - 에너지 그래프. SVG 직접, 차트 라이브러리 없음. 런타임 의존성은 여전히 0개
  - 탭하면 이유, 다시 탭하면 그날로 이동 (날짜 이동의 조합이지 새 기능이 아니다)
  - **「전체 내려받기」의 범위가 그래프 창이 됐다.** 기본값이 최근 30일이므로
    전량을 받으려면 그래프에서 「전체」를 먼저 누른다 — **이게 S1에서 바뀐 동작이다**
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
   **`AC-12`는 절차가 바뀌었다** — 내려받기 범위가 그래프 창이라 기본값이 최근
   30일이다. 「전체」를 먼저 눌러야 왕복이 맞는다.
2. **폰에서 볼 것** — `P-6`(30일 창에서 점을 짚을 수 있는가) ·
   `P-7`(그래프가 쓰는 자리 아래에 있는 게 맞는가). 단일 출처는
   [spec-first-slice.md](./spec-first-slice.md) `## Probe Questions`.
   **답에 따라 손볼 자리는 정해져 있다**: `P-6`이 나쁘면 `Graph.svelte`의 `STEP`을
   14로, `P-7`이 나쁘면 `App.svelte`에서 `<Graph>`를 위로 올리거나 접는다.
3. 남은 프로브 `P-2`·`P-3`.

## Discuss

- **10점 척도를 유지할지**(`A1`). 며칠 써보고 6과 7을 구분해 매기지 않으면 5점으로
  내린다. 스키마는 안 바뀌고 그래프도 `MIN_SCORE`/`MAX_SCORE`만 바뀐다.
- **내려받기 범위를 그래프 창에 묶은 것**(`S-5` 1번). 전량 export가 한 번의 조작으로
  닿지 않게 됐다. 거슬리면 떼어낸다 — `graphDates()`를 안 읽으면 끝이다.
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
