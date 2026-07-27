// 동기화 병합. 순수 함수만 둔다 — 저장소도 네트워크도 모른다.
//
// 두 규칙이 전부다:
//
// 1. **블록 단위 last-write-wins**, 키는 `updatedAt`.
// 2. **진 쪽 글자를 버리지 않는다** (불변식 3) — `conflict` 사본으로 남긴다.
//
// 그리고 자동으로 도는 쪽(pull)은 **절대 충돌을 만들지 않는다** (`D3`). 더티 레코드는
// 건너뛰고, 사람이 push를 눌렀을 때만 사본이 생긴다. 자동 동작이 사용자 글자를 옆으로
// 밀면 놀란다.

/**
 * @typedef {object} Rec
 * @property {string} key
 * @property {string} kind 'energy' | 'log' | 'pinned' | 'revision'
 * @property {Record<string, any>} data
 * @property {number} updatedAt epoch ms
 * @property {number} [syncedAt] 로컬 전용. 서버로 가지 않는다
 */

/**
 * @param {string} kind
 * @param {...string} parts
 * @returns {string}
 */
export function recordKey(kind, ...parts) {
  return [kind, ...parts].join(':')
}

/**
 * 미동기화 배지가 세는 값 (`D17`). push를 안 누르는 게 유일하게 남은 유실 경로다.
 *
 * @param {Rec} rec
 * @returns {boolean}
 */
export function isDirty(rec) {
  return rec.updatedAt > (rec.syncedAt ?? 0)
}

/**
 * @param {Rec[]} records
 * @returns {number}
 */
export function countDirty(records) {
  return records.filter(isDirty).length
}

/**
 * pull은 자동이므로 **로컬을 파괴하지 않는다.** 더티면 건너뛰고, 다음 push에서
 * 사람이 결과를 본다.
 *
 * @param {Rec | undefined} local
 * @param {Rec} remote
 * @returns {{accept: boolean, reason: 'new' | 'newer' | 'local-dirty' | 'stale'}}
 */
export function pullDecision(local, remote) {
  if (!local) return { accept: true, reason: 'new' }
  if (isDirty(local)) return { accept: false, reason: 'local-dirty' }
  if (remote.updatedAt > local.updatedAt) return { accept: true, reason: 'newer' }
  return { accept: false, reason: 'stale' }
}

/**
 * 못 받은 원격 레코드가 **분기**인가 — 이 기기가 본 적 없는 판본인가.
 *
 * **더티하다는 것만으로 분기라고 세면 거짓말이 된다.** `pushNow`는 `lastPulledAt`을
 * 옮기지 않으므로, 올린 직후 계속 편집하면 다음 pull이 **내가 방금 올린 그 판본**을
 * 도로 실어온다. 로컬은 더티라 안 받는데, 이건 다른 기기와 갈린 게 아니라 내 메아리다.
 * 기준은 `syncedAt` — 여기까지는 이미 본 것이다.
 *
 * `revision`은 세지 않는다. 자동 밀봉본이라 사용자가 고친 적이 없고, 「올리기」를 눌러도
 * 사본조차 남지 않아(먼저 쓴 쪽이 남는다) **확인할 결과가 없는 배너**가 된다.
 *
 * @param {Rec | undefined} local
 * @param {Rec} remote
 * @returns {boolean}
 */
export function isDiverged(local, remote) {
  if (!local) return false
  if (remote.kind === 'revision') return false
  return remote.updatedAt > (local.syncedAt ?? 0)
}

/**
 * pull 커서를 어디까지 미룰지. **건너뛴 레코드를 커서로 넘겨버리면 그 원격 변경은
 * 영영 다시 안 온다** — 사용자는 다음 push까지 분기 사실 자체를 모른다. 그래서 건너뛴
 * 게 있으면 그 중 가장 이른 `updatedAt` 직전에서 커서를 멈춘다. 다음 pull이 같은
 * 레코드를 다시 실어오므로 **분기 표시가 새로고침을 넘어 살아남고, 저장할 상태가 없다.**
 *
 * 해소되면(사람이 push해서 더티가 풀리면) 같은 레코드가 `stale`로 떨어지고 커서는
 * 저절로 `now`까지 간다.
 *
 * **메아리는 붙잡지 않는다** (`isDiverged` 참조). 붙잡으면 "올리기 → 계속 편집"만으로
 * 커서가 영영 안 나아가고 매 pull이 같은 구간을 통째로 다시 받는다.
 *
 * @param {number} now 서버가 준 시각
 * @param {Rec[]} diverged 분기라 못 받은 원격 레코드
 * @returns {number}
 */
