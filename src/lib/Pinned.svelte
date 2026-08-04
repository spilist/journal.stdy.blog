<script>
  // 「잊지 않을 것」. 어느 날짜에서나 보이고, 접혀 있고, 한 번에 펼쳐진다.
  //
  // **제목을 앱이 모른다** (`D10`) — 텍스트가 자기 제목(`# ...`)을 품고 있으므로
  // 「하반기 목표」로 고정할 필요가 없고, 사용자가 언제든 바꾼다.

  import Conflicts from './Conflicts.svelte'
  import { autogrow } from './autogrow.js'
  import { kstDate, kstTime, kstTimestamp } from './date.js'
  import { diffLines } from './diff.js'

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

  let showDiff = $state(false)
  let revisionDiffs = $derived(
    showDiff ? revisions.map((revision) => ({ revision, lines: diffLines(revision.data.text, rec.data.text) })) : [],
  )

  function toggleDiff() {
    if (!journal.pinnedOpen) journal.pinnedOpen = true
    showDiff = !showDiff
  }

  const PLACEHOLDER = '# 잊지 않을 것\n\n여기에 적는다. 제목도 직접 쓴다.'
</script>

<section class="pinned" class:open={journal.pinnedOpen}>
  <div class="head">
    <button
      type="button"
      class="toggle"
      aria-expanded={journal.pinnedOpen}
      aria-controls="pinned-content"
      title={journal.pinnedOpen ? '고정 노트 접기' : '고정 노트 펼치기'}
      onclick={() => (journal.pinnedOpen = !journal.pinnedOpen)}
    >
      <span class="caret" aria-hidden="true">{journal.pinnedOpen ? '▾' : '▸'}</span>
      <span class="title">{title || '잊지 않을 것'}</span>
      {#if !journal.pinnedOpen && journal.pinnedConflictCount() > 0}
        <!-- 접혀 있으면 안쪽 사본이 안 보인다. 있다는 사실만은 겉에 남긴다. -->
        <span class="badge">⚠ {journal.pinnedConflictCount()}</span>
      {/if}
    </button>
    {#if revisions.length}
      <button
        type="button"
        class="ghost history-toggle"
        aria-expanded={showDiff}
        aria-controls="pinned-diff"
        title={showDiff ? '고정 노트 본문 보기' : '고정 노트 변경 내역 보기'}
        onclick={toggleDiff}
      >
        {showDiff ? '본문' : '변경 내역'}{showDiff ? '' : ` ${revisions.length}개`}
      </button>
    {/if}
  </div>

  {#if journal.pinnedOpen}
    <div id="pinned-content">
      {#if !showDiff}
        {#if rec.updatedAt}
          <div
            class="at"
            aria-label={`마지막 수정 시각: ${kstTimestamp(rec.updatedAt)}`}
            title={`마지막 수정 시각: ${kstTimestamp(rec.updatedAt)}`}
          >
            마지막 수정 {kstDate(rec.updatedAt)} {kstTime(rec.updatedAt)}
          </div>
        {/if}
        <textarea
          use:autogrow={rec.data.text}
          rows="10"
          aria-label="고정 노트"
          placeholder={PLACEHOLDER}
          value={rec.data.text}
          oninput={(/** @type {Event & {currentTarget: HTMLTextAreaElement}} */ e) => journal.setPinned(e.currentTarget.value)}
          onblur={() => journal.flush()}
        ></textarea>

        <Conflicts {journal} target="pinned" />
      {:else}
        <div id="pinned-diff" class="diff-view" aria-label="고정 노트 변경 내역">
          <p class="diff-note">각 항목은 그날 처음 고치기 전 내용과 현재 내용을 비교합니다.</p>
          {#each revisionDiffs as entry (entry.revision.key)}
            <section class="diff-entry">
              <h3>{entry.revision.key.slice('revision:'.length)} 변경 전</h3>
              <div class="diff" role="list">
                {#each entry.lines as line, i (i)}
                  <div
                    class:added={line.kind === 'added'}
                    class:removed={line.kind === 'removed'}
                    class="diff-line"
                    aria-label={`${line.kind === 'added' ? '추가' : line.kind === 'removed' ? '삭제' : '같음'}: ${line.text || '빈 줄'}`}
                    role="listitem"
                  >
                    <span class="marker" aria-hidden="true">{line.kind === 'added' ? '+' : line.kind === 'removed' ? '-' : ' '}</span>
                    <span aria-hidden="true">{line.text || ' '}</span>
                  </div>
                {/each}
              </div>
            </section>
          {/each}
        </div>
      {/if}
    </div>
  {/if}
</section>

<style>
  .pinned {
    border: 1px solid var(--line);
    border-radius: 8px;
    background: var(--raised);
    margin-bottom: 1rem;
  }
  .head {
    display: flex;
    align-items: stretch;
    gap: 0.25rem;
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
    min-width: 0;
  }
  .history-toggle {
    flex: none;
    min-height: 44px;
    align-self: center;
    padding: 0 0.5rem;
    font-size: 0.8rem;
  }
  .caret {
    color: var(--dim);
  }
  .badge {
    margin-left: auto;
    flex: none;
    font-size: 0.78rem;
    color: var(--warn-fg);
    background: var(--warn-bg);
    border: 1px solid var(--warn);
    border-radius: 999px;
    padding: 0.1rem 0.5rem;
  }
  .title {
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .at {
    padding: 0 0.9rem 0.4rem;
    font-size: 0.75rem;
    color: var(--dim);
  }
  #pinned-content {
    padding-bottom: 0.01rem;
  }
  .pinned.open textarea {
    margin: 0 0.9rem 0.9rem;
    width: calc(100% - 1.8rem);
  }
  .diff-view {
    padding: 0 0.9rem 0.9rem;
  }
  .diff-note {
    margin: 0 0 0.7rem;
    color: var(--dim);
    font-size: 0.8rem;
  }
  .diff-entry + .diff-entry {
    margin-top: 1rem;
  }
  .diff-entry h3 {
    margin: 0 0 0.35rem;
    color: var(--dim);
    font-size: 0.8rem;
    font-weight: 600;
  }
  .diff {
    overflow-x: auto;
    border: 1px solid var(--line);
    border-radius: 6px;
    background: var(--bg);
    font: 0.82rem/1.5 ui-monospace, SFMono-Regular, Menlo, Consolas, monospace;
  }
  .diff-line {
    display: grid;
    grid-template-columns: 1.5rem minmax(0, 1fr);
    min-height: 1.5em;
    padding: 0 0.35rem;
    white-space: pre-wrap;
    overflow-wrap: anywhere;
  }
  .diff-line.added {
    background: color-mix(in srgb, var(--accent) 16%, transparent);
  }
  .diff-line.removed {
    background: color-mix(in srgb, var(--warn) 18%, transparent);
  }
  .marker {
    color: var(--dim);
  }
</style>
