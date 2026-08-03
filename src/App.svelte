<script>
  // 화면 하나. 날짜 이동 · 고정 블록 · 에너지 · 어제 · 오늘.
  // 그래프는 에너지 블록 안에 접혀 있다 (`P-7`).

  import Energy from './lib/Energy.svelte'
  import ImportPanel from './lib/ImportPanel.svelte'
  import LogBlock from './lib/LogBlock.svelte'
  import Pinned from './lib/Pinned.svelte'
  import { dayLabel, kstDate, kstTime } from './lib/date.js'
  import { DIMS, LOG_KINDS } from './lib/markdown.js'
  import { Journal } from './lib/state.svelte.js'

  const journal = new Journal()

  let showImport = $state(false)
  let toast = $state('')

  $effect(() => {
    journal.load().then(() => journal.pullNow())

    // 폰에서 앱을 전환하거나 화면을 끌 때 디바운스 중인 글자를 잃지 않게 한다.
    // 돌아올 때는 반대로 받아온다 — **PC 탭을 열어둔 채 폰에서 고치는 게 실제 루프다.**
    // 로드 때 한 번만 pull하면 그 탭은 영영 낡은 채로 남는다.
    const flush = () => journal.flush()
    const onVisibility = () => {
      if (document.visibilityState === 'hidden') {
        flush()
        return
      }
      // **날짜부터 다시 읽는다.** 자정을 넘겨 돌아오면 여기가 아니면 갱신될 자리가
      // 없어서, 그 화면에서 쓴 「오늘」이 전날에 저장된다.
      journal.refreshToday()
      // **로컬을 서버보다 먼저 다시 읽는다.** 같은 브라우저의 다른 탭이 쓴 판본은
      // 이 경로가 아니면 안 들어오고, 모르는 채로 커밋하면 그 탭의 글자를 덮는다.
      journal.reload().then(() => journal.pullNow({ auto: true }))
    }
    // 오프라인에서 돌아왔을 때. 이게 없이는 `syncState`가 'offline'에 갇혀 있다가
    // 새로고침해야 풀린다.
    const onOnline = () => journal.pullNow({ auto: true })
    document.addEventListener('visibilitychange', onVisibility)
    window.addEventListener('online', onOnline)
    window.addEventListener('pagehide', flush)
    return () => {
      document.removeEventListener('visibilitychange', onVisibility)
      window.removeEventListener('online', onOnline)
      window.removeEventListener('pagehide', flush)
      flush()
    }
  })

  let dirty = $derived(journal.dirtyCount())

  /**
   * 마지막 동기화 시각. **날이 다르면 날짜를 함께 보인다** — 시각만 보이면 어제 아침에
   * 맞춘 걸 오늘 아침으로 읽는다(블록의 기록 시각과 같은 규칙, `F-5`).
   */
  let syncedLabel = $derived.by(() => {
    if (!journal.lastSyncAt) return '동기화 전'
    const day = kstDate(journal.lastSyncAt)
    return `↕ ${day === journal.today ? '' : `${day.slice(5)} `}${kstTime(journal.lastSyncAt)}`
  })

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

  // **내려받기는 늘 전량이다.** S2에서 그래프 창을 범위로 쓰는 결합을 넣었다가
  // 되돌렸다 (사용자 판정 2026-07-26) — 화면 다른 곳의 상태가 이 버튼의 결과를
  // 바꾸는 게 강결합이었다.
  function download() {
    const blob = new Blob([journal.exportAll()], { type: 'text/markdown' })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = `journal-${journal.today}.md`
    // 붙이지 않고 클릭하거나 즉시 revoke 하면 Firefox·iOS Safari에서 조용히 실패한다.
    document.body.appendChild(a)
    a.click()
    a.remove()
    setTimeout(() => URL.revokeObjectURL(url), 10_000)
    // **이 파일에 없는 게 있으면 그 자리에서 말한다.** 충돌 사본은 이 기기 로컬
    // 전용이고(구현 계약 `## Deferred Decisions`) export 형식에도 없다. 그 사실을 안 말하면
    // 「백업을 떴다」가 안전하다는 착각이 되고, 해소 안 한 사본은 기기와 함께 사라진다.
    // **형식을 바꾸지 않는 이유**: 사본은 해소하라고 띄워둔 임시 큐라 오래 살 물건이
    // 아니다 — 파일에 넣으면 그 결정을 뒤집는 것이고, 되읽을 때 붙일 자리도 없다.
    const left = journal.conflicts.length
    say(
      left
        ? `전체 마크다운을 내려받았습니다 — 충돌 사본 ${left}개는 이 파일에 없습니다. 먼저 해소하세요`
        : '전체 마크다운을 내려받았습니다',
    )
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
    <span
      class="state"
      class:warn={journal.syncState === 'relogin' || journal.syncState === 'error'}
    >
      {#if journal.syncState === 'syncing'}동기화 중…
      {:else if journal.syncState === 'offline'}오프라인{journal.syncMessage ? ` · ${journal.syncMessage}` : ''}
      {:else if journal.syncMessage}{journal.syncMessage}
      {:else}
        <!-- **늘 떠 있는 자리.** 토스트는 4초 뒤 사라지므로 그것만으로는 "언제
             마지막으로 맞췄더라"에 답이 없다 (설계 취향 15항). 자동화가 아니라
             사실을 보이게 하는 것이라 불변식 2와 충돌하지 않는다. -->
        <span class="synced" title="마지막으로 서버와 통한 시각">{syncedLabel}</span>
      {/if}
    </span>
  </div>
</header>

<main>
  {#if journal.storageError}
    <p class="banner warn">{journal.storageError}</p>
  {/if}

  <!-- 충돌이 아니라 분기다 — pull은 충돌을 만들지 않는다 (`D3`). 지워지지 않고
       남아야 하므로 사라지는 `syncMessage`가 아니라 배너다. -->
  {#if journal.diverged > 0}
    <p class="banner warn">
      다른 기기에서 고친 {journal.diverged}개를 아직 안 받았습니다 — 여기서도 고쳐서
      갈립니다. 「올리기」를 누르면 정해집니다.
    </p>
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
    <button type="button" class="ghost" onclick={download}>전체 내려받기</button>
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
  .synced {
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
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
    /* 토스트는 알림이지 조작면이 아니다. 이게 없으면 「전체 내려받기」 버튼 위에
       겹쳐 앉아 탭을 먹는다 — 복사 직후 곧바로 내려받는 흐름에서 실제로 걸린다. */
    pointer-events: none;
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
