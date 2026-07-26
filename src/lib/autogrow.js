// textarea가 내용만큼 자란다. 저널은 길이가 제각각이라 스크롤바 안에서 쓰면
// 방금 쓴 줄 말고는 안 보인다 — 인출 통로가 좁아지는 것과 같다 (설계 취향 15항).
//
// 라이브러리를 넣지 않는다. `scrollHeight`를 읽어 높이에 넣는 게 전부다 (9항).

/**
 * 두 번째 인자는 밖에서 값이 바뀌었을 때(날짜 이동·동기화) 다시 재라는 트리거다.
 *
 * @type {import('svelte/action').Action<HTMLTextAreaElement, unknown>}
 */
export const autogrow = (node, value) => {
  const resize = () => {
    // 줄이 지워졌을 때도 따라 줄어들려면 먼저 풀어야 한다.
    node.style.height = 'auto'
    node.style.height = `${node.scrollHeight}px`
  }

  // 폰트가 늦게 로드되면 첫 측정이 틀린다.
  resize()
  document.fonts?.ready?.then(resize)

  node.addEventListener('input', resize)

  return {
    /** @param {unknown} next */
    update(next) {
      if (next === value) return
      value = next
      // 새 value가 DOM에 반영된 뒤에 재야 한다.
      queueMicrotask(resize)
    },
    destroy() {
      node.removeEventListener('input', resize)
    },
  }
}
