import { Match, Switch, createEffect, createMemo, createSignal, onMount } from 'solid-js'
import { KnowledgeIndex } from '@/lib/rag'
import { SAMPLE_BUSINESS, SAMPLE_DOCS } from '@/lib/sampleKnowledge'
import { DEFAULT_SETTINGS, load, save } from '@/lib/settings'
import ChatPanel from './ChatPanel'
import EmailPanel from './EmailPanel'
import KnowledgePanel from './KnowledgePanel'
import SettingsDrawer from './SettingsDrawer'
import type { KnowledgeDoc } from '@/lib/rag'
import type { Settings } from '@/lib/settings'

type Tab = 'chat' | 'email' | 'kb'

const defaults: Settings = {
  ...DEFAULT_SETTINGS,
  baseUrl: import.meta.env.PUBLIC_DEFAULT_BASE_URL || DEFAULT_SETTINGS.baseUrl,
  model: import.meta.env.PUBLIC_DEFAULT_MODEL || DEFAULT_SETTINGS.model,
  businessName: import.meta.env.PUBLIC_BUSINESS_NAME || '',
}

export default () => {
  const [tab, setTab] = createSignal<Tab>('chat')
  const [settings, setSettings] = createSignal<Settings>(defaults)
  const [docs, setDocs] = createSignal<KnowledgeDoc[]>(SAMPLE_DOCS)
  const [settingsOpen, setSettingsOpen] = createSignal(false)
  const [ready, setReady] = createSignal(false)

  onMount(() => {
    setSettings(load('rp-settings', defaults))
    const savedDocs = load<KnowledgeDoc[] | null>('rp-docs', null)
    if (Array.isArray(savedDocs) && savedDocs.every(d => typeof d?.title === 'string' && typeof d?.content === 'string')) setDocs(savedDocs)
    const fromHash = location.hash.slice(1) as Tab
    if (['chat', 'email', 'kb'].includes(fromHash)) setTab(fromHash)
    setReady(true)
  })
  createEffect(() => ready() && save('rp-settings', settings()))
  createEffect(() => ready() && save('rp-docs', docs()))
  createEffect(() => ready() && history.replaceState(null, '', `#${tab()}`))

  // Rebuilt automatically whenever a document is added, edited or removed
  const index = createMemo(() => new KnowledgeIndex(docs()))
  const businessName = () => settings().businessName.trim() || SAMPLE_BUSINESS

  const TabBtn = (p: { id: Tab, icon: string, label: string }) => (
    <button class={`tab ${tab() === p.id ? 'tab-active' : ''}`} onClick={() => setTab(p.id)} aria-pressed={tab() === p.id}>
      <span class={p.icon} /><span class="hidden sm:inline">{p.label}</span>
    </button>
  )

  return (
    <>
      <div class="flex flex-wrap items-center justify-between gap-3 mb-5">
        <nav class="inline-flex gap-1 p-1 rounded-2xl bg-slate-200/60 dark:bg-ink-800">
          <TabBtn id="chat" icon="i-ph-chats-circle-bold" label="Live chat" />
          <TabBtn id="email" icon="i-ph-envelope-simple-bold" label="Email replies" />
          <TabBtn id="kb" icon="i-ph-books-bold" label="Knowledge base" />
        </nav>
        <div class="flex items-center gap-2">
          <span class={`chip ${settings().engine === 'openai' ? 'bg-emerald-100 text-emerald-700 dark:(bg-emerald-500/15 text-emerald-300)' : 'bg-amber-100 text-amber-700 dark:(bg-amber-500/15 text-amber-300)'}`}>
            <span class={settings().engine === 'openai' ? 'i-ph-sparkle-bold' : 'i-ph-flask-bold'} />
            {settings().engine === 'openai' ? `AI: ${settings().model}` : 'Demo mode (no API key)'}
          </span>
          <button class="btn-ghost" onClick={() => setSettingsOpen(true)}><span class="i-ph-gear-six-bold" />Settings</button>
        </div>
      </div>
      <Switch>
        <Match when={tab() === 'chat'}><ChatPanel index={index} settings={settings} businessName={businessName} onOpenSettings={() => setSettingsOpen(true)} /></Match>
        <Match when={tab() === 'email'}><EmailPanel index={index} settings={settings} setSettings={setSettings} businessName={businessName} /></Match>
        <Match when={tab() === 'kb'}><KnowledgePanel docs={docs} setDocs={setDocs} index={index} onReset={() => setDocs(SAMPLE_DOCS)} /></Match>
      </Switch>
      <SettingsDrawer open={settingsOpen} setOpen={setSettingsOpen} settings={settings} setSettings={setSettings} />
    </>
  )
}
