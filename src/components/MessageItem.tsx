import { Show, createSignal } from 'solid-js'
import MarkdownIt from 'markdown-it'
import hljs from 'highlight.js/lib/core'
import json from 'highlight.js/lib/languages/json'
import plaintext from 'highlight.js/lib/languages/plaintext'
import { useClipboard } from './useClipboard'
import { ConfidenceChip, TriageBadges } from './Badges'
import Sources from './Sources'
import IconRefresh from './icons/Refresh'
import type { Accessor } from 'solid-js'
import type { UiMessage } from '@/types'

interface Props {
  message: UiMessage
  content?: Accessor<string>
  showRetry?: boolean
  onRetry?: () => void
}

// html: false keeps any HTML in model output escaped (prevents XSS from prompt-injected answers)
hljs.registerLanguage('json', json)
hljs.registerLanguage('plaintext', plaintext)
const md: MarkdownIt = MarkdownIt({
  html: false,
  linkify: true,
  breaks: true,
  highlight: (code, lang) => (lang && hljs.getLanguage(lang) ? hljs.highlight(code, { language: lang }).value : md.utils.escapeHtml(code)),
})
// open links in a new tab, safely
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
    <div class={`flex gap-3 py-3 ${isUser() ? 'flex-row-reverse' : ''}`}>
      <div class={`shrink-0 w-9 h-9 rounded-full grid place-items-center text-white text-sm font-bold ${isUser() ? 'bg-gradient-to-br from-slate-400 to-slate-600' : 'bg-gradient-to-br from-brand-400 to-indigo-700'}`}>
        {isUser() ? <span class="i-ph-user-bold" /> : <span class="i-ph-paper-plane-tilt-fill" />}
      </div>
      <div class={`min-w-0 max-w-[85%] ${isUser() ? 'items-end text-right' : ''} flex flex-col`}>
        <div class={`rounded-2xl px-4 py-3 text-left ${isUser() ? 'bg-brand-500 text-white rounded-tr-sm' : 'bg-white dark:bg-ink-700 border border-slate-200/80 dark:border-ink-600 rounded-tl-sm'}`}>
          <div class={`message prose prose-sm max-w-none break-words ${isUser() ? 'prose-invert' : 'dark:prose-invert'}`} innerHTML={renderMarkdown(text())} />
        </div>
        <Show when={isUser() && props.message.triage}>
          <div class="mt-1.5 flex justify-end"><TriageBadges triage={props.message.triage!} /></div>
        </Show>
        <Show when={!isUser() && !props.content}>
          <div class="mt-1.5 flex flex-wrap items-center gap-2">
            <ConfidenceChip level={props.message.confidence} />
            <span class="chip bg-slate-100 text-slate-500 dark:(bg-ink-700 text-slate-400)">{props.message.engine === 'openai' ? 'AI model' : 'Demo engine'}</span>
            <button class="chip bg-slate-100 text-slate-500 hover:text-slate-800 dark:(bg-ink-700 text-slate-400 hover:text-white)" onClick={() => copy(text())}>
              <span class={copied() ? 'i-ph-check-bold' : 'i-ph-copy-bold'} /> {copied() ? 'Copied' : 'Copy'}
            </button>
            <Show when={props.showRetry && props.onRetry}>
              <button class="chip bg-slate-100 text-slate-500 hover:text-slate-800 dark:(bg-ink-700 text-slate-400 hover:text-white)" onClick={props.onRetry}>
                <IconRefresh /> Regenerate
              </button>
            </Show>
          </div>
          <Sources hits={props.message.sources} />
        </Show>
      </div>
    </div>
  )
}
