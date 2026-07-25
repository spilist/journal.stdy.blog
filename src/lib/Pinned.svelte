<script>
  // 「잊지 않을 것」. 어느 날짜에서나 보이고, 접혀 있고, 한 번에 펼쳐진다.
  //
  // **제목을 앱이 모른다** (`D10`) — 텍스트가 자기 제목(`# ...`)을 품고 있으므로
  // 「하반기 목표」로 고정할 필요가 없고, 사용자가 언제든 바꾼다.

  import Conflicts from './Conflicts.svelte'

  /** @type {{journal: import('./state.svelte.js').Journal}} */
  let { journal } = $props()

  let rec = $derived(journal.pinned())
  let revisions = $derived(journal.revisions())

  /** 접혀 있을 때 보여줄 한 줄. 첫 번째 `# ` 제목 줄을 쓴다. */
  let title = $derived(
    (rec.data.text.split('\n').find((/** @type {string} */ l) => l.startsWith('# ')) ?? '# 잊지 않을 것')
      .slice(2)
      .trim(),
  )

  let showRevisions = $state(false)

  const PLACEHOLDER = '# 잊지 않을 것\n\n여기에 적는다. 제목도 직접 쓴다.'
</script>

<section class="pinned" class:open={journal.pinnedOpen}>
  <button type="button" class="toggle" onclick={() => (journal.pinnedOpen = !journal.pinnedOpen)}>
    <span class="caret">{journal.pinnedOpen ? '▾' : '▸'}</span>
    <span class="title">{title || '잊지 않을 것'}</span>
  </button>

  {#if journal.pinnedOpen}
    <textarea
      rows="14"
      placeholder={PLACEHOLDER}
      value={rec.data.text}
      oninput={(e) => journal.setPinned(e.currentTarget.value)}
      onblur={() => journal.flush()}
    ></textarea>

    <Conflicts {journal} target="pinned" />

    {#if revisions.length}
      <div class="revisions">
        <button type="button" class="link" onclick={() => (showRevisions = !showRevisions)}>
          변경 내역 {revisions.length}개
        </button>
        {#if showRevisions}
          {#each revisions as rev (rev.key)}
            <details>
              <summary>{rev.key.slice('revision:'.length)}</summary>
              <pre>{rev.data.text}</pre>
            </details>
          {/each}
        {/if}
      </div>
    {/if}
  {/if}
</section>

<style>
  .pinned {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--raised);
    margin-bottom: 1rem;
  }
  .toggle {
    display: flex;
    align-items: center;
    gap: 0.5rem;
    width: 100%;
    padding: 0.85rem 0.9rem;
    background: none;
    border: 0;
    color: var(--fg);
    font-size: 1rem;
    font-weight: 600;
    text-align: left;
    cursor: pointer;
  }
  .caret {
    color: var(--dim);
  }
  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .pinned.open textarea {
    margin: 0 0.9rem 0.9rem;
    width: calc(100% - 1.8rem);
  }
  .revisions {
    padding: 0 0.9rem 0.9rem;
    font-size: 0.85rem;
  }
  .link {
    background: none;
    border: 0;
    padding: 0;
    color: var(--accent);
    cursor: pointer;
    font: inherit;
  }
  .revisions pre {
    white-space: pre-wrap;
    word-break: break-word;
    font: inherit;
    color: var(--dim);
    border-left: 3px solid var(--line);
    padding-left: 0.6rem;
  }
</style>
