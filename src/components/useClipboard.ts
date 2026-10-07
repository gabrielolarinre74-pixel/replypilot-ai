import { createSignal } from 'solid-js'

export function useClipboard(ms = 1200) {
  const [copied, setCopied] = createSignal(false)
  const copy = async(text: string) => {
    try {
      await navigator.clipboard.writeText(text)
    } catch {
      const ta = document.createElement('textarea')
      ta.value = text
      document.body.appendChild(ta)
      ta.select()
      document.execCommand('copy')
      ta.remove()
    }
    setCopied(true)
    setTimeout(() => setCopied(false), ms)
  }
  return [copied, copy] as const
}
