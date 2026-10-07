import { describe, expect, it } from 'vitest'
import { triage } from '@/lib/triage'

describe('triage', () => {
  it('detects intent', () => {
    expect(triage('Where is my order? The tracking has not moved').intent).toBe('shipping')
    expect(triage('I want a refund for this lamp').intent).toBe('refund')
    expect(triage('Can I book an appointment for Friday?').intent).toBe('booking')
    expect(triage('We would like a wholesale quote for 40 chairs').intent).toBe('sales')
  })

  it('detects sentiment and urgency', () => {
    const t = triage('This is UNACCEPTABLE. The package is damaged, I am furious and I need this fixed TODAY')
    expect(t.sentiment).toBe('negative')
    expect(t.urgency).toBe('high')
    expect(triage('Thank you so much, I love the vase!').sentiment).toBe('positive')
  })

  it('escalates legal threats and requests for a human', () => {
    expect(triage('If this is not fixed I will contact my lawyer').escalate).toBe(true)
    expect(triage('Can I speak to a manager please').escalate).toBe(true)
    expect(triage('What are your opening hours?').escalate).toBe(false)
  })
})
