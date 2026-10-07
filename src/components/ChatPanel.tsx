import { For, Show, createMemo, createSignal, onMount } from 'solid-js'
import { buildLLMMessages, demoAnswer, streamChat, typewriter } from '@/lib/agent'
import { multiSearch } from '@/lib/rag'
import { validateSettings } from '@/lib/settings'
import { triage } from '@/lib/triage'
import { makeEntry } from '@/lib/insights'
import MessageItem from './MessageItem'
import Alert from './Alert'
import { ConfidenceMeter, TriageBadges } from './Badges'
import type { Accessor } from 'solid-js'
import type { KnowledgeIndex } from '@/lib/rag'
import type { Settings } from '@/lib/settings'
import type { LogEntry } from '@/lib/insights'
import type { UiMessage } from '@/types'

const SUGGESTIONS = [
  { q: 'Is shipping free?', icon: 'i-ph-truck-bold' },
  { q: 'How do I return something?', icon: 'i-ph-arrow-u-up-left-bold' },
  { q: 'My lamp arrived broken, what now?', icon: 'i-ph-package-bold' },
  { q: 'When are you open on Saturday?', icon: 'i-ph-clock-bold' },
]
const MAX_INPUT = 2000
const uid = () => Math.random().toString(36).slice(2, 10)

interface Props {
  index: Accessor<KnowledgeIndex>
  settings: Accessor<Settings>
  businessName: Accessor<string>
  onOpenSettings: () => void
  onLog: (e: LogEntry) => void
}

