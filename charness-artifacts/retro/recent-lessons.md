# Recent Retro Lessons

## Current Focus

- 이번 단위는 4차 repo-wide 품질 검사와 온라인 복귀 동기화 수정이다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)
- 이번 단위는 5차 repo-wide 품질 검사, 충돌 사본 저장 경계 수정, push와 배포다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-5.md`)

## Repeat Traps

- **artifact-validator-repair:** round-5 품질 artifact와 critique를 만든 뒤 validator가 runtime prefix, passive 이유, enum 상태를 각각 잡았다. 이는 낭비라기보다 검증 가능한 기록을 만드는 verification 비용이지만, 다음에는 scaffold의 canonical field vocabulary를 먼저 읽어 한 번에 작성한다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-5.md`)
- **broad exploration은 waste로 분류하지 않음:** 사용자가 전체 품질과 unknown-unknown을 직접 요청했으므로 exploration은 의도됐다. triage lock에서 fix-now는 타입 오류와 conflict persistence였고, service-worker old tab·tombstone·dependency major·새 runner는 deferred, false positive는 없었다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-5.md`)
- **gate-baseline runtime:** measured `/usr/bin/time -p npm run gate` real 11.99s, Node test 1.60s, Vite build 0.89s. 현재 budget 초과나 느린 gate recurrence는 관찰되지 않아 제거·병렬 runner를 만들지 않았다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-5.md`)
- **gate-before-reviewer:** 탐색 후 fresh-eye를 먼저 기다리고 나서 `npm run check`를 실행했다. 이미 존재하던 `#loading` 타입 오류는 reviewer가 찾기 전에 값싼 check로 닫을 수 있었다. 비용은 reviewer attention의 재사용 가능한 일부였고 정확한 token/tool 비용은 unavailable이다. 다음에는 adapter/primer 직후 `check`와 최소 gate packet을 먼저 실행한다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-5.md`)

## Next-Time Checklist

- adapter `packet_sections`·reviewer boundary 상태를 spawn 전에 확인하고, snapshot→spawn→각 결과 수령 후 verify를 고정한다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)
- adapter/primer 다음에 `npm run check`와 최소 deterministic gate를 먼저 실행하고, 그 결과를 reviewer prompt에 고정한다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-5.md`)
- Charness upstream #507에 custom adapter 보존과 empty-packet preflight를 후속한다. 이 리포 안에 숨은 bootstrap wrapper를 만들지 않는다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)
- critique runner가 reviewer별 snapshot 경로와 application/delivery 상태를 자동으로 분리 기록하게 한다. 현재 host capability가 없으므로 이 리포에 wrapper를 만들지 않는다. (source: `charness-artifacts/retro/2026-08-05-session-retro-round-5.md`)

## Selection Policy

- Source: `charness-artifacts/retro/lesson-selection-index.json`
- Slots: current_focus=2, repeat_trap=4, next_improvement=4
- Policy: advisory recency half-life 45 days plus recurrence boost with adaptive alpha.

## Sources

- `charness-artifacts/retro/2026-08-05-session-retro-round-5.md`
- `charness-artifacts/retro/2026-08-05-session-retro.md`
