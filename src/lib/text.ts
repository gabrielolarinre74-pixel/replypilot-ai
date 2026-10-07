// Small, dependency-free text utilities shared by the retriever and the triage engine.

const STOPWORDS = new Set(`a an and are as at be been but by can could did do does doing for from had has have
having he her hers him his how i if in into is it its just me my of on or our ours please so some than that
the their them then there these they this those to too us was we were what when where which who whom why will
with would you your yours am also any about after again all being both each few more most other own same should
only very s t don now hi hello hey thanks thank regards dear get got im ive id
take takes long much many need want know tell like way also still really something anything everything someone thing things now`.split(/\s+/))

// Lightweight synonym groups so "money back" can still find the refund policy.
const SYNONYMS: Record<string, string[]> = {
  refund: ['return', 'money', 'reimburse'],
  return: ['refund', 'exchange'],
  ship: ['deliver', 'delivery', 'post', 'courier'],
  deliver: ['ship', 'shipping', 'courier'],
  price: ['cost', 'pricing', 'fee', 'plan'],
  cost: ['price', 'pricing', 'fee'],
  cancel: ['cancellation', 'stop', 'terminate'],
  hour: ['open', 'opening', 'time'],
  open: ['hour', 'opening'],
  pay: ['payment', 'card', 'invoice'],
  track: ['tracking', 'status', 'where'],
  book: ['appointment', 'schedule', 'reserve'],
  broken: ['damage', 'damaged', 'faulty', 'defect', 'replacement'],
  crack: ['damage', 'damaged', 'broken', 'replacement'],
  damage: ['broken', 'faulty', 'defect'],
  remove: ['disappear', 'refund'],
}

export function stem(word: string): string {
  let w = word
  if (w.length > 5 && w.endsWith('ing')) w = w.slice(0, -3)
  else if (w.length > 4 && w.endsWith('ies')) w = `${w.slice(0, -3)}y`
  else if (w.length > 4 && w.endsWith('ed')) w = w.slice(0, -2)
  else if (w.length > 4 && w.endsWith('es') && /(sh|ch|x|ss)es$/.test(w)) w = w.slice(0, -2)
  else if (w.length > 3 && w.endsWith('s') && !w.endsWith('ss')) w = w.slice(0, -1)
  else if (w.length > 5 && w.endsWith('ly')) w = w.slice(0, -2)
  // "damage" and "damaged" should meet at "damag"
  if (w.length > 4 && w.endsWith('e') && !w.endsWith('ee')) w = w.slice(0, -1)
  // "shipping"/"shipped" -> "shipp" -> "ship", so they match "ship"
  if (w !== word && w.length > 3 && /([bdgmnprt])\1$/.test(w)) w = w.slice(0, -1)
  return w
}

export function tokenize(text: string): string[] {
  return (text.toLowerCase().normalize('NFKD').replace(/[\u0300-\u036F]/g, '').match(/[a-z0-9]+/g) || [])
    .filter(t => !STOPWORDS.has(t) && t.length > 1)
    .map(stem)
}

const STEMMED_SYNONYMS: Record<string, string[]> = Object.fromEntries(
  Object.entries(SYNONYMS).map(([k, v]) => [stem(k), v.map(stem)]),
)

/** Synonyms of an already-stemmed term. */
export function synonymsOf(term: string): string[] {
  return STEMMED_SYNONYMS[term] || []
}

/** Tokenize and add synonyms (used for queries only, never for documents). */
export function expandQuery(text: string): string[] {
  const base = tokenize(text)
  const out = [...base]
  for (const t of base) out.push(...synonymsOf(t))
  return out
}

export function splitSentences(text: string): string[] {
  return text
    .replace(/\s+/g, ' ')
    .split(/(?<=[.!?])\s+(?=[A-Z0-9"'(])/)
    .map(s => s.trim())
    .filter(s => s.length > 0)
}
