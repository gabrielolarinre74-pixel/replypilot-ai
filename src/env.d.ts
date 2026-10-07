/// <reference types="astro/client" />

interface ImportMetaEnv {
  readonly PUBLIC_DEFAULT_BASE_URL?: string
  readonly PUBLIC_DEFAULT_MODEL?: string
  readonly PUBLIC_BUSINESS_NAME?: string
}

interface ImportMeta {
  readonly env: ImportMetaEnv
}
