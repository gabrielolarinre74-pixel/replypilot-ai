// Rule-based triage that runs instantly in the browser, before any AI call.
// It tells the agent (and the human team) what the customer wants, how they feel
// and whether the conversation should be handed to a person.

export type Intent = 'damaged' | 'refund' | 'shipping' | 'billing' | 'booking' | 'pricing' | 'technical' | 'cancellation' | 'complaint' | 'sales' | 'general'
export type Sentiment = 'negative' | 'neutral' | 'positive'
export type Urgency = 'high' | 'normal' | 'low'

export interface Triage {
  intent: Intent
  sentiment: Sentiment
  urgency: Urgency
  escalate: boolean
  reasons: string[]
}

const INTENT_RULES: [Intent, RegExp][] = [
  ['damaged', /\b(damaged|broken|cracked|smashed|faulty|defective|arrived in pieces)\b/i],
  ['refund', /\b(refund|money back|reimburse|return(ed|ing)? (it|the|my)|chargeback)\b/i],
  ['cancellation', /\b(cancel|cancellation|unsubscribe|close my account|terminate)\b/i],
  ['shipping', /\b(ship|shipping|deliver(y|ed)?|courier|tracking|track my|where is my (order|package|parcel)|arriv)/i],
  ['billing', /\b(invoice|charged|charge|billing|payment|receipt|card|overcharg|double charg)/i],
  ['sales', /\b(wholesale|bulk|partnership|partner|reseller|corporate order|b2b)\b/i],
  ['booking', /\b(book|booking|appointment|schedule|reschedul|reservation|availability|slot)\b/i],
  ['pricing', /\b(price|pricing|cost|how much|quote|discount|plan|package)\b/i],
  ['technical', /\b(error|bug|not working|doesn'?t work|broken link|login|log in|password|crash|can'?t access)\b/i],
  ['complaint', /\b(complain|complaint|disappointed|unacceptable|terrible|awful|worst|rude)\b/i],
]

const NEGATIVE = /\b(angry|upset|disappointed|frustrat\w*|terrible|awful|horrible|worst|unacceptable|ridiculous|scam|broken|damaged|late|never arrived|still waiting|no one|nobody|useless|annoyed|furious|bad|poor|wrong|missing)\b/gi
const POSITIVE = /\b(love|great|amazing|awesome|thanks so much|thank you so much|happy|excellent|perfect|fantastic|wonderful|appreciate)\b/gi
const URGENT = /\b(urgent|asap|immediately|right now|today|tonight|emergency|as soon as possible|deadline)\b|!!/i
const LEGAL = /\b(lawyer|legal action|sue|court|chargeback|dispute with my bank|report you|trading standards|consumer protection)\b/i
const HUMAN = /\b(speak to (a|an) (human|person|manager|agent)|real person|talk to (someone|a human|your manager)|manager)\b/i

export function triage(message: string): Triage {
  const text = message.slice(0, 8000)
  const reasons: string[] = []

  const intent = INTENT_RULES.find(([, re]) => re.test(text))?.[0] ?? 'general'

  const neg = (text.match(NEGATIVE) || []).length
  const pos = (text.match(POSITIVE) || []).length
  const shouting = (text.match(/\b[A-Z]{4,}\b/g) || []).length >= 2
  const negScore = neg + (shouting ? 1 : 0)
  const sentiment: Sentiment = negScore > pos ? 'negative' : pos > negScore ? 'positive' : 'neutral'

  let urgency: Urgency = 'normal'
  if (URGENT.test(text) || (sentiment === 'negative' && negScore >= 3)) urgency = 'high'
  else if (sentiment === 'positive' && intent === 'general') urgency = 'low'

  if (LEGAL.test(text)) reasons.push('Mentions legal action or a bank dispute')
  if (HUMAN.test(text)) reasons.push('Customer asked for a human')
  if (sentiment === 'negative' && negScore >= 3) reasons.push('Strongly negative tone')
  if (intent === 'refund' && sentiment === 'negative') reasons.push('Unhappy customer asking for a refund')

  return { intent, sentiment, urgency, escalate: reasons.length > 0, reasons }
}

export const INTENT_LABEL: Record<Intent, string> = {
  damaged: 'Damaged item',
  refund: 'Refund / return',
  shipping: 'Shipping & delivery',
  billing: 'Billing & payments',
  booking: 'Booking',
  pricing: 'Pricing',
  technical: 'Technical issue',
  cancellation: 'Cancellation',
  complaint: 'Complaint',
  sales: 'Sales lead',
  general: 'General question',
}
