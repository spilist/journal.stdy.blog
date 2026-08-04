/** @typedef {{kind: 'same' | 'added' | 'removed', text: string}} DiffLine */

/**
 * 두 텍스트를 줄 단위로 비교한다. 저널 본문은 작은 개인 문서라 외부 diff 의존성 없이
 * LCS를 직접 쓴다. 줄의 내용과 빈 줄을 그대로 보존해 읽기 전용 화면에서만 사용한다.
 *
 * @param {string} before
 * @param {string} after
 * @returns {DiffLine[]}
 */
export function diffLines(before, after) {
  const a = before.split('\n')
  const b = after.split('\n')
  const width = b.length + 1
  const lcs = new Array((a.length + 1) * width).fill(0)

  for (let i = a.length - 1; i >= 0; i -= 1) {
    for (let j = b.length - 1; j >= 0; j -= 1) {
      lcs[i * width + j] =
        a[i] === b[j]
          ? lcs[(i + 1) * width + j + 1] + 1
          : Math.max(lcs[(i + 1) * width + j], lcs[i * width + j + 1])
    }
  }

  /** @type {DiffLine[]} */
  const out = []
  let i = 0
  let j = 0
  while (i < a.length || j < b.length) {
    if (i < a.length && j < b.length && a[i] === b[j]) {
      out.push({ kind: 'same', text: a[i] })
      i += 1
      j += 1
    } else if (i < a.length && (j === b.length || lcs[(i + 1) * width + j] >= lcs[i * width + j + 1])) {
      out.push({ kind: 'removed', text: a[i] })
      i += 1
    } else {
      out.push({ kind: 'added', text: b[j] })
      j += 1
    }
  }
  return out
}
