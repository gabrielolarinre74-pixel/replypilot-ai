import { For, Show, createSignal } from 'solid-js'
import type { SearchHit } from '@/lib/rag'

export default (props: { hits?: SearchHit[], defaultOpen?: boolean }) => {
  const [open, setOpen] = createSignal(!!props.defaultOpen)
  return (
    <Show when={props.hits?.length}>
      <div class="mt-3 border-t border-ink-100 pt-2.5">
        <button class="flex items-center gap-1.5 text-[12px] font-semibold text-ink-500 hover:text-ink-950 transition" onClick={() => setOpen(!open())} aria-expanded={open()}>
          <span class="i-ph-book-open-text-bold text-brand-600" />
          {props.hits!.length} source{props.hits!.length > 1 ? 's' : ''}
          <span class={`i-ph-caret-down-bold text-[10px] transition-transform ${open() ? 'rotate-180' : ''}`} />
        </button>
        <Show when={open()}>
          <ol class="mt-2 grid gap-1.5">
            <For each={props.hits}>{(h, i) => (
              <li class="rise rounded-lg bg-ink-50 ring-1 ring-ink-100 px-3 py-2 text-[12.5px] leading-relaxed">
                <div class="mb-0.5 flex items-center justify-between gap-3">
                  <span class="flex items-center gap-1.5 font-semibold text-ink-900">
                    <span class="grid h-4 min-w-4 place-items-center rounded bg-brand-100 px-1 text-[10px] font-bold text-brand-700">{i() + 1}</span>
                    {h.chunk.docTitle}
                  </span>
                  <span class="flex items-center gap-1.5 text-[11px] tabular-nums text-ink-400">
                    <span class="h-1 w-12 overflow-hidden rounded-full bg-ink-200"><span class="block h-full bg-brand-500" style={{ width: `${Math.round(h.coverage * 100)}%` }} /></span>
                    {Math.round(h.coverage * 100)}%
                  </span>
                </div>
                <p class="text-ink-500">{h.chunk.text}</p>
              </li>
            )}</For>
          </ol>
        </Show>
      </div>
    </Show>
  )
}
