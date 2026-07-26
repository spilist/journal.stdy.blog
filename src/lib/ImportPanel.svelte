<script>
  // import는 **미리보기를 먼저 낸다** (불변식 3). 해석 못 한 줄과 이미 내용이 있어
  // 건너뛸 것을 보여주고, 사용자가 확인해야 쓴다. 저널은 다시 못 쓴다.
  //
  // 이게 **마지막 복붙**이다.

  import { autogrow } from './autogrow.js'

  /** @type {{journal: import('./state.svelte.js').Journal, onclose: (message?: string) => void}} */
  let { journal, onclose } = $props()

  let text = $state('')
  /** @type {ReturnType<import('./state.svelte.js').Journal['previewImport']> | null} */
  let preview = $state(null)
  let busy = $state(false)

  const PLACEHOLDER = '# 26-03-01\n\n## 에너지\n- 인지: 8. ...'

  /** @type {HTMLElement | undefined} */
  let root = $state()

  // 여는 버튼 바로 아래에 뜨지만, 긴 화면에서는 접힌 부분에 열릴 수 있다.
  $effect(() => {
    root?.scrollIntoView({ behavior: 'smooth', block: 'nearest' })
  })

  /** @param {Event} e */
  async function pickFile(e) {
    const input = /** @type {HTMLInputElement} */ (e.currentTarget)
    const file = input.files?.[0]
    if (!file) return
    text = await file.text()
    preview = journal.previewImport(text)
  }

  let error = $state('')

  async function apply() {
    if (!preview) return
    busy = true
    error = ''
    const count = preview.writes.length
    try {
      await journal.applyImport(preview.writes)
      onclose(`${count}개를 저장했습니다. 「↑ 올리기」를 눌러야 서버로 갑니다`)
    } catch (err) {
      // 실패를 삼키면 「쓰는 중…」으로 굳고 몇 개가 쓰였는지 알 수 없다.
      // `putRecords`는 트랜잭션이라 실제로는 전부 무산이다.
      error = `저장하지 못했습니다 — 아무것도 쓰이지 않았습니다 (${err})`
    } finally {
      busy = false
    }
  }
</script>

<div class="panel" bind:this={root}>
  <h2>가져오기</h2>
  <p class="note">
    마크다운을 붙여넣거나 파일을 고릅니다. <strong>미리 보고 확인해야 저장됩니다.</strong>
  </p>

  <input type="file" accept=".md,text/markdown,text/plain" onchange={pickFile} />

  <textarea
    use:autogrow={text}
    rows="6"
    placeholder={PLACEHOLDER}
    bind:value={text}
    oninput={() => (preview = null)}
  ></textarea>

  <div class="row">
    <button type="button" onclick={() => (preview = journal.previewImport(text))} disabled={!text.trim()}>
      미리보기
    </button>
    <button type="button" class="ghost" onclick={() => onclose()}>닫기</button>
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
      {#if error}<p class="error">{error}</p>{/if}
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
  .error {
    border: 1px solid var(--warn);
    background: var(--warn-bg);
    color: var(--warn-fg);
    border-radius: 6px;
    padding: 0.5rem 0.7rem;
  }
  input[type='file'] {
    display: block;
    margin-bottom: 0.6rem;
    font-size: 0.85rem;
  }
</style>
