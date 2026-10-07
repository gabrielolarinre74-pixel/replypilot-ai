import { For, Show, createMemo, createSignal } from 'solid-js'
import { buildLLMMessages, demoAnswer, streamChat, subjectFor, typewriter } from '@/lib/agent'
import { confidenceOf, extractQuestions, multiSearch } from '@/lib/rag'
import { validateSettings } from '@/lib/settings'
import { triage as runTriage } from '@/lib/triage'
import { makeEntry } from '@/lib/insights'
import { addSnippet, fillSnippet, toTemplate, validateSnippet } from '@/lib/snippets'
import { ConfidenceMeter, TriageBadges } from './Badges'
import Sources from './Sources'
import Alert from './Alert'
import { useClipboard } from './useClipboard'
import type { Accessor, Setter } from 'solid-js'
import type { KnowledgeIndex, SearchHit } from '@/lib/rag'
import type { Settings, Tone } from '@/lib/settings'
import type { LogEntry } from '@/lib/insights'
import type { Snippet } from '@/lib/snippets'

const INBOX = [
  { name: 'Alex Morgan', subject: 'Broken vase', text: 'Hi, my vase arrived cracked and honestly I am disappointed. Can I get a replacement? Also, do you ship to the UK? My sister wants to order one.' },
  { name: 'Jordan Lee', subject: 'Charged twice??', text: 'Hello, I just checked my bank and I was charged twice for order #4471. This is really frustrating. When will the extra charge be removed? I need this fixed today.' },
  { name: 'Priya Shah', subject: 'Hotel order', text: 'Hi team, I manage a boutique hotel and we are looking for 40 linen sets and 25 bedside lamps. Do you offer wholesale pricing, and can you add branded packaging?' },
]
const MAX_EMAIL = 6000
const TONES: { id: Tone, label: string }[] = [{ id: 'friendly', label: 'Friendly' }, { id: 'professional', label: 'Professional' }, { id: 'concise', label: 'Concise' }]
const initials = (n: string) => n.split(/\s+/).map(p => p[0]).join('').slice(0, 2).toUpperCase()

interface Props {
  index: Accessor<KnowledgeIndex>
  settings: Accessor<Settings>
  setSettings: Setter<Settings>
  businessName: Accessor<string>
  snippets: Accessor<Snippet[]>
  setSnippets: Setter<Snippet[]>
  onLog: (e: LogEntry) => void
}

