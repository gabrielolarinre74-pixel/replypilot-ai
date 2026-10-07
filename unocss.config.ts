import {
  defineConfig,
  presetIcons,
  presetTypography,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

// ReplyPilot design tokens: blue on white, with near-black ink for text and primary actions.
export default defineConfig({
  presets: [
    presetWind3(),
    presetIcons({ scale: 1.1 }),
    presetTypography(),
  ],
  transformers: [transformerVariantGroup(), transformerDirectives()],
  theme: {
    fontFamily: {
      sans: '"Plus Jakarta Sans Variable", "Plus Jakarta Sans", ui-sans-serif, sans-serif',
      mono: '"JetBrains Mono Variable", "JetBrains Mono", ui-monospace, monospace',
    },
    colors: {
      brand: { 50: '#eff6ff', 100: '#dbeafe', 200: '#bfdbfe', 300: '#93c5fd', 400: '#60a5fa', 500: '#3b82f6', 600: '#2563eb', 700: '#1d4ed8', 800: '#1e40af', 900: '#1e3a8a' },
      ink: { 950: '#09090b', 900: '#111113', 800: '#1c1c1f', 700: '#2e2e33', 500: '#71717a', 400: '#a1a1aa', 300: '#d4d4d8', 200: '#e4e4e7', 100: '#f4f4f5', 50: '#fafafa' },
    },
  },
  shortcuts: [{
    'surface': 'bg-white border border-ink-200 rounded-2xl shadow-[0_1px_2px_rgba(9,9,11,.04),0_1px_12px_-4px_rgba(9,9,11,.06)]',
    'btn': 'inline-flex items-center justify-center gap-2 rounded-lg px-3.5 h-9 text-[13px] font-semibold transition-all duration-150 select-none disabled:(op-40 cursor-not-allowed) active:scale-[.98]',
    'btn-primary': 'btn bg-ink-950 text-white hover:bg-ink-800 shadow-[0_1px_0_rgba(255,255,255,.15)_inset,0_2px_6px_-2px_rgba(9,9,11,.5)]',
    'btn-blue': 'btn bg-brand-600 text-white hover:bg-brand-700 shadow-[0_1px_0_rgba(255,255,255,.2)_inset,0_4px_14px_-4px_rgba(37,99,235,.6)]',
    'btn-ghost': 'btn bg-white text-ink-900 border border-ink-200 hover:(bg-ink-50 border-ink-300)',
    'btn-icon': 'inline-grid place-items-center w-8 h-8 rounded-lg text-ink-500 hover:(bg-ink-100 text-ink-950) transition',
    'field': 'w-full rounded-lg border border-ink-200 bg-white px-3 py-2 text-sm text-ink-950 outline-none transition placeholder:text-ink-400 focus:(border-brand-500 ring-4 ring-brand-500/12)',
    'label': 'block text-[12px] font-semibold text-ink-700 mb-1.5',
    'eyebrow': 'text-[11px] font-semibold uppercase tracking-[.08em] text-ink-500',
    'chip': 'inline-flex items-center gap-1 rounded-md px-2 py-0.5 text-[11.5px] font-semibold leading-5',
    'kbd': 'inline-grid place-items-center min-w-5 h-5 px-1 rounded border border-ink-200 bg-ink-50 font-mono text-[10px] text-ink-500',
  }],
})
