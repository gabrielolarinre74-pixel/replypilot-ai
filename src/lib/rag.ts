import { expandQuery, splitSentences, synonymsOf, tokenize } from './text'

export interface KnowledgeDoc {
  id: string
  title: string
  content: string
  updatedAt?: number
}

export interface Chunk {
  id: string
  docId: string
  docTitle: string
  text: string
  tokens: string[]
}

export interface SearchHit {
  chunk: Chunk
  score: number
  /** Share of the (non-stopword) query terms found in this chunk, 0..1 */
  coverage: number
}

export type Confidence = 'high' | 'medium' | 'low'

const TARGET_WORDS = 90

/** Split a document into passages of roughly TARGET_WORDS words, respecting paragraph and sentence boundaries. */
export function chunkDocument(doc: KnowledgeDoc): Chunk[] {
  const paragraphs = doc.content.split(/\n\s*\n/).map(p => p.trim()).filter(Boolean)
  const pieces: string[] = []
  let buf: string[] = []
  let words = 0
  const flush = () => {
    if (buf.length) pieces.push(buf.join(' '))
    buf = []
    words = 0
  }
  for (const p of paragraphs) {
    for (const s of splitSentences(p)) {
      const w = s.split(/\s+/).length
      if (words + w > TARGET_WORDS && words > 0) flush()
      buf.push(s)
      words += w
    }
    if (words > TARGET_WORDS * 0.6) flush()
  }
  flush()
  return pieces.map((text, i) => ({
    id: `${doc.id}#${i}`,
    docId: doc.id,
    docTitle: doc.title,
    // the title is indexed too so "shipping" matches the "Shipping policy" document
    text,
    tokens: tokenize(`${doc.title} ${text}`),
  }))
}

/** Okapi BM25 index over knowledge-base passages. Runs fully in the browser. */
export class KnowledgeIndex {
  readonly chunks: Chunk[]
  private df = new Map<string, number>()
  private avgLen = 0
  private k1 = 1.4
  private b = 0.75

  constructor(docs: KnowledgeDoc[]) {
    this.chunks = docs.flatMap(chunkDocument)
    let total = 0
    for (const c of this.chunks) {
      total += c.tokens.length
      for (const t of new Set(c.tokens)) this.df.set(t, (this.df.get(t) || 0) + 1)
    }
    this.avgLen = this.chunks.length ? total / this.chunks.length : 0
  }

  idf(term: string): number {
    const n = this.chunks.length
    const df = this.df.get(term) || 0
    return Math.log(1 + (n - df + 0.5) / (df + 0.5))
  }

  search(query: string, k = 4): SearchHit[] {
    const qTerms = expandQuery(query)
    const core = new Set(tokenize(query))
    if (!qTerms.length || !this.chunks.length) return []
    const hits: SearchHit[] = []
    for (const chunk of this.chunks) {
      const tf = new Map<string, number>()
      for (const t of chunk.tokens) tf.set(t, (tf.get(t) || 0) + 1)
      let score = 0
      for (const term of new Set(qTerms)) {
        const f = tf.get(term)
        if (!f) continue
        const weight = core.has(term) ? 1 : 0.5 // synonyms count half
        score += weight * this.idf(term) * (f * (this.k1 + 1)) / (f + this.k1 * (1 - this.b + this.b * chunk.tokens.length / (this.avgLen || 1)))
      }
      if (score > 0) {
        // A query word counts as covered if it, or one of its synonyms, appears in the passage.
        // Words are weighted by rarity (IDF), so missing a specific word like "crypto" or
        // "Japan" lowers coverage far more than missing a generic one like "order".
        let found = 0
        let total = 0
        for (const t of core) {
          const w = this.idf(t)
          total += w
          if (tf.has(t) || synonymsOf(t).some(s => tf.has(s))) found += w
        }
        hits.push({ chunk, score, coverage: total ? found / total : 0 })
      }
    }
    return hits.sort((a, b) => b.score - a.score).slice(0, k)
  }
}

export function confidenceOf(hits: SearchHit[]): Confidence {
  const top = hits[0]
  if (!top) return 'low'
  if (top.coverage >= 0.5 && top.score >= 2) return 'high'
  if (top.coverage > 0.3 && top.score >= 1) return 'medium'
  // a short question whose every word is covered ("delivery time?") is still a solid match
  if (top.coverage >= 0.99 && top.score >= 0.5) return 'medium'
  return 'low'
}

/** Pull the questions out of a longer message so each one gets its own retrieval pass. */
export function extractQuestions(message: string): string[] {
  const sentences = splitSentences(message)
  const questions = sentences.filter(s => s.endsWith('?') || /^(can|could|do|does|is|are|how|what|when|where|why|will|would)\b/i.test(s))
  return questions.length ? questions.slice(0, 5) : [message]
}

/** Retrieve for every question in the message and merge the results without duplicates. */
export function multiSearch(index: KnowledgeIndex, message: string, perQuestion = 3, limit = 5): SearchHit[] {
  const best = new Map<string, SearchHit>()
  for (const q of extractQuestions(message)) {
    for (const hit of index.search(q, perQuestion)) {
      const prev = best.get(hit.chunk.id)
      if (!prev || prev.score < hit.score) best.set(hit.chunk.id, hit)
    }
  }
  return [...best.values()].sort((a, b) => b.score - a.score).slice(0, limit)
}
