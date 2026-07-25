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
 * @typedef {object} Record
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
 * @param {Record} rec
 * @returns {boolean}
 */
export function isDirty(rec) {
  return rec.updatedAt > (rec.syncedAt ?? 0)
}

/**
 * @param {Record[]} records
 * @returns {number}
 */
export function countDirty(records) {
  return records.filter(isDirty).length
}

/**
 * pull은 자동이므로 **로컬을 파괴하지 않는다.** 더티면 건너뛰고, 다음 push에서
 * 사람이 결과를 본다.
 *
 * @param {Record | undefined} local
 * @param {Record} remote
 * @returns {{accept: boolean, reason: 'new' | 'newer' | 'local-dirty' | 'stale'}}
 */
export function pullDecision(local, remote) {
  if (!local) return { accept: true, reason: 'new' }
  if (isDirty(local)) return { accept: false, reason: 'local-dirty' }
  if (remote.updatedAt > local.updatedAt) return { accept: true, reason: 'newer' }
  return { accept: false, reason: 'stale' }
}

/**
 * 서버 쪽 판정. `revision`은 추가 전용이라 먼저 쓴 쪽이 남는다 — 개정 스냅샷은
 * 사용자가 그 순간 작성한 문장이 아니라 자동 밀봉본이므로 사본을 만들지 않는다.
 *
 * @param {Record | undefined} server
 * @param {Record} incoming
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
 * @param {Record} local 진 쪽
 * @param {Record} server 이긴 쪽
 * @returns {{live: Record, conflict: {target: string, text: string, at: number} | null}}
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
 * @param {Record} rec
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
 * @param {Record} prev
 * @param {string} text
 * @param {number} now
 * @returns {Record} 내용이 같으면 `prev` 그대로
 */
export function nextText(prev, text, now) {
  if (prev.data.text === text) return prev
  return { ...prev, data: { ...prev.data, text }, updatedAt: now }
}

/**
 * `scoredAt`은 **점수 값이 바뀔 때만** 갱신한다 (`D15`). 사용자가 본문에 직접 썼듯이
 * 기록 시점이 점수 해석에 영향을 주므로, 이유 오타를 고쳤다고 갱신하면 그 값이 사라진다.
 *
 * @param {Record} prev
 * @param {{score?: number | null, reason?: string}} patch
 * @param {number} now
 * @returns {Record}
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
