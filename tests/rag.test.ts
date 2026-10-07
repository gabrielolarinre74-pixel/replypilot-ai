import { describe, expect, it } from 'vitest'
import { KnowledgeIndex, chunkDocument, confidenceOf, extractQuestions, multiSearch } from '@/lib/rag'
import { SAMPLE_DOCS } from '@/lib/sampleKnowledge'
import { stem, tokenize } from '@/lib/text'

const index = new KnowledgeIndex(SAMPLE_DOCS)

describe('text', () => {
  it('drops stopwords and stems', () => {
    expect(tokenize('How long does shipping take?')).toEqual([stem('shipping')])
    expect(tokenize('Where is my parcel?')).toEqual(['parcel'])
    expect(stem('refunds')).toBe('refund')
  })
})

describe('chunking', () => {
  it('keeps every sentence and stays small', () => {
    const chunks = chunkDocument(SAMPLE_DOCS[0])
    expect(chunks.length).toBeGreaterThan(1)
    expect(chunks.map(c => c.text).join(' ')).toContain('import duties')
    for (const c of chunks) expect(c.text.split(' ').length).toBeLessThan(160)
  })
})

describe('retrieval', () => {
  it.each([
    ['How long does delivery take?', 'shipping'],
    ['Can I get my money back?', 'returns'],
    ['What time are you open on Saturday?', 'contact'],
    ['I was charged twice for my order', 'payments'],
    ['Do you offer bulk pricing for hotels?', 'wholesale'],
    ['How do I clean the wooden table?', 'care'],
  ])('"%s" -> %s', (q, doc) => {
    expect(index.search(q)[0].chunk.docId).toBe(doc)
  })

  it('reports low confidence for unrelated questions', () => {
    expect(confidenceOf(index.search('Who won the football match yesterday?'))).toBe('low')
    expect(confidenceOf(index.search('How long does standard delivery take?'))).not.toBe('low')
  })

  it('splits multi-question emails and merges hits', () => {
    const email = 'Hi! My order arrived damaged. Can I get a replacement? Also, do you ship to Canada?'
    expect(extractQuestions(email)).toHaveLength(2)
    const docs = new Set(multiSearch(index, email).map(h => h.chunk.docId))
    expect(docs.has('returns')).toBe(true)
    expect(docs.has('shipping')).toBe(true)
  })
})

describe('stemming', () => {
  it('collapses doubled consonants left by -ing/-ed', () => {
    expect(stem('shipping')).toBe(stem('ship'))
    expect(stem('shipped')).toBe(stem('ship'))
    expect(stem('planned')).toBe(stem('plan'))
    expect(stem('dress')).toBe('dress')
  })
})