export function nextPullCursor(now, diverged) {
  if (!diverged.length) return now
  const earliest = Math.min(...diverged.map((r) => r.updatedAt))
  // `updated_at > since`라 1을 빼야 그 레코드가 다음 응답에 다시 들어온다.
  return Math.min(now, earliest - 1)
}

/**
 * 서버 쪽 판정. `revision`은 추가 전용이라 먼저 쓴 쪽이 남는다 — 개정 스냅샷은
 * 사용자가 그 순간 작성한 문장이 아니라 자동 밀봉본이므로 사본을 만들지 않는다.
 *
 * @param {Rec | undefined} server
 * @param {Rec} incoming
 * @returns {{applied: boolean}}
 */
export function pushVerdict(server, incoming) {
  if (!server) return { applied: true }
  if (incoming.kind === 'revision') return { applied: false }
  return { applied: incoming.updatedAt > server.updatedAt }
}

/**
 * push가 거절됐을 때 클라이언트가 할 일 (`D12`): 서버 값을 라이브로 채택하고,
 * **자기 텍스트를 사본으로 남긴다.**
 *
 * @param {Rec} local 진 쪽
 * @param {Rec} server 이긴 쪽
 * @returns {{live: Rec, conflict: {target: string, text: string, at: number} | null}}
 */
export function resolveRejected(local, server) {
  const live = { ...server, syncedAt: server.updatedAt }
  const text = describe(local)
  const same = text === describe(server)
  // 내용이 같으면 사본을 만들지 않는다 — 해소할 게 없는 배지는 잡음이다.
  return { live, conflict: same ? null : { target: local.key, text, at: local.updatedAt } }
}

/**
 * 충돌 사본에 보일 사람이 읽는 형태.
 *
 * @param {Rec} rec
 * @returns {string}
 */
export function describe(rec) {
  if (rec.kind === 'energy') {
    const score = rec.data.score
    return `${score === null || score === undefined ? '—' : score}. ${rec.data.reason ?? ''}`
  }
  return String(rec.data.text ?? '')
}

/**
 * 자동저장이 `updatedAt`을 매번 갱신하면 **가짜 더티가 쌓이고, 내용이 같은데도 LWW에서
 * 이겨 다른 기기의 진짜 편집을 밀어낸다.** 그래서 내용 비교가 먼저다.
 *
 * @param {Rec} prev
 * @param {string} text
 * @param {number} now
 * @returns {Rec} 내용이 같으면 `prev` 그대로
 */
export function nextText(prev, text, now) {
  if (prev.data.text === text) return prev
  return { ...prev, data: { ...prev.data, text }, updatedAt: now }
}

/**
 * `scoredAt`은 **점수 값이 바뀔 때만** 갱신한다 (`D15`). 사용자가 본문에 직접 썼듯이
 * 기록 시점이 점수 해석에 영향을 주므로, 이유 오타를 고쳤다고 갱신하면 그 값이 사라진다.
 *
 * @param {Rec} prev
 * @param {{score?: number | null, reason?: string}} patch
 * @param {number} now
 * @returns {Rec}
 */
export function nextEnergy(prev, patch, now) {
  const score = patch.score === undefined ? prev.data.score : patch.score
  const reason = patch.reason === undefined ? prev.data.reason : patch.reason
  if (score === prev.data.score && reason === prev.data.reason) return prev
  const scoredAt = score === prev.data.score ? prev.data.scoredAt : now
  return { ...prev, data: { ...prev.data, score, reason, scoredAt }, updatedAt: now }
}

/**
 * 개정 스냅샷은 하루에 1개다 (`D11`) — 키가 날짜라 제약이 스키마에 들어 있다.
 * 그날 처음 손대는 시점에 **직전 내용을** 밀봉한다.
 *
 * @param {string | null} lastRevisionDay 'YYYY-MM-DD' | null
 * @param {string} today 'YYYY-MM-DD' (KST)
 * @returns {boolean}
 */
export function needsSnapshot(lastRevisionDay, today) {
  return lastRevisionDay !== today
}
