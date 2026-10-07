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

  const Engine = (p: { id: Settings['engine'], icon: string, title: string, text: string }) => (
    <button class={`rounded-xl p-3.5 text-left ring-1 transition ${draft().engine === p.id ? 'bg-brand-50 ring-2 ring-brand-500' : 'bg-white ring-ink-200 hover:ring-ink-300'}`} onClick={() => set('engine', p.id)} aria-pressed={draft().engine === p.id}>
      <span class={`${p.icon} mb-2 block text-lg ${draft().engine === p.id ? 'text-brand-600' : 'text-ink-400'}`} />
      <div class="text-[13px] font-bold text-ink-950">{p.title}</div>
      <div class="mt-0.5 text-[12px] leading-snug text-ink-500">{p.text}</div>
    </button>
  )

  return (
    <Show when={props.open()}>
      <div class="fixed inset-0 z-50 grid place-items-center p-4" onKeyDown={e => e.key === 'Escape' && props.setOpen(false)}>
        <div class="absolute inset-0 bg-ink-950/40 backdrop-blur-[2px]" onClick={() => props.setOpen(false)} />
        <div class="rise relative max-h-[90vh] w-full max-w-lg overflow-y-auto rounded-2xl bg-white shadow-2xl ring-1 ring-ink-200" role="dialog" aria-modal="true" aria-label="Settings">
          <header class="sticky top-0 z-10 flex items-center justify-between border-b border-ink-100 bg-white/90 px-6 py-4 backdrop-blur">
            <div>
              <h2 class="text-base font-bold text-ink-950">Settings</h2>
              <p class="text-[12px] text-ink-500">Saved in this browser only</p>
            </div>
            <button class="btn-icon" onClick={() => props.setOpen(false)} aria-label="Close"><span class="i-ph-x-bold" /></button>
          </header>

          <div class="space-y-6 px-6 py-5">
            <section>
              <div class="eyebrow mb-2.5">Answer engine</div>
              <div class="grid grid-cols-2 gap-2.5">
                <Engine id="demo" icon="i-ph-lightning-bold" title="Demo mode" text="Offline, no key. Answers are extracted from your documents." />
                <Engine id="openai" icon="i-ph-sparkle-bold" title="AI model" text="Any OpenAI-compatible API: OpenAI, Groq, Ollama and more." />
              </div>
              <Show when={draft().engine === 'openai'}>
                <div class="rise mt-3 space-y-3.5 rounded-xl bg-ink-50 p-4 ring-1 ring-ink-100">
                  <div>
                    <label class="label" for="key">API key</label>
                    <div class="relative">
                      <input id="key" class="field pr-10 font-mono" type={show() ? 'text' : 'password'} autocomplete="off" value={draft().apiKey} onInput={e => set('apiKey', e.currentTarget.value)} placeholder="sk-…" />
                      <button class="absolute right-2 top-1/2 -translate-y-1/2 p-1 text-ink-400 hover:text-ink-900" onClick={() => setShow(!show())} aria-label="Show key"><span class={show() ? 'i-ph-eye-slash-bold' : 'i-ph-eye-bold'} /></button>
                    </div>
                    <p class="mt-1 text-[11.5px] text-ink-500">Only ever sent to the API URL below.</p>
                  </div>
                  <div><label class="label" for="url">API base URL</label><input id="url" class="field font-mono !text-[13px]" value={draft().baseUrl} onInput={e => set('baseUrl', e.currentTarget.value)} /></div>
                  <div class="grid grid-cols-2 gap-3">
                    <div><label class="label" for="model">Model</label><input id="model" class="field font-mono !text-[13px]" value={draft().model} onInput={e => set('model', e.currentTarget.value)} /></div>
                    <div><label class="label" for="temp">Creativity · {draft().temperature.toFixed(1)}</label><input id="temp" type="range" min="0" max="1" step="0.1" class="mt-2.5 w-full accent-brand-600" value={draft().temperature} onInput={e => set('temperature', Number(e.currentTarget.value))} /></div>
                  </div>
                </div>
              </Show>
            </section>

            <section class="space-y-3.5">
              <div class="eyebrow">Your business</div>
              <div><label class="label" for="biz">Business name</label><input id="biz" class="field" maxLength={80} value={draft().businessName} onInput={e => set('businessName', e.currentTarget.value)} placeholder="Defaults to the sample store" /></div>
              <div class="grid grid-cols-2 gap-3">
                <div><label class="label" for="agent">Sign emails as</label><input id="agent" class="field" maxLength={80} value={draft().agentName} onInput={e => set('agentName', e.currentTarget.value)} /></div>
                <div>
                  <label class="label" for="tone2">Default tone</label>
                  <select id="tone2" class="field" value={draft().tone} onChange={e => set('tone', e.currentTarget.value as Settings['tone'])}>
                    <option value="friendly">Friendly</option><option value="professional">Professional</option><option value="concise">Concise</option>
                  </select>
                </div>
              </div>
            </section>
            <Show when={error()}><p class="rounded-lg bg-red-50 px-3 py-2 text-[13px] text-red-700 ring-1 ring-red-200">{error()}</p></Show>
          </div>

          <footer class="sticky bottom-0 flex items-center gap-2 border-t border-ink-100 bg-white px-6 py-4">
            <Show when={props.settings().apiKey}><button class="btn-ghost" onClick={() => { setDraft({ ...draft(), apiKey: '', engine: 'demo' }) }}>Forget key</button></Show>
            <div class="flex-1" />
            <button class="btn-ghost" onClick={() => props.setOpen(false)}>Cancel</button>
            <button class="btn-primary" onClick={apply}>Save changes</button>
          </footer>
        </div>
      </div>
    </Show>
  )
}
