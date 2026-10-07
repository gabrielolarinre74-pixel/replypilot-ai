import { Show } from 'solid-js'
import { INTENT_LABEL } from '@/lib/triage'
import type { Triage } from '@/lib/triage'
import type { Confidence } from '@/lib/rag'

const SENTIMENT = {
  negative: { cls: 'bg-red-50 text-red-700 ring-red-200', icon: 'i-ph-smiley-sad-bold' },
  neutral: { cls: 'bg-ink-100 text-ink-700 ring-ink-200', icon: 'i-ph-smiley-meh-bold' },
  positive: { cls: 'bg-emerald-50 text-emerald-700 ring-emerald-200', icon: 'i-ph-smiley-bold' },
}

const CONFIDENCE: Record<Confidence, { cls: string, bars: number, label: string }> = {
  high: { cls: 'text-emerald-700', bars: 3, label: 'High confidence' },
  medium: { cls: 'text-amber-700', bars: 2, label: 'Medium confidence' },
  low: { cls: 'text-red-700', bars: 1, label: 'Low confidence' },
}

/** Signal-strength style meter: how well the knowledge base covers the question. */
export const ConfidenceMeter = (props: { level?: Confidence }) => (
  <Show when={props.level}>
    {(() => {
      const c = () => CONFIDENCE[props.level!]
      return (
        <span class={`inline-flex items-center gap-1.5 text-[11.5px] font-semibold ${c().cls}`} title="How well your knowledge base covers this question">
          <span class="flex items-end gap-[2px] h-3">
            {[1, 2, 3].map(i => <span class={`w-[3px] rounded-sm ${i <= c().bars ? 'bg-current' : 'bg-ink-200'}`} style={{ height: `${i * 4}px` }} />)}
          </span>
          {c().label}
        </span>
      )
    })()}
  </Show>
)

export const IntentChip = (props: { triage: Triage }) => (
  <span class="chip bg-brand-50 text-brand-700 ring-1 ring-brand-200"><span class="i-ph-hash-bold text-[10px]" />{INTENT_LABEL[props.triage.intent]}</span>
)

export const TriageBadges = (props: { triage: Triage, compact?: boolean }) => (
  <div class="flex flex-wrap items-center gap-1.5">
    <IntentChip triage={props.triage} />
    <span class={`chip ring-1 capitalize ${SENTIMENT[props.triage.sentiment].cls}`}><span class={SENTIMENT[props.triage.sentiment].icon} />{props.triage.sentiment}</span>
    <Show when={props.triage.urgency === 'high'}>
      <span class="chip bg-amber-50 text-amber-800 ring-1 ring-amber-200"><span class="i-ph-lightning-fill" />Urgent</span>
    </Show>
    <Show when={props.triage.escalate}>
      <span class="chip bg-ink-950 text-white" title={props.triage.reasons.join(' · ')}><span class="i-ph-user-switch-bold" />Needs a human</span>
    </Show>
  </div>
)
