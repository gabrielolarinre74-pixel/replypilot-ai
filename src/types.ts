import type { SearchHit } from './lib/rag'
import type { Triage } from './lib/triage'

export interface ChatMessage {
  role: 'system' | 'user' | 'assistant'
  content: string
}

export interface UiMessage extends ChatMessage {
  id: string
  sources?: SearchHit[]
  triage?: Triage
  confidence?: 'high' | 'medium' | 'low'
  engine?: 'demo' | 'openai'
}
