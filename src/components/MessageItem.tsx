import { Show } from 'solid-js'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import plaintext from 'highlight.js/lib/languages/plaintext'
import { useClipboard } from './useClipboard'
import { ConfidenceMeter } from './Badges'
import Sources from './Sources'
import type { Accessor } from 'solid-js'
import type { UiMessage } from '@/types'

interface Props {
  message: UiMessage
  content?: Accessor<string>
  showRetry?: boolean
  onRetry?: () => void
  onSelect?: () => void
  selected?: boolean
}

// html: false keeps any HTML in model output escaped (prevents XSS from prompt-injected answers)
hljs.registerLanguage('json', json)
hljs.registerLanguage('plaintext', plaintext)
const escapeHtml = (s: string) => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]!))
const md = MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  highlight: (code: string, lang: string) => (lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : escapeHtml(code)),
})
md.renderer.rules.link_open = (tokens, idx, options, _env, self) => {
  tokens[idx].attrSet('target', '_blank')
  tokens[idx].attrSet('rel', 'noopener noreferrer')
  return self.renderToken(tokens, idx, options)
}

export function renderMarkdown(text: string) {
  return md.render(text).replace(/\[(\d{1,2})\]/g, '<sup class="cite">$1</sup>')
}

export default (props: Props) => {
  const text = () => (props.content ? props.content() : props.message.content)
  const isUser = () => props.message.role === 'user'
  const [copied, copy] = useClipboard()

  return (
    <div class={`rise flex py-2 ${isUser() ? 'justify-end' : 'justify-start'}`}>
      <Show when={isUser()} fallback={
        <div class="flex max-w-[88%] gap-3">
          <div class="mt-0.5 grid h-7 w-7 shrink-0 place-items-center rounded-lg bg-ink-950 text-[13px] text-brand-400"><span class="i-ph-paper-plane-tilt-fill" /></div>
          <div class="min-w-0">
            <div class="mb-1 flex items-center gap-2 text-[12px]">
              <span class="font-bold text-ink-950">ReplyPilot</span>
              <span class="text-ink-400">{props.message.engine === 'openai' ? 'AI model' : 'Demo engine'}</span>
            </div>
            <div class={`rounded-2xl rounded-tl-md bg-white px-4 py-3 ring-1 transition ${props.selected ? 'ring-brand-300 shadow-[0_0_0_4px_rgba(59,130,246,.08)]' : 'ring-ink-200'}`}>
              <Show when={text()} fallback={<div class="typing py-1"><span /><span /><span /></div>}>
                <div class="answer break-words text-ink-900" innerHTML={renderMarkdown(text())} />
              </Show>
              <Show when={!props.content}>
                <Sources hits={props.message.sources} />
              </Show>
            </div>
            <Show when={!props.content}>
              <div class="mt-1.5 flex flex-wrap items-center gap-3 pl-1">
                <ConfidenceMeter level={props.message.confidence} />
                <button class="flex items-center gap-1 text-[12px] font-medium text-ink-400 hover:text-ink-950" onClick={() => copy(text())}>
                  <span class={copied() ? 'i-ph-check-bold text-emerald-600' : 'i-ph-copy-bold'} />{copied() ? 'Copied' : 'Copy'}
                </button>
                <Show when={props.showRetry && props.onRetry}>
                  <button class="flex items-center gap-1 text-[12px] font-medium text-ink-400 hover:text-ink-950" onClick={props.onRetry}><span class="i-ph-arrow-clockwise-bold" />Regenerate</button>
                </Show>
              </div>
            </Show>
          </div>
        </div>
      }>
        <button class="group max-w-[75%] text-right" onClick={props.onSelect} title="Show details">
          <div class={`bubble-user rounded-2xl rounded-tr-md bg-ink-950 px-4 py-2.5 text-left text-white transition ${props.selected ? 'ring-4 ring-brand-500/25' : ''}`}>
            <div class="answer break-words" innerHTML={renderMarkdown(text())} />
          </div>
          <div class="mt-1 text-[11px] font-medium text-ink-400 group-hover:text-brand-600">Customer</div>
        </button>
      </Show>
    </div>
  )
}
