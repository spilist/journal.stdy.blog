# Recent Retro Lessons

## Current Focus

- 이번 단위는 4차 repo-wide 품질 검사와 온라인 복귀 동기화 수정이다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)
- 이번 단위는 5차 repo-wide 품질 검사, 충돌 사본 저장 경계 수정, push와 배포다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-5.md`)

## Repeat Traps

- **artifact validator 왕복**: quality 기록이 advisory evidence·executed status·slow-gate 렌즈를 한 번씩 보강한 뒤 통과했다. 검증 비용은 정직한 기록에 필요했지만, scaffold의 canonical field와 validator coupling을 먼저 체크했으면 재작성은 줄었다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-6.md`; sources: 2)
- **bootstrap 경고는 waste로 승격하지 않음**: `bootstrap_adapter.py --dry-run`이 재직렬화와 주석 손실을 경고했지만, upstream #507과 연결된 재현 가능한 위험이라 같은 명령을 반복하는 대신 실제 bootstrap을 하지 않았다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-6.md`)
- **broad exploration은 waste로 분류하지 않음:** 사용자가 전체 품질과 unknown-unknown을 직접 요청했으므로 exploration은 의도됐다. triage lock에서 fix-now는 타입 오류와 conflict persistence였고, service-worker old tab·tombstone·dependency major·새 runner는 deferred, false positive는 없었다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-5.md`)
- **gate-baseline runtime:** measured `/usr/bin/time -p npm run gate` real 11.99s, Node test 1.60s, Vite build 0.89s. 현재 budget 초과나 느린 gate recurrence는 관찰되지 않아 제거·병렬 runner를 만들지 않았다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-5.md`)

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
- `charness-artifacts/retro/2026-08-05-session-retro.md`
