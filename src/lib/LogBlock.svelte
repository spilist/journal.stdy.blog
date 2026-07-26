<script>
  // 「어제」를 쓸 때 전날의「오늘」을 읽기 전용으로 위에 띄운다 (`D8`).
  // 새 기능이 아니라 이미 있는 데이터를 다른 자리에 보여주는 것뿐이다 — 다시 떠올려
  // 쓰기가 아니라 보면서 회고하기가 된다.

  import Conflicts from './Conflicts.svelte'
  import { autogrow } from './autogrow.js'

  /** @type {{journal: import('./state.svelte.js').Journal, kind: string}} */
  let { journal, kind } = $props()

  let rec = $derived(journal.log(kind))
  let previous = $derived(kind === '어제' ? journal.previousToday() : '')
</script>

<section class="block">
  <h2>{kind}</h2>

  {#if previous}
    <div class="previous">
      <div class="label">전날의 「오늘」</div>
      <pre>{previous}</pre>
    </div>
  {/if}

  <textarea
    use:autogrow={rec.data.text}
    rows="6"
    placeholder="- "
    value={rec.data.text}
    oninput={(/** @type {Event & {currentTarget: HTMLTextAreaElement}} */ e) => journal.setLog(kind, e.currentTarget.value)}
    onblur={() => journal.flush()}
  ></textarea>

  <Conflicts {journal} target={rec.key} />
</section>

<style>
  .previous {
    border-left: 3px solid var(--line);
    padding: 0.1rem 0 0.1rem 0.6rem;
    margin-bottom: 0.6rem;
    color: var(--dim);
  }
  .label {
    font-size: 0.72rem;
    letter-spacing: 0.02em;
    margin-bottom: 0.2rem;
  }
  pre {
    white-space: pre-wrap;
    word-break: break-word;
    margin: 0;
    font: inherit;
    font-size: 0.85rem;
  }
</style>
