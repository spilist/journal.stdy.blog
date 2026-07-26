# AGENTS

journal.stdy.blog에서 에이전트가 지켜야 할 운영 계약.

## 이 리포의 성격

개인용(n=1) 저널 앱. 사용자 한 명이 쓰고, 사용자 한 명이 읽는다. **멀티유저·공유·유료화·
바이럴 관련 제안은 이 리포에서 전부 범위 밖이다.** 첫 슬라이스(S1)가
**배포돼 있다**(https://journal.stdy.blog) — 현재 상태와 순서는
[로드맵](./docs/roadmap.md)에 있다.

**이 앱이 하는 일은 두 개다** (사용자, 2026-07-26):

1. **복붙을 없앤다.** 지금 루프는 "메모장에 쓴다 → 저널 마크다운에 복붙한다"이고,
   그 두 번째 손을 없애는 게 목적이다.
2. **에너지 레벨을 추적한다.** 점수가 텍스트에 박혀 있어서 지금은 못 본다.

**어떤 제안이든 이 둘 중 하나에 닿지 않으면 범위 밖이다.**

**검증 의례를 하지 않는다.** 전제를 트립와이어로 걸고 계측하고 두 달 뒤 판정하는 식의
설계는 여기서 안 한다 (사용자: "이건 뭐 검증이고 뭐고 하룻밤 상관없고"). **불편하면
사용자가 말한다.** 대신 결정을 되돌릴 수 있게 유지하는 데 노력을 쓴다.

## 언어

- 사람이 읽는 문서·커밋 메시지·응답: **한국어**
- 코드·식별자·주석: 영어 (도메인 용어가 한국어일 때만 예외 — `energy`, `cognitive`,
  `emotional`, `physical` 처럼 영어로 자연스러우면 영어)
- 아래 정책 조항(`Commit Discipline`, `Subagent Delegation`, `Dynamic Workflows`,
  `Skill Routing`)은 **기계 검증되는 계약 텍스트라 영어로 유지한다.**

## 설계 취향 — 판정 기준

**[cmanki AGENTS.md](../cmanki/AGENTS.md)의 `설계 취향` 15항을 그대로 쓴다.**
같은 사람의 같은 취향이고, 여기서 다시 유도하거나 복사할 이유가 없다. **설계 판단을
내리기 전에 그 절을 읽을 것.** 원 출처는
[g15e 위키](https://wiki.g15e.com/pages/Wiki%20gardening%20rules.md)의 설계 철학이고,
정리본이 [cmanki 쪽 gather 기록](../cmanki/charness-artifacts/gather/2026-07-25-g15e-design-philosophy.md)에
있다. **재fetch 금지.**

이 리포에서 특히 자주 쓰이는 것 넷:

1. **1항 — 기능보다 가능성.** 기능 추가 제안에는 **"기존 수단의 조합으로 안 되는가?"를
   먼저 묻는다.** (예: 그래프의 한 점을 탭해 그날로 이동하는 건 이미 있는 날짜 이동
   기능의 조합이지 새 기능이 아니다.)
2. **2항 — 비직교성이 최악의 실패 모드다.** 새 수단을 만들 때마다 **기존 수단과의 경계를
   명시할 것.** (예: 점수는 라디오로만, 이유는 텍스트로만 편집된다.)
3. **9항 — 적을수록 좋다.** 의존성 하나를 넣기 전에 직접 짜면 몇 줄인지 세어본다.
   차트 라이브러리를 넣으려면 SVG로 직접 그리는 것보다 왜 나은지 대야 한다.
4. **15항 — 기록보다 인출.** 저널은 본질적으로 기록 도구라 이 항이 **가장 위험한
   자리**다. 저장 기능을 늘리는 제안에는 **"이건 어떻게 다시 읽히나?"를 붙여 묻는다.**
   인출 통로 없는 저장 기능은 설계 미완성이다.

## 설계 불변식 — 위반 제안은 거부할 것

1. **오프라인이 기본이다.** 로컬 저장소가 **작업 정본**이고 D1은 동기화 대상이다.
   네트워크 없이 앱이 완전히 동작해야 한다. "온라인일 때만 되는 기능"은 동기화 자체
   말고는 없어야 한다. (사용자 결정 2026-07-26)
2. **동기화는 사람이 누른다.** 상시 자동 동기화를 넣지 않는다 — cmanki `자동화 금지`
   2항("명령형 버튼만 허용")과 같은 형태다. 미동기화 상태를 **보이게** 하는 건 자동화가
   아니므로 허용된다.
3. **사용자가 쓴 글자를 잃지 않는다.** 동기화 충돌에서 진 쪽도 버리지 않고 `conflict`
   사본으로 남긴다. 파싱이 실패해도 원문은 그대로 둔다. **저널은 다시 못 쓴다.**
4. **앱에 LLM을 넣지 않는다.** 저널 작성은 그 자체가 목적인 행위다 — AI가 문장을
   대신 쓰거나 요약하면 과정의 가치가 지워진다 (cmanki 6항·15항). 회고 보조가 필요하면
   **export한 마크다운을 앱 밖에서** 쓴다.

넷 다 **하지 않는 것에 대한 금지**라 잘못 올려도 기능이 늘지 않는다. 불변식 4는
cmanki의 `AI 정책`에서 옮겨온 것이고, 저널에는 "AI가 질문한다" 예외도 아직 없다.

## 요청을 받는 방식 — 조합안 + 반대 의견

[cmanki AGENTS.md](../cmanki/AGENTS.md)의 `요청을 받는 방식` 절을 그대로 따른다. 요약:

1. **되묻지 않는다.** "정말 필요합니까?"는 에이전트가 판단할 수 있는 걸 미루는 것이다.
2. **조합안을 먼저 만들어 보여준다.** `설계 취향` 1항을 시도해 대안을 제시한다.
   안 되면 넣는다.
3. **그래도 넣기로 하면 반대 의견을 기록으로 남긴다.** "이게 틀릴 수 있는 지점"을
   한 문단. 틀린 판단이 기록으로 남아야 나중에 되짚을 수 있다.

**그리고 "이 모든 것은 과정이다."** 설계 결정을 되돌릴 수 있게 유지하는 것 자체가
원칙이다 — 늘렸다가 여차하면 줄인다.

## 사용자 데이터를 다룰 때

이 저널에는 가족·건강·회사 이야기가 들어 있다. **아주 사적인 데이터다.**

- **`references/sample.md`의 내용을 예시로 인용하거나 외부에 노출하지 않는다.**
  형식(H1/H2 구조, `- 인지: 7. ...`)은 인용해도 되지만 본문 문장은 안 된다.
- 로그·에러 리포트·커밋 메시지에 저널 본문이 새지 않게 한다.
- 테스트 픽스처는 **지어낸 문장**을 쓴다. 실제 기록을 복사하지 않는다.
- `.env`는 `~/stdy.blog/.env`에서 복사한 것이고 `.gitignore`에 있다. **열지 않는다.**

## 스택 — cmanki를 따른다

같은 사람의 같은 취향이므로 [cmanki](../cmanki)의 구성을 기본값으로 삼는다. 벗어나려면
근거를 대야 한다.

| 항목 | 선택 |
|---|---|
| 프레임워크 | Svelte 5 (룬) + Vite. SvelteKit 아님 — SPA 하나면 충분하다 |
| 언어 | **TypeScript로 옮기지 않는다.** `.js` + JSDoc + `jsconfig.json`의 `checkJs` |
| 포맷터 | **Prettier 안 씀.** 린터가 취향을 다투면 신호가 잡음에 묻힌다 |
| 린트 | eslint + eslint-plugin-svelte 권장 설정만 |
| 테스트 | `node --test src/lib/*.test.js`. 순수 함수(파서·조립·동기화 병합)에 집중 |
| 배포 | Cloudflare Workers + `wrangler deploy`, 정적 자산은 `assets` |
| 도메인 | **`journal.stdy.blog`** 커스텀 도메인. `workers_dev: false` |
| DB | D1. `~/stdy.blog`에 같은 계정 선례(`stdy-blog-db`)가 있다 |
| 의존성 | **최소.** cmanki는 런타임 의존성이 1개다 |

## 핵심 메모리 표면

| 표면 | 역할 |
|---|---|
| [docs/handoff.md](./docs/handoff.md) | **세션 시작 시 여기부터.** 픽업 트리거와 막힌 지점 |
| [docs/spec-first-slice.md](./docs/spec-first-slice.md) | **구현 정본.** 스키마·동기화 프로토콜·수용 기준 |
| [docs/roadmap.md](./docs/roadmap.md) | 우선순위와 순서. 결정을 재선언하지 않는다 |
| [docs/operator-acceptance.md](./docs/operator-acceptance.md) | 운영자 인수. **사람만 할 수 있는 수용 확인이 여기 있다** |
| [charness-artifacts/ideation/](./charness-artifacts/ideation/) | 결정·전제의 **정본**. 설계 얘기 전에 읽을 것 |
| [2026-07-26-concept-ideation.md](./charness-artifacts/ideation/2026-07-26-concept-ideation.md) | 현재 개념 모델과 결정 `D1`~`D20` |
| [references/sample.md](./references/sample.md) | **정본 형식의 단일 출처.** 파서·export 계약이 여기서 나온다 |
| [../cmanki/AGENTS.md](../cmanki/AGENTS.md) | 설계 취향 15항의 원본. **복사하지 말고 참조할 것** |

아이데이션 아티팩트의 결정이 대화에서 바뀌면 **아티팩트를 갱신**할 것. 모순된 버전을
쌓아두지 말고 낡은 부분을 다시 쓴다. 철회는 지우지 말고 **철회 표시**로 남긴다.

## Commit Discipline

- Commit meaningful implementation/workflow slices as they finish, so a long
  autonomous run does not leave the whole implementation uncommitted.
- Keep commits scoped.
- Do not report a task-completing goal as done while meaningful work remains
  uncommitted, unless the deferral is explicit.
- Meaningful changes under `charness-artifacts/` are **repo state** and commit
  targets. Current-pointer helpers should no-op when the **canonical content**
  has not changed.
- **Never commit journal content.** `references/sample.md` is the one exception
  already in the repo; do not add exported journal data, database dumps, or
  fixtures containing real entries.

## Subagent Delegation

`explicit user delegation request` — this repo uses bounded fresh-eye / critique
subagent review as a stop gate, and that bounded scope is **already delegated** by
this repo contract. Agents should not wait for a **second user message** asking for
delegation.

Scope: task-completing `setup`, `quality`, `critique`, `release`, and GitHub `issue`
resolution/closeout review runs.

When the **host blocks** subagent spawning, report that restriction explicitly
instead of substituting a **same-agent pass**.

Run reviewers **synchronously** (`run_in_background: false`). A background run
has delivered only the idle signal with the report body lost, and there is no
supported way to retrieve it afterward.

## Dynamic Workflows

Dynamic-workflow use (the Workflow tool) and multi-agent orchestration are
standing-approved when they genuinely earn their cost: fan-out coverage,
adversarial confidence, or scale one context cannot hold.

Appropriateness stays the agent's judgment. **Scale to the task** — this is an
n=1 personal journal app; attaching dozens of agents to it is almost always
overkill.

## Skill Routing

At session start, a pickup follows docs/handoff.md `## Workflow Trigger`; otherwise choose the durable workflow directly from installed skill metadata and model judgment. If hidden support/integration availability is unclear, run the read-only `charness catalog list --repo-root <repo> --summary` inventory. Treat its facts only as inventory; if the command returns nonzero, report the command failure. When a request names an external URL or source, use `gather` before deciding; validation closeout or operator-reading tests go through `quality`.

The SessionStart hook may inject this context when installed; this block is the fallback when it is absent.

## 마크다운 링크 규약

- 상대 링크는 `./` 또는 `../`로 시작한다. 링크 안의 맨 `foo.md`는 lint 실패다.
- 백틱은 개념 토큰·실행 가능한 명령·명시적 파일 링크에만 쓴다. 확장자가 있거나 추적
  경로와 일치하는 백틱 토큰은 인라인 코드로 두지 말고 마크다운 링크 안에 넣는다.
