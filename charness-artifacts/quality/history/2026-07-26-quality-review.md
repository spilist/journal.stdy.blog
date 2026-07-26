# Quality Review
Date: 2026-07-26
Title: Quality Review

## Scope

Target boundary: 리포 전체의 품질 자세. 사용자 요청은 "돌려보고 린터 세팅" —
표준 게이트를 실행하고 린터 표면을 정리하는 것. 대상 스킬 없음(리포에 `skills/` 없음).

Ambient repo findings: S2(에너지 그래프)를 막 배포한 직후라 코드 쪽은 이미 프레시아이
리뷰 둘을 거쳤다. 이번 런은 **게이트 자체**를 본다.

## Current Gates

- `npm run gate` (신설) — `test` · `lint` · `check` · `build`를 `&&`로 잇는다.
  이전에는 네 명령이 흩어져 있어 문서 세 곳이 각각 나열했다.
- `npm test` — `node --test`, 70개(순수 함수 + 검사기 자체 테스트 10개).
- `npm run lint` — eslint(추적 `.js`/`.svelte` 26개 전부 커버) **+ 마크다운 링크 검사**(신설).
- `npm run check` — `svelte-check`(checkJs + JSDoc) + `tsc`(worker).
- `npm run build` — vite + 서비스워커 생성.
- CI 없음, 커밋 훅 없음 — **의도된 생략**이고 [roadmap](../../../docs/roadmap.md)
  `의도적으로 미룬 것`에 근거가 있다 (n=1 리포).

## Runtime Signals

- runtime source: `render_runtime_summary.py --repo-root . --detail`가
  `runtime source: not configured` · `commands_source: none` · `samples_total: 0`을
  냈다 — 구조화 타이밍이 없다. 아래 수치는 그래서 헬퍼가 아니라 이번 턴의 직접
  측정(`date +%s%N` 래핑)이고, 추세가 아니라 단발 표본이다. <!-- reproduction-source -->
- runtime hot spots: unavailable until structured runtime metrics have samples
  (`render_runtime_summary.py`가 낸 문장 그대로다). **구조화 소스를 만들지 않는다** —
  아래 `Recommended Next Quality Moves`의 근거 참조.
- 단발 표본 (추세 아님, 검증기가 요구하는 구조화 소스 없음): command: `date +%s%N`로
  감싼 직접 측정 — `gate` 12.7s / `check` 4.0s · `build` 2.0s · `lint` 1.1s · `test` 0.3s.
  가장 느린 `check`가 svelte-check + tsc 두 프로세스다. 다음 세션이 같은 방식으로
  다시 재면 비교는 된다.
- runtime visibility: `render_runtime_summary.py`가 `runtime_visibility_missing_budgets`와
  `runtime_visibility_missing_startup_probes`를 weak으로 보고했다. 둘 다 아래
  `Deferred`로 둔다 — 12.7초짜리 게이트에 예산과 기동 프로브를 세우는 게 측정 대상보다 비싸다.
- coverage gate: 없음. 커버리지 도구를 안 쓴다 — 순수 함수에만 테스트를 붙이는 게
  의도라(AGENTS.md `스택`) 바닥을 세우면 UI 코드를 테스트하라는 압력이 된다.
- evaluator depth: 결정론적 게이트 + 바운디드 프레시아이 리뷰 1회. Cautilus 미실행.

## Healthy

- **eslint 커버리지에 구멍이 없다.** 추적된 `.js`/`.svelte` 26개를 전부 본다
  (`npx eslint . --format json`으로 확인). `worker/`도 포함된다.
- **lint 억제가 0건이다.** `inventory_lint_ignores.py` 결과 `eslint-disable` 없음.
  린트 부채가 정규화되지 않았다.
- **중복 구현·문서 중복·구조적 낭비 전부 0건.** 세 인벤토리 모두 후보 없음.
- **게이트가 실제로 실패한다.** 새 마크다운 검사기에 일부러 깨진 링크를 넣어
  음성 확인을 했고, 커밋 안 된 파일을 가리키는 링크 2건을 실제로 잡아냈다.

## Weak

- **`gate`가 `&&` 사슬이라 첫 실패에서 멈춘다.** 리팩터 뒤에 eslint 위반과
  svelte-check 오류가 같이 나는 게 정상인데 전자만 보인다. `lint` 안에서도
  eslint와 문서 검사가 `&&`라 서로를 가린다. **도구가 아니라 문서로 처리했다** —
  AGENTS.md `게이트` 절에 "전체 상태가 필요하면 넷을 따로 부른다"를 적었다.
  실패해도 계속 도는 러너를 새로 만드는 건 9항 위반이다.
- **`gate`가 읽기 전용이 아니다.** `build`가 `dist/`에 쓴다. 무시 대상이라 무해하지만
  어댑터의 `gate_commands`가 이걸 부르므로 quality 런이 워크트리에 산출물을 남긴다.

## Missing

- **커밋 전 강제 채널이 없다.** `npm run gate`는 사람이나 에이전트가 불러야 돈다.
  Maintainer-Local Enforcement 처분: **명시적으로 문서화된 생략**이다 —
  cmanki `자동화 금지` 2항(명령형 버튼만 허용)과 roadmap의 `CI · 테스트 게이트 ·
  Prettier — n=1 리포다`가 근거다. 훅을 넣지 않는 것이 이 리포의 선택이다.
