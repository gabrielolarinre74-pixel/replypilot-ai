import {
  defineConfig,
  presetAttributify,
  presetIcons,
  presetTypography,
  presetWind3,
  transformerDirectives,
  transformerVariantGroup,
} from 'unocss'

export default defineConfig({
  presets: [
    presetWind3(),
    presetAttributify(),
    presetIcons({ scale: 1.1 }),
    presetTypography(),
  ],
  transformers: [transformerVariantGroup(), transformerDirectives()],
  theme: {
    colors: {
      brand: { 50: '#eef4ff', 100: '#dbe6ff', 400: '#6b8cff', 500: '#4f6bff', 600: '#3a50e8', 700: '#2f3fc0' },
      ink: { 900: '#0b1020', 800: '#121831', 700: '#1b2342', 600: '#2a3358' },
    },
  },
  shortcuts: [{
    'card': 'rounded-2xl border border-slate-200 dark:border-ink-600 bg-white/80 dark:bg-ink-800/80 backdrop-blur shadow-sm',
    'btn': 'inline-flex items-center justify-center gap-2 rounded-xl px-4 h-10 text-sm font-semibold transition-all disabled:(op-50 cursor-not-allowed) active:scale-97',
    'btn-primary': 'btn bg-brand-500 text-white hover:bg-brand-600 shadow-[0_6px_20px_-6px_rgba(79,107,255,.7)]',
    'btn-ghost': 'btn bg-slate-100 hover:bg-slate-200 text-slate-700 dark:(bg-ink-700 text-slate-200 hover:bg-ink-600)',
    'field': 'w-full rounded-xl border border-slate-200 dark:border-ink-600 bg-white dark:bg-ink-900 px-3 py-2.5 text-sm outline-none focus:(border-brand-400 ring-3 ring-brand-500/20) transition placeholder:text-slate-400',
    'label': 'block text-xs font-semibold uppercase tracking-wide text-slate-500 dark:text-slate-400 mb-1.5',
    'chip': 'inline-flex items-center gap-1 rounded-full px-2.5 py-0.5 text-xs font-medium',
    'tab': 'flex items-center gap-2 px-4 h-10 rounded-xl text-sm font-semibold transition cursor-pointer text-slate-500 hover:text-slate-900 dark:hover:text-white',
    'tab-active': '!bg-white !text-slate-900 shadow dark:(!bg-ink-600 !text-white)',
    'gpt-copy-btn': 'absolute top-12px right-12px z-3 flex items-center justify-center border border-transparent w-8 h-8 p-2 bg-slate-200 dark:bg-ink-600 op-90 cursor-pointer rounded-md',
    'gpt-copy-tips': 'op-0 h-7 bg-black px-2.5 py-1 box-border text-xs c-white flex items-center justify-center rounded absolute z-1 transition duration-600 whitespace-nowrap -top-8',
  }],
})
