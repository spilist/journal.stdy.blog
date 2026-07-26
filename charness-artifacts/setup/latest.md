# Setup — 운영 표면 정규화

Date: 2026-07-26
Repo mode: NORMALIZE (진입 시 PARTIAL / targeted_missing_surface)

## 무엇을 했나

진입 시 `inspect_repo.py`가 셋을 짚었다: **`docs/roadmap.md` 없음**,
**AGENTS.md의 charness-artifacts 커밋 정책 문구 누락**, **critique 어댑터 없음**.
앞의 둘은 고쳤고 셋째는 호스트에 맞게 새로 썼다.

| 표면 | 결과 |
|---|---|
| README.md | realigned — 문서 표에 로드맵 추가, 현재 상태에서 로드맵으로 연결 |
| AGENTS.md | realigned — (1) "아직 코드가 없고 아이데이션 단계다"가 거짓이 됐다 (2) 메모리 표면 표에 `docs/` 넷 추가 (3) current-pointer no-op 문구 추가 |
| CLAUDE.md | already-aligned — `AGENTS.md` 심볼릭 링크. `normalize_host_docs.py`가 `keep_claude_symlink` 판정 |
| docs/roadmap.md | scaffolded — 없던 표면 |
| docs/operator-acceptance.md | already-aligned |
| .agents/critique-adapter.yaml | scaffolded — 기본 스켈레톤이 Codex 모델을 가리켜 Claude Code 호스트에 맞게 교체 |

## 왜 그렇게 했나

- **로드맵은 결정을 재선언하지 않는다.** 결정의 단일 출처는 아이데이션 `D1`~`D20`,
  구현 계약의 단일 출처는 [스펙](../../docs/spec-first-slice.md)이다. 로드맵이 상태를
  다시 나열하면 곧 어긋난다 — cmanki 로드맵이 같은 실수를 한 적이 있어 명시로 막았다.
- **critique 어댑터를 기본값 그대로 두지 않았다.** 스켈레톤이
  `model: gpt-5.6-terra`를 가리키는데 이 리포는 Claude Code에서 돈다. 그대로 뒀으면
  리뷰어 티어가 무의미해진다.
- **`setup` 어댑터는 만들지 않았다** (advisory). 표면 경로가 전부 기본값과 같아서
  기본값을 다시 적는 파일만 생긴다 — cmanki 9항.
- **죽은 export 셋을 지웠다** (`recordsByPrefix` · `getRecord` · `blankDay` 재export).
  소스가 12파일이라 `knip`을 붙이기 전에 눈으로 세는 게 빠르다. 도구는 트리가
  커지면 그때 붙인다.

## 게이트

`npm test` 35 · `npm run lint` 0 · `npm run check` 0 (svelte-check + worker tsc) ·
`npm run build` 성공. 죽은 export 제거 후 재실행한 결과다.

## 큐에 남긴 권고

- `setup_adapter_missing` (advisory) — 표면 경로를 바꿀 일이 생기면 그때
  `.agents/setup-adapter.yaml`을 만든다. 지금은 기본값과 동일해 값이 없다.

## 증명하지 않은 것

- **바운디드 프레시아이 리뷰어를 못 돌렸다.** 이 세션 호스트가 서브에이전트 생성을
  막는다 (`Do not call the AgentTool unless the user requested it`). AGENTS.md
  `Subagent Delegation`이 요구하는 대로 **같은 에이전트의 재검토로 대체하지 않고**
  제약을 그대로 남긴다. 호스트 정책 · 어댑터 적합성 · 운영자 인수 흐름 세 렌즈가
  미검증이다.
- ~~**배포 경로는 여전히 미검증이다** — `.env` 토큰의 D1 권한 문제와 Access 설정이
  남아 있다.~~ **해소됨 (같은 날 이후).** 토큰 권한이 추가되고 배포까지 끝났다 —
  https://journal.stdy.blog. 현재 상태는 [handoff.md](../../docs/handoff.md)를 볼 것.
- ~~바운디드 프레시아이 리뷰어를 못 돌렸다~~ **해소됨** — 사용자가 명시적으로 요청해
  동기 실행으로 넷을 돌렸고 지적을 반영했다.