export default (props: Props) => {
  let inputRef: HTMLTextAreaElement
  let listRef: HTMLDivElement
  const [messages, setMessages] = createSignal<UiMessage[]>([])
  const [streaming, setStreaming] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal('')
  const [selectedId, setSelectedId] = createSignal<string | null>(null)
  const [length, setLength] = createSignal(0)
  let controller: AbortController | null = null

  onMount(() => {
    try {
      const saved = sessionStorage.getItem('rp-chat')
      if (saved) setMessages(JSON.parse(saved))
    } catch {}
  })
  const persist = () => {
    try { sessionStorage.setItem('rp-chat', JSON.stringify(messages())) } catch {}
  }
  const toBottom = () => queueMicrotask(() => listRef?.scrollTo({ top: listRef.scrollHeight, behavior: 'smooth' }))

  // The details panel follows the selected customer message, or the latest one.
  const focus = createMemo(() => {
    const list = messages()
    const userMsgs = list.filter(m => m.role === 'user')
    const user = userMsgs.find(m => m.id === selectedId()) || userMsgs.at(-1)
    if (!user) return null
    const reply = list[list.indexOf(user) + 1]
    return { user, reply: reply?.role === 'assistant' ? reply : undefined }
  })

  const send = async(text?: string) => {
    const value = (text ?? inputRef.value).trim().slice(0, MAX_INPUT)
    if (!value || loading()) return
    inputRef.value = ''
    inputRef.style.height = 'auto'
    setLength(0)
    setSelectedId(null)
    setMessages([...messages(), { id: uid(), role: 'user', content: value, triage: triage(value) }])
    toBottom()
    await answer()
  }

  const answer = async() => {
    const history = messages()
    const last = history[history.length - 1]
    if (!last || last.role !== 'user') return
    const s = props.settings()
    const problem = validateSettings(s)
    if (problem) {
      setError(problem)
      return
    }
    setError('')
    setLoading(true)
    setStreaming('')
    controller = new AbortController()
    const idx = props.index()
    // short follow-ups ("and to Canada?") borrow the previous customer turn as context
    const prevUser = [...history].reverse().slice(1).find(m => m.role === 'user')
    const query = last.content.split(/\s+/).length < 5 && prevUser ? `${prevUser.content} ${last.content}` : last.content
    const hits = multiSearch(idx, query)
    const input = {
      message: last.content, hits, mode: 'chat' as const, triage: last.triage!, settings: s,
      businessName: props.businessName(), history: history.slice(0, -1).map(m => ({ role: m.role, content: m.content })),
    }
    let confidence: UiMessage['confidence']
    try {
      if (s.engine === 'openai') {
        confidence = hits.length ? (hits[0].coverage >= 0.5 ? 'high' : 'medium') : 'low'
        await streamChat(s, buildLLMMessages(input), controller.signal, (t) => { setStreaming(streaming() + t); toBottom() })
      } else {
        const res = demoAnswer(idx, { ...input, message: query })
        confidence = res.confidence
        await typewriter(res.text, controller.signal, (t) => { setStreaming(streaming() + t); toBottom() })
      }
    } catch (e: any) {
      if (e?.name !== 'AbortError') setError(e?.message || 'Something went wrong.')
    }
    if (streaming()) {
      setMessages([...messages(), { id: uid(), role: 'assistant', content: streaming(), sources: hits, confidence, engine: s.engine }])
      props.onLog(makeEntry('chat', last.content, last.triage!, confidence || 'low', hits[0]?.chunk.docTitle))
      persist()
    }
    setStreaming('')
    setLoading(false)
    controller = null
    toBottom()
  }

  const retry = () => {
    const list = messages()
    if (list.at(-1)?.role === 'assistant') setMessages(list.slice(0, -1))
    answer()
  }

  const clear = () => {
    controller?.abort()
    setMessages([])
    setError('')
    setSelectedId(null)
    persist()
  }

  const exportTranscript = () => {
    const body = messages().map(m => `**${m.role === 'user' ? 'Customer' : 'ReplyPilot'}:** ${m.content}`).join('\n\n')
    const blob = new Blob([`# Conversation with ${props.businessName()}\n\n${body}\n`], { type: 'text/markdown' })
    const a = document.createElement('a')
    a.href = URL.createObjectURL(blob)
    a.download = `replypilot-chat-${new Date().toISOString().slice(0, 10)}.md`
    a.click()
    URL.revokeObjectURL(a.href)
  }

  return (
    <div class="grid h-full min-h-0 gap-4 xl:grid-cols-[minmax(0,1fr)_320px]">
      <section class="surface flex min-h-0 flex-col overflow-hidden">
        <header class="flex items-center justify-between border-b border-ink-100 px-5 py-3">
          <div class="flex items-center gap-3">
            <div class="relative grid h-9 w-9 place-items-center rounded-full bg-brand-50 text-brand-700 ring-1 ring-brand-100">
              <span class="i-ph-storefront-bold" />
              <span class="absolute -bottom-0.5 -right-0.5 h-2.5 w-2.5 rounded-full bg-emerald-500 ring-2 ring-white" />
            </div>
            <div>
              <div class="text-sm font-bold text-ink-950">{props.businessName()}</div>
              <div class="text-[12px] text-ink-500">Website chat · answers only from your knowledge base</div>
            </div>
          </div>
          <div class="flex items-center gap-1">
            <button class="btn-icon" onClick={exportTranscript} disabled={!messages().length} title="Download transcript" aria-label="Download transcript"><span class="i-ph-download-simple-bold" /></button>
            <button class="btn-icon" onClick={clear} title="New conversation" aria-label="New conversation"><span class="i-ph-note-pencil-bold" /></button>
          </div>
        </header>

        <div ref={listRef!} class="flex-1 overflow-y-auto px-5 py-4">
          <Show when={!messages().length && !loading()}>
            <div class="dot-grid -mx-5 -my-4 grid h-[calc(100%+2rem)] place-items-center px-6 text-center">
              <div class="rise max-w-md">
                <div class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-ink-950 text-xl text-brand-400 shadow-lg shadow-ink-950/20"><span class="i-ph-chats-teardrop-fill" /></div>
                <h3 class="text-lg font-bold tracking-tight text-ink-950">Try it as a customer</h3>
                <p class="mx-auto mb-6 mt-1 max-w-sm text-sm text-ink-500">Type any question a shopper might send. Answers are built from your knowledge base and cite where each fact came from.</p>
                <div class="grid gap-2 sm:grid-cols-2">
                  <For each={SUGGESTIONS}>{s => (
                    <button class="flex items-center gap-2.5 rounded-xl bg-white px-3.5 py-2.5 text-left text-[13px] font-medium text-ink-800 ring-1 ring-ink-200 transition hover:(-translate-y-0.5 ring-brand-300 shadow-md)" onClick={() => send(s.q)}>
                      <span class={`${s.icon} shrink-0 text-brand-600`} />{s.q}
                    </button>
                  )}</For>
                </div>
              </div>
            </div>
          </Show>
          <For each={messages()}>{(m, i) => (
            <MessageItem
              message={m}
              showRetry={m.role === 'assistant' && i() === messages().length - 1}
              onRetry={retry}
              selected={focus()?.user.id === m.id || focus()?.reply?.id === m.id}
              onSelect={() => setSelectedId(m.id)}
            />
          )}</For>
          <Show when={loading()}>
            <MessageItem message={{ id: 'stream', role: 'assistant', content: '' }} content={() => streaming()} />
          </Show>
          <Show when={error()}>
            <div class="mt-2"><Alert message={error()} action={error().includes('API key') ? 'Open settings' : 'Try again'} onAction={error().includes('API key') ? props.onOpenSettings : retry} /></div>
          </Show>
        </div>

        <div class="border-t border-ink-100 bg-ink-50/60 p-3">
          <div class="rounded-xl bg-white ring-1 ring-ink-200 transition focus-within:(ring-brand-400 shadow-[0_0_0_4px_rgba(59,130,246,.1)])">
            <textarea
              ref={inputRef!}
              rows="1"
              maxLength={MAX_INPUT}
              placeholder="Write a message as the customer…"
              aria-label="Customer message"
              class="block max-h-36 w-full resize-none bg-transparent px-4 pt-3 text-sm text-ink-950 outline-none placeholder:text-ink-400"
              onInput={() => { inputRef.style.height = 'auto'; inputRef.style.height = `${inputRef.scrollHeight}px`; setLength(inputRef.value.length) }}
              onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send() } }}
            />
            <div class="flex items-center justify-between px-3 pb-2.5 pt-1">
              <span class="flex items-center gap-1.5 text-[11px] text-ink-400"><span class="kbd">↵</span> send <span class="kbd ml-1">⇧↵</span> new line <Show when={length() > MAX_INPUT * 0.8}><span class="ml-2 tabular-nums">{length()}/{MAX_INPUT}</span></Show></span>
              <Show when={!loading()} fallback={<button class="btn-ghost !h-8" onClick={() => controller?.abort()}><span class="i-ph-stop-fill" />Stop</button>}>
                <button class="btn-blue !h-8" onClick={() => send()}>Send<span class="i-ph-arrow-up-bold" /></button>
              </Show>
            </div>
          </div>
        </div>
      </section>

      <aside class="surface hidden min-h-0 overflow-y-auto p-5 xl:block">
        <div class="eyebrow mb-3">Conversation details</div>
        <Show when={focus()} fallback={
          <div class="rounded-xl border border-dashed border-ink-200 p-5 text-center text-[13px] text-ink-500">
            <span class="i-ph-scan-bold mx-auto mb-2 block text-2xl text-ink-300" />
            Intent, sentiment, urgency and sources appear here for every customer message.
          </div>
        }>
          {f => (
            <div class="space-y-5">
              <div>
                <div class="mb-2 text-[12px] font-semibold text-ink-700">Customer said</div>
                <p class="rounded-lg bg-ink-50 p-3 text-[13px] leading-relaxed text-ink-800 ring-1 ring-ink-100">“{f().user.content.slice(0, 220)}{f().user.content.length > 220 ? '…' : ''}”</p>
              </div>
              <div>
                <div class="mb-2 text-[12px] font-semibold text-ink-700">Triage</div>
                <TriageBadges triage={f().user.triage!} />
                <Show when={f().user.triage!.reasons.length}>
                  <ul class="mt-2 space-y-1 text-[12px] text-ink-600">
                    <For each={f().user.triage!.reasons}>{r => <li class="flex gap-1.5"><span class="i-ph-arrow-bend-down-right-bold mt-0.5 shrink-0 text-ink-400" />{r}</li>}</For>
                  </ul>
                </Show>
              </div>
              <Show when={f().reply}>
                <div>
                  <div class="mb-2 text-[12px] font-semibold text-ink-700">Answer quality</div>
                  <ConfidenceMeter level={f().reply!.confidence} />
                  <p class="mt-1.5 text-[12px] leading-relaxed text-ink-500">
                    {f().reply!.confidence === 'low'
                      ? 'The knowledge base does not cover this well, so the agent offered a hand-off. It now shows up under Insights → Knowledge gaps.'
                      : `Grounded in ${f().reply!.sources?.length || 0} passage${f().reply!.sources?.length === 1 ? '' : 's'} from your knowledge base.`}
                  </p>
                </div>
                <Show when={f().reply!.sources?.length}>
                  <div>
                    <div class="mb-2 text-[12px] font-semibold text-ink-700">Documents used</div>
                    <ul class="space-y-1.5">
                      <For each={[...new Set(f().reply!.sources!.map(s => s.chunk.docTitle))]}>{t => (
                        <li class="flex items-center gap-2 text-[13px] text-ink-800"><span class="i-ph-file-text-bold text-brand-600" />{t}</li>
                      )}</For>
                    </ul>
                  </div>
                </Show>
              </Show>
            </div>
          )}
        </Show>
      </aside>
    </div>
  )
}
