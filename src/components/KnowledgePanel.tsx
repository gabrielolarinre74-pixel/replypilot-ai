import { For, Show, createMemo, createSignal } from 'solid-js'
import type { Accessor, Setter } from 'solid-js'
import type { KnowledgeDoc, KnowledgeIndex } from '@/lib/rag'

interface Props {
  docs: Accessor<KnowledgeDoc[]>
  setDocs: Setter<KnowledgeDoc[]>
  index: Accessor<KnowledgeIndex>
  onReset: () => void
}

const MAX_DOC_CHARS = 20000
const MAX_FILE_BYTES = 200_000
const uid = () => `doc-${Math.random().toString(36).slice(2, 9)}`

export default (props: Props) => {
  const [editing, setEditing] = createSignal<KnowledgeDoc | null>(null)
  const [title, setTitle] = createSignal('')
  const [content, setContent] = createSignal('')
  const [notice, setNotice] = createSignal('')
  const [probe, setProbe] = createSignal('')
  const probeHits = createMemo(() => (probe().trim().length > 2 ? props.index().search(probe(), 3) : []))
  const words = createMemo(() => props.docs().reduce((n, d) => n + d.content.split(/\s+/).length, 0))

  const startNew = () => { setEditing({ id: '', title: '', content: '' }); setTitle(''); setContent('') }
  const startEdit = (d: KnowledgeDoc) => { setEditing(d); setTitle(d.title); setContent(d.content) }

  const saveDoc = () => {
    const t = title().trim().slice(0, 120)
    const c = content().trim().slice(0, MAX_DOC_CHARS)
    if (!t || c.length < 20) { setNotice('Give the document a title and at least a sentence of content.'); return }
    const cur = editing()!
    if (cur.id) props.setDocs(props.docs().map(d => (d.id === cur.id ? { ...d, title: t, content: c, updatedAt: Date.now() } : d)))
    else props.setDocs([...props.docs(), { id: uid(), title: t, content: c, updatedAt: Date.now() }])
    setEditing(null)
    setNotice(`Saved "${t}". The index was rebuilt instantly.`)
  }

  const remove = (d: KnowledgeDoc) => {
    if (confirm(`Delete "${d.title}" from the knowledge base?`)) props.setDocs(props.docs().filter(x => x.id !== d.id))
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
    setNotice(`${added.length} file(s) added.${skipped.length ? ` Skipped (only .md/.txt under 200 KB): ${skipped.join(', ')}` : ''}`)
  }

  const exportKb = () => {
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([JSON.stringify(props.docs(), null, 2)], { type: 'application/json' }))
    a.download = 'replypilot-knowledge-base.json'
    a.click()
  }

  return (
    <div class="grid lg:grid-cols-[1fr_360px] gap-5">
      <section class="card p-5">
        <div class="flex flex-wrap items-center justify-between gap-3 mb-4">
          <div>
            <h2 class="font-bold text-lg flex items-center gap-2"><span class="i-ph-books-bold text-brand-500" />Knowledge base</h2>
            <p class="text-sm text-slate-500">{props.docs().length} documents · {props.index().chunks.length} searchable passages · {words().toLocaleString()} words. Stored in this browser only.</p>
          </div>
          <div class="flex flex-wrap gap-2">
            <label class="btn-ghost cursor-pointer"><span class="i-ph-upload-simple-bold" />Upload .md / .txt<input type="file" class="hidden" multiple accept=".md,.markdown,.txt,text/plain,text/markdown" onChange={e => onFiles(e.currentTarget.files)} /></label>
            <button class="btn-primary" onClick={startNew}><span class="i-ph-plus-bold" />New document</button>
          </div>
        </div>
        <Show when={notice()}><div class="mb-3 text-sm rounded-lg bg-brand-50 text-brand-700 dark:(bg-brand-500/10 text-brand-100) px-3 py-2">{notice()}</div></Show>

        <Show when={editing()}>
          <div class="rounded-xl border-2 border-brand-400/60 p-4 mb-4 space-y-3">
            <input class="field font-semibold" placeholder="Title, e.g. Refund policy" value={title()} maxLength={120} onInput={e => setTitle(e.currentTarget.value)} />
            <textarea class="field min-h-48 leading-relaxed" placeholder="Paste the policy, FAQ or product info. Separate topics with blank lines." value={content()} maxLength={MAX_DOC_CHARS} onInput={e => setContent(e.currentTarget.value)} />
            <div class="flex justify-end gap-2"><button class="btn-ghost" onClick={() => setEditing(null)}>Cancel</button><button class="btn-primary" onClick={saveDoc}>Save document</button></div>
          </div>
        </Show>

        <div class="grid sm:grid-cols-2 gap-3">
          <For each={props.docs()}>{d => (
            <article class="group rounded-xl border border-slate-200 dark:border-ink-600 p-4 hover:(border-brand-400/60 shadow-md) transition">
              <div class="flex items-start justify-between gap-2">
                <h3 class="font-semibold">{d.title}</h3>
                <div class="flex gap-1 op-60 group-hover:op-100">
                  <button class="p-1.5 rounded-lg hover:bg-slate-100 dark:hover:bg-ink-600" title="Edit" onClick={() => startEdit(d)}><span class="i-ph-pencil-simple-bold" /></button>
                  <button class="p-1.5 rounded-lg hover:bg-rose-50 text-rose-500 dark:hover:bg-rose-500/10" title="Delete" onClick={() => remove(d)}><span class="i-ph-trash-bold" /></button>
                </div>
              </div>
              <p class="text-sm text-slate-500 mt-1 line-clamp-3">{d.content}</p>
              <div class="text-xs text-slate-400 mt-2">{d.content.split(/\s+/).length} words · {(n => `${n} passage${n === 1 ? "" : "s"}`)(props.index().chunks.filter(c => c.docId === d.id).length)}</div>
            </article>
          )}</For>
        </div>
        <div class="flex gap-4 mt-5 text-sm">
          <button class="text-slate-500 hover:text-brand-600 flex items-center gap-1" onClick={exportKb}><span class="i-ph-download-simple-bold" />Export as JSON</button>
          <button class="text-slate-500 hover:text-rose-600 flex items-center gap-1" onClick={() => confirm('Replace your documents with the sample store?') && props.onReset()}><span class="i-ph-arrow-counter-clockwise-bold" />Reset to sample data</button>
        </div>
      </section>

      <aside class="card p-5 h-fit lg:sticky lg:top-6">
        <h3 class="font-bold flex items-center gap-2"><span class="i-ph-magnifying-glass-bold text-brand-500" />Retrieval tester</h3>
        <p class="text-sm text-slate-500 mb-3">See exactly which passages the agent would use for a question.</p>
        <input class="field" placeholder="e.g. do you deliver to Canada?" value={probe()} onInput={e => setProbe(e.currentTarget.value)} />
        <ol class="mt-3 space-y-2">
          <For each={probeHits()} fallback={<li class="text-sm text-slate-400"><Show when={probe().trim().length > 2} fallback="Type a question to test.">No passage matches. The agent would hand this off to a human.</Show></li>}>{(h, i) => (
            <li class="rounded-lg bg-slate-50 dark:bg-ink-900/60 p-3 text-xs">
              <div class="flex justify-between font-semibold mb-1"><span>[{i() + 1}] {h.chunk.docTitle}</span><span class="text-slate-400 tabular-nums">{h.score.toFixed(2)}</span></div>
              <div class="h-1.5 rounded-full bg-slate-200 dark:bg-ink-600 mb-2 overflow-hidden"><div class="h-full bg-brand-500" style={{ width: `${Math.round(h.coverage * 100)}%` }} /></div>
              <p class="text-slate-500 line-clamp-4">{h.chunk.text}</p>
            </li>
          )}</For>
        </ol>
      </aside>
    </div>
  )
}
