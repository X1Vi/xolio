# Xolio

An open-source ebook reader for PDF, EPUB, and Markdown. Read in your browser, keep a local library, save highlights and bookmarks, and ask optional AI questions about a selected passage.

Xolio has no application server or account system. Books are opened locally. **When you use AI, the selected passage and your question are sent to the provider or endpoint you choose.** You supply your own API key or local model.

## Features

- PDF, EPUB, and Markdown (`.md`, `.markdown`, `.mdown`) support.
- Local library with grid and list views, file import, and drag and drop.
- Linked files where the browser supports file handles; stored copies otherwise.
- In-book search with `Ctrl+F` / `Cmd+F` and next/previous matches.
- Highlights and bookmarks stored separately for each library entry.
- Page navigation, PDF zoom, EPUB contents, and virtualized Markdown that renders large files as you scroll.
- Light and dark reader themes.
- Optional AI actions: Simplify, Explain, Summarize, Key points, Stress test, and custom questions.
- Streaming AI responses with Markdown, mathematical notation, and chemical equations.

## Run locally

Use Node.js 22.12 or later in the 22.x release line, or another version allowed by `package.json`. An `.nvmrc` is included for Node 22. npm is required.

```bash
npm ci
npm run dev
```

Open the local URL printed by Vite. No `.env` file, account, database server, or API key is needed to read books. With nvm, run `nvm install` and `nvm use` first.

## Reading

1. Select **Add book** or drop a supported file into the library.
2. Use the reader toolbar or arrow keys to turn pages. PDFs also offer zoom and fit-to-width controls. Large Markdown files scroll continuously, loading pages as you reach them.
3. Use **Search** or `Ctrl+F` / `Cmd+F`. `Enter` and `Shift+Enter` move through results; `Escape` closes search.
4. Select text and choose **Highlight** to save a passage or **Ask AI** to open the assistant.
5. Use **Bookmark** to save the current location and **Marks** to revisit or manage saved marks.
6. In **Marks**, use **Pin** on a bookmark to make it the place the book opens to. Without a pinned bookmark, a book reopens at your last reading position.
7. Xolio reopens your most recent book automatically on launch. Use **Library** in the reader header to go back to the library.
8. Return to the library to reopen or remove a book. Removing a library entry does not delete the original file on disk.

Chromium browsers with the File System Access API can remember a link to a file. Other browsers store a copy in IndexedDB. Reopening a linked file may require permission again. Keep your original books backed up: browser storage can be cleared or evicted.

## Optional AI

Open **Ask AI → Settings**, then:

1. Select a provider.
2. Choose a suggested model, or enter a custom model name.
3. For a custom endpoint, enter its base URL first, then its API key if needed.
4. Optionally select **Save key securely**, create a local vault password, and unlock it once after reopening Xolio.
5. Use **Test connection**, then select a passage and ask a question.

The application includes presets for OpenAI, Anthropic, Google Gemini, DeepSeek, OpenRouter, Groq, Ollama, and custom OpenAI-compatible endpoints. Suggested model names are conveniences; availability depends on your provider account. Use a custom model name when a preset is unavailable. Provider adapter tests cover every preset, and **Test connection** makes a small real request with the selected credentials before reporting success.

Remote endpoints must use HTTPS. HTTP is accepted only for `localhost`, `127.0.0.1`, and `::1`. URLs containing credentials, query parameters, or fragments are rejected. Enter authentication in the API key field. Changing a provider or endpoint clears its key to prevent forwarding credentials to a different service.

**AI requests can incur provider charges**, including Test connection. There is no shared or bundled API key. Responses are limited to 2,048 output tokens (32,768 for DeepSeek, whose V4 models enable reasoning by default and count reasoning tokens against the output budget) with a two-minute request timeout; connection tests have a 30-second timeout. The Stop button and closing the AI panel cancel the browser request. Provider-side processing or billing may still continue after cancellation.

### Local models and browser access

The Ollama preset uses `http://localhost:11434/v1`. Run your model server locally and make the selected model available before connecting. A custom endpoint can also connect to an OpenAI-compatible local server.

The endpoint must permit the app's origin through CORS. Browser private-network or mixed-content policies may also restrict a hosted HTTPS app from calling a local HTTP service; running Xolio locally can help. Do not broadly disable browser security.

Some remote providers or gateways block direct browser calls. The DeepSeek preset accepts a custom gateway URL for this reason. Use a trusted gateway that explicitly permits your origin, or a provider that supports direct browser requests. The Anthropic adapter enables its browser-access header. A gateway receives your credentials and selected text, so choose it carefully.

## Privacy and storage

- Books, library metadata, bookmarks, and highlights are stored in the browser or accessed through user-approved file handles. Xolio has no sync or upload backend and includes no analytics integration.
- AI sends the selection, instructions, and question directly to your configured provider. Responses remain in memory and are not saved as conversation history.
- Keys stay in memory by default. Closing or reloading the app discards keys that were not saved securely.
- **Save key securely** encrypts the key locally with AES-256-GCM. Its encryption key is derived from the vault password with PBKDF2-HMAC-SHA-256, a unique random salt, and 600,000 iterations. The password and derived key are never stored. The vault must be unlocked once after reopening Xolio.
- Local encryption protects a locked key copied from browser storage, but it cannot protect an unlocked key from malicious browser extensions or JavaScript running on the same origin. Use a dedicated origin and do not save keys on shared devices.
- **Clear AI settings** removes the encrypted vault and saved AI preferences. Forgetting the vault password requires resetting the vault and entering the provider key again. To erase all local data, clear the site's storage in your browser; this also removes your library and annotations.
- Markdown images, including those in AI responses, are replaced with their alternative text to prevent automatic image requests. Raw HTML is skipped. EPUB scripts are disabled, and production CSP restricts external embedded resources.
- Opening a normal link can leave the app and contact that destination. Your hosting provider also receives ordinary requests for the app's static assets.