- **백틱 토큰 규약에 강제가 없다** — 그리고 앞으로도 두지 않는다. 아래 Advisory 참조.

## Deferred

- 구조화된 런타임 타이밍 로그 · 런타임 예산 · 기동 프로브 (헬퍼가 셋 다 weak으로
  보고했다). 게이트가 12초인 동안은 값이 없다. `check`가 30초를 넘기면 그때 세운다.
- `check`의 두 프로세스(svelte-check + tsc) 병렬화. 4초는 아직 아프지 않다.

## Advisory

- structural review result: 대상 스킬이 없어 `structural_review_packet`은 발행되지
  않았다 — command: `plan_quality_run.py --repo-root .` → `skills_in_scope: false`.
- **백틱 토큰 규약은 기계화하지 않는다.** command: 이번 턴의 1회용 스캔이 추적 `.md`
  전체에서 44건을 셌다. AGENTS.md가 "확장자가 있거나 추적 경로와
  일치하는 백틱 토큰은 링크로"라고 선언했는데, 실측 44건 중 대부분이 `.js`·
  `.gitignore`·규칙 자신을 설명하는 `foo.md`처럼 정당한 개념 토큰이다. 강제하면
  잡음이 신호를 덮는다 — 선언을 "판단으로 남긴다"로 강등하고 근거를 적었다.
- **`AGENTS.md`가 강제 없는 규칙을 "lint 실패다"라고 선언하고 있었다.**
  command: `cat package.json` → `lint`가 `eslint .` 뿐이었다. 문서와
  런타임의 드리프트였고, 이번에 검사기를 만들어 선언을 참으로 만들었다.
- **검사기 스스로가 게이트의 유일한 무검증 코드였다.** artifact: 위임 리뷰 §2.3.
  순수 부분을 `scanLinks`로 분리해 테스트 10개를 붙였다 — command:
  `node --test scripts/check-docs.test.js`. 참조 문법 우회·중첩 펜스·인라인 코드
  오탐이 그 테스트에 박혀 있다.
- **어댑터에서 `coverage_floor_policy`를 지우면 바닥이 없어지는 게 아니다** —
  command: `resolve_adapter.py --repo-root .`가 키 부재 상태에서 `fail_below_pct: 80.0`과
  존재하지 않는 `lefthook.yml`·CI 경로를 냈다. 리뷰어의 낮은-확신 지적이 맞았고,
  명시적으로 꺼 두는 값으로 고쳤다.

## Delegated Review

- Delegated Review: executed — 바운디드 프레시아이 리뷰 1회(읽기 전용). 새 검사기의
  거짓 음성 6종·거짓 양성 6종, 문서 과소/과대 주장 7건, 어댑터 잘라내기 손실 6건을
  냈다. 우선순위 상위 다섯(D1·D2·D3 문서, P2 리포-밖 링크, A1 이데이션 경로,
  N1 참조 문법, P1 인라인 코드)을 **전부 반영했다.** A2(커버리지 기본값)는 리뷰어가
  확신 낮음으로 표시했으나 실행 확인 결과 맞았다.
- Slow-gate lenses (fixture-economics, parallel-critical-path, duplicated-proof):
  재위임하지 않음 — 게이트 전체가 12.7초라 slow-gate 범위에 들어오지 않는다.

## Commands Run

- `plan_quality_run.py` · `resolve_adapter.py` · `bootstrap_adapter.py` · `resolve_quality_artifact.py`
- `inventory_lint_ignores.py` · `inventory_dual_implementation.py` ·
  `inventory_structural_waste.py` · `inventory_doc_duplicates.py` (모두 `--summary`)
- `npm test` · `npm run lint` · `npm run check` · `npm run build` · `npm run gate` (타이밍 측정 포함)
- `npx eslint . --format json` (파일 커버리지 확인)
- `node scripts/check-docs.mjs` (음성 확인: 일부러 깨진 링크 2건 주입 후 복원)
- `git ls-files .charness` (무시 추가 전 추적 없음 확인)

## Recommended Next Quality Moves

- active `check`의 실행 시간을 다음 세션에 한 번 더 잰다 — capability_needed=게이트가
  느려지는지 알기; next_center=`npm run check`; transformation=측정만, 장치 없음;
  proof_boundary=`date +%s%N` 직접 측정; enforcement_posture=advisory.
- passive 구조화 런타임 로그를 세우지 않는다 because 게이트가 12.7초이고 드리프트를
  추적할 장치가 측정 대상보다 비싸다 — `check`가 30초를 넘으면 재검토한다.
- passive 커밋 훅을 넣지 않는다 until 사용자가 게이트를 빠뜨려 실제로 깨진 커밋이
  나온다 — cmanki `자동화 금지` 2항이 명령형 버튼만 허용한다.
- passive `check-docs.mjs`에 규칙을 더 넣지 않는다 because 이 파일이 200줄로 자라면
  markdownlint를 안 쓴 근거(9항)가 사라진다 — 새 규칙 전에 그 선을 먼저 볼 것.

## History

- 이전 quality 리뷰 없음 — [이번 기록](./2026-07-26-quality-review.md)이 첫 항목이다.
