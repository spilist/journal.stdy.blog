# Handoff

## Workflow Trigger

`charness:impl` — S1은 배포됐다. 다음은 **S2(에너지 그래프)**다. 다만 그 전에
[운영자 인수](./operator-acceptance.md)의 **수용 확인 셋을 사람이 해야 한다.**

## 지금 상태 (2026-07-26)

**배포됨 — https://journal.stdy.blog**

- D1 `journal-db` 생성 + 원격 스키마 적용 완료
- Cloudflare Access: 기존 앱 `routine-stdy-blog`에 `journal.stdy.blog`를
  destination으로 추가 (AUD 공유, 세션 1개월)
- 게이트 전부 초록 — `npm test` 38 · `npm run lint` · `npm run check` · `npm run build`

## 다음 행동 — 순서대로

### 1. 사람만 할 수 있는 수용 확인 (`AC-9`~`AC-12`)

**여기가 지금 가장 놓치기 쉬운 자리다.** 절차는
[operator-acceptance.md](./operator-acceptance.md) `## 수용 확인`에 있다.

- `AC-9` 인증 경계 — **배포 직후 관측 완료**(루트·`/api/*` 둘 다 Access 로그인으로
  302, `*.workers.dev` 404). 기록은 같은 문서에 있다
- `AC-10` 비행기 모드 유실 확인
- `AC-11` 두 기기 충돌 사본
- `AC-12` `sample.md` 왕복

### 2. 폰에서 볼 프로브 (`P-2`~`P-4`)

**단일 출처는 [spec-first-slice.md](./spec-first-slice.md) `## Probe Questions`다.**
여기서 목록을 재선언하지 않는다 — 이전 판이 그래서 어긋났다.

### 3. S2 — 에너지 그래프

범위의 단일 출처는 [roadmap.md](./roadmap.md) `### 3. S2`다.

## 막힌 곳

**없다.** 이전 판이 적어둔 D1 토큰 권한 문제는 해소됐다(토큰에 `D1: Edit`와
`Access: Apps and Policies — Read`가 추가됐다).

## 알려진 제약

- **로컬 개발(`npm run dev`)에는 API가 없다.** vite만 뜨므로 `/api/*`는 SPA fallback
  HTML을 받고 앱이 "다시 로그인" 상태로 간다. **UI 작업용이고 동기화는 배포본에서
  확인한다.**
- 서브에이전트 리뷰는 **동기 실행(`run_in_background: false`)으로 돌릴 것.**
  백그라운드로 돌리면 완료 신호만 오고 보고 본문이 유실된 사례가 있다.