Internal storage names retain the `reader-*` prefix, so the rename does not reset an existing library on the same origin. Moving to a different domain or port creates a separate storage origin; there is currently no migration or export UI.

See [SECURITY.md](SECURITY.md) for credential handling and vulnerability reporting.

## Production build and Cloudflare deployment

```bash
npm ci
npm run check
npm audit --audit-level=high
npm run preview
```

`npm run check` runs lint, tests, TypeScript checks, the production build, and a credential-pattern scan. Preview serves the built app locally for inspection. The production files are in **`dist/`**. Xolio is a browser-only static application: no Node.js process, desktop runtime, application server, or server-side secret is required in production.

For Cloudflare Pages, import the repository and use:

- Build command: `npm run build`
- Build output directory: `dist`
- Production branch: `main`

For Cloudflare Workers Static Assets, build and deploy from the repository root:

```bash
npm run build:cloudflare
npx wrangler deploy
```

`npm run build:cloudflare` runs the complete release check and creates a clean **`cloudflare-upload/`** directory. That directory can be selected for a manual Cloudflare upload. Pass a project-local directory name to choose another destination, for example `bash scripts/build-cloudflare.sh release-upload`.

`wrangler.jsonc` points Cloudflare at `dist/` for CLI deployments and enables SPA fallback. The generated `_headers` file supplies the production security and cache headers used by Cloudflare. No API keys belong in Cloudflare build variables because AI credentials are entered by each user in the browser.

For hosting at a subpath, build with the matching base URL:

```bash
npm run build -- --base=/xolio/
```

The build embeds a Content Security Policy in HTML and generates `dist/_headers`. Hosts that support `_headers` can apply it directly. On other hosts, configure the headers from that file in your web server or CDN. In particular, `frame-ancestors` and `X-Frame-Options` require HTTP headers; the HTML policy alone cannot prevent framing.

The policy allows HTTPS AI connections and HTTP loopback model servers, while limiting scripts, frames, images, and fonts to the sources needed by the reader. Inline styles are permitted for the document renderers. It does not permit arbitrary inline scripts or JavaScript eval. If you only support selected providers, restrict `connect-src` in `vite.config.ts` to those endpoints.

Use a dedicated origin, preserve JavaScript and WebAssembly MIME types, and serve HTML with revalidation so clients receive new asset references. The generated headers use `Cache-Control: no-cache`. Enable HTTPS redirection and an appropriate HSTS policy at your host. Do not publish `src/`, local settings, or `node_modules/` as the website root.

Never put a secret in `VITE_*` environment variables or hardcode one into a frontend build: users can inspect bundled values. Source maps are disabled for production, but minification is not secret protection.

Before publishing, verify the deployed headers and open representative PDF, EPUB, and Markdown files. Test AI with a restricted key you control if enabling that feature. A release check that cannot reach the security registry has **not** verified dependency advisories.

## Development

```bash
npm run dev          # Development server
npm run typecheck    # TypeScript checks
npm run lint         # ESLint
npm test             # Unit and component tests
npm run test:watch   # Watch tests
npm run build        # Typecheck and build dist/
npm run preview      # Inspect the production build locally
npm run secrets:check # Scan source/build for common credential patterns
npm run check        # All local release checks
```

The GitHub Actions workflow runs installation, local checks, and a production dependency audit on pushes and pull requests. Dependency audit failures must be reviewed before release. The secret scanner reports filenames and rule names without printing matched values; it cannot detect every possible secret or personal document.

Built with React, TypeScript, and Vite. PDF.js renders PDFs, epub.js renders EPUBs, react-markdown renders Markdown, KaTeX handles math and chemistry, and the AI SDK provides streaming model adapters.

```text
src/
  App.tsx             Library and reader state
  components/         Library, format readers, search, marks, and AI panel
  ai/                 Providers, settings, prompts, streaming, and safe errors
  lib/                File loading, IndexedDB, marks, search, and anchors
  hooks/              Theme and keyboard controls
  version.ts          App name and version
scripts/
  check-secrets.mjs    Credential-pattern release guard
vite.config.ts        Build, tests, and production security headers
```

Keep changes focused and add regression tests for behavior changes. Do not include API keys, `.env` files, private books, or real user data in commits or test fixtures. Use synthetic or public-domain documents for demos. Keep the package version, lockfile metadata, and `src/version.ts` synchronized when releasing.

## Known limitations

- There is no cloud sync, account system, annotation export, or persisted AI conversation history.
- Browser storage is not a backup. Private browsing and storage restrictions can prevent persistence.
- There is no service worker or guaranteed offline startup; reading uses local file contents once the app and required assets are loaded.
- Large EPUB searches can take time, and very large documents can exhaust browser memory.
- Scanned/image-only PDFs need a text layer for search, text selection, and anchored highlights. OCR is not included.
- Browser capabilities affect file linking and highlight rendering. Test target browsers with representative books.
- This release does not include automated end-to-end coverage of every document format or live AI provider. Provider compatibility and deployment headers need verification in the target environment.

## License

Xolio's application code is licensed under the [MIT License](LICENSE). Third-party packages retain their own licenses; see their installed package metadata and notices when redistributing bundled dependencies. The license does not grant rights to books opened in the reader.
