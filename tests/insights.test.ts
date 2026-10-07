import { describe, expect, it } from 'vitest'
import { appendLog, draftFromGap, knowledgeGaps, makeEntry, MAX_LOG, summarize } from '@/lib/insights'
import { addSnippet, fillSnippet, toTemplate, validateSnippet } from '@/lib/snippets'
import { triage } from '@/lib/triage'

const entry = (q: string, confidence: 'high' | 'medium' | 'low', at = 1, source?: string) => makeEntry('chat', q, triage(q), confidence, source, at)

describe('conversation analytics', () => {
  const log = [
    entry('Is shipping free?', 'high', 1, 'Shipping'),
    entry('How long does delivery take?', 'medium', 2, 'Shipping'),
    entry('I want a refund, this is terrible and I am furious, worst service', 'high', 3, 'Returns'),
    entry('Do you ship to Japan?', 'low', 4),
    entry('Shipping to japan possible?', 'low', 5),
    entry('Can I pay with crypto?', 'low', 6),
  ]

  it('summarizes volume, self-serve rate, intents and sources', () => {
    const s = summarize(log)
    expect(s.total).toBe(6)
    expect(s.selfServe).toBe(2) // the refund is escalated, the 3 low-confidence ones are not self-serve
    expect(s.escalated).toBe(1)
    expect(s.byIntent[0].intent).toBe('shipping')
    expect(s.topSources[0]).toEqual({ title: 'Shipping', count: 2 })
    expect(s.byConfidence.low).toBe(3)
  })

  it('groups near-duplicate unanswered questions into knowledge gaps', () => {
    const gaps = knowledgeGaps(log)
    expect(gaps).toHaveLength(2)
    expect(gaps[0].count).toBe(2)
    expect(gaps[0].examples).toContain('Shipping to japan possible?')
    expect(gaps[1].question).toBe('Can I pay with crypto?')
  })

  it('drafts a starter document from a gap', () => {
    const d = draftFromGap(knowledgeGaps(log)[0])
    expect(d.title).toBe('Do you ship to Japan?')
    expect(d.content).toContain('- Shipping to japan possible?')
    expect(d.content.trim().endsWith('Answer:')).toBe(true)
  })

  it('caps the log size and strips email subject lines', () => {
    let l: ReturnType<typeof entry>[] = []
    for (let i = 0; i < MAX_LOG + 20; i++) l = appendLog(l, entry(`q${i}`, 'high', i))
    expect(l).toHaveLength(MAX_LOG)
    expect(l[0].question).toBe('q20')
    expect(makeEntry('email', 'Subject: Hi\n\nWhere is my order?', triage('Where is my order?'), 'high').question).toBe('Where is my order?')
  })
})

describe('saved replies', () => {
  it('fills placeholders with sensible fallbacks', () => {
    expect(fillSnippet('Hi {{customer}}, thanks from {{ business }}. {{agent}}', { customer: 'Alex', business: 'Harbor & Pine' }))
      .toBe('Hi Alex, thanks from Harbor & Pine. The Support Team')
    expect(fillSnippet('Hi {{customer}}', {})).toBe('Hi there')
  })

  it('turns a drafted reply back into a template', () => {
    expect(toTemplate('Hi Alex,\n\nBest,\nSam at Harbor & Pine', { customer: 'Alex', agent: 'Sam', business: 'Harbor & Pine' }))
      .toBe('Hi {{customer}},\n\nBest,\n{{agent}} at {{business}}')
  })

  it('validates and de-duplicates by title', () => {
    expect(validateSnippet('', 'long enough body')).toMatch(/title/)
    expect(validateSnippet('Refund', 'short')).toMatch(/too short/)
    let list = addSnippet([], 'Refund', 'Refund policy reply body', 1)
    list = addSnippet(list, 'refund', 'Updated refund reply body', 2)
    expect(list).toHaveLength(1)
    expect(list[0].body).toBe('Updated refund reply body')
  })
})
