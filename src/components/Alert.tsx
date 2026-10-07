import { Show } from 'solid-js'

export default (props: { message: string, action?: string, onAction?: () => void }) => (
  <div class="rise flex items-start gap-3 rounded-xl border border-red-200 bg-red-50/70 px-4 py-3 text-sm text-red-800" role="alert">
    <span class="i-ph-warning-circle-bold mt-0.5 shrink-0 text-red-600" />
    <p class="flex-1 leading-relaxed">{props.message}</p>
    <Show when={props.onAction}>
      <button class="shrink-0 font-semibold text-red-700 underline underline-offset-2 hover:text-red-900" onClick={props.onAction}>{props.action || 'Try again'}</button>
    </Show>
  </div>
)
