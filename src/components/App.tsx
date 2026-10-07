import { For, Match, Show, Switch, createEffect, createMemo, createSignal, onCleanup, onMount } from 'solid-js'
import { KnowledgeIndex } from '@/lib/rag'
import { SAMPLE_BUSINESS, SAMPLE_DOCS } from '@/lib/sampleKnowledge'
import { DEFAULT_SETTINGS, load, save } from '@/lib/settings'
import { appendLog, knowledgeGaps } from '@/lib/insights'
import ChatPanel from './ChatPanel'
import EmailPanel from './EmailPanel'
import KnowledgePanel from './KnowledgePanel'
import InsightsPanel from './InsightsPanel'
import SettingsDialog from './SettingsDialog'
import type { KnowledgeDoc } from '@/lib/rag'
import type { Settings } from '@/lib/settings'
import type { LogEntry } from '@/lib/insights'
import type { Snippet } from '@/lib/snippets'

type View = 'chat' | 'email' | 'kb' | 'insights'

const VIEWS: { id: View, label: string, icon: string, title: string, sub: string, key: string }[] = [
  { id: 'chat', label: 'Live chat', icon: 'i-ph-chats-teardrop-bold', title: 'Live chat', sub: 'Answer website visitors instantly, with sources for every fact.', key: '1' },
  { id: 'email', label: 'Email replies', icon: 'i-ph-envelope-simple-bold', title: 'Email replies', sub: 'Turn a customer email into a ready-to-send, on-brand reply.', key: '2' },
  { id: 'kb', label: 'Knowledge base', icon: 'i-ph-books-bold', title: 'Knowledge base', sub: 'The policies and FAQs the agent is allowed to answer from.', key: '3' },
  { id: 'insights', label: 'Insights', icon: 'i-ph-chart-line-up-bold', title: 'Insights', sub: 'What customers ask, what was answered, and what your docs are missing.', key: '4' },
]

const defaults: Settings = {
  ...DEFAULT_SETTINGS,
  baseUrl: import.meta.env.PUBLIC_DEFAULT_BASE_URL || DEFAULT_SETTINGS.baseUrl,
  model: import.meta.env.PUBLIC_DEFAULT_MODEL || DEFAULT_SETTINGS.model,
  businessName: import.meta.env.PUBLIC_BUSINESS_NAME || '',
}

