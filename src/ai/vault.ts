import type { AiConfig, ProviderId } from './types';

export const VAULT_STORAGE_KEY = 'reader-ai-vault';
export const MIN_VAULT_PASSPHRASE_LENGTH = 12;
export const VAULT_KDF_ITERATIONS = 600_000;

const VAULT_VERSION = 1;
const VAULT_AAD = new TextEncoder().encode('xolio-ai-vault:v1');

interface VaultEnvelope {
  readonly version: typeof VAULT_VERSION;
  readonly kdf: 'PBKDF2-SHA-256';
  readonly iterations: number;
  readonly salt: string;
  readonly iv: string;
  readonly ciphertext: string;
}

export interface VaultPayload {
  readonly apiKey: string;
  readonly providerId: ProviderId;
  readonly baseUrl: string;
}

function toBase64(value: Uint8Array<ArrayBuffer>): string {
  let binary = '';
  for (const byte of value) binary += String.fromCharCode(byte);
  return window.btoa(binary);
}

function fromBase64(value: string): Uint8Array<ArrayBuffer> {
  const binary = window.atob(value);
  const bytes = new Uint8Array(binary.length);
  for (let index = 0; index < binary.length; index += 1) {
    bytes[index] = binary.charCodeAt(index);
  }
  return bytes;
}

function isEnvelope(value: unknown): value is VaultEnvelope {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return record['version'] === VAULT_VERSION
    && record['kdf'] === 'PBKDF2-SHA-256'
    && record['iterations'] === VAULT_KDF_ITERATIONS
    && typeof record['salt'] === 'string'
    && typeof record['iv'] === 'string'
    && typeof record['ciphertext'] === 'string';
}

function isPayload(value: unknown): value is VaultPayload {
  if (typeof value !== 'object' || value === null) return false;
  const record = value as Record<string, unknown>;
  return typeof record['apiKey'] === 'string'
    && typeof record['providerId'] === 'string'
    && typeof record['baseUrl'] === 'string';
}

async function deriveVaultKey(passphrase: string, salt: Uint8Array<ArrayBuffer>): Promise<CryptoKey> {
  const material = await window.crypto.subtle.importKey(
    'raw',
    new TextEncoder().encode(passphrase),
    'PBKDF2',
    false,
    ['deriveKey'],
  );
  return window.crypto.subtle.deriveKey(
    {
      name: 'PBKDF2',
      hash: 'SHA-256',
      salt,
      iterations: VAULT_KDF_ITERATIONS,
    },
    material,
    { name: 'AES-GCM', length: 256 },
    false,
    ['encrypt', 'decrypt'],
  );
}

export async function encryptVault(config: AiConfig, passphrase: string): Promise<string> {
  if (passphrase.length < MIN_VAULT_PASSPHRASE_LENGTH) {
    throw new Error(`Use at least ${String(MIN_VAULT_PASSPHRASE_LENGTH)} characters for the vault password.`);
  }
  if (config.apiKey.trim() === '') {
    throw new Error('Enter an API key before saving it securely.');
  }

  const salt = window.crypto.getRandomValues(new Uint8Array(16));
  const iv = window.crypto.getRandomValues(new Uint8Array(12));
  const key = await deriveVaultKey(passphrase, salt);
  const plaintext = new TextEncoder().encode(JSON.stringify({
    apiKey: config.apiKey,
    providerId: config.providerId,
    baseUrl: config.baseUrl,
  } satisfies VaultPayload));
  const ciphertext = await window.crypto.subtle.encrypt(
    { name: 'AES-GCM', iv, additionalData: VAULT_AAD },
    key,
    plaintext,
  );
  return JSON.stringify({
    version: VAULT_VERSION,
    kdf: 'PBKDF2-SHA-256',
    iterations: VAULT_KDF_ITERATIONS,
    salt: toBase64(salt),
    iv: toBase64(iv),
    ciphertext: toBase64(new Uint8Array(ciphertext)),
  } satisfies VaultEnvelope);
}

export async function decryptVault(envelopeJson: string, passphrase: string): Promise<VaultPayload> {
  try {
    const envelope = JSON.parse(envelopeJson) as unknown;
    if (!isEnvelope(envelope)) throw new Error('Invalid vault');
    const salt = fromBase64(envelope.salt);
    const iv = fromBase64(envelope.iv);
    if (salt.byteLength !== 16 || iv.byteLength !== 12) throw new Error('Invalid vault');
    const key = await deriveVaultKey(passphrase, salt);
    const plaintext = await window.crypto.subtle.decrypt(
      { name: 'AES-GCM', iv, additionalData: VAULT_AAD },
      key,
      fromBase64(envelope.ciphertext),
    );
    const payload = JSON.parse(new TextDecoder().decode(plaintext)) as unknown;
    if (!isPayload(payload) || payload.apiKey.trim() === '') throw new Error('Invalid vault');
    return payload;
  } catch {
    throw new Error('Could not unlock the vault. Check the password and try again.');
  }
}

export function readStoredVault(): string | null {
  try {
    return window.localStorage.getItem(VAULT_STORAGE_KEY);
  } catch {
    return null;
  }
}

export function storeVault(envelope: string): void {
  try {
    window.localStorage.setItem(VAULT_STORAGE_KEY, envelope);
  } catch {
    throw new Error('The browser could not save the encrypted vault.');
  }
}

export function clearStoredVault(): void {
  try {
    window.localStorage.removeItem(VAULT_STORAGE_KEY);
  } catch {
    // The in-memory key can still be cleared even if browser storage is unavailable.
  }
}
