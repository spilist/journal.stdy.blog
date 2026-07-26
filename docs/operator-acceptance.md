# 운영자 인수

**배포됨 (2026-07-26) — https://journal.stdy.blog**

아래 1~3은 끝났다. 남은 건 §4 첫 사용과 §수용 확인이다.

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

> **CLI로는 못 가져온다.** `.env`의 토큰에 Zero Trust 읽기 권한이 없어
> `GET /accounts/{id}/access/apps`가 `Authentication error`를 준다. 대시보드에서
> 복사하거나, 토큰에 `Access: Apps and Policies — Read`를 추가하면 자동으로 채울 수 있다.
> **AUD는 비밀이 아니다** — 검증할 대상을 지정하는 식별자라 리포에 두어도 된다.

> **Access만으로는 부족하다.** Access는 커스텀 도메인 앞만 막으므로 Worker가
> `Cf-Access-Jwt-Assertion`을 직접 검증한다 ([worker/access.js](../worker/access.js)).
> `workers_dev: false`와 함께 두 겹이다.

## 3. 배포 — **완료 (2026-07-26)**

```bash
npm run deploy
```

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
4. 저장한 뒤 **「↑ 올리기」를 누른다** — 여기까지 해야 D1에 올라간다

## 수용 확인 (사람이 하는 것)

[구현 계약](./spec-first-slice.md)의 `AC-10`~`AC-12`, 그리고 S2의 `AC-19`다.

- **AC-10** 비행기 모드로 폰에서 열고 쓰고 앱을 껐다 켠다 → 남아 있고
  「↑ 올리기」 옆 숫자가 보인다
- **AC-11** 폰과 데스크톱에서 같은 블록을 고치고 둘 다 「올리기」 →
  진 쪽이 `⚠ 충돌 사본`으로 접혀 보인다
- **AC-12** `references/sample.md`를 가져온 뒤 **그래프에서 「전체」를 먼저 누르고**
  내려받기 → 원본과 같다 (**파일 끝 개행 개수만 다르다**).
  **S2에서 바뀐 자리다** — 내려받기 범위가 그래프 창이라 기본값이 최근 30일이다.
  버튼 라벨이 「전체 N일 내려받기」로 바뀐 걸 확인하고 누를 것
- **AC-19** 폰에서 30일 그래프의 점을 짚어본다 → 한 칸이 약 11px이다.
  오터치가 나거나 세로 스크롤과 싸우면 `P-6`에 적고 창 기본값을 14일로 내린다

## 아직 없는 것

**주·월 회고 화면.** 그래프를 실제로 써본 뒤 판단하기로 했다 — 이제 써볼 수 있다.
