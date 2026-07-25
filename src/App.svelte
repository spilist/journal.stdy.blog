<script>
  // 화면 하나. 날짜 이동 · 고정 블록 · 에너지 · 어제 · 오늘.
  // 그래프는 S2다.

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

  function download() {
    const blob = new Blob([journal.exportAll()], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `journal-${journal.today}.md`
    a.click()
    URL.revokeObjectURL(url)
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
    {#if journal.date !== journal.today}
      <button type="button" class="ghost today" onclick={() => journal.goToday()}>오늘</button>
    {/if}
  </nav>

  <div class="sync">
    <!-- 동기화는 사람이 누른다 (불변식 2). 미동기화를 보이게 하는 건 자동화가 아니다. -->
    <button type="button" class:has={dirty > 0} onclick={() => journal.pushNow()}>
      ↑ 올리기{dirty > 0 ? ` ${dirty}` : ''}
    </button>
    <span class="state" class:warn={journal.syncState === 'relogin'}>
      {#if journal.syncState === 'syncing'}동기화 중…
      {:else if journal.syncState === 'offline'}오프라인
      {:else}{journal.syncMessage}{/if}
    </span>
  </div>
</header>

<main>
  {#if journal.syncState === 'relogin'}
    <p class="relogin">로그인이 만료됐습니다. <a href={location.pathname}>새로고침</a>하면 다시 로그인합니다.</p>
  {/if}

  <Pinned {journal} />

  {#if showImport}
    <ImportPanel {journal} onclose={() => (showImport = false)} />
  {/if}

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
    <button type="button" class="ghost" onclick={download}>전체 내려받기</button>
    <button type="button" class="ghost" onclick={() => (showImport = !showImport)}>가져오기</button>
  </footer>
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
    padding: 0.5rem 0.9rem;
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
  .today {
    height: 44px;
  }
  .sync {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    margin-top: 0.4rem;
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
    padding: 0.9rem;
    max-width: 46rem;
    margin: 0 auto;
  }
  .relogin {
    border: 1px solid var(--warn);
    background: var(--warn-bg);
    color: var(--warn-fg);
    border-radius: 6px;
    padding: 0.6rem 0.8rem;
    font-size: 0.9rem;
  }
  footer {
    display: flex;
    flex-wrap: wrap;
    gap: 0.5rem;
    margin: 1.5rem 0 3rem;
  }
  .toast {
    position: fixed;
    left: 50%;
    bottom: 1.5rem;
    transform: translateX(-50%);
    background: var(--fg);
    color: var(--bg);
    padding: 0.55rem 1rem;
    border-radius: 999px;
    font-size: 0.85rem;
    z-index: 3;
  }
</style>
