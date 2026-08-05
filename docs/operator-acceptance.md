# 운영자 인수

**배포됨 (2026-07-26) — https://journal.stdy.blog**

아래 1~3은 끝났다. 남은 건 §4 첫 사용과 §수용 확인이다. **AC-25~AC-27은 현재
작업 슬라이스가 배포됐으므로 이제 확인할 수 있다.**

## 1. D1 데이터베이스 — **완료 (2026-07-26)**

`journal-db` (`cf99f5c5-47ea-4286-a22d-cdee5d0a05d8`, APAC)를 만들고
[wrangler.jsonc](../wrangler.jsonc)에 넣었다. 원격 스키마도 올렸다 — 테이블 4개.

스키마를 다시 밀어야 하면 `npm run db:schema`(원격). `worker/schema.sql`은 전부
`IF NOT EXISTS`라 재실행이 안전하다.

> **로컬 개발에는 API가 없다.** `npm run dev`는 vite만 띄우므로 `/api/*`가 SPA
> fallback HTML을 받고 앱이 "다시 로그인" 상태로 간다. **UI 작업용이고 동기화는
> 배포본에서 확인한다** — 그래서 로컬 D1 스크립트를 두지 않았다.

## 2. Cloudflare Access — **완료 (2026-07-26)**

기존 앱 `routine-stdy-blog`에 **destination을 하나 더 붙이는 방식**으로 처리했다 —
앱 하나가 `routine.stdy.blog`와 `journal.stdy.blog`를 둘 다 막고 **AUD를 공유**한다.
정책과 세션이 두 도메인에 똑같이 걸리지만, 허용 이메일 하나짜리 n=1 앱에서는 문제가 없다.

| 값 | |
|---|---|
| 팀 도메인 | `stdy.cloudflareaccess.com` |
| AUD | `eaf8386b…` ([wrangler.jsonc](../wrangler.jsonc)에 들어 있다) |
| 세션 | `730h` ≈ 1개월 (`D9`) |
| 허용 이메일 | **Worker 시크릿 `ALLOWED_EMAIL`.** 리포에 없다 — 아래 `## 3` 참조 |

새로 만들어야 할 때의 절차는 아래에 남겨 둔다 —
Zero Trust → Access → Applications → **Add an application** → *Self-hosted*

| 항목 | 값 |
|---|---|
| Application domain | `journal.stdy.blog` |
| Session Duration | **1 month** (`D9`) |
| 정책 | Action `Allow` · Include → **Emails** → `bae.hwidong@gmail.com` |
| 로그인 방법 | **One-time PIN**이 기본으로 켜져 있다. IdP를 붙일 필요가 없다 |

만들고 나면 **Application Audience (AUD) Tag**가 나온다. 그걸
[wrangler.jsonc](../wrangler.jsonc)의 `ACCESS_AUD`에, 팀 도메인
(`<team>.cloudflareaccess.com`)을 `ACCESS_TEAM_DOMAIN`에 넣는다.
**허용 이메일은 거기 넣지 않는다** — 시크릿으로 주입한다 (`## 3`).

> **CLI로는 못 가져온다.** `.env`의 토큰에 Zero Trust 읽기 권한이 없어
> `GET /accounts/{id}/access/apps`가 `Authentication error`를 준다. 대시보드에서
> 복사하거나, 토큰에 `Access: Apps and Policies — Read`를 추가하면 자동으로 채울 수 있다.
> **AUD는 비밀이 아니다** — 검증할 대상을 지정하는 식별자라 리포에 두어도 된다.

> **Access만으로는 부족하다.** Access는 커스텀 도메인 앞만 막으므로 Worker가
> `Cf-Access-Jwt-Assertion`을 직접 검증한다 ([worker/access.js](../worker/access.js)).
> `workers_dev: false`와 함께 두 겹이다.

## 3. 배포 — **완료 (2026-07-26). S2도 배포됨 (같은 날)**

```bash
npm run deploy
wrangler secret put ALLOWED_EMAIL   # 최초 1회
```

**`wrangler deploy`는 시크릿을 주입하지 않는다.** `vars`와 달리 계정에 한 번 올려두는
값이다. 없으면 Worker가 허용 목록을 모르므로 **모든 요청이 401**이 되고, 앱에서는
「로그인이 만료됐습니다」로만 보인다 ([worker/access.js](../worker/access.js)의
`no-allowlist` 가드).

**순서가 위와 같은 이유 (2026-08-03에 실제로 부딪혔다):** `ALLOWED_EMAIL`이 한때
`vars`에 있었으므로, 배포된 Worker에 같은 이름의 var 바인딩이 남아 있다. 그 상태에서
`secret put`을 먼저 부르면 **`Binding name 'ALLOWED_EMAIL' already in use` (code 10053)**
로 거절된다. `vars`에서 뺀 판을 **먼저 배포해야** 이름이 비고, 그 다음 시크릿이 들어간다.
그 사이 수 초간 동기화가 401이다 — 로컬 편집은 영향받지 않는다(불변식 1).

**새 계정·새 Worker라면 순서는 상관없다.** 위 함정은 var → secret 마이그레이션에만 있다.

값은 Access 정책의 Include에 넣은 것과 **같은 이메일**이다. 계정을 옮기거나 Worker를
다시 만들면 이 명령을 다시 부른다.

`.env`의 `CLOUDFLARE_API_TOKEN`·`CLOUDFLARE_ACCOUNT_ID`를 쓴다
(`~/stdy.blog/.env`에서 복사했고 `.gitignore`에 있다).

`journal.stdy.blog` DNS 레코드는 `wrangler`가 커스텀 도메인으로 붙인다.
`stdy.blog` 존이 이미 같은 계정에 있으므로 추가 설정은 없다.

