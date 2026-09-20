# Security

Xolio reads documents in the browser and has no application backend. Optional AI
requests send the selected passage and question directly to the configured provider
or endpoint. Never publish a shared API key in this frontend or in a `VITE_*`
environment variable; bundled frontend values are public.

API credentials are held in memory by default. Enabling **Remember on this device**
stores the configuration, including the key, unencrypted in localStorage. Other code
on the same origin and browser extensions may access it. Host Xolio on a dedicated
origin, use restricted keys, and avoid remembering keys on shared devices. Changing
the provider or endpoint clears the key. **Clear AI settings** removes the saved
configuration. Clearing site data removes the local library and annotations too.

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
