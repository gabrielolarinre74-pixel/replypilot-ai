import { Show } from 'solid-js'
import { INTENT_LABEL } from '@/lib/triage'
import type { Triage } from '@/lib/triage'

const SENT = {
  negative: 'bg-rose-100 text-rose-700 dark:(bg-rose-500/15 text-rose-300)',
  neutral: 'bg-slate-100 text-slate-600 dark:(bg-slate-500/15 text-slate-300)',
  positive: 'bg-emerald-100 text-emerald-700 dark:(bg-emerald-500/15 text-emerald-300)',
}

export const ConfidenceChip = (props: { level?: 'high' | 'medium' | 'low' }) => {
  const style = () => ({
    high: 'bg-emerald-100 text-emerald-700 dark:(bg-emerald-500/15 text-emerald-300)',
    medium: 'bg-amber-100 text-amber-700 dark:(bg-amber-500/15 text-amber-300)',
    low: 'bg-rose-100 text-rose-700 dark:(bg-rose-500/15 text-rose-300)',
  }[props.level || 'low'])
  return (
    <Show when={props.level}>
      <span class={`chip ${style()}`} title="How well the knowledge base covers this question">
        <span class="i-ph-gauge-bold" /> {props.level} confidence
      </span>
    </Show>
  )
}

export const TriageBadges = (props: { triage: Triage }) => (
  <div class="flex flex-wrap gap-1.5">
    <span class="chip bg-brand-50 text-brand-700 dark:(bg-brand-500/15 text-brand-100)"><span class="i-ph-tag-bold" />{INTENT_LABEL[props.triage.intent]}</span>
    <span class={`chip ${SENT[props.triage.sentiment]}`}><span class="i-ph-smiley-bold" />{props.triage.sentiment}</span>
    <Show when={props.triage.urgency === 'high'}>
      <span class="chip bg-orange-100 text-orange-700 dark:(bg-orange-500/15 text-orange-300)"><span class="i-ph-lightning-bold" />urgent</span>
    </Show>
    <Show when={props.triage.escalate}>
      <span class="chip bg-rose-500 text-white" title={props.triage.reasons.join(' · ')}><span class="i-ph-user-switch-bold" />hand off to a human</span>
    </Show>
  </div>
)
