<script>
  // import는 **미리보기를 먼저 낸다** (불변식 3). 해석 못 한 줄과 이미 내용이 있어
  // 건너뛸 것을 보여주고, 사용자가 확인해야 쓴다. 저널은 다시 못 쓴다.
  //
  // 이게 **마지막 복붙**이다.

  /** @type {{journal: import('./state.svelte.js').Journal, onclose: () => void}} */
  let { journal, onclose } = $props()

  let text = $state('')
  /** @type {ReturnType<import('./state.svelte.js').Journal['previewImport']> | null} */
  let preview = $state(null)
  let busy = $state(false)

  const PLACEHOLDER = '# 26-03-01\n\n## 에너지\n- 인지: 8. ...'

  /** @type {HTMLElement | undefined} */
  let root = $state()

  // 이 패널은 화면 위쪽에 열리는데 여는 버튼은 맨 아래에 있다. 폰에서는 몇 화면
  // 위에 열려서 아무 반응이 없는 것처럼 보인다.
  $effect(() => {
    root?.scrollIntoView({ behavior: 'smooth', block: 'start' })
  })

  /** @param {Event} e */
  async function pickFile(e) {
    const input = /** @type {HTMLInputElement} */ (e.currentTarget)
    const file = input.files?.[0]
    if (!file) return
    text = await file.text()
    preview = journal.previewImport(text)
  }

  async function apply() {
    if (!preview) return
    busy = true
    await journal.applyImport(preview.writes)
    busy = false
    onclose()
  }
</script>

<div class="panel" bind:this={root}>
  <h2>가져오기</h2>
  <p class="note">
    마크다운을 붙여넣거나 파일을 고릅니다. <strong>미리 보고 확인해야 저장됩니다.</strong>
  </p>

  <input type="file" accept=".md,text/markdown,text/plain" onchange={pickFile} />

  <textarea
    rows="6"
    placeholder={PLACEHOLDER}
    bind:value={text}
    oninput={() => (preview = null)}
  ></textarea>

  <div class="row">
    <button type="button" onclick={() => (preview = journal.previewImport(text))} disabled={!text.trim()}>
      미리보기
    </button>
    <button type="button" class="ghost" onclick={onclose}>닫기</button>
  </div>

  {#if preview}
    <div class="preview">
      <p><strong>{preview.days}일치</strong> · 쓸 항목 {preview.writes.length}개</p>

      {#if preview.skipped.length}
        <details open>
          <summary>이미 내용이 있어 건너뜁니다 — {preview.skipped.length}개</summary>
          <ul>
            {#each preview.skipped as s (s)}<li>{s}</li>{/each}
          </ul>
        </details>
      {/if}

      {#if preview.unparsed.length}
        <details open>
          <summary>해석하지 못한 줄 — {preview.unparsed.length}개 (저장되지 않습니다)</summary>
          <ul>
            {#each preview.unparsed as u, i (i)}
              <li><code>{u.line}</code> <span class="dim">— {u.where}</span></li>
            {/each}
          </ul>
        </details>
      {/if}

      <button type="button" class="primary" onclick={apply} disabled={busy || !preview.writes.length}>
        {busy ? '쓰는 중…' : `${preview.writes.length}개 저장`}
      </button>
    </div>
  {/if}
</div>

<style>
  .panel {
    border: 1px solid var(--line);
    border-radius: 8px;
    padding: 0.9rem;
    background: var(--raised);
    margin-bottom: 1rem;
  }
  .note {
    font-size: 0.85rem;
    color: var(--dim);
    margin: 0 0 0.6rem;
  }
  .row {
    display: flex;
    gap: 0.5rem;
    margin-top: 0.5rem;
  }
  .preview {
    margin-top: 0.8rem;
    font-size: 0.85rem;
  }
  ul {
    margin: 0.4rem 0;
    padding-left: 1.2rem;
  }
  code {
    word-break: break-all;
  }
  .dim {
    color: var(--dim);
  }
  input[type='file'] {
    display: block;
    margin-bottom: 0.6rem;
    font-size: 0.85rem;
  }
</style>
