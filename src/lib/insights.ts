import { tokenize } from './text'
import type { Confidence } from './rag'
import type { Intent, Sentiment, Triage } from './triage'

// ---------------------------------------------------------------------------
// Conversation log + analytics. Every question ReplyPilot answers is logged
// locally so the team can see what customers ask about, how much the agent
// can handle on its own, and which questions the knowledge base can't answer.
// ---------------------------------------------------------------------------

export interface LogEntry {
  id: string
  at: number
  channel: 'chat' | 'email'
  question: string
  intent: Intent
  sentiment: Sentiment
  urgent: boolean
  escalated: boolean
  confidence: Confidence
  /** title of the best-matching knowledge-base document, if any */
  source?: string
}

export const MAX_LOG = 500

export function makeEntry(channel: LogEntry['channel'], question: string, t: Triage, confidence: Confidence, source?: string, at = Date.now()): LogEntry {
  return {
    id: `${at.toString(36)}-${Math.random().toString(36).slice(2, 7)}`,
    at,
    channel,
    question: question.replace(/^subject:.*$/im, '').trim().slice(0, 400),
    intent: t.intent,
    sentiment: t.sentiment,
    urgent: t.urgency === 'high',
    escalated: t.escalate,
    confidence,
    source,
  }
}

/** Append and cap the log so localStorage never grows without bound. */
export function appendLog(log: LogEntry[], entry: LogEntry): LogEntry[] {
  return [...log, entry].slice(-MAX_LOG)
}

export interface Summary {
  total: number
  /** answered from the knowledge base with medium/high confidence and no hand-off */
  selfServe: number
  escalated: number
  urgent: number
  byIntent: { intent: Intent, count: number }[]
  bySentiment: Record<Sentiment, number>
  byConfidence: Record<Confidence, number>
  topSources: { title: string, count: number }[]
}

export function summarize(log: LogEntry[]): Summary {
  const intents = new Map<Intent, number>()
  const sources = new Map<string, number>()
  const bySentiment: Record<Sentiment, number> = { positive: 0, neutral: 0, negative: 0 }
  const byConfidence: Record<Confidence, number> = { high: 0, medium: 0, low: 0 }
  let selfServe = 0
  let escalated = 0
  let urgent = 0
  for (const e of log) {
    intents.set(e.intent, (intents.get(e.intent) || 0) + 1)
    if (e.source) sources.set(e.source, (sources.get(e.source) || 0) + 1)
    bySentiment[e.sentiment]++
    byConfidence[e.confidence]++
    if (e.escalated) escalated++
    if (e.urgent) urgent++
    if (!e.escalated && e.confidence !== 'low') selfServe++
  }
  const sortDesc = <T>(m: Map<T, number>) => [...m.entries()].sort((a, b) => b[1] - a[1])
  return {
    total: log.length,
    selfServe,
    escalated,
    urgent,
    byIntent: sortDesc(intents).map(([intent, count]) => ({ intent, count })),
    bySentiment,
    byConfidence,
    topSources: sortDesc(sources).slice(0, 5).map(([title, count]) => ({ title, count })),
  }
}

export interface Gap {
  question: string
  count: number
  lastAt: number
  intent: Intent
  examples: string[]
}

const jaccard = (a: Set<string>, b: Set<string>) => {
  let inter = 0
  for (const x of a) if (b.has(x)) inter++
  return inter / Math.max(1, a.size + b.size - inter)
}

/**
 * Questions the knowledge base could not answer (low confidence), grouped so
 * near-duplicates ("do you ship to Japan" / "shipping to japan?") count once.
 * Sorted by how often they were asked, then by recency.
 */
export function knowledgeGaps(log: LogEntry[], threshold = 0.45): Gap[] {
  const groups: { tokens: Set<string>, gap: Gap }[] = []
  for (const e of log) {
    if (e.confidence !== 'low' || !e.question) continue
    const tokens = new Set(tokenize(e.question))
    if (!tokens.size) continue
    const match = groups.find(g => jaccard(g.tokens, tokens) >= threshold)
    if (match) {
      match.gap.count++
      match.gap.lastAt = Math.max(match.gap.lastAt, e.at)
      if (match.gap.examples.length < 3 && !match.gap.examples.includes(e.question)) match.gap.examples.push(e.question)
      for (const t of tokens) match.tokens.add(t)
    } else {
      groups.push({ tokens, gap: { question: e.question, count: 1, lastAt: e.at, intent: e.intent, examples: [e.question] } })
    }
  }
  return groups.map(g => g.gap).sort((a, b) => b.count - a.count || b.lastAt - a.lastAt)
}

/** Starter document for filling a gap: the team only has to write the answer. */
export function draftFromGap(gap: Gap): { title: string, content: string } {
  const q = gap.question.split(/(?<=[?.!])\s/)[0].replace(/\s+/g, ' ').trim()
  const title = q.length > 60 ? `${q.slice(0, 57).trim()}…` : q
  return {
    title: title.charAt(0).toUpperCase() + title.slice(1),
    content: `Customers asked:\n${gap.examples.map(x => `- ${x}`).join('\n')}\n\nAnswer: `,
  }
}
