import { For, Show, createMemo, createSignal } from 'solid-js'
import { buildLLMMessages, demoAnswer, streamChat, subjectFor, typewriter } from '@/lib/agent'
import { confidenceOf, extractQuestions, multiSearch } from '@/lib/rag'
import { validateSettings } from '@/lib/settings'
import { triage as runTriage } from '@/lib/triage'
import { ConfidenceChip, TriageBadges } from './Badges'
import Sources from './Sources'
import ErrorMessageItem from './ErrorMessageItem'
import { useClipboard } from './useClipboard'
import type { Accessor, Setter } from 'solid-js'
import type { KnowledgeIndex, SearchHit } from '@/lib/rag'
import type { Settings, Tone } from '@/lib/settings'

const SAMPLES = [
  { name: 'Alex', text: 'Subject: Broken vase\n\nHi, my vase arrived cracked and honestly I am disappointed. Can I get a replacement? Also, do you ship to the UK? My sister wants to order one.' },
  { name: 'Jordan', text: 'Subject: Charged twice??\n\nHello, I just checked my bank and I was charged twice for order #4471. This is really frustrating. When will the extra charge be removed? I need this fixed today.' },
  { name: 'Priya', text: 'Subject: Hotel order\n\nHi team, I manage a boutique hotel and we are looking for 40 linen sets and 25 bedside lamps. Do you offer wholesale pricing, and can you add branded packaging?' },
]
const MAX_EMAIL = 6000

interface Props {
  index: Accessor<KnowledgeIndex>
  settings: Accessor<Settings>
  setSettings: Setter<Settings>
  businessName: Accessor<string>
}

