import { readdir, readFile } from 'node:fs/promises';
import path from 'node:path';

// A lightweight release guard. It prints filenames and rule names, never credentials.
const excluded = new Set(['node_modules', '.git', '.agents', '.codex', 'coverage']);
const rules = [
  ['private key', /-----BEGIN (?:RSA |EC |OPENSSH |DSA )?PRIVATE KEY-----/],
  ['provider token', /\b(?:sk-(?:proj-|ant-|or-)?[A-Za-z0-9_-]{20,}|AIza[\w-]{30,}|gsk_[\w]{20,})\b/],
  ['GitHub token', /\b(?:gh[pousr]_[\w]{20,}|github_pat_[\w]{20,})\b/],
  ['AWS access key', /\b(?:AKIA|ASIA)[0-9A-Z]{16}\b/],
  ['Slack token', /\bxox[baprs]-[0-9A-Za-z-]{20,}\b/],
  ['credential in URL', /https?:\/\/[^\s/:]+:[^\s/@]+@/],
];
let scanned = 0;
const findings = [];

async function scan(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    if (excluded.has(entry.name) || entry.isSymbolicLink()) continue;
    const file = path.join(directory, entry.name);
    if (entry.isDirectory()) {
      await scan(file);
      continue;
    }
    if (!entry.isFile()) continue;
    if ((/^\.env(?:\.|$)/.test(entry.name) && entry.name !== '.env.example') ||
        /\.(?:pem|key|p12|pfx)$/.test(entry.name) || entry.name === '.npmrc') {
      findings.push(`${file}: credential/config file must stay outside the release`);
      continue;
    }
    const content = (await readFile(file)).toString('utf8');
    scanned += 1;
    for (const [name, pattern] of rules) {
      if (pattern.test(content)) findings.push(`${file}: ${name}`);
    }
  }
}

await scan('.');
if (findings.length > 0) {
  console.error(findings.join('\n'));
  process.exitCode = 1;
} else {
  console.log(`No credential patterns found in ${scanned} files.`);
}
