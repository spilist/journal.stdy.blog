<script>
  // 화면 하나. 날짜 이동 · 고정 블록 · 에너지 · 어제 · 오늘.
  // 그래프는 에너지 블록 안에 접혀 있다 (`P-7`).

  import Energy from './lib/Energy.svelte'
  import ImportPanel from './lib/ImportPanel.svelte'
  import LogBlock from './lib/LogBlock.svelte'
  import Pinned from './lib/Pinned.svelte'
  import { dayLabel } from './lib/date.js'
  import { DIMS, LOG_KINDS } from './lib/markdown.js'
  import { Journal } from './lib/state.svelte.js'

  const journal = new Journal()

  let showImport = $state(false)
  let toast = $state('')

  $effect(() => {
    journal.load().then(() => journal.pullNow())

    // 폰에서 앱을 전환하거나 화면을 끌 때 디바운스 중인 글자를 잃지 않게 한다.
    const flush = () => journal.flush()
    const onHide = () => {
      if (document.visibilityState === 'hidden') flush()
    }
    document.addEventListener('visibilitychange', onHide)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onHide)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  })

  let dirty = $derived(journal.dirtyCount())

  /**
   * @param {string} text
   * @param {string} done
   */
  async function copy(text, done) {
    try {
      await navigator.clipboard.writeText(text)
      say(done)
    } catch {
      say('복사에 실패했습니다')
    }
  }

  /** @param {string} message */
  function say(message) {
    toast = message
    setTimeout(() => (toast = message === toast ? '' : toast), 2400)
  }

  // 내려받기 범위는 **그래프 창**이다 — 같은 일을 하는 UI를 하나 더 만들지 않는다
  // (설계 취향 1항). 그래서 라벨이 범위를 말해야 한다. 버튼만 보고 눌러도 무엇이
  // 나올지 알 수 있어야 아래쪽 그래프 상태에 의존하는 게 함정이 되지 않는다.
  let rangeLabel = $derived(journal.graphLabel())

  function download() {
    const dates = journal.graphDates()
    const blob = new Blob([journal.exportAll()], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    // 파일명이 범위를 주장한다. 창의 실제 양 끝을 쓴다 — 오늘로 박으면 「전체」가
    // 오늘 뒤의 기록까지 담을 때 이름이 거짓말이 된다.
    a.download = `journal-${dates[0]}_${dates[dates.length - 1]}.md`
    // 붙이지 않고 클릭하거나 즉시 revoke 하면 Firefox·iOS Safari에서 조용히 실패한다.
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    say(`${rangeLabel} 마크다운을 내려받았습니다`)
  }
</script>

<header>
  <nav class="dates">
    <button type="button" onclick={() => journal.shiftDate(-1)} aria-label="전날">‹</button>
    <label class="current">
      <span class="label">{dayLabel(journal.date, journal.today)}</span>
      <input type="date" value={journal.date} onchange={(e) => journal.goTo(e.currentTarget.value)} />
    </label>
    <button type="button" onclick={() => journal.shiftDate(1)} aria-label="다음날">›</button>
  </nav>

  <div class="sync">
    <!-- 동기화는 사람이 누른다 (불변식 2). 미동기화를 보이게 하는 건 자동화가 아니다. -->
    <button type="button" class:has={dirty > 0} onclick={() => journal.pushNow()}>
      ↑ 올리기<!-- 개수는 고정폭 자리에 둔다. 라벨에 붙이면 0→1, 9→10에서 버튼이
                  넓어지며 옆 버튼을 밀어 오터치가 난다. -->
      <span class="count">{dirty > 0 ? dirty : ''}</span>
    </button>
    <!-- 날짜 줄이 아니라 여기 산다. 날짜 줄에 두면 나타났다 사라질 때마다 `›` 가
         밀려 오터치가 났다. 여기서는 앞의 「올리기」가 자리를 지키므로 숨겨도 안 밀린다. -->
    {#if journal.date !== journal.today}
      <button type="button" class="ghost today" onclick={() => journal.goToday()}>오늘로</button>
    {/if}
    <span class="state" class:warn={journal.syncState === 'relogin'}>
      {#if journal.syncState === 'syncing'}동기화 중…
      {:else if journal.syncState === 'offline'}오프라인{journal.syncMessage ? ` · ${journal.syncMessage}` : ''}
      {:else}{journal.syncMessage}{/if}
    </span>
  </div>
</header>

<main>
  {#if journal.storageError}
    <p class="banner warn">{journal.storageError}</p>
  {/if}

  {#each journal.offscreenConflicts() as c (c.date)}
    <!-- 다른 날짜의 충돌 사본으로 가는 통로. 새 기능이 아니라 날짜 이동의 조합이다. -->
    <button type="button" class="banner jump" onclick={() => journal.goTo(c.date)}>
      ⚠ {c.date}에 충돌 사본 {c.count}개 — 보러 가기
    </button>
  {/each}

  {#if journal.syncState === 'relogin'}
    <p class="relogin">로그인이 만료됐습니다. <a href={location.pathname}>새로고침</a>하면 다시 로그인합니다.</p>
  {/if}

  <Pinned {journal} />

  {#if journal.loaded}
    <Energy {journal} dims={DIMS} />
    {#each LOG_KINDS as kind (kind)}
      <LogBlock {journal} {kind} />
    {/each}
  {/if}

  <footer>
    <button type="button" onclick={() => copy(journal.exportDay(), '하루치를 복사했습니다')}>
      하루치 복사
    </button>
    <!-- 범위는 그래프 창이 정한다. 여기서는 무엇이 나오는지만 말한다. -->
    <button type="button" class="ghost" onclick={download}>{rangeLabel} 내려받기</button>
    <button type="button" class="ghost" class:open={showImport} onclick={() => (showImport = !showImport)}>
      {showImport ? '가져오기 닫기' : '가져오기'}
    </button>
  </footer>

  {#if showImport}
    <!-- 여는 버튼 바로 아래에 뜬다. 위쪽에 삽입하면 폰에서 몇 화면 위에 열려
         아무 반응이 없는 것처럼 보인다. -->
    <ImportPanel
      {journal}
      onclose={(message) => {
        showImport = false
        if (message) say(message)
      }}
    />
  {/if}
</main>

{#if toast}
  <div class="toast" role="status">{toast}</div>
{/if}

<style>
  header {
    position: sticky;
    top: 0;
    z-index: 2;
    background: var(--bg);
    border-bottom: 1px solid var(--line);
    /* index.html 이 viewport-fit=cover 라 노치 아래로 파고든다. 그 대가를 여기서 치른다. */
    padding: calc(0.5rem + env(safe-area-inset-top)) calc(0.9rem + env(safe-area-inset-right))
      0.5rem calc(0.9rem + env(safe-area-inset-left));
  }
  header > * {
    max-width: 46rem;
    margin: 0 auto;
  }
  .dates {
    display: flex;
    align-items: center;
    gap: 0.4rem;
  }
  .dates button {
    min-width: 44px;
    height: 44px;
    font-size: 1.2rem;
  }
  .current {
    flex: 1;
    display: flex;
    flex-direction: column;
    align-items: center;
  }
  .current .label {
    font-size: 0.72rem;
    color: var(--dim);
  }
  .current input {
    border: 0;
    background: none;
    color: var(--fg);
    font: inherit;
    font-weight: 600;
    text-align: center;
    padding: 0;
  }
  .sync {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.4rem;
  }
  .sync .today:not(:disabled) {
    border-color: var(--line);
    color: var(--fg);
  }
  .sync .state {
    margin-left: auto;
    text-align: right;
  }
  .count {
    display: inline-block;
    min-width: 1.6em;
    text-align: right;
    font-variant-numeric: tabular-nums;
  }
  .sync button.has {
    border-color: var(--accent);
    color: var(--accent);
    font-weight: 700;
  }
  .state {
    font-size: 0.78rem;
    color: var(--dim);
  }
  .state.warn {
    color: var(--warn-fg);
  }
  main {
    padding: 0.9rem calc(0.9rem + env(safe-area-inset-right)) 0.9rem
      calc(0.9rem + env(safe-area-inset-left));
    max-width: 46rem;
    margin: 0 auto;
  }
  .relogin,
  .banner {
    display: block;
    width: 100%;
    text-align: left;
    border: 1px solid var(--warn);
    background: var(--warn-bg);
    color: var(--warn-fg);
    border-radius: 6px;
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
    margin-bottom: 0.6rem;
  }
  footer button.open {
    border-color: var(--accent);
    color: var(--accent);
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1.5rem 0 1rem;
  }
  main :global(.panel:last-child) {
    margin-bottom: calc(3rem + env(safe-area-inset-bottom));
  }
  .toast {
    position: fixed;
    left: 50%;
    /* 홈 인디케이터(~34px)와 겹치지 않게. */
    bottom: calc(1.5rem + env(safe-area-inset-bottom));
    transform: translateX(-50%);
    background: var(--fg);
    color: var(--bg);
    padding: 0.55rem 1rem;
    border-radius: 999px;
    font-size: 0.85rem;
    z-index: 3;
  }
</style>