export default (props: Props) => {
  const [email, setEmail] = createSignal(SAMPLES[0].text)
  const [customer, setCustomer] = createSignal(SAMPLES[0].name)
  const [draft, setDraft] = createSignal('')
  const [hits, setHits] = createSignal<SearchHit[]>([])
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal('')
  const [copied, copy] = useClipboard()
  const triage = createMemo(() => runTriage(email()))
  const questions = createMemo(() => (email().trim() ? extractQuestions(email().replace(/^subject:.*$/im, '')) : []))
  const confidence = createMemo(() => (hits().length || draft() ? confidenceOf(hits()) : undefined))
  let controller: AbortController | null = null

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
    const input = { message: body, hits: found, mode: 'email' as const, triage: triage(), settings: s, businessName: props.businessName(), customerName: customer().trim().slice(0, 60) || undefined }
    try {
      if (s.engine === 'openai')
        await streamChat(s, buildLLMMessages(input), controller.signal, t => setDraft(draft() + t))
      else
        await typewriter(demoAnswer(props.index(), input).text, controller.signal, t => setDraft(draft() + t), 6)
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Something went wrong.')
    }
    setLoading(false)
  }

  const subject = () => subjectFor(email(), triage())
  const mailto = () => `mailto:?subject=${encodeURIComponent(subject())}&body=${encodeURIComponent(draft())}`

  return (
    <div class="grid lg:grid-cols-2 gap-5">
      <section class="card p-5 space-y-4">
        <div class="flex items-center justify-between">
          <h2 class="font-bold text-lg flex items-center gap-2"><span class="i-ph-envelope-simple-open-bold text-brand-500" />Incoming email</h2>
          <div class="flex gap-1">
            <For each={SAMPLES}>{(s, i) => (
              <button class="chip bg-slate-100 hover:bg-slate-200 dark:(bg-ink-700 hover:bg-ink-600) cursor-pointer" onClick={() => { setEmail(s.text); setCustomer(s.name); setDraft(''); setHits([]) }}>Sample {i() + 1}</button>
            )}</For>
          </div>
        </div>
        <div class="grid grid-cols-2 gap-3">
          <div>
            <label class="label" for="cust">Customer name</label>
            <input id="cust" class="field" maxLength={60} value={customer()} onInput={e => setCustomer(e.currentTarget.value)} placeholder="Optional" />
          </div>
          <div>
            <label class="label" for="tone">Tone</label>
            <select id="tone" class="field" value={props.settings().tone} onChange={e => props.setSettings({ ...props.settings(), tone: e.currentTarget.value as Tone })}>
              <option value="friendly">Friendly</option>
              <option value="professional">Professional</option>
              <option value="concise">Concise</option>
            </select>
          </div>
        </div>
        <div>
          <label class="label" for="email">Email body</label>
          <textarea id="email" class="field min-h-56 leading-relaxed" maxLength={MAX_EMAIL} value={email()} onInput={e => setEmail(e.currentTarget.value)} placeholder="Paste the customer's email here…" />
          <div class="text-right text-xs text-slate-400 mt-1">{email().length}/{MAX_EMAIL}</div>
        </div>
        <div class="rounded-xl bg-slate-50 dark:bg-ink-900/50 p-4 space-y-3">
          <div class="text-xs font-semibold uppercase tracking-wide text-slate-500">Instant triage</div>
          <TriageBadges triage={triage()} />
          <Show when={triage().reasons.length}>
            <ul class="text-xs text-rose-600 dark:text-rose-300 list-disc pl-4">
              <For each={triage().reasons}>{r => <li>{r}</li>}</For>
            </ul>
          </Show>
          <Show when={questions().length > 1}>
            <div class="text-xs text-slate-500">
              <span class="font-semibold">{questions().length} questions detected</span>, each one is answered:
              <ol class="list-decimal pl-4 mt-1 space-y-0.5"><For each={questions()}>{q => <li>{q}</li>}</For></ol>
            </div>
          </Show>
        </div>
        <Show when={!loading()} fallback={<button class="btn-ghost w-full" onClick={() => controller?.abort()}><span class="i-ph-stop-fill" />Stop</button>}>
          <button class="btn-primary w-full !h-11" onClick={generate}><span class="i-ph-magic-wand-bold" />Draft reply</button>
        </Show>
      </section>

      <section class="card p-5 flex flex-col">
        <div class="flex items-center justify-between mb-4">
          <h2 class="font-bold text-lg flex items-center gap-2"><span class="i-ph-pencil-simple-line-bold text-brand-500" />Draft reply</h2>
          <ConfidenceChip level={confidence()} />
        </div>
        <Show when={error()}><ErrorMessageItem message={error()} /></Show>
        <Show when={draft() || loading()} fallback={
          <div class="flex-1 grid place-items-center text-center text-sm text-slate-400 py-16">
            <div><div class="i-ph-tray-bold text-4xl mx-auto mb-2" />Your draft will appear here.<br />Review it, then copy it into your inbox.</div>
          </div>
        }>
          <div class="rounded-xl border border-slate-200 dark:border-ink-600 overflow-hidden flex-1 flex flex-col">
            <div class="px-4 py-2.5 bg-slate-50 dark:bg-ink-900/60 text-sm border-b border-slate-200 dark:border-ink-600"><span class="text-slate-400">Subject:</span> <span class="font-medium">{subject()}</span></div>
            <pre class="flex-1 whitespace-pre-wrap font-sans text-sm leading-relaxed p-4">{draft()}<Show when={loading()}><span class="inline-block w-2 h-4 bg-brand-500 animate-pulse align-middle ml-0.5" /></Show></pre>
          </div>
          <Show when={!loading() && draft()}>
            <div class="flex flex-wrap gap-2 mt-4">
              <button class="btn-primary" onClick={() => copy(`Subject: ${subject()}\n\n${draft()}`)}><span class={copied() ? 'i-ph-check-bold' : 'i-ph-copy-bold'} />{copied() ? 'Copied' : 'Copy reply'}</button>
              <a class="btn-ghost" href={mailto()}><span class="i-ph-envelope-bold" />Open in mail app</a>
              <button class="btn-ghost" onClick={generate}><span class="i-ph-arrows-clockwise-bold" />Regenerate</button>
            </div>
            <Show when={triage().escalate}>
              <p class="mt-3 text-xs rounded-lg bg-rose-50 text-rose-700 dark:(bg-rose-500/10 text-rose-300) p-3"><b>Flagged for a human:</b> review this one personally before sending.</p>
            </Show>
          </Show>
          <Sources hits={hits()} />
        </Show>
      </section>
    </div>
  )
}
