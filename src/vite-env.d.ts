/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_STORE_ORIGIN?: string;
  readonly VITE_SKYFORGE_URL?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
