# Handoff

섹션 제목은 기계가 검증하므로 영어로 둔다. 본문은 한국어다 (AGENTS.md `언어`).

## Workflow Trigger

`charness:impl` — **S2 에너지 그래프.** 범위의 단일 출처는
[roadmap.md](./roadmap.md) `### 3. S2`, 계약은
[spec-first-slice.md](./spec-first-slice.md)다.

먼저 아래 `Next Session` 1번(사람만 할 수 있는 확인)을 사용자에게 상기시킬 것.

## Continuation Capability

읽고 나면 **S2를 바로 착수할 수 있어야 한다** — 무엇을 그리는지(`D14`·`D19`),
데이터를 어디서 읽는지(로컬 IndexedDB, D1이 아니다), 왜 차트 라이브러리를 안 넣는지.

## Current State

**S1 배포됨 — https://journal.stdy.blog** (Cloudflare Access, 허용 이메일 하나).

- D1 `journal-db` + 원격 스키마 적용 완료. 재적용은 `npm run db:schema`
- 게이트 확인: `npm test` · `npm run lint` · `npm run check` · `npm run build`
- 프레시아이 리뷰 넷을 돌리고 지적을 반영했다(구현 정확성·`$state` 프록시 경계·
  운영자 인수·UI/모바일). 상세는
  [charness-artifacts/setup/latest.md](../charness-artifacts/setup/latest.md)와
  커밋 로그에 있다
- **`git remote`가 없다.** 이 리포는 이 기계에만 있다 — 아래 `Discuss` 참조

## Next Session

1. **수용 확인 — 사람만 할 수 있다.** 절차는
   [operator-acceptance.md](./operator-acceptance.md) `## 수용 확인`.
   `AC-9`는 배포 직후 관측으로 닫혔고 **`AC-10`(비행기 모드) · `AC-11`(두 기기 충돌) ·
   `AC-12`(`sample.md` 왕복)가 남았다.** 링크 라벨이 "배포 전"이 아니므로 열어볼 것 —
   이게 가장 놓치기 쉬운 자리다.
2. **S2 에너지 그래프.** 30일 기본 · 「1개월 더」·「전체」 · 결측일은 선을 끊고 ·
   탭하면 이유 툴팁 → 다시 탭하면 그날로 이동. **SVG로 직접 그린다.**
3. **폰에서 볼 프로브 `P-2`~`P-5`.** 단일 출처는
   [spec-first-slice.md](./spec-first-slice.md) `## Probe Questions`.

## Discuss

- **백업이 없다.** `git remote`가 0개라 코드·문서·아이데이션 기록이 이 기계에만 산다.
  저널 본문은 D1에 있으니 별개지만, **비공개 원격을 붙일지 사용자 결정이 필요하다.**
  (붙인다면 `references/sample.md`가 함께 올라간다는 걸 짚을 것 — 실제 저널이다.)
- **10점 척도를 유지할지**(`A1`). 며칠 써보고 6과 7을 구분해 매기지 않으면 5점으로
  내린다. 스키마는 안 바뀐다.
- `conflict` 사본을 서버로 올릴지 — 지금은 로컬 전용(의도적 보류).

## References

- [spec-first-slice.md](./spec-first-slice.md) — **구현 정본.** 스키마·동기화
  프로토콜·수용 기준·프로브
- [roadmap.md](./roadmap.md) — 순서. 결정을 재선언하지 않는다
- [operator-acceptance.md](./operator-acceptance.md) — 사람이 하는 확인. `## 1`에
  **로컬 개발에는 API가 없다**는 제약이 있다(동기화는 배포본에서 본다)
- [2026-07-26-concept-ideation.md](../charness-artifacts/ideation/2026-07-26-concept-ideation.md)
  — 결정 `D1`~`D20`의 근거