export default (props: Props) => {
  const [active, setActive] = createSignal(0)
  const [email, setEmail] = createSignal(`Subject: ${INBOX[0].subject}\n\n${INBOX[0].text}`)
  const [customer, setCustomer] = createSignal(INBOX[0].name)
  const [draft, setDraft] = createSignal('')
  const [hits, setHits] = createSignal<SearchHit[]>([])
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal('')
  const [saving, setSaving] = createSignal(false)
  const [snippetTitle, setSnippetTitle] = createSignal('')
  const [notice, setNotice] = createSignal('')
  const [pickerOpen, setPickerOpen] = createSignal(false)
  const [copied, copy] = useClipboard()
  const triage = createMemo(() => runTriage(email()))
  const questions = createMemo(() => (email().trim() ? extractQuestions(email().replace(/^subject:.*$/im, '')) : []))
  const confidence = createMemo(() => (hits().length || draft() ? confidenceOf(hits()) : undefined))
  let controller: AbortController | null = null

  const firstName = () => customer().trim().split(/\s+/)[0] || ''
  const vars = () => ({ customer: firstName(), business: props.businessName(), agent: props.settings().agentName })

  const open = (i: number) => {
    setActive(i)
    setEmail(`Subject: ${INBOX[i].subject}\n\n${INBOX[i].text}`)
    setCustomer(INBOX[i].name)
    setDraft('')
    setHits([])
    setError('')
  }

  const generate = async() => {
    const text = email().trim().slice(0, MAX_EMAIL)
    if (text.length < 10) { setError('Paste the customer email first (at least a sentence).'); return }
    const s = props.settings()
    const problem = validateSettings(s)
    if (problem) { setError(problem); return }
    setError('')
    setDraft('')
    setLoading(true)
    controller = new AbortController()
    const body = text.replace(/^subject:.*$/im, '').trim()
    const found = multiSearch(props.index(), body)
    setHits(found)
    const input = { message: body, hits: found, mode: 'email' as const, triage: triage(), settings: s, businessName: props.businessName(), customerName: firstName().slice(0, 60) || undefined }
    try {
      if (s.engine === 'openai')
        await streamChat(s, buildLLMMessages(input), controller.signal, t => setDraft(draft() + t))
      else
        await typewriter(demoAnswer(props.index(), input).text, controller.signal, t => setDraft(draft() + t), 6)
      if (draft()) props.onLog(makeEntry('email', body, triage(), confidenceOf(found), found[0]?.chunk.docTitle))
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Something went wrong.')
    }
    setLoading(false)
  }

  const flash = (m: string) => { setNotice(m); setTimeout(() => setNotice(''), 2200) }
  const saveSnippet = () => {
    const problem = validateSnippet(snippetTitle(), draft())
    if (problem) { setError(problem); return }
    props.setSnippets(addSnippet(props.snippets(), snippetTitle(), toTemplate(draft(), vars())))
    setSaving(false)
    setSnippetTitle('')
    setError('')
    flash('Saved to your replies. Names are stored as placeholders.')
  }
  const useSnippet = (s: Snippet) => {
    setDraft(fillSnippet(s.body, vars()))
    setPickerOpen(false)
    flash(`Inserted “${s.title}”`)
  }

  const subject = () => subjectFor(email(), triage())
  const mailto = () => `mailto:?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(draft())}`

  return (
    <div class="grid h-full min-h-0 gap-4 lg:grid-cols-[260px_minmax(0,1fr)_minmax(0,1fr)]">
      <aside class="surface hidden min-h-0 flex-col overflow-hidden lg:flex">
        <div class="flex items-center justify-between border-b border-ink-100 px-4 py-3">
          <span class="text-sm font-bold text-ink-950">Inbox</span>
          <span class="chip bg-ink-100 text-ink-600">{INBOX.length} samples</span>
        </div>
        <ul class="flex-1 overflow-y-auto p-2">
          <For each={INBOX}>{(m, i) => {
            const t = runTriage(m.text)
            return (
              <li>
                <button class={`w-full rounded-xl p-3 text-left transition ${active() === i() ? 'bg-brand-50 ring-1 ring-brand-200' : 'hover:bg-ink-50'}`} onClick={() => open(i())}>
                  <div class="flex items-center gap-2.5">
                    <span class={`grid h-8 w-8 shrink-0 place-items-center rounded-full text-[11px] font-bold ${active() === i() ? 'bg-brand-600 text-white' : 'bg-ink-100 text-ink-700'}`}>{initials(m.name)}</span>
                    <div class="min-w-0 flex-1">
                      <div class="flex items-center justify-between gap-2">
                        <span class="truncate text-[13px] font-bold text-ink-950">{m.name}</span>
                        <Show when={t.urgency === 'high'}><span class="i-ph-lightning-fill shrink-0 text-amber-500" title="Urgent" /></Show>
                      </div>
                      <div class="truncate text-[12px] font-semibold text-ink-700">{m.subject}</div>
                    </div>
                  </div>
                  <p class="mt-1.5 line-clamp-2 text-[12px] leading-relaxed text-ink-500">{m.text}</p>
                </button>
              </li>
            )
          }}</For>
        </ul>
        <p class="border-t border-ink-100 p-3 text-[11px] leading-relaxed text-ink-400">Fictional sample emails. Paste any real email in the editor to draft a reply.</p>
      </aside>

      <section class="surface flex min-h-0 flex-col overflow-y-auto p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-[15px] font-bold text-ink-950">Customer email</h2>
          <div class="flex rounded-lg bg-ink-100 p-0.5">
            <For each={TONES}>{t => (
              <button class={`rounded-md px-2.5 py-1 text-[12px] font-semibold transition ${props.settings().tone === t.id ? 'bg-white text-ink-950 shadow-sm' : 'text-ink-500 hover:text-ink-900'}`} onClick={() => props.setSettings({ ...props.settings(), tone: t.id })}>{t.label}</button>
            )}</For>
          </div>
        </div>
        <label class="label" for="cust">From</label>
        <input id="cust" class="field mb-3" maxLength={60} value={customer()} onInput={e => setCustomer(e.currentTarget.value)} placeholder="Customer name (optional)" />
        <label class="label" for="email">Message</label>
        <textarea id="email" class="field min-h-52 flex-1 leading-relaxed" maxLength={MAX_EMAIL} value={email()} onInput={e => setEmail(e.currentTarget.value)} placeholder="Paste the customer's email here…" />
        <div class="mt-1 text-right text-[11px] tabular-nums text-ink-400">{email().length.toLocaleString()} / {MAX_EMAIL.toLocaleString()}</div>

        <div class="mt-3 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
          <div class="mb-2.5 flex items-center justify-between">
            <span class="eyebrow">Instant triage</span>
            <span class="text-[11px] text-ink-400">runs locally as you type</span>
          </div>
          <TriageBadges triage={triage()} />
          <Show when={triage().reasons.length}>
            <ul class="mt-2.5 space-y-1 text-[12px] text-ink-700">
              <For each={triage().reasons}>{r => <li class="flex gap-1.5"><span class="i-ph-warning-bold mt-0.5 shrink-0 text-amber-600" />{r}</li>}</For>
            </ul>
          </Show>
          <Show when={questions().length > 1}>
            <div class="mt-3 border-t border-ink-200/70 pt-3 text-[12px] text-ink-600">
              <span class="font-semibold text-ink-900">{questions().length} questions found.</span> The reply answers each one:
              <ol class="mt-1 list-decimal space-y-0.5 pl-4"><For each={questions()}>{q => <li>{q}</li>}</For></ol>
            </div>
          </Show>
        </div>
        <div class="mt-4">
          <Show when={!loading()} fallback={<button class="btn-ghost w-full !h-10" onClick={() => controller?.abort()}><span class="i-ph-stop-fill" />Stop</button>}>
            <button class="btn-blue w-full !h-10" onClick={generate}><span class="i-ph-sparkle-fill" />Draft reply</button>
          </Show>
        </div>
      </section>

      <section class="surface relative flex min-h-0 flex-col overflow-y-auto p-5">
        <div class="mb-4 flex items-center justify-between gap-3">
          <h2 class="text-[15px] font-bold text-ink-950">Reply</h2>
          <div class="flex items-center gap-3">
            <ConfidenceMeter level={confidence()} />
            <div class="relative">
              <button class="btn-ghost !h-8" onClick={() => setPickerOpen(!pickerOpen())} aria-expanded={pickerOpen()}><span class="i-ph-bookmarks-simple-bold" />Saved<span class="chip !px-1.5 bg-ink-100 text-ink-600">{props.snippets().length}</span></button>
              <Show when={pickerOpen()}>
                <div class="rise absolute right-0 top-10 z-20 w-72 rounded-xl bg-white p-1.5 shadow-xl ring-1 ring-ink-200">
                  <For each={props.snippets()} fallback={<p class="p-3 text-[12px] text-ink-500">No saved replies yet. Draft a reply, then use <b>Save as reply</b> to reuse it later.</p>}>{s => (
                    <div class="group flex items-center gap-1 rounded-lg hover:bg-ink-50">
                      <button class="min-w-0 flex-1 px-2.5 py-2 text-left" onClick={() => useSnippet(s)}>
                        <div class="truncate text-[13px] font-semibold text-ink-900">{s.title}</div>
                        <div class="truncate text-[11.5px] text-ink-500">{s.body.replace(/\s+/g, ' ').slice(0, 70)}</div>
                      </button>
                      <button class="btn-icon op-0 group-hover:op-100" title="Delete" aria-label={`Delete ${s.title}`} onClick={() => props.setSnippets(props.snippets().filter(x => x.id !== s.id))}><span class="i-ph-trash-bold" /></button>
                    </div>
                  )}</For>
                </div>
              </Show>
            </div>
          </div>
        </div>
        <Show when={error()}><div class="mb-3"><Alert message={error()} /></div></Show>
        <Show when={draft() || loading()} fallback={
          <div class="dot-grid grid flex-1 place-items-center rounded-xl text-center ring-1 ring-ink-100">
            <div class="max-w-[16rem] p-6">
              <span class="i-ph-envelope-open-bold mx-auto mb-3 block text-3xl text-ink-300" />
              <p class="text-sm font-semibold text-ink-800">Your draft appears here</p>
              <p class="mt-1 text-[12px] text-ink-500">Pick an email, choose a tone and press <b>Draft reply</b>, or insert one of your saved replies.</p>
            </div>
          </div>
        }>
          <div class="flex flex-1 flex-col overflow-hidden rounded-xl ring-1 ring-ink-200">
            <div class="flex items-center gap-2 border-b border-ink-100 bg-ink-50 px-4 py-2.5 text-[13px]">
              <span class="text-ink-400">Subject</span><span class="font-semibold text-ink-900">{subject()}</span>
            </div>
            <textarea class="min-h-64 flex-1 resize-none bg-white p-4 text-[14px] leading-relaxed text-ink-900 outline-none" value={draft()} onInput={e => setDraft(e.currentTarget.value)} aria-label="Reply draft" readOnly={loading()} />
          </div>
          <Show when={!loading() && draft()}>
            <div class="mt-3 flex flex-wrap gap-2">
              <button class="btn-primary" onClick={() => copy(`Subject: ${subject()}\n\n${draft()}`)}><span class={copied() ? 'i-ph-check-bold' : 'i-ph-copy-bold'} />{copied() ? 'Copied' : 'Copy reply'}</button>
              <a class="btn-ghost" href={mailto()}><span class="i-ph-paper-plane-right-bold" />Open in mail</a>
              <button class="btn-ghost" onClick={() => { setSaving(!saving()); setSnippetTitle(subject().replace(/^re:\s*/i, '')) }}><span class="i-ph-bookmark-simple-bold" />Save as reply</button>
              <button class="btn-icon ml-auto" title="Regenerate" aria-label="Regenerate" onClick={generate}><span class="i-ph-arrow-clockwise-bold" /></button>
            </div>
            <Show when={saving()}>
              <div class="rise mt-3 flex gap-2">
                <input class="field" maxLength={80} value={snippetTitle()} onInput={e => setSnippetTitle(e.currentTarget.value)} placeholder="Name this reply, e.g. Damaged item" onKeyDown={e => e.key === 'Enter' && saveSnippet()} />
                <button class="btn-primary" onClick={saveSnippet}>Save</button>
              </div>
            </Show>
            <Show when={triage().escalate}>
              <p class="mt-3 flex gap-2 rounded-lg bg-amber-50 p-3 text-[12px] text-amber-900 ring-1 ring-amber-200"><span class="i-ph-user-switch-bold mt-0.5 shrink-0" /><span><b>Review before sending.</b> This email was flagged for a human: {triage().reasons.join(', ').toLowerCase()}.</span></p>
            </Show>
          </Show>
          <Sources hits={hits()} />
        </Show>
        <Show when={notice()}><div class="rise absolute bottom-4 left-1/2 w-max max-w-[90%] -translate-x-1/2 rounded-lg bg-ink-950 px-3 py-2 text-[12px] font-medium text-white shadow-lg">{notice()}</div></Show>
      </section>
    </div>
  )
}
