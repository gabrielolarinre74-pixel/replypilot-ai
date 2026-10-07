// Saved replies: reusable answers the team approved, with simple placeholders.

export interface Snippet {
  id: string
  title: string
  body: string
  createdAt: number
}

export const PLACEHOLDERS = ['{{customer}}', '{{business}}', '{{agent}}'] as const
export const MAX_SNIPPETS = 50
export const MAX_SNIPPET_CHARS = 4000

export interface SnippetVars {
  customer?: string
  business?: string
  agent?: string
}

/** Replace placeholders; a missing customer name falls back to a friendly "there". */
export function fillSnippet(body: string, vars: SnippetVars): string {
  return body
    .replace(/\{\{\s*customer\s*\}\}/gi, vars.customer?.trim() || 'there')
    .replace(/\{\{\s*business\s*\}\}/gi, vars.business?.trim() || 'our team')
    .replace(/\{\{\s*agent\s*\}\}/gi, vars.agent?.trim() || 'The Support Team')
}

/** Turn a drafted reply back into a reusable template by swapping names for placeholders. */
export function toTemplate(body: string, vars: SnippetVars): string {
  let out = body
  const swap = (value: string | undefined, token: string) => {
    const v = value?.trim()
    if (v && v.length > 1) out = out.split(v).join(token)
  }
  swap(vars.agent, '{{agent}}')
  swap(vars.business, '{{business}}')
  swap(vars.customer, '{{customer}}')
  return out
}

export function validateSnippet(title: string, body: string): string | null {
  if (!title.trim()) return 'Give the saved reply a short title.'
  if (title.trim().length > 80) return 'Keep the title under 80 characters.'
  if (body.trim().length < 10) return 'The reply is too short to save.'
  if (body.length > MAX_SNIPPET_CHARS) return `Saved replies are limited to ${MAX_SNIPPET_CHARS} characters.`
  return null
}

export function addSnippet(list: Snippet[], title: string, body: string, now = Date.now()): Snippet[] {
  const s: Snippet = { id: `s-${now.toString(36)}${Math.random().toString(36).slice(2, 5)}`, title: title.trim(), body: body.trim(), createdAt: now }
  return [s, ...list.filter(x => x.title.toLowerCase() !== s.title.toLowerCase())].slice(0, MAX_SNIPPETS)
}
