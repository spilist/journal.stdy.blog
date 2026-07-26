<script>
  // 에너지 그래프 (`D14`·`D19`). **SVG로 직접 그린다** — 라인 3개에 차트 라이브러리를
  // 넣을 이유가 없다 (설계 취향 9항). 좌표 계산은 `series.js`의 순수 함수에 있고
  // 여기는 그리기와 손가락만 맡는다.
  //
  // 탭하면 그날 이유가 뜨고, **같은 자리를 다시 탭하면 그날로 이동한다.** 이건 새
  // 기능이 아니라 이미 있는 날짜 이동의 조합이다 (설계 취향 1항).

  import { dayLabel } from './date.js'
  import { dayEnergy, lines, plot } from './series.js'

  /** @type {{journal: import('./state.svelte.js').Journal, dims: readonly string[]}} */
  let { journal, dims } = $props()

  const HEIGHT = 170
  /** 왼쪽은 점수 눈금, 아래는 날짜 눈금이 산다. */
  const PAD = { top: 10, right: 6, bottom: 20, left: 22 }
  const STEP = 30

  // 창은 `journal`이 갖고 있다 — **내려받기 범위이기도 해서** 컴포넌트 안에 두면
  // 푸터의 버튼이 못 읽는다 (`state.svelte.js`의 `graphDays` 주석 참조).
  let days = $derived(journal.graphDays)
  /** 컨테이너 실측 폭. viewBox로 늘리면 점이 타원이 되고 손가락 좌표가 어긋난다. */
  let width = $state(0)
  /** 선택한 날짜. 같은 날짜를 다시 고르면 이동한다. */
  let picked = $state('')

  let records = $derived(Object.values(journal.records))
  // 창은 `journal`이 계산한다 — 내려받기와 **같은 배열**이어야 한다 (`S-2`).
  let dates = $derived(journal.graphDates())
  let series = $derived(lines(records, dims, dates))
  let view = $derived(plot(dates, series, { width, height: HEIGHT, pad: PAD }))
  let empty = $derived(series.every((l) => l.points.length === 0))
  let atFullSpan = $derived(days === null || days >= journal.graphSpan())

  /** 지금 보고 있는 날짜가 창 안에 있으면 세로 자를 세운다. */
  let cursor = $derived(dates.indexOf(journal.date))
  /** 창이 좁아져 짚은 날이 밖으로 나가면 툴팁도 접는다 — 자가 없는 툴팁은 어디를
      가리키는지 알 수 없고, 값까지 「없음」으로 뒤집혀 보인다. */
  let pickedIndex = $derived(picked ? dates.indexOf(picked) : -1)

  /**
   * 선택한 날짜의 세 차원. **선이 아니라 레코드에서 읽는다** — 점수 없이 이유만 쓴
   * 날도 이유가 보여야 한다 (`SC-11`).
   */
  let pickedRows = $derived(pickedIndex >= 0 ? dayEnergy(records, dims, picked) : [])

  let rangeLabel = $derived(journal.graphLabel())

  /** @param {string} date */
  function select(date) {
    if (picked === date) {
      // 두 번째 탭 = 그날로 이동. 이동하면 자는 거기로 옮겨가므로 선택은 놓아준다.
      picked = ''
      journal.goTo(date)
      return
    }
    picked = date
  }

  /**
   * 손가락 x를 가장 가까운 날짜로 스냅한다. 날짜마다 히트 영역을 두면 「전체」에서
   * 한 칸이 1px 아래로 내려가 아무것도 못 짚는다.
   *
   * @param {PointerEvent} e
   */
  function dateAt(e) {
    const rect = /** @type {HTMLElement} */ (e.currentTarget).getBoundingClientRect()
    const inner = Math.max(1, rect.width - PAD.left - PAD.right)
    const ratio = (e.clientX - rect.left - PAD.left) / inner
    const last = dates.length - 1
    return dates[Math.min(last, Math.max(0, Math.round(ratio * last)))]
  }

  /**
   * 누른 자리와 손을 뗀 자리. **누르는 순간을 탭으로 치면 세로 스크롤을 시작한 것도
   * 선택이 된다** — 같은 칸에서 두 번 스크롤을 시작하면 두 번째가 이동으로 판정돼
   * 보고 있던 날짜가 바뀐다. 에너지 스트립이 `P-5`에서 겪은 것과 같은 자리다.
   *
   * @type {{id: number, x: number, y: number} | null}
   */
  let tap = null
  /** 손가락이 이만큼 넘게 움직였으면 탭이 아니라 스크롤이다. */
  const TAP_SLOP = 8

  /** @param {PointerEvent} e */
  function onDown(e) {
    if (!e.isPrimary) return
    tap = { id: e.pointerId, x: e.clientX, y: e.clientY }
  }

  /** @param {PointerEvent} e */
  function onUp(e) {
    if (!tap || tap.id !== e.pointerId) return
    const moved =
      Math.abs(e.clientX - tap.x) > TAP_SLOP || Math.abs(e.clientY - tap.y) > TAP_SLOP
    tap = null
    if (!moved) select(dateAt(e))
  }

  /** 스크롤이 제스처를 가져가면 취소가 온다. **취소는 확정이 아니다.** @param {PointerEvent} e */
  function onCancel(e) {
    if (tap && tap.id === e.pointerId) tap = null
  }

  /**
   * 키보드로도 짚는다 — 데스크톱에서 마우스를 쓰지 않아도 되게.
   *
   * @param {KeyboardEvent} e
   */
  function onKey(e) {
    const last = dates.length - 1
    if (e.key === 'ArrowLeft' || e.key === 'ArrowRight') {
      e.preventDefault()
      // 아무것도 안 짚은 상태의 첫 키는 **오늘을 짚는다.** 여기서 바로 ±1을 하면
      // 첫 ←가 어제로 건너뛰어 좌우가 비대칭이 된다.
      if (pickedIndex < 0) {
        picked = dates[last]
        return
      }
      const next = pickedIndex + (e.key === 'ArrowRight' ? 1 : -1)
      picked = dates[Math.min(last, Math.max(0, next))]
    } else if ((e.key === 'Enter' || e.key === ' ') && pickedIndex >= 0) {
      e.preventDefault()
      journal.goTo(picked)
      picked = ''
    }
  }
