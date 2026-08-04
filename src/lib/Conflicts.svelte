<script>
  // 동기화에서 진 쪽 글자는 버리지 않고 여기 접힌 채로 붙는다 (`D12`, 불변식 3).
  // 펼쳐서 쓸 문장만 옮기고 닫으면 사라진다. **push를 막지는 않는다.**

  import { kstTime } from './date.js'

  /** @type {{journal: import('./state.svelte.js').Journal, target: string}} */
  let { journal, target } = $props()

  let items = $derived(journal.conflictsFor(target))
</script>

{#each items as c (c.id)}
  <details class="conflict">
    <summary>⚠ 충돌 사본 ({kstTime(c.at)})</summary>
    <pre>{c.text}</pre>
    <button
      type="button"
      title="충돌 사본을 닫고 삭제"
      onclick={() => journal.dismissConflict(/** @type {number} */ (c.id))}
    >
      옮겼습니다 — 닫기
    </button>
  </details>
{/each}

<style>
  .conflict {
    margin-top: 0.4rem;
    border: 1px solid var(--warn);
    border-radius: 6px;
    padding: 0.4rem 0.6rem;
    background: var(--warn-bg);
    font-size: 0.85rem;
  }
  summary {
    cursor: pointer;
    color: var(--warn-fg);
  }
  pre {
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0.5rem 0;
    font: inherit;
  }
</style>
