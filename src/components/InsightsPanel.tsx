import { For, Show, createMemo } from 'solid-js'
import { draftFromGap, knowledgeGaps, summarize } from '@/lib/insights'
import { INTENT_LABEL } from '@/lib/triage'
import type { Accessor } from 'solid-js'
import type { Gap, LogEntry } from '@/lib/insights'

interface Props {
  log: Accessor<LogEntry[]>
  onClear: () => void
  onFillGap: (draft: { title: string, content: string }) => void
  onGoChat: () => void
}

const pct = (n: number, total: number) => (total ? Math.round((n / total) * 100) : 0)
const ago = (t: number) => {
  const m = Math.round((Date.now() - t) / 60000)
  if (m < 1) return 'just now'
  if (m < 60) return `${m} min ago`
  const h = Math.round(m / 60)
  return h < 24 ? `${h} h ago` : `${Math.round(h / 24)} d ago`
}

export default (props: Props) => {
  const s = createMemo(() => summarize(props.log()))
  const gaps = createMemo(() => knowledgeGaps(props.log()))
  const recent = createMemo(() => [...props.log()].reverse().slice(0, 8))

  const exportCsv = () => {
    const head = 'time,channel,intent,sentiment,urgent,escalated,confidence,source,question'
    const esc = (v: string) => `"${v.replace(/"/g, '""')}"`
    const rows = props.log().map(e => [new Date(e.at).toISOString(), e.channel, e.intent, e.sentiment, e.urgent, e.escalated, e.confidence, esc(e.source || ''), esc(e.question)].join(','))
    const a = document.createElement('a')
    a.href = URL.createObjectURL(new Blob([[head, ...rows].join('\n')], { type: 'text/csv' }))
    a.download = 'replypilot-conversations.csv'
    a.click()
    setTimeout(() => URL.revokeObjectURL(a.href), 1000)
  }

  const Stat = (p: { label: string, value: string, hint: string, icon: string, accent?: boolean }) => (
    <div class={`surface p-4 ${p.accent ? '!bg-ink-950 !border-ink-950 text-white' : ''}`}>
      <div class={`mb-3 flex items-center justify-between text-[12px] font-semibold ${p.accent ? 'text-ink-400' : 'text-ink-500'}`}>{p.label}<span class={`${p.icon} ${p.accent ? 'text-brand-400' : 'text-brand-600'}`} /></div>
      <div class="text-[28px] font-bold leading-none tracking-tight tabular-nums">{p.value}</div>
      <div class={`mt-2 text-[12px] ${p.accent ? 'text-ink-400' : 'text-ink-500'}`}>{p.hint}</div>
    </div>
  )

  return (
    <Show when={props.log().length} fallback={
      <div class="surface dot-grid grid h-full place-items-center p-10 text-center">
        <div class="rise max-w-md">
          <div class="mx-auto mb-4 grid h-12 w-12 place-items-center rounded-2xl bg-brand-600 text-xl text-white shadow-lg shadow-brand-600/30"><span class="i-ph-chart-bar-fill" /></div>
          <h3 class="text-lg font-bold tracking-tight">No conversations yet</h3>
          <p class="mx-auto mb-5 mt-1 text-sm text-ink-500">Every chat answer and email draft is logged here, in this browser only. You'll see what customers ask about, how much ReplyPilot handles on its own, and which questions your knowledge base is missing.</p>
          <button class="btn-blue" onClick={props.onGoChat}><span class="i-ph-chats-teardrop-bold" />Start a test conversation</button>
        </div>
      </div>
    }>
      <div class="h-full space-y-4 overflow-y-auto pb-2">
        <div class="grid gap-4 sm:grid-cols-2 xl:grid-cols-4">
          <Stat accent label="Conversations" value={String(s().total)} hint={`${props.log().filter(e => e.channel === 'chat').length} chat · ${props.log().filter(e => e.channel === 'email').length} email`} icon="i-ph-chats-teardrop-bold" />
          <Stat label="Answered from docs" value={`${pct(s().selfServe, s().total)}%`} hint={`${s().selfServe} without a hand-off`} icon="i-ph-check-circle-bold" />
          <Stat label="Handed to a human" value={String(s().escalated)} hint={`${pct(s().escalated, s().total)}% of conversations`} icon="i-ph-user-switch-bold" />
          <Stat label="Knowledge gaps" value={String(gaps().length)} hint={gaps().length ? 'questions your docs miss' : 'your docs covered everything'} icon="i-ph-puzzle-piece-bold" />
        </div>

        <div class="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section class="surface p-5">
            <div class="mb-1 flex items-center justify-between">
              <h3 class="text-[15px] font-bold">Knowledge gaps</h3>
              <span class="text-[12px] text-ink-500">grouped by similar wording</span>
            </div>
            <p class="mb-4 text-[13px] text-ink-500">Questions answered with low confidence. Fill them and the agent can answer next time.</p>
            <ul class="divide-y divide-ink-100">
              <For each={gaps().slice(0, 6)} fallback={<li class="py-6 text-center text-[13px] text-ink-500"><span class="i-ph-seal-check-bold mr-1 text-emerald-600" />No gaps so far. Every question matched your knowledge base.</li>}>{(g: Gap) => (
                <li class="flex items-center gap-4 py-3">
                  <span class="grid h-9 w-9 shrink-0 place-items-center rounded-lg bg-amber-50 text-[13px] font-bold tabular-nums text-amber-700 ring-1 ring-amber-200">{g.count}×</span>
                  <div class="min-w-0 flex-1">
                    <div class="truncate text-[13.5px] font-semibold text-ink-950">{g.question}</div>
                    <div class="text-[12px] text-ink-500">{INTENT_LABEL[g.intent]} · last asked {ago(g.lastAt)}</div>
                  </div>
                  <button class="btn-ghost !h-8 shrink-0" onClick={() => props.onFillGap(draftFromGap(g))}><span class="i-ph-pencil-simple-line-bold" />Write answer</button>
                </li>
              )}</For>
            </ul>
          </section>

          <section class="surface p-5">
            <h3 class="mb-4 text-[15px] font-bold">What customers ask about</h3>
            <ul class="space-y-3">
              <For each={s().byIntent.slice(0, 6)}>{i => (
                <li>
                  <div class="mb-1 flex justify-between text-[13px]"><span class="font-medium text-ink-800">{INTENT_LABEL[i.intent]}</span><span class="tabular-nums text-ink-500">{i.count}</span></div>
                  <div class="h-2 overflow-hidden rounded-full bg-ink-100"><div class="h-full rounded-full bg-brand-600" style={{ width: `${pct(i.count, s().byIntent[0].count)}%` }} /></div>
                </li>
              )}</For>
            </ul>
            <div class="mt-6">
              <div class="mb-2 text-[12px] font-semibold text-ink-700">Sentiment</div>
              <div class="flex h-2.5 overflow-hidden rounded-full bg-ink-100">
                <div class="bg-emerald-500" style={{ width: `${pct(s().bySentiment.positive, s().total)}%` }} />
                <div class="bg-ink-300" style={{ width: `${pct(s().bySentiment.neutral, s().total)}%` }} />
                <div class="bg-red-500" style={{ width: `${pct(s().bySentiment.negative, s().total)}%` }} />
              </div>
              <div class="mt-2 flex gap-4 text-[12px] text-ink-500">
                <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-emerald-500" />Positive {s().bySentiment.positive}</span>
                <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-ink-300" />Neutral {s().bySentiment.neutral}</span>
                <span class="flex items-center gap-1.5"><span class="h-2 w-2 rounded-full bg-red-500" />Negative {s().bySentiment.negative}</span>
              </div>
            </div>
          </section>
        </div>

        <div class="grid gap-4 xl:grid-cols-[minmax(0,1.4fr)_minmax(0,1fr)]">
          <section class="surface overflow-hidden">
            <div class="flex items-center justify-between px-5 pb-2 pt-4">
              <h3 class="text-[15px] font-bold">Recent activity</h3>
              <div class="flex gap-1">
                <button class="btn-icon" title="Export CSV" aria-label="Export CSV" onClick={exportCsv}><span class="i-ph-download-simple-bold" /></button>
                <button class="btn-icon hover:(!bg-red-50 !text-red-600)" title="Clear log" aria-label="Clear log" onClick={() => confirm('Clear the conversation log?') && props.onClear()}><span class="i-ph-trash-bold" /></button>
              </div>
            </div>
            <table class="w-full text-[13px]">
              <tbody>
                <For each={recent()}>{e => (
                  <tr class="border-t border-ink-100">
                    <td class="py-2.5 pl-5 pr-2"><span class={e.channel === 'chat' ? 'i-ph-chat-circle-bold text-ink-400' : 'i-ph-envelope-simple-bold text-ink-400'} /></td>
                    <td class="max-w-0 w-full truncate py-2.5 pr-3 font-medium text-ink-900">{e.question}</td>
                    <td class="whitespace-nowrap py-2.5 pr-3"><span class={`chip ${e.escalated ? 'bg-ink-950 text-white' : e.confidence === 'low' ? 'bg-amber-50 text-amber-800' : 'bg-emerald-50 text-emerald-700'}`}>{e.escalated ? 'Human' : e.confidence === 'low' ? 'Gap' : 'Answered'}</span></td>
                    <td class="whitespace-nowrap py-2.5 pr-5 text-right text-[12px] text-ink-400">{ago(e.at)}</td>
                  </tr>
                )}</For>
              </tbody>
            </table>
          </section>
          <section class="surface p-5">
            <h3 class="mb-4 text-[15px] font-bold">Most used documents</h3>
            <ol class="space-y-2.5">
              <For each={s().topSources} fallback={<li class="text-[13px] text-ink-500">No documents cited yet.</li>}>{(src, i) => (
                <li class="flex items-center gap-3 text-[13px]">
                  <span class="grid h-6 w-6 place-items-center rounded-md bg-ink-100 text-[11px] font-bold text-ink-700">{i() + 1}</span>
                  <span class="flex-1 truncate font-medium text-ink-900">{src.title}</span>
                  <span class="tabular-nums text-ink-500">{src.count}</span>
                </li>
              )}</For>
            </ol>
          </section>
        </div>
      </div>
    </Show>
  )
}
