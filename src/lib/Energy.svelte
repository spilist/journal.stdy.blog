<script>
  // 점수는 라디오로만, 이유는 텍스트로만 편집된다 (`D1`). 두 수단이 같은 값을
  // 건드리지 않으므로 표면이 겹치지 않는다.
  //
  // 10점 1행 (`D7`). **버튼을 유지하되 스트립 위를 문지르면 슬라이더처럼 움직인다** —
  // 새 UI를 하나 더 만들지 않고 조작 방식만 늘린 것이다 (설계 취향 1항).
  // 슬라이더(`input[type=range]`)를 쓰지 않은 이유는 `P-1` 참조.

  import { autogrow } from './autogrow.js'
  import { kstTime } from './date.js'
  import Conflicts from './Conflicts.svelte'
  import Graph from './Graph.svelte'

  /** @type {{journal: import('./state.svelte.js').Journal, dims: readonly string[]}} */
  let { journal, dims } = $props()

  const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]

  /**
   * 그래프는 **에너지의 인출 통로**라 같은 블록에 산다 (설계 취향 15항). 접어두는 건
   * 고정 블록이 이미 쓰는 형태고, 새 UI 종류가 아니다 (`P-7`).
   */
  let showGraph = $state(false)

  /**
   * 문지르기 상태. **포인터 하나만 추적한다** — 손바닥이 스치는 두 번째 포인터가
   * 진행 중인 조작을 가로채면 값이 엉뚱하게 해제된다.
   *
   * @type {{dim: string, id: number, start: number, before: number | null, moved: boolean} | null}
   */
  let drag = null

  /**
   * 손가락 x좌표를 점수로 바꾼다. 버튼 경계가 아니라 스트립 전체를 기준으로 재므로
   * 버튼 사이 간격에서도 값이 끊기지 않는다.
   *
   * @param {HTMLElement} strip
   * @param {number} clientX
   * @returns {number} 1..10
   */
  function scoreAt(strip, clientX) {
    const rect = strip.getBoundingClientRect()
    const ratio = (clientX - rect.left) / rect.width
    return Math.min(10, Math.max(1, Math.ceil(ratio * 10)))
  }

  /**
   * @param {PointerEvent} e
   * @param {string} dim
   */
  function onDown(e, dim) {
    if (drag || e.button !== 0 || !e.isPrimary) return
    const strip = /** @type {HTMLElement} */ (e.currentTarget)
    strip.setPointerCapture(e.pointerId)
    const picked = scoreAt(strip, e.clientX)
    // 취소될 수 있으므로 누르기 전 값을 들고 있는다 (아래 `onCancel`).
    drag = { dim, id: e.pointerId, start: picked, before: journal.energy(dim).data.score, moved: false }
    // 이미 그 점수면 손을 뗄 때 해제한다 — 문지르는 중에 깜빡이지 않게.
    if (drag.before !== picked) journal.toggleScore(dim, picked)
  }

  /**
   * @param {PointerEvent} e
   * @param {string} dim
   */
  function onMove(e, dim) {
    if (!drag || drag.dim !== dim || drag.id !== e.pointerId) return
    const picked = scoreAt(/** @type {HTMLElement} */ (e.currentTarget), e.clientX)
    if (picked === drag.start && !drag.moved) return
    drag.moved = true
    if (journal.energy(dim).data.score !== picked) journal.toggleScore(dim, picked)
  }

  /**
   * 키보드로도 값을 옮긴다 — 데스크톱에서 마우스를 쓰지 않아도 되게.
   *
   * @param {KeyboardEvent} e
   * @param {string} dim
   */
  function onKey(e, dim) {
    const current = journal.energy(dim).data.score
    if (e.key === 'ArrowRight' || e.key === 'ArrowUp') {
      e.preventDefault()
      journal.toggleScore(dim, Math.min(10, (current ?? 0) + 1))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      if (current !== null && current > 1) journal.toggleScore(dim, current - 1)
    } else if ((e.key === 'Backspace' || e.key === 'Delete') && current !== null) {
      e.preventDefault()
      journal.toggleScore(dim, current)
    }
  }

  /**
   * @param {PointerEvent} e
   * @param {string} dim
   */
  function onUp(e, dim) {
    if (!drag || drag.dim !== dim || drag.id !== e.pointerId) return
    // 움직이지 않고 이미 켜져 있던 점수를 눌렀으면 해제다 (`SC-3`).
    if (!drag.moved && drag.before === drag.start) journal.toggleScore(dim, drag.start)
    drag = null
  }

  /**
   * **취소는 확정이 아니다.** 스트립 위에서 세로 스크롤을 시작하면 브라우저가 제스처를
   * 가져가며 `pointercancel`을 쏜다 (`touch-action: pan-y`가 그걸 허용한다).
   * 이걸 `onUp`으로 흘리면 **스크롤만 했는데 점수가 지워진다.** 누르기 전 값으로 되돌린다.
   *
   * @param {PointerEvent} e
   * @param {string} dim
   */
  function onCancel(e, dim) {
    if (!drag || drag.dim !== dim || drag.id !== e.pointerId) return
    const { before } = drag
    const now = journal.energy(dim).data.score
    if (now !== before) {
      // 되돌린다. before 가 null 이면 지금 값을 한 번 더 눌러 해제하는 게 되돌리기다.
      journal.toggleScore(dim, before === null ? /** @type {number} */ (now) : before)
    }
    drag = null
  }
