import { For, Show, createSignal, onMount } from 'solid-js'
import { buildLLMMessages, demoAnswer, streamChat, typewriter } from '@/lib/agent'
import { multiSearch } from '@/lib/rag'
import { validateSettings } from '@/lib/settings'
import { triage } from '@/lib/triage'
import MessageItem from './MessageItem'
import ErrorMessageItem from './ErrorMessageItem'
import type { Accessor } from 'solid-js'
import type { KnowledgeIndex } from '@/lib/rag'
import type { Settings } from '@/lib/settings'
import type { UiMessage } from '@/types'

const SUGGESTIONS = [
  'Is shipping free?',
  'How do I return something?',
  'My lamp arrived broken, what now?',
  'When are you open on Saturday?',
]
const MAX_INPUT = 2000
const uid = () => Math.random().toString(36).slice(2, 10)

interface Props {
  index: Accessor<KnowledgeIndex>
  settings: Accessor<Settings>
  businessName: Accessor<string>
  onOpenSettings: () => void
}

export default (props: Props) => {
  let inputRef: HTMLTextAreaElement
  let listRef: HTMLDivElement
  const [messages, setMessages] = createSignal<UiMessage[]>([])
  const [streaming, setStreaming] = createSignal('')
  const [loading, setLoading] = createSignal(false)
  const [error, setError] = createSignal('')
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

  const send = async(text?: string) => {
    const value = (text ?? inputRef.value).trim().slice(0, MAX_INPUT)
    if (!value || loading()) return
    inputRef.value = ''
    inputRef.style.height = 'auto'
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
    // use the previous user turn as extra context for short follow-ups ("and to Canada?")
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
    <section class="card flex flex-col h-[calc(100vh-15rem)] min-h-[520px]">
      <div class="flex items-center justify-between px-5 py-3 border-b border-slate-200/80 dark:border-ink-600">
        <div class="flex items-center gap-3">
          <div class="relative">
            <div class="w-10 h-10 rounded-full bg-gradient-to-br from-brand-400 to-indigo-700 grid place-items-center text-white"><span class="i-ph-headset-bold" /></div>
            <span class="absolute -bottom-0.5 -right-0.5 w-3 h-3 rounded-full bg-emerald-400 ring-2 ring-white dark:ring-ink-800" />
          </div>
          <div>
            <div class="font-semibold">{props.businessName()} support</div>
            <div class="text-xs text-slate-500">Answers only from your knowledge base · hands off when unsure</div>
          </div>
        </div>
        <div class="flex gap-2">
          <button class="btn-ghost !h-9 !px-3" onClick={exportTranscript} disabled={!messages().length} title="Download transcript"><span class="i-ph-download-simple-bold" /></button>
          <button class="btn-ghost !h-9 !px-3" onClick={clear} title="New conversation"><span class="i-ph-broom-bold" /></button>
        </div>
      </div>

      <div ref={listRef!} class="flex-1 overflow-y-auto px-5 py-2">
        <Show when={!messages().length && !loading()}>
          <div class="h-full grid place-items-center text-center py-10">
            <div>
              <div class="mx-auto w-14 h-14 rounded-2xl bg-brand-50 dark:bg-brand-500/10 grid place-items-center text-brand-500 text-2xl mb-3"><span class="i-ph-chats-circle-bold" /></div>
              <h3 class="font-bold text-lg">Ask anything a customer would ask</h3>
              <p class="text-sm text-slate-500 mt-1 mb-5 max-w-sm">Every answer is grounded in the knowledge base, with sources you can check.</p>
              <div class="flex flex-wrap justify-center gap-2 max-w-md">
                <For each={SUGGESTIONS}>{q => <button class="btn-ghost !h-9 !font-medium" onClick={() => send(q)}>{q}</button>}</For>
              </div>
            </div>
          </div>
        </Show>
        <For each={messages()}>{(m, i) => (
          <MessageItem message={m} showRetry={m.role === 'assistant' && i() === messages().length - 1} onRetry={retry} />
        )}</For>
        <Show when={loading()}>
          <MessageItem message={{ id: 'stream', role: 'assistant', content: '' }} content={() => streaming() || '…'} />
        </Show>
        <Show when={error()}>
          <ErrorMessageItem message={error()} onRetry={error().includes('API key') ? props.onOpenSettings : retry} />
        </Show>
      </div>

      <div class="p-4 border-t border-slate-200/80 dark:border-ink-600">
        <div class="flex gap-2 items-end">
          <textarea
            ref={inputRef!}
            rows="1"
            maxLength={MAX_INPUT}
            placeholder="Type a customer message…"
            aria-label="Customer message"
            class="field resize-none max-h-36"
            onInput={() => { inputRef.style.height = 'auto'; inputRef.style.height = `${inputRef.scrollHeight}px` }}
            onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); send() } }}
          />
          <Show when={!loading()} fallback={<button class="btn-ghost" onClick={() => controller?.abort()}><span class="i-ph-stop-fill" />Stop</button>}>
            <button class="btn-primary" onClick={() => send()}><span class="i-ph-paper-plane-right-fill" />Send</button>
          </Show>
        </div>
      </div>
    </section>
  )
}
