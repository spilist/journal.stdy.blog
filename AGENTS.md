# AGENTS

journal.stdy.blog에서 에이전트가 지켜야 할 운영 계약.

## 이 리포의 성격

개인용(n=1) 저널 앱. 사용자 한 명이 쓰고, 사용자 한 명이 읽는다. **멀티유저·공유·유료화·
바이럴 관련 제안은 이 리포에서 전부 범위 밖이다.** 첫 두 슬라이스(S1·S2)가
**배포돼 있다**(https://journal.stdy.blog) — 현재 상태와 순서는
[로드맵](./docs/roadmap.md)에 있다. 코드는 공개돼 있고, 외부 기여의 경계는
[CONTRIBUTING.md](./CONTRIBUTING.md)에 있다.

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

원 출처는 [g15e 위키](https://wiki.g15e.com/pages/Wiki%20gardening%20rules.md)의 설계
철학이고, 사용자가 아주 많이 영향을 받았다. 아래 15항은 그 철학을 판정에 바로 쓸 수 있는
형태로 압축한 것이다. 같은 사람의 같은 취향이라 다른 리포에도 같은 목록이 있지만,
**이 리포 안에서 읽을 수 있어야 하므로 여기 인라인으로 둔다** — 리포 밖을 가리키는 참조는
이 리포를 공개했을 때 통째로 끊긴다. **재fetch 금지.**

1. **기능보다 가능성.** 최소한의 기능으로 최대한의 가능성을 만든다. 방법은 **기능을
   직교적으로 만들고 조합 가능성을 높이는 것**이다.
2. **비직교성이 최악의 실패 모드다.** 같은 일을 하는 수단이 둘 이상 있으면 사용자를
   구렁텅이로 몬다 — 옵시디언에 폴더·태그·링크가 **동시에** 있는 게 그 예다.
3. **태그와 폴더를 만들지 않는다.** 태그는 자료가 늘면 "태그가 많지 않아야 한다"와
   "태그당 자료가 많지 않아야 한다"가 필연적으로 상충하고, 폴더는 배타적 분류를 강제한다.
4. **분류가 필요하면 기능을 늘리지 말고 조합한다.** 태그가 필요하면 **항목을 하나 만들고
   링크로 잇는다** — 역링크가 곧 태그 목록이다. 새 기능 0개로 태그의 가능성을 얻는 이
   패턴은 1·2항의 실천법이고, **"이 기능이 필요하다"는 제안마다 먼저 시도한다.**
5. **링크는 맥락 안에 있어야 한다.** 무맥락 "See also"가 나쁜 이유가 곧 라벨 없는 연결이
   나쁜 이유다 — 왜 이어졌는지가 연결 옆에 없으면 나중에 읽히지 않는다.
6. **과도한 자동화를 경계한다. 과정에 담긴 가치를 지킨다.** 도구는 자동으로 해버리는 대신
   **제안**한다 — 진단은 기계가, 결정은 사람이.
7. **외재화된 믿음.** 어떤 내용이 담겨 있는 이유는 **내가 의식적으로 검토하고 담기로
   결정했기 때문**이어야 한다. 기계가 대신 채워 넣은 것은 내 믿음이 아니다.
8. **잘 설계된 제약이 자유를 만든다.** 뭘 안 해야 하는지 알아야 나머지를 자유롭게 탐색할
   수 있다. **자유 입력이 더 자유로운 게 아니다.**
9. **적을수록 좋다.** 가능성이 같으면 기능이 적을수록 / 기능이 같으면 코드가 적을수록 /
   코드가 같으면 **절차적보다 선언적**일수록 좋다.
10. **결에 맞는 디자인.** 결을 맞추면 가벼워지고 거스르면 무거워진다. 기술 선택은
    "되는가"가 아니라 **"결에 맞는가"**로 묻는다.
11. **타협해야 하면 배우기 쉬움보다 사용하기 쉬움.** n=1에서는 더 그렇다 — 배우는 건 한
    번이고 쓰는 건 6개월이다.
12. **점진적으로 꾸준하게.** 완벽한 구조를 먼저 설계하고 채우는 전략도, 몰아서 하는
    대개조도 안 된다. **중복을 만들지 않는다** — 같은 문서를 v1/v2/v3로 복사하는 게
    전형적인 위반이다.
13. **정량화한다.** 목표는 셀 수 있는 지표로 두고 지표가 낡으면 진화시킨다. 단 **지표가
    판정 축을 대체하지 않게** 한다.
14. **카피캣도 취향이 필요하다.** 베낄 요소를 감별하지 못하면 개선한다며 개악한다. 남의
    도구를 참고할 때는 **무엇을 베끼고 무엇을 베끼지 않을지**를 같이 말해야 한다.
15. **기록보다 인출.** 기록되었으나 인출되지 않는 정보가 많은 건 나쁜 신호다. 쓰는 행위
    자체가 중요하지만(과정의 가치) 결국 인출이 되어야 의미가 있다.

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
2. **동기화는 사람이 누른다.** 상시 자동 동기화를 넣지 않는다 — **명령형 버튼만
   허용한다.** 미동기화 상태를 **보이게** 하는 건 자동화가 아니므로 허용된다.
3. **사용자가 쓴 글자를 잃지 않는다.** 동기화 충돌에서 진 쪽도 버리지 않고 `conflict`
   사본으로 남긴다. 파싱이 실패해도 원문은 그대로 둔다. **저널은 다시 못 쓴다.**
4. **앱에 LLM을 넣지 않는다.** 저널 작성은 그 자체가 목적인 행위다 — AI가 문장을
   대신 쓰거나 요약하면 과정의 가치가 지워진다 (`설계 취향` 6항·15항). 회고 보조가
   필요하면 **export한 마크다운을 앱 밖에서** 쓴다.

넷 다 **하지 않는 것에 대한 금지**라 잘못 올려도 기능이 늘지 않는다. 불변식 4는
같은 사람의 다른 리포에서 옮겨온 것이고, 저널에는 "AI가 질문한다" 예외도 아직 없다.

## 요청을 받는 방식 — 조합안 + 반대 의견

같은 사람의 다른 리포와 같은 방식이다. 셋이 전부다:

1. **되묻지 않는다.** "정말 필요합니까?"는 에이전트가 판단할 수 있는 걸 미루는 것이다.
2. **조합안을 먼저 만들어 보여준다.** `설계 취향` 1항을 시도해 대안을 제시한다.
   안 되면 넣는다.
3. **그래도 넣기로 하면 반대 의견을 기록으로 남긴다.** "이게 틀릴 수 있는 지점"을
   한 문단. 틀린 판단이 기록으로 남아야 나중에 되짚을 수 있다.

**그리고 "이 모든 것은 과정이다."** 설계 결정을 되돌릴 수 있게 유지하는 것 자체가
원칙이다 — 늘렸다가 여차하면 줄인다.

## 사용자 데이터를 다룰 때

이 저널에는 가족·건강·회사 이야기가 들어 있다. **아주 사적인 데이터다.** 그리고 이 리포는
**공개된다** — 여기 들어온 것은 되돌릴 수 없다고 보는 게 맞다.

- **실제 기록을 리포에 넣지 않는다.** 저널 본문, export한 마크다운, DB 덤프 전부.
- [references/sample.md](./references/sample.md)는 **지어낸 형식 예시다** (2026-08-03에
  실제 기록에서 교체했다). 형식 계약의 단일 출처이므로 **본문까지 자유롭게 인용해도 된다.**
  대신 **여기에 실제 기록을 다시 넣지 않는다** — 이 파일은 공개된다.
- 로그·에러 리포트·커밋 메시지·이슈에 저널 본문이 새지 않게 한다.
- 테스트 픽스처는 **지어낸 문장**을 쓴다.
- `.env`는 `~/stdy.blog/.env`에서 복사한 것이고 `.gitignore`에 있다. **열지 않는다.**

## 스택

같은 사람의 다른 리포와 같은 구성을 기본값으로 삼는다. 벗어나려면 근거를 대야 한다.

| 항목 | 선택 |
|---|---|
| 프레임워크 | Svelte 5 (룬) + Vite. SvelteKit 아님 — SPA 하나면 충분하다 |
| 언어 | **TypeScript로 옮기지 않는다.** `.js` + JSDoc + `jsconfig.json`의 `checkJs` |
| 포맷터 | **Prettier 안 씀.** 린터가 취향을 다투면 신호가 잡음에 묻힌다 |
| 린트 | eslint + eslint-plugin-svelte 권장 설정만. **`npm run lint`는 [마크다운 링크 검사](./scripts/check-docs.mjs)도 함께 돈다** |
| 테스트 | `npm test`. 순수 함수(파서·조립·동기화 병합·그래프)와 워커 경계를 Node 테스트로 검증한다 |
| 배포 | Cloudflare Workers + `wrangler deploy`, 정적 자산은 `assets` |
| 도메인 | **`journal.stdy.blog`** 커스텀 도메인. `workers_dev: false` |
| DB | D1. `~/stdy.blog`에 같은 계정 선례(`stdy-blog-db`)가 있다 |
| 의존성 | **최소.** 런타임 의존성은 **0개**이고 그 상태를 유지한다 |

## 핵심 메모리 표면

| 표면 | 역할 |
|---|---|
| [docs/handoff.md](./docs/handoff.md) | **세션 시작 시 여기부터.** 픽업 트리거와 막힌 지점 |
| [docs/spec-first-slice.md](./docs/spec-first-slice.md) | **구현 정본.** 스키마·동기화 프로토콜·수용 기준 |
| [docs/roadmap.md](./docs/roadmap.md) | 우선순위와 순서. 결정을 재선언하지 않는다 |
| [docs/operator-acceptance.md](./docs/operator-acceptance.md) | 운영자 인수. **사람만 할 수 있는 수용 확인이 여기 있다** |
| [charness-artifacts/ideation/](./charness-artifacts/ideation/) | 결정·전제의 **정본**. 설계 얘기 전에 읽을 것 |
| [2026-07-26-concept-ideation.md](./charness-artifacts/ideation/2026-07-26-concept-ideation.md) | 현재 개념 모델과 결정 `D1` 이후 전부. **범위를 여기 다시 적지 않는다** — 결정이 늘면 이 표가 먼저 낡는다 |
| [references/sample.md](./references/sample.md) | **정본 형식의 단일 출처.** 파서·export 계약이 여기서 나온다. 지어낸 예시다 |
| [CONTRIBUTING.md](./CONTRIBUTING.md) | 외부 기여의 경계. 무엇을 받고 무엇을 안 받는지 |

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
- **Never commit journal content.** No exported journal data, database dumps, or
  fixtures containing real entries. `references/sample.md` is a **fabricated**
  format example, not an exception to this rule.
- The GitHub remote (`origin`) is **being opened to the public** (decided
  2026-08-03; the flip happens after the history rewrite). Every commit is one
  `push` away from being world-readable and permanently indexable. Treat that as
  the reason the rule above is strict, not as a reason to relax it.

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

**강제된다 (`npm run lint` → [scripts/check-docs.mjs](./scripts/check-docs.mjs)):**

- 상대 링크는 `./` 또는 `../`로 시작한다. 링크 안의 맨 `foo.md`는 lint 실패다.
- 링크가 가리키는 파일이 실제로 있어야 한다.

**판단으로 남는다 (강제하지 않는다):**

- 백틱은 개념 토큰·실행 가능한 명령·명시적 파일 링크에만 쓴다. 확장자가 있거나 추적
  경로와 일치하는 백틱 토큰은 되도록 마크다운 링크 안에 넣는다.
  **기계화하지 않은 이유**: 실측 44건 중 대부분이 `.js`·`.gitignore`처럼 정당한 개념
  토큰이라, 강제하면 잡음이 신호를 덮는다 (2026-07-26 quality).

## 게이트

`npm run gate` 하나가 다섯을 순서대로 돈다 — `test` · `reach` · `lint` · `check` · `build`.
**훅으로 자동화하지 않는다** — 명령형 버튼만 허용한다. 커밋 전에
사람이나 에이전트가 부른다 (`Commit Discipline` 참조).

**`&&` 사슬이라 앞이 실패하면 뒤는 안 돈다.** 리팩터 뒤처럼 여러 게이트가 같이
깨졌을 법하면 넷을 따로 부른다. 실패해도 계속 도는 러너를 새로 만들지 않는다 (9항).

**워커 테스트는 타입 검사에서 빠져 있다** ([worker/jsconfig.json](./worker/jsconfig.json)의
`exclude`). 그 설정은 Workers 타입만 보는데 테스트는 Node에서 돌아 `node:test`·`Buffer`를
쓴다. 둘을 같이 넣으면 `@types/node`가 node_modules의 JS까지 끌고 와 검사가 리포 밖에서
터진다. **잃는 것은 그 파일들의 타입 검사뿐이고** eslint와 `npm test`는 그대로 본다.

**`reach`는 커버리지 퍼센트가 아니라 도달 가능성을 잰다** ([check-reach.mjs](./scripts/check-reach.mjs)).
테스트가 **로드조차 하지 않는** 프로덕션 파일 목록이 [기준선](./scripts/reach-baseline.txt)보다
늘면 실패하고, 줄었는데 기준선을 안 조여도 실패한다 — **줄어드는 방향으로만 움직인다.**

**줄 커버리지로 래칫을 걸지 않는 이유**: 2026-08-03 실측에서 Node 커버리지가 97.54%를
냈는데 그건 **테스트가 로드한 파일만** 센 값이었다. 프로덕션 4279줄 중 실제로 닿는 건
1113줄(26%)이었고 나머지는 리포트에 나오지도 않았다. 그 상태로 퍼센트를 고정했으면
74%가 안 보인다는 사실을 영영 못 봤다.

**강제 범위는 인라인 링크와 참조 정의까지다.** 코드 블록·인라인 코드·HTML 주석
안은 보지 않고, 리포 밖(`../...`)은 존재를 묻지 않는다. 존재 검사는
**git 추적 기준**이다 — 무시된 경로를 가리키는 링크는 로컬에서만 살아 있다.