</script>

<section class="block">
  <div class="title">
    <h2>에너지</h2>
    <button
      type="button"
      class="ghost graph"
      class:on={showGraph}
      aria-expanded={showGraph}
      onclick={() => (showGraph = !showGraph)}
    >
      {showGraph ? '▾' : '▸'} 그래프
    </button>
  </div>

  {#if showGraph}
    <Graph {journal} {dims} />
  {/if}

  {#each dims as dim (dim)}
    {@const rec = journal.energy(dim)}
    <div class="dim">
      <div class="head">
        <span class="name">{dim}</span>
        <span class="value" class:unset={rec.data.score === null}>
          {rec.data.score ?? '—'}
        </span>
        {#if rec.data.scoredAt}
          <span class="at" title="점수를 매긴 시각">{kstTime(rec.data.scoredAt)}</span>
        {/if}
      </div>

      <div
        class="scores"
        role="radiogroup"
        aria-label="{dim} 점수"
        tabindex="0"
        onkeydown={(e) => onKey(e, dim)}
        onpointerdown={(e) => onDown(e, dim)}
        onpointermove={(e) => onMove(e, dim)}
        onpointerup={(e) => onUp(e, dim)}
        onpointercancel={(e) => onCancel(e, dim)}
        onlostpointercapture={(e) => onCancel(e, dim)}
      >
        {#each SCORES as score (score)}
          <span
            role="radio"
            aria-checked={rec.data.score === score}
            aria-label="{score}점"
            tabindex="-1"
            class="cell"
            class:on={rec.data.score === score}
            class:filled={rec.data.score !== null && score <= rec.data.score}
          >{score}</span>
        {/each}
      </div>

      <textarea
        use:autogrow={rec.data.reason}
        rows="2"
        placeholder="이유"
        value={rec.data.reason}
        oninput={(/** @type {Event & {currentTarget: HTMLTextAreaElement}} */ e) => journal.setReason(dim, e.currentTarget.value)}
        onblur={() => journal.flush()}
      ></textarea>

      <Conflicts {journal} target={rec.key} />
    </div>
  {/each}
</section>

<style>
  .title {
    display: flex;
    align-items: center;
    gap: 0.5rem;
  }
  .title h2 {
    margin-bottom: 0;
  }
  .graph {
    margin-left: auto;
    min-height: 32px;
    padding: 0 0.5rem;
    font-size: 0.85rem;
  }
  .graph.on {
    color: var(--accent);
  }
  .dim + .dim {
    margin-top: 1.1rem;
  }
  .head {
    display: flex;
    align-items: baseline;
    gap: 0.5rem;
    margin-bottom: 0.35rem;
  }
  .name {
    font-weight: 600;
  }
  .value {
    font-size: 1.05rem;
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    color: var(--accent);
  }
  .value.unset {
    color: var(--dim);
    font-weight: 400;
  }
  .at {
    font-size: 0.75rem;
    color: var(--dim);
    margin-left: auto;
  }

  .scores {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    border: 1px solid var(--line);
    border-radius: 8px;
    overflow: hidden;
    /* 가로로 문지르는 동작을 우리가 받고, 세로 스크롤은 브라우저에 넘긴다. */
    touch-action: pan-y;
    user-select: none;
    -webkit-user-select: none;
  }
  .cell {
    /* 전역 button 의 좌우 padding 이 칸 최소폭을 밀어올려 10번째가 잘렸다.
       0 으로 두고 min-width 도 풀어야 1fr 이 실제로 균등해진다. */
    padding: 0;
    min-width: 0;
    height: 56px; /* D7: 폭이 좁은 걸 세로로 상쇄한다 */
    display: flex;
    align-items: center;
    justify-content: center;
    font-size: 0.8rem;
    font-variant-numeric: tabular-nums;
    color: var(--dim);
    background: var(--bg);
    cursor: pointer;
  }
  .cell + .cell {
    border-left: 1px solid var(--line);
  }
  /* 선택한 값까지 채워서 슬라이더처럼 읽히게 한다. 값 자체는 .on 이 가리킨다. */
  .cell.filled {
    background: color-mix(in srgb, var(--accent) 18%, var(--bg));
    color: var(--fg);
  }
  .cell.on {
    background: var(--accent);
    /* 이 숫자가 앱의 핵심 판독값이다. 다크 모드에서 흰 글씨는 대비 2:1 미만이었다. */
    color: var(--on-accent);
    font-weight: 700;
    font-size: 0.95rem;
  }

  textarea {
    margin-top: 0.4rem;
  }
</style>
