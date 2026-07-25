<script>
  // 점수는 라디오로만, 이유는 텍스트로만 편집된다 (`D1`). 두 수단이 같은 값을
  // 건드리지 않으므로 표면이 겹치지 않는다.
  //
  // 10점 1행 + 높이 56px (`D7`). 폭 34px은 권장 터치 타깃(44px)에 못 미치지만 세로를
  // 키워 상쇄한다. 며칠 써보고 거슬리면 5×2행이나 5점으로 내린다 (`P-1`).

  import { kstTime } from './date.js'
  import Conflicts from './Conflicts.svelte'

  /** @type {{journal: import('./state.svelte.js').Journal, dims: readonly string[]}} */
  let { journal, dims } = $props()

  const SCORES = [1, 2, 3, 4, 5, 6, 7, 8, 9, 10]
</script>

<section class="block">
  <h2>에너지</h2>

  {#each dims as dim (dim)}
    {@const rec = journal.energy(dim)}
    <div class="dim">
      <div class="head">
        <span class="name">{dim}</span>
        {#if rec.data.scoredAt}
          <span class="at" title="점수를 매긴 시각">{kstTime(rec.data.scoredAt)}</span>
        {/if}
      </div>

      <div class="scores" role="radiogroup" aria-label="{dim} 점수">
        {#each SCORES as score (score)}
          <button
            type="button"
            role="radio"
            aria-checked={rec.data.score === score}
            class:on={rec.data.score === score}
            onclick={() => journal.toggleScore(dim, score)}
          >{score}</button>
        {/each}
      </div>

      <textarea
        rows="2"
        placeholder="이유"
        value={rec.data.reason}
        oninput={(e) => journal.setReason(dim, e.currentTarget.value)}
        onblur={() => journal.flush()}
      ></textarea>

      <Conflicts {journal} target={rec.key} />
    </div>
  {/each}
</section>

<style>
  .dim + .dim {
    margin-top: 1rem;
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
  .at {
    font-size: 0.75rem;
    color: var(--dim);
  }
  .scores {
    display: grid;
    grid-template-columns: repeat(10, 1fr);
    gap: 2px;
  }
  .scores button {
    height: 56px; /* D7: 폭이 좁은 걸 세로로 상쇄한다 */
    border: 1px solid var(--line);
    background: var(--bg);
    color: var(--fg);
    font-size: 0.9rem;
    font-variant-numeric: tabular-nums;
    cursor: pointer;
    touch-action: manipulation;
  }
  .scores button:first-child {
    border-radius: 6px 0 0 6px;
  }
  .scores button:last-child {
    border-radius: 0 6px 6px 0;
  }
  .scores button.on {
    background: var(--accent);
    border-color: var(--accent);
    color: #fff;
    font-weight: 700;
  }
  textarea {
    margin-top: 0.35rem;
  }
</style>
