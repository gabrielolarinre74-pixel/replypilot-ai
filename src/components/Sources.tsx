import { For, Show, createSignal } from 'solid-js'
import type { SearchHit } from '@/lib/rag'

export default (props: { hits?: SearchHit[] }) => {
  const [open, setOpen] = createSignal(false)
  return (
    <Show when={props.hits?.length}>
      <div class="mt-2">
        <button class="text-xs font-semibold text-brand-600 dark:text-brand-400 hover:underline flex items-center gap-1" onClick={() => setOpen(!open())}>
          <span class="i-ph-books-bold" /> {props.hits!.length} source{props.hits!.length > 1 ? 's' : ''} from your knowledge base
          <span class={open() ? 'i-ph-caret-up-bold' : 'i-ph-caret-down-bold'} />
        </button>
        <Show when={open()}>
          <ol class="mt-2 space-y-2">
            <For each={props.hits}>{(h, i) => (
              <li class="rounded-xl bg-slate-50 dark:bg-ink-900/60 border border-slate-200/70 dark:border-ink-600 p-3 text-xs leading-relaxed">
                <div class="flex items-center justify-between gap-2 mb-1">
                  <span class="font-semibold text-slate-700 dark:text-slate-200">[{i() + 1}] {h.chunk.docTitle}</span>
                  <span class="text-slate-400 tabular-nums">score {h.score.toFixed(2)} · {Math.round(h.coverage * 100)}% match</span>
                </div>
                <p class="text-slate-500 dark:text-slate-400">{h.chunk.text}</p>
              </li>
            )}</For>
          </ol>
        </Show>
      </div>
    </Show>
  )
}
