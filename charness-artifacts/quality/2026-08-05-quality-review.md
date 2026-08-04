# Quality Review
Date: 2026-08-05
Title: 전체 품질 점검 — 데이터 보존·동시성·오프라인 경계

## Scope

Target boundary: repo-wide quality review covering latent bugs, repeated patterns, test speed,
duplicate structure, unnecessary bootstrap, and offline/sync data preservation.

Ambient repo finding: `bootstrap_adapter.py` rewrote the existing customized
`.agents/quality-adapter.yaml`; the file was restored exactly and Charness issue #507 was filed.

## Current Gates

- `npm run gate`: 174 tests passed; reach 22 production files / 11 reached; lint and 21-file
  document check passed; svelte-check had 0 warnings/errors; worker TypeScript check passed;
  Vite built 130 modules and generated 5 assets (JS gzip 35.71 kB).
- `npm audit --omit=optional --audit-level=high`: 0 vulnerabilities.
- Focused regression runs passed for merge/state/SW paths; `git diff --check` passed.

## Runtime Signals

- runtime source: command:`/usr/bin/time` one-turn samples were test 1.71s, lint 1.48s,
  check 3.76s, build 1.96s; final gate emitted Node test 1.537s and Vite build 0.913s.
  Structured timing capture, startup probe, and budget are missing.
- runtime hot spots: unavailable until structured runtime metrics have samples
  (`render_runtime_summary.py`); the observed one-turn samples do not justify a slow-gate or
  test removal.
- coverage gate: reach passed at 11/22; this repo intentionally has no line-coverage floor.
- evaluator depth: deterministic gates plus one bounded delegated read-only review; no Cautilus
  or browser acceptance run.

## Healthy

- Unknown imported energy dimensions now survive export; load-time input, same-millisecond tab
  races, keyboard score bounds, Access redirects, metadata errors, and persistence rejection
  handling have regression coverage.
- Structural-waste, duplicate-discovery, lint-ignore, hardcoded-discovery, and doc-duplicate
  inventories found no candidates; runtime dependencies remain zero.
- The service-worker test executes generated code, and the state harness uses compiled client
  runes with structured-clone behavior.

## Weak

- Browser/IndexedDB/SW UI seams remain mostly untested; the handoff explicitly leaves these to
  human acceptance. Reach is a reachability ratchet, not behavioral coverage.
- Runtime visibility has no repeated structured samples or budgets (`render_runtime_summary.py`).
- CI/local parity evaluated zero workflows, so it establishes no CI health. Test isolation is
  `node_test_isolation_unknown`; the nose-clone inventory returned an advisory error.

## Missing

- Human acceptance remains for AC-12, AC-19, AC-23, AC-25, AC-26, and AC-27, plus the large
  D1 push and two-tab behavior. These require the authenticated deployed app.
- Maintainer-local enforcement is missing by explicit repo contract: hooks and automatic gate
  execution are forbidden; `npm run gate` remains a manual command.

## Deferred

- JWKS key-rotation retry, IndexedDB `versionchange`/`blocked`, and real-browser persistence
  denial behavior remain deferred because they need deployed/browser evidence and no current
  user-visible failure was reproduced.
- Structured timing capture remains passive because current gates are fast and show no trend;
  adding a new runner would add bootstrap without a measured need.

## Advisory

- structural review result: `inventory_structural_waste.py`, `inventory_doc_duplicates.py`, and
  `inventory_lint_ignores.py` found no candidates; `skills_in_scope:false`, so no skill-ergonomics
  review was dispatched.
- prose review result: command:`npm run lint` passed and `inventory_doc_duplicates.py` found 0
  candidates; no source-guard rows were reported.
- Adapter bootstrap is an upstream quality issue, not a local adapter change: artifact:`#507` at
  `corca-ai/charness#507` records the overwrite and intended-absence regression.

## Delegated Review

- Delegated Review: executed through the bounded subagent channel; its returned report explicitly
  said it could not perform a true fresh-eye run because its fork lacked explorer/spawn and Ceal
  subagent capability. It reported five confirmed risks; all five were either fixed and tested
  in this slice or had already been fixed in the worktree. Three browser/external-state items
  were deferred above. No same-agent pass is claimed as fresh-eye evidence.
- Slow-gate lenses (fixture-economics, parallel-critical-path, duplicated-proof): not re-delegated
  because the measured gate and test suite are fast and no duplication hotspot was found.

## Commands Run

- Quality planner/bootstrap/scaffold, quality inventories, runtime summary, and `npm audit`.
- Focused merge/state/SW tests, `npm run lint`, `npm run check`, `git diff --check`.
- Final `npm run gate`; issue plan/create/readback for Charness #507.

## Recommended Next Quality Moves

- active human acceptance — capability_needed=authenticated deployed browser and two devices;
  next_center=`docs/operator-acceptance.md`; transformation=run AC-12/19/23/25/26/27 and the
  large D1 push; proof_boundary=human observation on the deployed app; enforcement_posture=NON_AUTOMATABLE/advisory.
- passive structured runtime timing because current gates are fast and lack a regression trend —
  capability_needed=repo-owned timing capture; next_center=`charness-artifacts/quality/`;
  transformation=record repeated phase samples only when a budget is needed; proof_boundary=several
  future gate runs; enforcement_posture=advisory/no new gate yet.
- passive adapter bootstrap follow-up until upstream #507 is fixed — capability_needed=Charness
  maintainer; next_center=`corca-ai/charness#507`; transformation=preserve comments and intentional
  absence idempotently; proof_boundary=bootstrap rerun produces no diff; enforcement_posture=upstream issue.

## History

- [2026-07-26 quality review](./history/2026-07-26-quality-review.md)
