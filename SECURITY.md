# Security

Xolio reads documents in the browser and has no application backend. Optional AI
requests send the selected passage and question directly to the configured provider
or endpoint. Never publish a shared API key in this frontend or in a `VITE_*`
environment variable; bundled frontend values are public.

API credentials are held in memory by default. **Save key securely** stores only an
AES-256-GCM encrypted vault in localStorage. The encryption key is derived from a
user-supplied vault password with PBKDF2-HMAC-SHA-256, a random 16-byte salt, and
600,000 iterations. Each encryption uses a random 12-byte IV. Neither the password,
derived key, nor plaintext API key is persisted. Legacy plaintext saved keys are
removed from storage on first load and retained only in memory for that session.

The vault protects a locked key against offline inspection of browser storage. It
does not protect a key after the user unlocks it from same-origin malicious script,
an XSS vulnerability, or a privileged browser extension. Host Xolio on a dedicated
origin, keep its CSP restrictive, use restricted provider keys, and do not save keys
on shared devices. Changing the provider or endpoint removes the vault. **Clear AI
settings** removes the encrypted vault and saved preferences. A forgotten vault
password cannot be recovered; reset the vault and enter the provider key again.

The production build includes a Content Security Policy in HTML and emits an
`_headers` file. Hosts that do not support that file must configure the equivalent
HTTP headers themselves. `frame-ancestors` and anti-framing protection require
HTTP headers. Remote images in Markdown and AI answers are not loaded. EPUB scripts
are disabled; the production policy also restricts embedded resources. Do not weaken
the policy to make an untrusted document work.

Before a release, run `npm run check` and `npm audit --audit-level=high`. The secret
check detects common token formats and credential files, not every possible secret
or kind of personal data. Review the staged files as well. A failed registry request
does not constitute a clean dependency audit.

If you discover a vulnerability, report it privately to the repository maintainer
or use GitHub's **Report a vulnerability** option when enabled. Do not post active
keys, private books, or personal data in a public issue. If a key was exposed, revoke
or rotate it at the provider; deleting it from the working tree does not revoke it
or remove previous Git history.
