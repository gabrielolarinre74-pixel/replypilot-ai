import { defineConfig } from 'astro/config'
import unocss from 'unocss/astro'
import solidJs from '@astrojs/solid-js'

// Static build: the whole agent (retrieval, triage, demo engine) runs in the browser,
// so it can be hosted on GitHub Pages or any static host.
// BASE_PATH is set by the GitHub Pages workflow (e.g. "/replypilot-ai").
export default defineConfig({
  site: process.env.SITE_URL || 'https://gabrielolarinre74-pixel.github.io',
  base: process.env.BASE_PATH || '/',
  output: 'static',
  integrations: [unocss({ injectReset: true }), solidJs()],
})
