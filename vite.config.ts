import react from '@vitejs/plugin-react';
import { defineConfig } from 'vitest/config';

const contentSecurityPolicy = [
  "default-src 'self'",
  "script-src 'self' 'wasm-unsafe-eval'",
  "style-src 'self' 'unsafe-inline' blob:",
  "img-src 'self' blob: data:",
  "font-src 'self' blob: data:",
  "connect-src 'self' blob: https: http://localhost:* http://127.0.0.1:* http://[::1]:*",
  "frame-src 'self' blob:",
  "worker-src 'self' blob:",
  "object-src 'none'",
  "base-uri 'self'",
  "form-action 'none'",
].join('; ');

const securityHeaders = {
  'Content-Security-Policy': `${contentSecurityPolicy}; frame-ancestors 'none'`,
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Referrer-Policy': 'no-referrer',
  'Permissions-Policy': 'camera=(), microphone=(), geolocation=()',
};

export default defineConfig({
  plugins: [
    react(),
    {
      name: 'xolio-production-security',
      apply: 'build',
      transformIndexHtml() {
        return [{
          tag: 'meta',
          attrs: { 'http-equiv': 'Content-Security-Policy', content: contentSecurityPolicy },
          injectTo: 'head-prepend',
        }];
      },
      generateBundle() {
        const headers = Object.entries(securityHeaders).map(([key, value]) => `  ${key}: ${value}`).join('\n');
        this.emitFile({
          type: 'asset',
          fileName: '_headers',
          source: `/*\n${headers}\n  Cache-Control: no-cache\n`,
        });
      },
    },
  ],
  build: { sourcemap: false },
  preview: { host: '127.0.0.1', headers: securityHeaders },
  test: {
    environment: 'jsdom',
    setupFiles: ['./src/test/setup.ts'],
    include: ['src/**/*.test.{ts,tsx}'],
  },
});
