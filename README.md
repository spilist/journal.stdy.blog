# journal.stdy.blog

> 메모장에 쓰고 저널 파일에 복붙하던 걸 없애는 앱. 그리고 텍스트에 박혀 보이지 않던
> 에너지 점수를 값으로 꺼낸다.

## 이게 뭔가

개인용(n=1) 저널 앱. 한 사람이 쓰고 한 사람이 읽는다. 하는 일은 **두 개뿐**이다:

1. **복붙을 없앤다.** 폰에서 쓰면 그게 정본이다.
2. **에너지를 추적한다.** 인지·정서·육체 점수를 원터치로 넣고, 나중에 흐름을 본다.

형식의 정본은 [references/sample.md](./references/sample.md)다 — 앱이 만드는 마크다운이
그 파일과 같은 모양이라, 언제든 앱 밖으로 나갈 수 있다.

## 어떻게 생겼나

날짜 하나에 블록 넷:

| 블록 | 편집 방법 |
|---|---|
| **잊지 않을 것** | 접혀 있다. 펼치면 텍스트 하나. **제목도 직접 쓴다** — 앱은 제목을 모른다 |
| **에너지** | 점수는 10점 버튼 한 번, 이유는 텍스트. **두 수단이 겹치지 않는다** |
| **어제** | 전날의 「오늘」이 위에 읽기 전용으로 뜬다 — 보면서 회고한다 |
| **오늘** | 하루 동안 여러 번 덧붙인다 |

## 설계 불변식

넷 다 **하지 않는 것에 대한 금지**다. 자세한 건 [AGENTS.md](./AGENTS.md)에 있다.

1. **오프라인이 기본이다.** 로컬(IndexedDB)이 작업 정본이고 D1은 동기화 대상이다.
   네트워크 없이 앱이 완전히 동작한다.
2. **동기화는 사람이 누른다.** 상시 자동 push가 없다. 서버에서 당겨오는 pull만
   자동이고, 그건 로컬을 파괴하지 않는다.
3. **사용자가 쓴 글자를 잃지 않는다.** 동기화 충돌에서 진 쪽도 `충돌 사본`으로 남고,
   가져오기가 해석 못 한 줄은 저장 전에 원문으로 보여준다.
4. **앱에 LLM이 없다.** 저널 쓰기는 그 자체가 목적인 행위다. 회고 보조가 필요하면
   export한 마크다운을 앱 밖에서 쓴다.

## 현재 상태

**S1·S2 배포됨 (2026-07-26) — https://journal.stdy.blog**

**품질 개선 슬라이스도 배포됨 (2026-08-04).** 월치 복사·날짜 URL·변경 내역 diff와
접근성·동시성·오프라인 복구 보강이 배포본에 반영됐다. 배포 버전은
`81e17bfe-db5b-40dd-82be-6c0628787214`다.

허용 이메일 하나만 Cloudflare Access를 통과한다. 남은 일은 **사람만 할 수 있는 수용
확인**([운영자 인수](./docs/operator-acceptance.md))이다 — 순서는
[로드맵](./docs/roadmap.md)에 있다.

| 있는 것 | 없는 것 |
|---|---|
| 날짜 화면 네 블록 · URL과 함께하는 날짜 이동 | 주·월 회고 화면 |
| 에너지 그래프 (S2) · 로컬 자동저장 · 오프라인 PWA | 앱 밖 알림 |
| 「잊지 않을 것」 + 하루 1개 변경 내역 diff | CLI |
| 하루치·월치 복사 · 전체 내려받기 · 가져오기 | 앱 내 LLM (**영구적으로 없음**) |
| D1 동기화 (pull 자동, push 버튼) + 충돌 사본 | 멀티유저 · 회원가입 |
| Cloudflare Access + Worker JWT 검증 | |

## 로컬에서 돌리기

```bash
npm install
npm run dev          # http://localhost:5173 — vite만 뜬다
```

**Cloudflare 계정 없이 앱과 게이트 전부가 돈다.** 로컬 저장소(IndexedDB)가 작업 정본이고
D1은 동기화 대상이라, 서버가 없어도 쓰기·읽기·내려받기가 전부 로컬에서 끝난다.

| | 계정 없이 | 필요한 것 |
|---|---|---|
| 날짜 화면 네 블록 · 날짜 이동 · 자동저장 | **된다** | — |
| 에너지 점수·이유 · 그래프 | **된다** | — |
| 하루치·월치 복사 · 전체 내려받기 · 가져오기 | **된다** | — |
| `npm run gate` (`test`·`reach`·`lint`·`check`·`build`) | **된다** | — |
| 「올리기」 · 자동 pull (`/api/*`) | **안 된다** | 배포본 |
| `npm run deploy` · `npm run db:schema` | 안 된다 | Cloudflare 계정 · D1 · `.env` |

개발 서버에는 `/api/*`가 없어서 [sync.js](./src/lib/sync.js)가 응답을 로그인 리다이렉트로
읽고 **「로그인이 만료됐습니다」 배너**를 띄운다. **로컬 개발의 정상 상태이고, 배너가 떠
있어도 편집·저장·내보내기는 그대로 동작한다.** 동기화·Worker·D1은 배포본에서 확인한다 —
Worker가 Cloudflare Access의 JWT를 검증하므로 로컬에서는 인증 경로를 재현할 수 없고, 그래서
`wrangler dev`·로컬 D1 스크립트를 **일부러 두지 않았다**.

```bash
npm run gate         # test → reach → lint → check → build. && 사슬이라 앞이 실패하면 뒤는 안 돈다
npm run check        # svelte-check (jsconfig checkJs + JSDoc) + tsc(worker)
npm run lint         # eslint + eslint-plugin-svelte, 그리고 마크다운 링크 검사
npm run deploy       # 빌드 + Cloudflare 업로드
```

**런타임 의존성 0개.** 에너지 그래프도 SVG로 직접 그렸다 (S2).

기여의 경계는 [CONTRIBUTING.md](./CONTRIBUTING.md)에 있다. 라이선스는
[MIT](./LICENSE)다.

## 문서

| | |
|---|---|
| [AGENTS.md](./AGENTS.md) | 에이전트 운영 계약. 설계 취향과 불변식 |
| [docs/spec-first-slice.md](./docs/spec-first-slice.md) | **구현 정본.** 스키마·프로토콜·수용 기준 |
| [docs/roadmap.md](./docs/roadmap.md) | 우선순위와 순서 |
| [docs/handoff.md](./docs/handoff.md) | 다음 세션이 먼저 읽을 것 |
| [docs/operator-acceptance.md](./docs/operator-acceptance.md) | 운영자 인수 + 수용 확인 |
| [아이데이션 기록](./charness-artifacts/ideation/2026-07-26-concept-ideation.md) | 결정 `D1` 이후 전부와 그 근거 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 무엇을 받고 무엇을 안 받는지 |