## 4. 첫 사용 — 마지막 복붙

1. 폰에서 `https://journal.stdy.blog`를 열고 **홈 화면에 추가**한다
   (PWA로 열어야 저장소가 evict되지 않는다 — `D17`)
2. 「가져오기」에 기존 저널 마크다운을 붙여넣는다
3. **미리보기에서 "해석하지 못한 줄"이 0인지 확인한다.** 0이 아니면 그 줄이
   저장되지 않으므로 형식을 고치거나 따로 옮긴다
4. 저장한 뒤 **「↑ 올리기」를 누른다** — 여기까지 해야 D1에 올라간다.
   **큰 저널이면 한 번에 안 끝날 수 있다** — 클라이언트가 200개씩 쪼개 보내고 묶음마다
   저장하므로, 도중에 끊겨도 앞 묶음은 남는다. 「올리기」를 다시 누르면 남은 것만 간다.
   숫자가 0이 될 때까지 누른다

## 수용 확인 (사람이 하는 것)

[구현 계약](./spec-first-slice.md)의 `AC-10`~`AC-12`, 그리고 S2의 `AC-19`·`AC-23`이다.
**ID는 구현 계약과 같은 네임스페이스다** — 여기서 새 번호를 붙이면 그쪽 표에도 등재한다.
`npm run lint`가 중복 선언을 잡는다.

- ~~**AC-10** 비행기 모드로 폰에서 열고 쓰고 앱을 껐다 켠다 → 남아 있고
  「↑ 올리기」 옆 숫자가 보인다~~ **확인 완료 (2026-07-26, 사용자)**
- ~~**AC-11** 폰과 데스크톱에서 같은 블록을 고치고 둘 다 「올리기」 →
  진 쪽이 `⚠ 충돌 사본`으로 접혀 보인다~~ **확인 완료 (2026-07-26, 사용자)**
- **AC-12** `references/sample.md`를 가져온 뒤 「전체 내려받기」 →
  원본과 같다 (**파일 끝 개행 개수만 다르다**). **S1과 같은 절차다** — S2에서 잠깐
  범위가 붙었다가 철회됐으므로, 그래프를 열 필요가 없다
- **AC-19** 에너지 헤더의 「그래프」를 열고, 폰에서 기본 창(**4주**) 그래프의 점을
  짚어본다 → 한 칸이 약 12px이다. 오터치가 나거나 세로 스크롤과 싸우면 `P-6`에 적고
  창 기본값을 2주로 내린다

- **AC-23** (신설 2026-08-03) 먼저 데스크톱에서 어떤 블록을 고쳐 「올리기」한다.
  그 뒤 폰을 **비행기 모드**로 두고 **같은 블록**을 고친다 → 폰을 온라인으로 돌리고
  「올리기」 (폰의 편집 시각이 더 나중이어야 한다) → **데스크톱에서 쓴 판본이 폰에
  `⚠ 충돌 사본`으로 남는가.** `SC-6`의 **applied 방향**이고, `AC-11`이 2026-07-26에
  확인한 것은 거절 방향뿐이다 — 이쪽은 사람이 돌려본 적이 없다

- **AC-26** 날짜를 바꾸거나 그래프의 날짜를 선택한다 → 주소에 `?date=YYYY-MM-DD`가
  반영되는가. 새로고침해도 같은 날짜가 열리고, 브라우저 뒤로/앞으로가 날짜 이동처럼
  동작하는가
- **AC-27** 먼저 고정 노트 본문을 A에서 B로 한 번 바꿔 저장해 revision을 만든다. 고정
  노트를 열고 우상단 **「변경 내역」**을 누른다 → 본문 대신 읽기 전용
  diff가 보이는가. **「본문」**으로 돌아갈 수 있고, 버튼·날짜 이동·복사에
  마우스를 올리거나 키보드 포커스를 두었을 때 무엇을 하는지 알 수 있는가. 동기화
  시각에는 마우스를 올리거나 스크린리더로 읽을 때 초까지 정확한 KST 시각이 나오는가
- **AC-25** 현재 날짜를 8월로 맞추고 **「8월 복사」**를 누른다 → 클립보드에 고정
  노트가 맨 위에 한 번 나오고 8월 기록만 포함되는가. 7월 기록·변경 내역·그래프 창의
  범위가 섞이지 않는가

- **UI-1** `references/sample.md` 형식을 참고해 지어낸 긴 한국어·영문 이유를 넣고
  320px 폭과 200% 확대에서 오늘 기록·점수·이유를 keyboard로 입력하고 다시 읽는다 →
  수평 스크롤 없이 focus와 전문이 살아 있는가
- **UI-2** 서비스워커가 설치·활성화된 뒤 한 번 재로드하고 오프라인으로 바꾼다 →
  날짜 이동·그래프·export가 살아 있는가. `prefers-reduced-motion`에서 가져오기를 열어
  패널이 smooth 이동하지 않고, 그래프 버튼의 조작면이 손가락으로 누르기 충분한가
- **UI-3** 점수 있음·없음과 긴 이유가 있는 지어낸 여러 날짜를 준비한다 → 그래프를
  keyboard로 `Tab → ArrowLeft/Right → Enter`, touch로 선택·재선택해 날짜로 이동하고,
  선택 요약에서 이유 전문이 색이나 hover 없이 읽히는가

**폰은 PWA 캐시가 있어 새 판이 바로 안 뜰 수 있다.** 홈 화면 아이콘으로 연 뒤에도
그래프가 없으면, 앱을 완전히 닫았다 다시 열거나 브라우저에서 한 번 새로고침한다.

## 아직 없는 것

**주·월 회고 화면.** 그래프를 실제로 써본 뒤 판단하기로 했다 — 이제 써볼 수 있다.
