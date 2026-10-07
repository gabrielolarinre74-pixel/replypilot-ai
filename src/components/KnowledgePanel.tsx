import { For, Show, createEffect, createMemo, createSignal, onMount } from 'solid-js'
import type { Accessor, Setter } from 'solid-js'
import type { KnowledgeDoc, KnowledgeIndex } from '@/lib/rag'

interface Props {
  docs: Accessor<KnowledgeDoc[]>
  setDocs: Setter<KnowledgeDoc[]>
  index: Accessor<KnowledgeIndex>
  onReset: () => void
  /** a starter document coming from Insights → Knowledge gaps */
  prefill: Accessor<{ title: string, content: string } | null>
  clearPrefill: () => void
}

const MAX_DOC_CHARS = 20000
const MAX_FILE_BYTES = 200_000
const uid = () => `doc-${Math.random().toString(36).slice(2, 9)}`
const wordCount = (s: string) => (s.trim() ? s.trim().split(/\s+/).length : 0)

export default (props: Props) => {
  const [selected, setSelected] = createSignal<string | null>(props.docs()[0]?.id ?? null)
  const [title, setTitle] = createSignal('')
  const [content, setContent] = createSignal('')
  const [filter, setFilter] = createSignal('')
  const [notice, setNotice] = createSignal('')
  const [probe, setProbe] = createSignal('')
  const [view, setView] = createSignal<'edit' | 'test'>('edit')
  const probeHits = createMemo(() => (probe().trim().length > 2 ? props.index().search(probe(), 4) : []))
  const words = createMemo(() => props.docs().reduce((n, d) => n + wordCount(d.content), 0))
  const visible = createMemo(() => {
    const f = filter().toLowerCase().trim()
    return f ? props.docs().filter(d => `${d.title} ${d.content}`.toLowerCase().includes(f)) : props.docs()
  })
  const current = () => props.docs().find(d => d.id === selected())
  const dirty = () => (current() ? current()!.title !== title() || current()!.content !== content() : !!(title() || content()))

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 2600) }
  const select = (d: KnowledgeDoc | null) => {
    setSelected(d?.id ?? null)
    setTitle(d?.title ?? '')
    setContent(d?.content ?? '')
    setView('edit')
  }
  onMount(() => { if (!props.prefill()) select(props.docs()[0] ?? null) })
  // if the selected document disappears (reset, delete, storage load), fall back to the first one
  createEffect(() => { if (selected() && !current()) select(props.docs()[0] ?? null) })

  createEffect(() => {
    const p = props.prefill()
    if (!p) return
    setSelected(null)
    setTitle(p.title)
    setContent(p.content)
    setView('edit')
    props.clearPrefill()
    flash('Starter document created from a knowledge gap. Write the answer, then save.')
  })

  const saveDoc = () => {
    const t = title().trim().slice(0, 120)
    const c = content().trim().slice(0, MAX_DOC_CHARS)
    if (!t || c.length < 20) { flash('Give the document a title and at least a sentence of content.'); return }
    const cur = current()
    if (cur) {
      props.setDocs(props.docs().map(d => (d.id === cur.id ? { ...d, title: t, content: c, updatedAt: Date.now() } : d)))
    } else {
      const doc = { id: uid(), title: t, content: c, updatedAt: Date.now() }
      props.setDocs([...props.docs(), doc])
      setSelected(doc.id)
    }
    flash(`Saved “${t}”. Search index rebuilt.`)
  }

  const remove = () => {
    const d = current()
    if (!d || !confirm(`Delete “${d.title}” from the knowledge base?`)) return
    const rest = props.docs().filter(x => x.id !== d.id)
    props.setDocs(rest)
    select(rest[0] ?? null)
  }

  const onFiles = async(files: FileList | null) => {
    if (!files) return
    const added: KnowledgeDoc[] = []
    const skipped: string[] = []
    for (const f of Array.from(files)) {
      if (!/\.(md|markdown|txt)$/i.test(f.name) || f.size > MAX_FILE_BYTES) { skipped.push(f.name); continue }
      const text = (await f.text()).slice(0, MAX_DOC_CHARS)
      added.push({ id: uid(), title: f.name.replace(/\.(md|markdown|txt)$/i, '').replace(/[-_]+/g, ' '), content: text, updatedAt: Date.now() })
    }
    props.setDocs([...props.docs(), ...added])
    if (added[0]) select(added[0])
    flash(`${added.length} file${added.length === 1 ? '' : 's'} added.${skipped.length ? ` Skipped (only .md/.txt under 200 KB): ${skipped.join(', ')}` : ''}`)
  }

  const exportKb = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(props.docs(), null, 2)], { type: 'application/json' }))
    a.download = 'replypilot-knowledge-base.json'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  return (
    <div class="grid h-full min-h-0 gap-4 lg:grid-cols-[300px_minmax(0,1fr)]">
      <aside class="surface flex min-h-0 flex-col overflow-hidden">
        <div class="border-b border-ink-100 p-3">
          <div class="relative">
            <span class="i-ph-magnifying-glass-bold absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
            <input class="field !pl-9" placeholder="Filter documents" value={filter()} onInput={e => setFilter(e.currentTarget.value)} aria-label="Filter documents" />
          </div>
        </div>
        <ul class="flex-1 overflow-y-auto p-2">
          <For each={visible()} fallback={<li class="p-4 text-center text-[12px] text-ink-500">No documents match.</li>}>{d => (
            <li>
              <button class={`flex w-full items-start gap-2.5 rounded-lg px-3 py-2.5 text-left transition ${selected() === d.id ? 'bg-ink-950 text-white' : 'hover:bg-ink-50'}`} onClick={() => select(d)}>
                <span class={`i-ph-file-text-bold mt-0.5 shrink-0 ${selected() === d.id ? 'text-brand-400' : 'text-ink-400'}`} />
                <span class="min-w-0">
                  <span class="block truncate text-[13px] font-semibold">{d.title}</span>
                  <span class={`block text-[11.5px] ${selected() === d.id ? 'text-ink-400' : 'text-ink-500'}`}>{wordCount(d.content)} words · {props.index().chunks.filter(c => c.docId === d.id).length} passages</span>
                </span>
              </button>
            </li>
          )}</For>
        </ul>
        <div class="space-y-2 border-t border-ink-100 p-3">
          <div class="grid grid-cols-2 gap-2">
            <button class="btn-primary" onClick={() => select(null)}><span class="i-ph-plus-bold" />New</button>
            <label class="btn-ghost cursor-pointer"><span class="i-ph-upload-simple-bold" />Upload<input type="file" class="hidden" multiple accept=".md,.markdown,.txt,text/plain,text/markdown" onChange={e => onFiles(e.currentTarget.files)} /></label>
          </div>
          <div class="flex justify-between text-[11.5px] text-ink-500">
            <button class="hover:text-ink-950" onClick={exportKb}>Export JSON</button>
            <button class="hover:text-red-600" onClick={() => { if (confirm('Replace your documents with the sample store?')) { props.onReset(); setSelected(null); setTitle(''); setContent('') } }}>Reset to sample</button>
          </div>
        </div>
      </aside>

      <section class="surface relative flex min-h-0 flex-col overflow-hidden">
        <header class="flex flex-wrap items-center justify-between gap-3 border-b border-ink-100 px-5 py-3">
          <div class="flex rounded-lg bg-ink-100 p-0.5">
            <button class={`rounded-md px-3 py-1 text-[12.5px] font-semibold transition ${view() === 'edit' ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-500'}`} onClick={() => setView('edit')}>Editor</button>
            <button class={`rounded-md px-3 py-1 text-[12.5px] font-semibold transition ${view() === 'test' ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-500'}`} onClick={() => setView('test')}>Retrieval test</button>
          </div>
          <div class="text-[12px] text-ink-500">{props.docs().length} documents · {props.index().chunks.length} passages · {words().toLocaleString()} words · stored in this browser</div>
        </header>

        <Show when={view() === 'edit'} fallback={
          <div class="flex-1 overflow-y-auto p-5">
            <p class="mb-3 text-[13px] text-ink-500">Type a customer question to see exactly which passages the agent would read, and how strongly each one matches.</p>
            <div class="relative">
              <span class="i-ph-chat-centered-text-bold absolute left-3 top-1/2 -translate-y-1/2 text-ink-400" />
              <input class="field !h-11 !pl-9" placeholder="e.g. do you deliver to Canada?" value={probe()} onInput={e => setProbe(e.currentTarget.value)} aria-label="Test question" />
            </div>
            <ol class="mt-4 space-y-2.5">
              <For each={probeHits()} fallback={
                <li class="rounded-xl border border-dashed border-ink-200 p-6 text-center text-[13px] text-ink-500">
                  <Show when={probe().trim().length > 2} fallback="Results appear as you type.">No passage matches, so the agent would hand this question to a human.</Show>
                </li>
              }>{(h, i) => (
                <li class="rise rounded-xl bg-white p-4 ring-1 ring-ink-200">
                  <div class="mb-2 flex items-center justify-between gap-3">
                    <span class="flex items-center gap-2 text-[13px] font-semibold text-ink-950"><span class="grid h-5 w-5 place-items-center rounded bg-brand-100 text-[11px] font-bold text-brand-700">{i() + 1}</span>{h.chunk.docTitle}</span>
                    <span class="text-[11.5px] tabular-nums text-ink-500">score {h.score.toFixed(2)}</span>
                  </div>
                  <div class="mb-2 h-1.5 overflow-hidden rounded-full bg-ink-100"><div class="h-full rounded-full bg-gradient-to-r from-brand-500 to-brand-400" style={{ width: `${Math.round(h.coverage * 100)}%` }} /></div>
                  <p class="text-[13px] leading-relaxed text-ink-600">{h.chunk.text}</p>
                </li>
              )}</For>
            </ol>
          </div>
        }>
          <div class="flex flex-1 flex-col overflow-y-auto p-5">
            <input class="mb-1 w-full bg-transparent text-xl font-bold tracking-tight text-ink-950 outline-none placeholder:text-ink-300" placeholder="Untitled document" value={title()} maxLength={120} onInput={e => setTitle(e.currentTarget.value)} aria-label="Document title" />
            <div class="mb-4 text-[12px] text-ink-400">{current() ? `Last edited ${new Date(current()!.updatedAt || Date.now()).toLocaleDateString()}` : 'New document'} · {wordCount(content())} words</div>
            <textarea class="min-h-80 flex-1 resize-none bg-transparent text-[14px] leading-7 text-ink-800 outline-none placeholder:text-ink-300" placeholder="Paste a policy, FAQ or product details. Separate topics with blank lines so each becomes its own searchable passage." value={content()} maxLength={MAX_DOC_CHARS} onInput={e => setContent(e.currentTarget.value)} aria-label="Document content" />
          </div>
          <footer class="flex items-center justify-between gap-2 border-t border-ink-100 bg-ink-50/60 px-5 py-3">
            <Show when={current()} fallback={<span />}>
              <button class="btn-icon hover:(!bg-red-50 !text-red-600)" title="Delete document" aria-label="Delete document" onClick={remove}><span class="i-ph-trash-bold" /></button>
            </Show>
            <div class="flex items-center gap-3">
              <Show when={dirty()}><span class="text-[12px] text-ink-500">Unsaved changes</span></Show>
              <button class="btn-blue" onClick={saveDoc} disabled={!dirty()}><span class="i-ph-check-bold" />Save document</button>
            </div>
          </footer>
        </Show>
        <Show when={notice()}><div class="rise absolute bottom-16 left-1/2 -translate-x-1/2 whitespace-nowrap rounded-lg bg-ink-950 px-3 py-2 text-[12px] font-medium text-white shadow-lg">{notice()}</div></Show>
      </section>
    </div>
  )
}
