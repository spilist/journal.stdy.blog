# Recent Retro Lessons

## Current Focus

- 이번 단위는 4차 repo-wide 품질 검사와 온라인 복귀 동기화 수정이다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)
- 이번 단위는 5차 repo-wide 품질 검사, 충돌 사본 저장 경계 수정, push와 배포다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-5.md`)

## Repeat Traps

- **artifact validator 왕복**: quality 기록이 advisory evidence·executed status·slow-gate 렌즈를 한 번씩 보강한 뒤 통과했다. 검증 비용은 정직한 기록에 필요했지만, scaffold의 canonical field와 validator coupling을 먼저 체크했으면 재작성은 줄었다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-6.md`; sources: 2)
- **reviewer delivery timeout:** 첫 네 angle과 후속 repaired-surface probe를 동기 대기 후 전달받지 못했다. 결과가 없는 상태에서 wait를 반복하지 않고 close했어야 하며, 다음에는 one-shot probe를 먼저 보내 capability와 delivery를 조기에 판정한다. 이 비용의 정확한 token/tool 수치는 unavailable이다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-7.md`; sources: 2)
- **artifact-before-gate는 이번에 개선:** dated artifact를 먼저 만들고 validator·tracking을 끝낸 뒤 최종 gate를 부르는 순서를 유지한다. 넓은 inventory 자체는 사용자 의도였으므로 waste로 분류하지 않는다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-7.md`)
- **bootstrap 경고는 waste로 승격하지 않음**: `bootstrap_adapter.py --dry-run`이 재직렬화와 주석 손실을 경고했지만, upstream #507과 연결된 재현 가능한 위험이라 같은 명령을 반복하는 대신 실제 bootstrap을 하지 않았다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-6.md`)

## Next-Time Checklist

- adapter/delegation resolver를 먼저 읽고 full scope를 한 번 기록한 뒤, reviewer별 parent-owned snapshot과 즉시 verify를 사용한다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-6.md`)
- adapter `packet_sections`·reviewer boundary 상태를 spawn 전에 확인하고, snapshot→spawn→각 결과 수령 후 verify를 고정한다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)
- adapter/primer 다음에 `npm run check`와 최소 deterministic gate를 먼저 실행하고, 그 결과를 reviewer prompt에 고정한다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-5.md`)
- Charness #507 이후에만 bootstrap preservation과 zero-scope inventory handling을 재검토한다. 이 리포에 local wrapper는 만들지 않는다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-6.md`)

## Selection Policy

- Source: `charness-artifacts/retro/lesson-selection-index.json`
- Slots: current_focus=2, repeat_trap=4, next_improvement=4
- Policy: advisory recency half-life 45 days plus recurrence boost with adaptive alpha.

## Sources

- `charness-artifacts/retro/2026-08-05-session-retro-round-5.md`
- `charness-artifacts/retro/2026-08-05-session-retro-round-6.md`
- `charness-artifacts/retro/2026-08-05-session-retro-round-7.md`
- `charness-artifacts/retro/2026-08-05-session-retro.md`
