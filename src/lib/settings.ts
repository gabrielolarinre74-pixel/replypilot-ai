export type EngineKind = 'demo' | 'openai'
export type Tone = 'friendly' | 'professional' | 'concise'

export interface Settings {
  engine: EngineKind
  apiKey: string
  baseUrl: string
  model: string
  businessName: string
  agentName: string
  tone: Tone
  temperature: number
}

export const DEFAULT_SETTINGS: Settings = {
  engine: 'demo',
  apiKey: '',
  baseUrl: 'https://api.openai.com/v1',
  model: 'gpt-4o-mini',
  businessName: '',
  agentName: 'The Support Team',
  tone: 'friendly',
  temperature: 0.3,
}

/** Read JSON from localStorage without ever throwing (corrupted values fall back to defaults). */
export function load<T>(key: string, fallback: T): T {
  try {
    if (typeof localStorage === 'undefined') return fallback
    const raw = localStorage.getItem(key)
    if (!raw) return fallback
    const parsed = JSON.parse(raw)
    if (fallback && typeof fallback === 'object' && !Array.isArray(fallback))
      return { ...fallback, ...parsed }
    return parsed as T
  } catch {
    return fallback
  }
}

export function save(key: string, value: unknown) {
  try {
    localStorage.setItem(key, JSON.stringify(value))
  } catch {
    // storage full or disabled (private mode): the app keeps working in memory
  }
}

export function validateSettings(s: Settings): string | null {
  if (s.engine === 'openai') {
    if (!s.apiKey.trim()) return 'Add an API key or switch back to Demo mode.'
    try {
      const u = new URL(s.baseUrl)
      if (u.protocol !== 'https:' && !['localhost', '127.0.0.1'].includes(u.hostname))
        return 'The API base URL must use https (http is only allowed for localhost).'
    } catch {
      return 'The API base URL is not a valid URL.'
    }
    if (!s.model.trim()) return 'Choose a model name.'
  }
  return null
}