export default () => {
  const [view, setView] = createSignal<View>('chat')
  const [settings, setSettings] = createSignal<Settings>(defaults)
  const [docs, setDocs] = createSignal<KnowledgeDoc[]>(SAMPLE_DOCS)
  const [log, setLog] = createSignal<LogEntry[]>([])
  const [snippets, setSnippets] = createSignal<Snippet[]>([])
  const [prefill, setPrefill] = createSignal<{ title: string, content: string } | null>(null)
  const [settingsOpen, setSettingsOpen] = createSignal(false)
  const [ready, setReady] = createSignal(false)

  onMount(() => {
    setSettings(load('rp-settings', defaults))
    const savedDocs = load<KnowledgeDoc[] | null>('rp-docs', null)
    if (Array.isArray(savedDocs) && savedDocs.every(d => typeof d?.title === 'string' && typeof d?.content === 'string')) setDocs(savedDocs)
    const savedLog = load<LogEntry[] | null>('rp-log', null)
    if (Array.isArray(savedLog)) setLog(savedLog.filter(e => e && typeof e.question === 'string' && typeof e.at === 'number'))
    const savedSnippets = load<Snippet[] | null>('rp-snippets', null)
    if (Array.isArray(savedSnippets)) setSnippets(savedSnippets.filter(s => s && typeof s.title === 'string' && typeof s.body === 'string'))
    const fromHash = location.hash.slice(1) as View
    if (VIEWS.some(v => v.id === fromHash)) setView(fromHash)
    setReady(true)

    // 1-4 switch views, "," opens settings (ignored while typing)
    const onKey = (e: KeyboardEvent) => {
      const el = e.target as HTMLElement
      if (e.metaKey || e.ctrlKey || e.altKey || /^(INPUT|TEXTAREA|SELECT)$/.test(el.tagName) || el.isContentEditable) return
      const v = VIEWS.find(x => x.key === e.key)
      if (v) setView(v.id)
      if (e.key === ',') setSettingsOpen(true)
    }
    window.addEventListener('keydown', onKey)
    onCleanup(() => window.removeEventListener('keydown', onKey))
  })
  createEffect(() => ready() && save('rp-settings', settings()))
  createEffect(() => ready() && save('rp-docs', docs()))
  createEffect(() => ready() && save('rp-log', log()))
  createEffect(() => ready() && save('rp-snippets', snippets()))
  createEffect(() => ready() && history.replaceState(null, '', `#${view()}`))

  // Rebuilt whenever a document is added, edited or removed
  const index = createMemo(() => new KnowledgeIndex(docs()))
  const businessName = () => settings().businessName.trim() || SAMPLE_BUSINESS
  const gapCount = createMemo(() => knowledgeGaps(log()).length)
  const current = () => VIEWS.find(v => v.id === view())!
  const addLog = (e: LogEntry) => setLog(appendLog(log(), e))

  return (
    <div class="flex h-screen min-h-[640px] overflow-hidden">
      <aside class="hidden w-[244px] shrink-0 flex-col border-r border-ink-200 bg-white md:flex">
        <a href={import.meta.env.BASE_URL} class="flex items-center gap-2.5 px-5 pb-5 pt-5">
          <span class="grid h-8 w-8 place-items-center rounded-[9px] bg-ink-950 text-brand-400 shadow-sm"><span class="i-ph-paper-plane-tilt-fill" /></span>
          <span class="leading-tight">
            <span class="block text-[15px] font-extrabold tracking-tight text-ink-950">ReplyPilot</span>
            <span class="block text-[11px] font-medium text-ink-400">by Gabriel.ATH</span>
          </span>
        </a>
        <div class="px-3">
          <div class="mb-2 px-2 eyebrow">Workspace</div>
          <nav class="space-y-0.5">
            <For each={VIEWS}>{v => (
              <button class={`group flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-semibold transition ${view() === v.id ? 'bg-ink-100 text-ink-950' : 'text-ink-500 hover:(bg-ink-50 text-ink-900)'}`} onClick={() => setView(v.id)} aria-current={view() === v.id ? 'page' : undefined}>
                <span class={`${v.icon} text-[17px] ${view() === v.id ? 'text-brand-600' : ''}`} />
                <span class="flex-1 text-left">{v.label}</span>
                <Show when={v.id === 'insights' && gapCount()} fallback={<span class="kbd op-0 group-hover:op-100">{v.key}</span>}>
                  <span class="chip !px-1.5 bg-amber-100 text-amber-800" title="Knowledge gaps">{gapCount()}</span>
                </Show>
              </button>
            )}</For>
          </nav>
        </div>
        <div class="mt-auto space-y-3 p-3">
          <div class="rounded-xl bg-ink-50 p-3 ring-1 ring-ink-100">
            <div class="flex items-center gap-2 text-[12px] font-bold text-ink-900">
              <span class={`h-2 w-2 rounded-full ${settings().engine === 'openai' ? 'bg-brand-500' : 'bg-emerald-500'}`} />
              {settings().engine === 'openai' ? 'AI model connected' : 'Demo mode'}
            </div>
            <p class="mt-1 text-[11.5px] leading-snug text-ink-500">{settings().engine === 'openai' ? settings().model : 'Runs offline in your browser. No API key needed.'}</p>
          </div>
          <button class="flex h-9 w-full items-center gap-2.5 rounded-lg px-2.5 text-[13.5px] font-semibold text-ink-500 transition hover:(bg-ink-50 text-ink-900)" onClick={() => setSettingsOpen(true)}>
            <span class="i-ph-gear-six-bold text-[17px]" /><span class="flex-1 text-left">Settings</span><span class="kbd">,</span>
          </button>
        </div>
      </aside>

      <div class="flex min-w-0 flex-1 flex-col">
        <header class="flex flex-wrap items-center justify-between gap-3 border-b border-ink-200 bg-white/80 px-6 py-4 backdrop-blur md:px-8">
          <div class="min-w-0">
            <div class="flex items-center gap-2 text-[12px] font-medium text-ink-400"><span>{businessName()}</span><span class="i-ph-caret-right-bold text-[10px]" /><span class="text-ink-600">{current().label}</span></div>
            <h1 class="mt-0.5 text-[20px] font-extrabold tracking-tight text-ink-950">{current().title}</h1>
            <p class="text-[13px] text-ink-500">{current().sub}</p>
          </div>
          <div class="flex items-center gap-2 md:hidden">
            <select class="field !h-9 !w-auto" value={view()} onChange={e => setView(e.currentTarget.value as View)} aria-label="Section">
              <For each={VIEWS}>{v => <option value={v.id}>{v.label}</option>}</For>
            </select>
            <button class="btn-icon" onClick={() => setSettingsOpen(true)} aria-label="Settings"><span class="i-ph-gear-six-bold" /></button>
          </div>
        </header>
        <main class="min-h-0 flex-1 overflow-hidden p-4 md:p-6">
          <Switch>
            <Match when={view() === 'chat'}><ChatPanel index={index} settings={settings} businessName={businessName} onOpenSettings={() => setSettingsOpen(true)} onLog={addLog} /></Match>
            <Match when={view() === 'email'}><EmailPanel index={index} settings={settings} setSettings={setSettings} businessName={businessName} snippets={snippets} setSnippets={setSnippets} onLog={addLog} /></Match>
            <Match when={view() === 'kb'}><KnowledgePanel docs={docs} setDocs={setDocs} index={index} onReset={() => setDocs(SAMPLE_DOCS)} prefill={prefill} clearPrefill={() => setPrefill(null)} /></Match>
            <Match when={view() === 'insights'}><InsightsPanel log={log} onClear={() => setLog([])} onFillGap={(d) => { setPrefill(d); setView('kb') }} onGoChat={() => setView('chat')} /></Match>
          </Switch>
        </main>
      </div>
      <SettingsDialog open={settingsOpen} setOpen={setSettingsOpen} settings={settings} setSettings={setSettings} />
    </div>
  )
}
