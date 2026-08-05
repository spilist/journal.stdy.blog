# Recent Retro Lessons

## Current Focus

- 이번 단위는 4차 repo-wide 품질 검사와 온라인 복귀 동기화 수정이다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)

## Repeat Traps

- **낭비로 분류하지 않은 탐색**: 사용자가 unknown-unknown 전체 검사를 요청했으므로 넓은 스캔·counterweight는 exploration 단계의 의도된 비용이다. triage lock 뒤에는 online lifecycle 한 건만 fix-now로 남기고 의존성·브라우저 경계는 defer했다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)
- **불필요한 packet 생성**: adapter가 `packet_sections: []`라고 이미 말했는데 packet을 생성했다. 이번에는 adapter를 먼저 읽고 생략했다. 비용은 command/attention 재작업으로 관찰됐지만 정확한 token 비용은 unavailable이다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)
- **순서가 만드는 경계 재작업**: fingerprint snapshot과 packet 생성/리뷰 준비를 병렬화해 boundary drift를 만들었다. 이번에는 snapshot→spawn→wait→verify 순서를 지켰고, 다만 여러 reviewer 완료 뒤 한 번에 verify한 것은 남은 절차 개선점이다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)
- **파일 추적 전 gate**: 문서가 가리키는 새 산출물을 먼저 git 추적하지 않아 문서 gate가 한 번 실패했다. 이번 round는 artifact validation을 먼저 마치고 최종 gate 전에 status를 확인한다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)

## Next-Time Checklist

- adapter `packet_sections`·reviewer boundary 상태를 spawn 전에 확인하고, snapshot→spawn→각 결과 수령 후 verify를 고정한다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)
- Charness upstream #507에 custom adapter 보존과 empty-packet preflight를 후속한다. 이 리포 안에 숨은 bootstrap wrapper를 만들지 않는다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)
- [quality round 4](../quality/2026-08-05-quality-review-round-4.md)와 [handoff](../../docs/handoff.md)에 이번 lifecycle 계약과 deferred 경계를 남긴다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)
- 문서 링크가 새 파일을 가리키면 파일 생성·validator·git status를 gate보다 먼저 실행한다. (source: `charness-artifacts/retro/2026-08-05-session-retro.md`)

## Selection Policy

- Source: `charness-artifacts/retro/lesson-selection-index.json`
- Slots: current_focus=2, repeat_trap=4, next_improvement=4
- Policy: advisory recency half-life 45 days plus recurrence boost with adaptive alpha.

## Sources

- `charness-artifacts/retro/2026-08-05-session-retro.md`
