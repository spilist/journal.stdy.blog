# Handoff

## Workflow Trigger

`charness:impl` — S1은 코드가 끝났고, 남은 건 **사람이 하는 Cloudflare 설정**과
그 뒤의 배포·수용 확인이다. 설정이 끝나면 S2(에너지 그래프)로 넘어간다.

## 지금 상태 (2026-07-26)

**S1 구현 완료, 배포 전.** 게이트는 다 초록이다 — 테스트 35 / eslint 0 /
svelte-check 0 / tsc(worker) 0 / 빌드 성공.

정본 문서 셋:

- [docs/spec-first-slice.md](./spec-first-slice.md) — **구현 정본.** 스키마·프로토콜·수용 기준
- [charness-artifacts/ideation/2026-07-26-concept-ideation.md](../charness-artifacts/ideation/2026-07-26-concept-ideation.md) — 결정 `D1`~`D20`
- [docs/operator-acceptance.md](./operator-acceptance.md) — 배포 전 사람이 할 일

## 막힌 곳 — 다음 행동

**`.env`의 API 토큰에 D1 권한이 없다.** `~/stdy.blog/.env`에서 복사한 것인데
계정 조회는 되고 `wrangler d1 create`는 `Authentication error [code: 10000]`으로
막혔다. 둘 중 하나가 필요하다:

1. 대시보드에서 **My Profile → API Tokens**의 토큰에 `D1: Edit` 권한을 추가하거나
   새 토큰을 발급해 `.env`의 `CLOUDFLARE_API_TOKEN`을 갈아끼운다
2. 또는 대시보드에서 D1 데이터베이스 `journal-db`를 직접 만든다

그다음은 [operator-acceptance.md](./operator-acceptance.md) 순서대로다 —
D1 ID를 [wrangler.jsonc](../wrangler.jsonc)에 넣고, Access 앱을 만들어
`ACCESS_TEAM_DOMAIN`·`ACCESS_AUD`를 채우고, 배포한다.

**Access를 붙이기 전에 배포하면 안 된다.** 정적 자산이 Worker보다 먼저 나가므로
앱 화면이 인증 없이 열린다. 데이터는 401로 막히지만 사적인 앱을 공개 URL에
세워둘 이유가 없다.

## 남은 프로브 (`spec` `Probe Questions`)

- **P-1** 10점 1행 56px에서 오터치가 나는가. 나면 5×2행이나 5점으로 내린다.
  **스키마는 안 바뀐다**
- **P-2** 「어제」 위 전날 「오늘」 병치가 세로를 너무 먹는가
- **P-3** 개정 타임라인 위치 — 지금은 고정 블록 펼침 하단

## 하지 않은 것

- **바운디드 프레시아이 크리틱을 못 돌렸다.** 이 세션의 호스트가 서브에이전트
  생성을 막았다(`Do not call the AgentTool unless the user requested it`).
  AGENTS.md `Subagent Delegation` 규정대로 **같은 에이전트의 재검토로 대체하지 않고
  제약을 그대로 남긴다.** 다음 세션에서 `critique`로 S1을 한 번 훑는 게 맞다.
- **S2 (에너지 그래프)** — 30일 기본, 「1개월 더」·「전체」, 결측일 선 끊기,
  탭하면 이유 툴팁 → 다시 탭하면 그날로 이동 (`D14`·`D19`)
- **전체 export의 날짜 범위 선택 UI** — 지금은 전체 하나만
