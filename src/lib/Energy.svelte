<script>
  // 점수는 라디오로만, 이유는 텍스트로만 편집된다 (`D1`). 두 수단이 같은 값을
  // 건드리지 않으므로 표면이 겹치지 않는다.
  //
  // 10점 1행 (`D7`). **버튼을 유지하되 스트립 위를 문지르면 슬라이더처럼 움직인다** —
  // 새 UI를 하나 더 만들지 않고 조작 방식만 늘린 것이다 (설계 취향 1항).
  // 슬라이더(`input[type=range]`)를 쓰지 않은 이유는 `P-1` 참조.

  import { autogrow } from './autogrow.js'
  import { kstDate, kstTime } from './date.js'
  import { moveScore } from './merge.js'
  import Conflicts from './Conflicts.svelte'
  import Graph from './Graph.svelte'

  /** @type {{journal: import('./state.svelte.js').Journal, dims: readonly string[], ondate?: (date: string) => void}} */
  let { journal, dims, ondate } = $props()

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
   * `before`는 **레코드 통째로** 들고 있는다. 점수만 들고 있으면 취소를 되돌릴 때
   * `updatedAt`이 지금으로 남아, 값은 그대로인데 더티가 된다 (`F-8`).
   *
   * @type {{dim: string, id: number, start: number, before: import('./merge.js').Rec, moved: boolean} | null}
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
    // 취소될 수 있으므로 누르기 전 레코드를 들고 있는다 (아래 `onCancel`).
    drag = { dim, id: e.pointerId, start: picked, before: journal.energy(dim), moved: false }
    // 이미 그 점수면 손을 뗄 때 해제한다 — 문지르는 중에 깜빡이지 않게.
    if (drag.before.data.score !== picked) journal.toggleScore(dim, picked)
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
      const next = moveScore(current, 1)
      if (next !== current) journal.toggleScore(dim, /** @type {number} */ (next))
    } else if (e.key === 'ArrowLeft' || e.key === 'ArrowDown') {
      e.preventDefault()
      const next = moveScore(current, -1)
      if (next !== current) journal.toggleScore(dim, /** @type {number} */ (next))
    } else if ((e.key === 'Backspace' || e.key === 'Delete') && current !== null) {
      e.preventDefault()
      journal.toggleScore(dim, current)
    } else if ((e.key === ' ' || e.key === 'Enter') && current !== null) {
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
    if (!drag.moved && drag.before.data.score === drag.start) journal.toggleScore(dim, drag.start)
    drag = null
  }

  /**
   * **취소는 확정이 아니다.** 스트립 위에서 세로 스크롤을 시작하면 브라우저가 제스처를
   * 가져가며 `pointercancel`을 쏜다 (`touch-action: pan-y`가 그걸 허용한다).
   * 이걸 `onUp`으로 흘리면 **스크롤만 했는데 점수가 지워진다.** 누르기 전 레코드로
   * 되돌린다 — 값만 되돌리면 손댄 적 없는 칸이 더티로 남아 빈 값이 올라간다 (`F-8`).
   *
   * @param {PointerEvent} e
   * @param {string} dim
   */
  function onCancel(e, dim) {
    if (!drag || drag.dim !== dim || drag.id !== e.pointerId) return
    journal.restoreScore(drag.before)
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
      title={showGraph ? '에너지 그래프 접기' : '에너지 그래프 펼치기'}
      onclick={() => (showGraph = !showGraph)}
    >
      {showGraph ? '▾' : '▸'} 그래프
    </button>
  </div>

  {#if showGraph}
      <Graph {journal} {dims} {ondate} />
  {/if}

  {#each dims as dim (dim)}
    {@const rec = journal.energy(dim)}
    {@const prev = journal.previousEnergy(dim)}
    <div class="dim">
      <div class="head">
        <span class="name">{dim}</span>
        <span class="value" class:unset={rec.data.score === null}>
          {rec.data.score ?? '—'}
        </span>
        <!-- **화면에 띄우는 건 `updatedAt`이다** (사용자 판정 2026-07-28). 이유를 고친
             것도 수정이다. `scoredAt`은 계속 저장되지만(`D15`) 화면 규칙은 어제·오늘·
             고정 블록과 같다 — 블록마다 시각의 뜻이 다르면 읽는 사람이 매번 헷갈린다. -->
        {#if rec.updatedAt}
          <!-- 보고 있는 날짜와 다르면 날짜를 앞에 붙인다 — 어제·오늘 블록과 **같은
               규칙이다.** 시각만 띄우면 7/20을 보면서 오늘 매긴 점수가 「7/20 14:32」로
               읽힌다. -->
          <span
            class="at"
            aria-label={`마지막 수정 시각: ${kstDate(rec.updatedAt)} ${kstTime(rec.updatedAt)}`}
            title={rec.updatedAt ? `마지막 수정 시각: ${kstDate(rec.updatedAt)} ${kstTime(rec.updatedAt)}` : ''}
          >
            {kstDate(rec.updatedAt) === journal.date
              ? ''
              : `${kstDate(rec.updatedAt)} `}{kstTime(rec.updatedAt)}
          </span>
        {/if}
      </div>

      {#if prev.score !== null || prev.reason}
        <div class="previous">
          <span class="label">전날</span>
          <span class="score">{prev.score ?? '—'}</span>
          {#if prev.reason}<span class="reason">{prev.reason}</span>{/if}
        </div>
      {/if}

      <div
        class="scores"
        role="radiogroup"
        aria-label={`${dim} 점수, 현재 ${rec.data.score ?? '미입력'}`}
        aria-activedescendant={rec.data.score ? `score-${dim}-${rec.data.score}` : undefined}
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
            id={`score-${dim}-${score}`}
            aria-label={`${score}점`}
            aria-setsize="10"
            aria-posinset={score}
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
        aria-label={`${dim} 점수 이유`}
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
    /* 전역 44px 조작면을 덮어쓰지 않는다. 그래프도 기존 에너지 인출 경로다. */
    min-height: 44px;
    padding: 0 0.5rem;
    font-size: 0.85rem;
  }
  .graph.on {
    color: var(--accent);
  }
  .scores:focus-visible {
    outline: 2px solid var(--accent);
    outline-offset: 3px;
    border-radius: 4px;
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

  /* 「어제」의 전날 병치와 같은 형태 (`D8`·`D21`) — 왼쪽 선 + 흐린 글씨. */
  .previous {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    border-left: 3px solid var(--line);
    padding: 0.1rem 0 0.1rem 0.6rem;
    margin-bottom: 0.4rem;
    color: var(--dim);
    font-size: 0.8rem;
  }
  /* 이유가 길면 flex 축소가 형제에게도 분배된다. CJK 라벨의 min-content 는 한 글자
     폭이라, 막아두지 않으면 「전날」이 두 줄로 감기며 스트립을 아래로 민다. */
  .previous .label,
  .previous .score {
    flex: none;
  }
  .previous .label {
    font-size: 0.72rem;
    letter-spacing: 0.02em;
  }
  .previous .score {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
  }
  /* 전날 이유는 통째로 보여준다 (사용자 판정 2026-07-28). 한 줄로 자르면 어제 뭐라
     썼는지 못 읽어 인출 통로가 막힌다 (설계 취향 15항) — 스트립이 조금 내려가는
     것보다 그게 크다. 원문 줄바꿈도 살린다. */
  .previous .reason {
    min-width: 0;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
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
