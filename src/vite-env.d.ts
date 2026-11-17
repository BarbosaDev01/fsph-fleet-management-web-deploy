/// <reference types="vite/client" />

interface ImportMetaEnv {
  readonly VITE_API_URL?: string;
  readonly VITE_API_BASE_URL?: string;
  readonly VITE_APP_ENV?: 'production' | 'staging' | 'development';
  readonly VITE_FUEL_CARDS_DEMO?: string;
}

interface ImportMeta {
  readonly env: ImportMetaEnv;
}