</script>

<section class="block">
  <h2>에너지 그래프</h2>

  <div class="range">
    <span class="span">{rangeLabel}</span>
    <button
      type="button"
      class="ghost"
      disabled={atFullSpan}
      onclick={() => {
        const next = (days ?? STEP) + STEP
        // 전체를 넘어서면 그냥 전체로 접는다 — 왼쪽에 빈 달을 붙여봐야 읽을 게 없다.
        journal.graphDays = next >= journal.graphSpan() ? null : next
      }}>1개월 더</button
    >
    <button
      type="button"
      class="ghost"
      disabled={days === null}
      onclick={() => (journal.graphDays = null)}
    >
      전체
    </button>
    <!-- 넓힌 창은 되돌릴 수 있어야 한다. -->
    {#if days !== STEP}
      <button type="button" class="ghost" onclick={() => (journal.graphDays = STEP)}>
        {STEP}일
      </button>
    {/if}
  </div>

  <div class="canvas" bind:clientWidth={width}>
    {#if width > 0}
      <!-- 그림을 버튼으로 감싼다. 초점·키보드·탭 의미를 브라우저가 이미 다 갖고 있어서
           `tabindex`를 손으로 붙인 SVG보다 정직하다. -->
      <button
        type="button"
        class="plot"
        aria-label="에너지 점수 {rangeLabel}. 좌우 화살표로 날짜를 짚고 엔터로 그날로 이동합니다."
        onpointerdown={onDown}
        onpointerup={onUp}
        onpointercancel={onCancel}
        onkeydown={onKey}
      >
      <svg {width} height={HEIGHT} role="img" aria-hidden="true">
        {#each view.gridlines as g (g.score)}
          <line class="grid" x1={PAD.left} x2={width - PAD.right} y1={g.y} y2={g.y} />
          <text class="tick" x={PAD.left - 5} y={g.y} text-anchor="end" dominant-baseline="middle">
            {g.score}
          </text>
        {/each}

        <!-- 인덱스로 키잉한다. 라벨은 창 안에서 유일하도록 만들지만, 키가 라벨이면
             한 번의 중복이 `each_key_duplicate`로 앱 전체를 죽인다. -->
        {#each view.ticks as t, i (i)}
          <text class="tick" x={t.x} y={HEIGHT - 6} text-anchor={t.anchor}>{t.label}</text>
        {/each}

        {#if cursor >= 0}
          <!-- 지금 보고 있는 날짜. 그래프와 날짜 화면이 같은 곳을 가리키는지 보인다. -->
          <line class="cursor" x1={view.x(cursor)} x2={view.x(cursor)} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
        {/if}
        {#if pickedIndex >= 0}
          <line class="picked" x1={view.x(pickedIndex)} x2={view.x(pickedIndex)} y1={PAD.top} y2={HEIGHT - PAD.bottom} />
        {/if}

        {#each view.series as s, i (s.dim)}
          {#each s.polylines as pts, j (j)}
            <polyline class="line s{i}" points={pts} />
          {/each}
          {#each s.dots as d (d.date)}
            <circle class="dot s{i}" class:on={d.date === picked} cx={d.x} cy={d.y} r={d.date === picked ? 4 : 2.5} />
          {/each}
        {/each}
      </svg>
      </button>
    {/if}

    {#if empty}
      <p class="none">이 창에는 점수가 없습니다. 에너지에 점수를 매기면 여기 쌓입니다.</p>
    {/if}
  </div>

  <ul class="legend">
    {#each dims as dim, i (dim)}
      <li><span class="swatch s{i}"></span>{dim}</li>
    {/each}
  </ul>

  {#if pickedIndex >= 0}
    <div class="tip">
      <div class="tip-head">
        <strong>{dayLabel(picked, journal.today)}</strong>
        <span class="date">{picked}</span>
        <span class="hint">다시 탭하면 그날로</span>
      </div>
      {#each pickedRows as row, i (row.dim)}
        <div class="row">
          <span class="swatch s{i}"></span>
          <span class="name">{row.dim}</span>
          <span class="score" class:unset={row.score === null}>{row.score ?? '—'}</span>
          <span class="reason">{row.reason}</span>
        </div>
      {/each}
    </div>
  {/if}
</section>

<style>
  .range {
    display: flex;
    align-items: center;
    gap: 0.3rem;
    margin-bottom: 0.4rem;
  }
  .range .span {
    font-size: 0.8rem;
    color: var(--dim);
    margin-right: auto;
    font-variant-numeric: tabular-nums;
  }
  .range button {
    font-size: 0.85rem;
    padding: 0 0.5rem;
  }

  .canvas {
    position: relative;
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--raised);
    /* 세로 스크롤은 브라우저가 갖는다. 우리는 탭만 받는다. */
    touch-action: pan-y;
  }
  /* 전역 button 의 padding·min-height·테두리를 여기서 전부 벗긴다. 남기면 SVG 폭과
     실측 rect 가 어긋나 손가락이 하루씩 밀린다. */
  .plot {
    display: block;
    width: 100%;
    min-height: 0;
    padding: 0;
    border: 0;
    background: none;
    border-radius: 8px;
    /* 탭 대상이 선이 아니라 세로 칸이라, 손가락이 선을 정확히 짚을 필요가 없다. */
    cursor: pointer;
  }
  svg {
    display: block;
  }
  .none {
    position: absolute;
    inset: 0;
    /* 안내 문구가 버튼 전체를 덮는다. 이걸 안 풀면 빈 창에서 탭이 아예 안 먹어,
       키보드로는 되고 손가락으로는 안 되는 비대칭이 생긴다. */
    pointer-events: none;
    display: flex;
    align-items: center;
    justify-content: center;
    margin: 0;
    padding: 0 1rem;
    text-align: center;
    font-size: 0.8rem;
    color: var(--dim);
  }

  .grid {
    stroke: var(--line);
    stroke-width: 1;
  }
  .tick {
    fill: var(--dim);
    font-size: 9px;
    font-variant-numeric: tabular-nums;
  }
  .cursor {
    stroke: var(--dim);
    stroke-width: 1;
    stroke-dasharray: 2 3;
  }
  .picked {
    stroke: var(--fg);
    stroke-width: 1;
  }
  .line {
    fill: none;
    stroke-width: 1.8;
    stroke-linecap: round;
    stroke-linejoin: round;
  }
  /* 선택자를 요소로 좁힌다. `.dot`과 `.s0`이 명시도가 같으면 뒤에 오는 `.s0`이
     이겨서 점의 분리용 후광(--raised)이 통째로 사라진다. */
  polyline.s0 {
    stroke: var(--series-a);
  }
  polyline.s1 {
    stroke: var(--series-b);
  }
  polyline.s2 {
    stroke: var(--series-c);
  }
  circle.dot {
    /* 선이 겹치는 구간에서 점이 선에 묻히지 않게 배경색으로 한 겹 두른다. */
    stroke: var(--raised);
    stroke-width: 1;
  }
  circle.s0 {
    fill: var(--series-a);
  }
  circle.s1 {
    fill: var(--series-b);
  }
  circle.s2 {
    fill: var(--series-c);
  }
  circle.dot.on {
    stroke: var(--fg);
    stroke-width: 1.5;
  }

  .legend {
    display: flex;
    flex-wrap: wrap;
    gap: 0.9rem;
    list-style: none;
    margin: 0.4rem 0 0;
    padding: 0;
    font-size: 0.8rem;
    color: var(--dim);
  }
  .legend li {
    display: flex;
    align-items: center;
    gap: 0.3rem;
  }
  .swatch {
    width: 0.7rem;
    height: 0.2rem;
    border-radius: 2px;
    flex: none;
  }
  .swatch.s0 {
    background: var(--series-a);
  }
  .swatch.s1 {
    background: var(--series-b);
  }
  .swatch.s2 {
    background: var(--series-c);
  }

  .tip {
    margin-top: 0.5rem;
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 0.5rem 0.6rem;
    font-size: 0.85rem;
  }
  .tip-head {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
    margin-bottom: 0.3rem;
  }
  .tip-head .date,
  .tip-head .hint {
    font-size: 0.75rem;
    color: var(--dim);
  }
  .tip-head .hint {
    margin-left: auto;
  }
  .row {
    display: flex;
    align-items: baseline;
    gap: 0.4rem;
  }
  .row + .row {
    margin-top: 0.15rem;
  }
  .row .name {
    color: var(--dim);
    flex: none;
  }
  .row .score {
    font-weight: 700;
    font-variant-numeric: tabular-nums;
    min-width: 1.5em;
    flex: none;
  }
  .row .score.unset {
    color: var(--dim);
    font-weight: 400;
  }
  .row .reason {
    color: var(--dim);
    /* 이유가 길어도 그래프가 밀려나지 않게 한 줄로 자른다. 전문은 그날로 가면 있다. */
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
</style>
