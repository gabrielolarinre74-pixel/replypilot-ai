import { defineConfig } from 'astro/config'
import unocss from 'unocss/astro'
import solidJs from '@astrojs/solid-js'

// Static build: the whole agent (retrieval, triage, demo engine) runs in the browser,
// so the dist/ folder can be served by any static host.
// Set BASE_PATH only when serving from a sub-path (e.g. "/replypilot").
export default defineConfig({
  site: process.env.SITE_URL || undefined,
  base: process.env.BASE_PATH || '/',
  output: 'static',
  integrations: [unocss({ injectReset: true }), solidJs()],
})
