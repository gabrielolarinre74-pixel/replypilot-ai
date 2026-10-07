import { describe, expect, it } from 'vitest'
import { HANDOFF_LINE, buildLLMMessages, demoAnswer, subjectFor } from '@/lib/agent'
import { KnowledgeIndex, multiSearch } from '@/lib/rag'
import { SAMPLE_BUSINESS, SAMPLE_DOCS } from '@/lib/sampleKnowledge'
import { DEFAULT_SETTINGS, validateSettings } from '@/lib/settings'
import { triage } from '@/lib/triage'

const index = new KnowledgeIndex(SAMPLE_DOCS)
const run = (message: string, mode: 'chat' | 'email' = 'chat', tone = DEFAULT_SETTINGS.tone) => demoAnswer(index, {
  message, mode, hits: multiSearch(index, message), triage: triage(message),
  settings: { ...DEFAULT_SETTINGS, tone }, businessName: SAMPLE_BUSINESS, customerName: 'Sam',
})

describe('demo engine', () => {
  it('answers from the knowledge base with citations', () => {
    const { text, confidence } = run('Is shipping free?')
    expect(text).toMatch(/free on orders over \$75/)
    expect(text).toMatch(/\[\d\]/)
    expect(confidence).not.toBe('low')
  })

  it('hands off instead of guessing', () => {
    const { text, confidence } = run('Can you recommend a good restaurant nearby?')
    expect(confidence).toBe('low')
    expect(text).toContain(HANDOFF_LINE)
  })

  it('writes a full email that answers every question', () => {
    const { text } = run('Subject: damaged mug\n\nHello, my mug arrived broken. Can I get a replacement? And how long do refunds take?', 'email', 'professional')
    expect(text.startsWith('Dear Sam,')).toBe(true)
    expect(text).toMatch(/photo/)
    expect(text).toMatch(/5 business days/)
    expect(text).toMatch(/Kind regards/)
  })

  it('creates a reply subject', () => {
    expect(subjectFor('Subject: Order 1234 late\n\nhi', triage('late'))).toBe('Re: Order 1234 late')
    expect(subjectFor('I want my money back', triage('I want my money back'))).toBe('Re: Your refund request')
  })
})

describe('LLM prompt', () => {
  it('grounds the model in numbered sources', () => {
    const msg = 'Do you ship to Canada?'
    const messages = buildLLMMessages({ message: msg, mode: 'chat', hits: multiSearch(index, msg), triage: triage(msg), settings: DEFAULT_SETTINGS, businessName: SAMPLE_BUSINESS })
    expect(messages[0].role).toBe('system')
    expect(messages[0].content).toContain('[1]')
    expect(messages[0].content).toContain(HANDOFF_LINE)
    expect(messages.at(-1)).toEqual({ role: 'user', content: msg })
  })
})

describe('settings validation', () => {
  it('requires a key and https in AI mode', () => {
    expect(validateSettings(DEFAULT_SETTINGS)).toBeNull()
    expect(validateSettings({ ...DEFAULT_SETTINGS, engine: 'openai' })).toMatch(/API key/)
    expect(validateSettings({ ...DEFAULT_SETTINGS, engine: 'openai', apiKey: 'x', baseUrl: 'http://evil.example' })).toMatch(/https/)
    expect(validateSettings({ ...DEFAULT_SETTINGS, engine: 'openai', apiKey: 'x', baseUrl: 'http://localhost:11434/v1' })).toBeNull()
  })
})
