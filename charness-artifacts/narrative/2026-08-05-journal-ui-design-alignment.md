# Narrative alignment — journal.stdy.blog UI design

Date: 2026-08-05

## Source

- canonical source: `https://wiki.g15e.com/pages/Declarative%20design%20and%20design%20runtime.md`
- canonical source: `https://wiki.g15e.com/pages/AOP%20and%20CSS.md`
- canonical source: `https://wiki.g15e.com/pages/Design%20in%20the%20AI%20era.md`
- gathered: [`charness-artifacts/gather/2026-08-05-g15e-design-sources.md`](../gather/2026-08-05-g15e-design-sources.md)
- access: sibling durable asset reuse after destination public fetch returned login-wall
- freshness: 2026-08-05 sibling capture

## Narrative drift

이 리포는 이미 오프라인 우선·수동 동기화·글자 보존·앱 내 LLM 금지·기능보다 가능성이라는
강한 계약을 갖고 있었다. 다만 UI 판단은 컴포넌트별 CSS와 수용 기준에 흩어져 있어,
화면 폭·입력 장치·글자 크기·동기화 상태가 동시에 변할 때 무엇을 보장해야 하는지가
암묵적이었다.

세 원문과 직접 연관 문서는 그 빈 곳에 다음 모델을 더한다.

```text
design outcome = f(design intent, user preference, context)
```

그리고 CSS의 교차 관심사 간섭을 별도 버그가 아니라 범위와 weaving을 검토해야 하는
설계 신호로 본다. 이 모델은 새 런타임 도입이 아니라 현재 Svelte·CSS·검사·브라우저
수용을 같은 증거 루프로 묶는 계약이다.

## Capability claim

이 앱의 UI는 새 기능을 많이 제공하는 것이 아니라, 사용자가 복붙 없이 바로 쓰고,
쓴 에너지 점수와 이유를 나중에 다시 읽게 해야 한다. 모든 UI 제안은 이 두 capability에
닿아야 하며, 그렇지 않으면 기존 요소의 조합으로 가능한지 먼저 판단한다.

## Updated truth

- [`docs/design-principles.md`](../../docs/design-principles.md)가 외부 디자인 논의를
  저널의 불변식과 결합한 파생 UI 해석이다. `AGENTS.md`·아이데이션·구현 계약보다
  높은 권위를 갖지 않는다.
- [`docs/ui-improvement-plan.md`](../../docs/ui-improvement-plan.md)가 두 outcome →
  선택된 증거 → 오늘 기록/에너지/재방문 → 인출 → 맥락 실패 → 조건부 CSS 순서로 작업을 배열한다.
- 원문은 gather 자산에 그대로 남기고, 파생 문서는 위키 문서인 것처럼 가장하지 않는다.

## Claim audit

| 주장 | 근거 | 상태 |
| --- | --- | --- |
| 로컬이 작업 정본이다 | AGENTS.md, `spec-first-slice.md` | 보존 |
| 수동 push와 자동 pull의 경계가 필요하다 | AGENTS.md, `spec-first-slice.md` | 보존 |
| UI는 의도·선호·맥락의 함수다 | `docs/design-principles.md` | 파생 UI 해석으로 정리 |
| 새 디자인 런타임 프레임워크가 첫 단계다 | 근거 없음 | 명시적으로 거부 |
| AI가 저널 내용을 생성한다 | AGENTS.md 불변식과 충돌 | 범위 밖 |
| dark mode 전면 개편이 지금의 우선순위다 | 근거 없음 | 보류 |

## Carry-forward

- 보존: 단일 화면, 적은 기능, 로컬 우선, 수동 동기화, 충돌 사본 보존, 현재의 차분한
  기록 표면, 점수와 이유의 함께 읽힘.
- 도전: 고정 geometry, implicit context assumptions, 넓은 CSS override, 색만으로 상태를
  전달하는 표현, 코드 존재만으로 UI 품질을 주장하는 관행.
- 보류: 새 taxonomy, 앱 내 LLM, 대형 디자인 시스템, 새 차트 의존성, 상시 자동 동기화.
- 참고 전용: sibling blog의 `public: true`·garden·SRS·POSSE 문맥은 원문 자산으로만
  보존하고 이 저널의 제품 결정으로 채택하지 않는다.

## Open questions

- 한국어와 영문 기록에서 본문 measure를 어느 값으로 고정할지는 실제 화면에서 비교한다.
- forced colors와 200% 확대에서 현재 energy strip·graph·conflict banner의 의미가
  유지되는지 사람 수용이 필요하다.
- 두 탭·두 기기의 실제 동기화 상태는 단위 테스트가 대신하지 못한다.
- 서비스워커 warm-cache에서 오프라인 기록·그래프·export가 살아 있는지 확인한다. 최초
  cold offline과 no-JS fallback은 이 계획의 대상이 아니다.

## Next step

UI-1~3 증거를 먼저 고정하고, 오늘 기록 → 에너지 점수/이유 → 재방문 흐름을 작은
slice로 구현한다. CSS는 그 흐름을 막는 경우에만 바꾸고, 기존 `npm run gate`와 사람의
배포 브라우저 수용으로 닫는다.
