import { Show, createEffect, createSignal } from 'solid-js'
import { validateSettings } from '@/lib/settings'
import type { Accessor, Setter } from 'solid-js'
import type { Settings } from '@/lib/settings'

interface Props {
  open: Accessor<boolean>
  setOpen: Setter<boolean>
  settings: Accessor<Settings>
  setSettings: Setter<Settings>
}

export default (props: Props) => {
  const [draft, setDraft] = createSignal<Settings>(props.settings())
  const [error, setError] = createSignal('')
  const [show, setShow] = createSignal(false)
  createEffect(() => { if (props.open()) { setDraft(props.settings()); setError('') } })
  const set = <K extends keyof Settings>(k: K, v: Settings[K]) => setDraft({ ...draft(), [k]: v })

  const apply = () => {
    const problem = validateSettings(draft())
    if (problem) { setError(problem); return }
    setError('')
    props.setSettings({ ...draft(), apiKey: draft().apiKey.trim() })
    props.setOpen(false)
  }

  return (
    <Show when={props.open()}>
      <div class="fixed inset-0 z-50 flex justify-end" onKeyDown={e => e.key === 'Escape' && props.setOpen(false)}>
        <div class="absolute inset-0 bg-ink-900/50 backdrop-blur-sm" onClick={() => props.setOpen(false)} />
        <aside class="relative w-full max-w-md h-full overflow-y-auto bg-white dark:bg-ink-800 shadow-2xl p-6 space-y-5" role="dialog" aria-label="Settings">
          <div class="flex items-center justify-between">
            <h2 class="text-xl font-bold">Settings</h2>
            <button class="btn-ghost !w-10 !px-0" onClick={() => props.setOpen(false)} aria-label="Close"><span class="i-ph-x-bold" /></button>
          </div>

          <div>
            <span class="label">Answer engine</span>
            <div class="grid grid-cols-2 gap-2">
              <button class={`rounded-xl border-2 p-3 text-left transition ${draft().engine === 'demo' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 dark:border-ink-600'}`} onClick={() => set('engine', 'demo')}>
                <div class="font-semibold text-sm">Demo engine</div><div class="text-xs text-slate-500">Offline, no key. Extracts answers from your docs.</div>
              </button>
              <button class={`rounded-xl border-2 p-3 text-left transition ${draft().engine === 'openai' ? 'border-brand-500 bg-brand-50 dark:bg-brand-500/10' : 'border-slate-200 dark:border-ink-600'}`} onClick={() => set('engine', 'openai')}>
                <div class="font-semibold text-sm">AI model</div><div class="text-xs text-slate-500">Any OpenAI-compatible API (OpenAI, Groq, Ollama…).</div>
              </button>
            </div>
          </div>

          <Show when={draft().engine === 'openai'}>
            <div class="space-y-4 rounded-xl bg-slate-50 dark:bg-ink-900/50 p-4">
              <div>
                <label class="label" for="key">API key</label>
                <div class="relative">
                  <input id="key" class="field pr-10" type={show() ? 'text' : 'password'} autocomplete="off" value={draft().apiKey} onInput={e => set('apiKey', e.currentTarget.value)} placeholder="sk-…" />
                  <button class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-slate-400" onClick={() => setShow(!show())} aria-label="Show key"><span class={show() ? 'i-ph-eye-slash-bold' : 'i-ph-eye-bold'} /></button>
                </div>
                <p class="text-xs text-slate-500 mt-1">Saved only in this browser and sent only to the API URL below.</p>
              </div>
              <div><label class="label" for="url">API base URL</label><input id="url" class="field" value={draft().baseUrl} onInput={e => set('baseUrl', e.currentTarget.value)} /></div>
              <div class="grid grid-cols-2 gap-3">
                <div><label class="label" for="model">Model</label><input id="model" class="field" value={draft().model} onInput={e => set('model', e.currentTarget.value)} /></div>
                <div><label class="label" for="temp">Creativity {draft().temperature.toFixed(1)}</label><input id="temp" type="range" min="0" max="1" step="0.1" class="w-full mt-3 accent-brand-500" value={draft().temperature} onInput={e => set('temperature', Number(e.currentTarget.value))} /></div>
              </div>
            </div>
          </Show>

          <div><label class="label" for="biz">Business name</label><input id="biz" class="field" maxLength={80} value={draft().businessName} onInput={e => set('businessName', e.currentTarget.value)} placeholder="Defaults to the sample store" /></div>
          <div><label class="label" for="agent">Sign emails as</label><input id="agent" class="field" maxLength={80} value={draft().agentName} onInput={e => set('agentName', e.currentTarget.value)} /></div>
          <div>
            <label class="label" for="tone2">Default tone</label>
            <select id="tone2" class="field" value={draft().tone} onChange={e => set('tone', e.currentTarget.value as Settings['tone'])}>
              <option value="friendly">Friendly</option><option value="professional">Professional</option><option value="concise">Concise</option>
            </select>
          </div>
          <Show when={error()}><p class="text-sm text-rose-600">{error()}</p></Show>
          <div class="flex gap-2 pt-2">
            <button class="btn-primary flex-1" onClick={apply}>Save settings</button>
            <Show when={props.settings().apiKey}><button class="btn-ghost" onClick={() => { setDraft({ ...draft(), apiKey: '', engine: 'demo' }) }}>Forget key</button></Show>
          </div>
        </aside>
      </div>
    </Show>
  )
}
