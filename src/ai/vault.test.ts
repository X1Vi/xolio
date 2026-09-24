import { beforeEach, describe, expect, it } from 'vitest';
import { defaultConfig } from './settings';
import {
  VAULT_KDF_ITERATIONS,
  VAULT_STORAGE_KEY,
  clearStoredVault,
  decryptVault,
  encryptVault,
  readStoredVault,
  storeVault,
} from './vault';

const passphrase = 'a long local vault password';

beforeEach(() => {
  window.localStorage.clear();
});

describe('encrypted AI key vault', () => {
  it('round-trips an API key without placing it in the stored envelope', async () => {
    const config = { ...defaultConfig(), providerId: 'anthropic' as const, apiKey: 'secret-key' };
    const envelope = await encryptVault(config, passphrase);
    expect(envelope).not.toContain('secret-key');
    expect(JSON.parse(envelope)).toMatchObject({
      version: 1,
      kdf: 'PBKDF2-SHA-256',
      iterations: VAULT_KDF_ITERATIONS,
    });
    await expect(decryptVault(envelope, passphrase)).resolves.toEqual({
      apiKey: 'secret-key', providerId: 'anthropic', baseUrl: '',
    });
  });

  it('fails closed for a wrong password or modified ciphertext', async () => {
    const envelope = await encryptVault({ ...defaultConfig(), apiKey: 'secret-key' }, passphrase);
    await expect(decryptVault(envelope, 'a different vault password')).rejects.toThrow(/could not unlock/i);
    const parsed = JSON.parse(envelope) as Record<string, unknown>;
    parsed['ciphertext'] = `${String(parsed['ciphertext']).slice(0, -2)}AA`;
    await expect(decryptVault(JSON.stringify(parsed), passphrase)).rejects.toThrow(/could not unlock/i);
  });

  it('requires a meaningful password and a non-empty key', async () => {
    await expect(encryptVault({ ...defaultConfig(), apiKey: 'secret-key' }, 'short')).rejects.toThrow(/12/);
    await expect(encryptVault(defaultConfig(), passphrase)).rejects.toThrow(/API key/);
  });

  it('stores and removes only the encrypted envelope', async () => {
    const envelope = await encryptVault({ ...defaultConfig(), apiKey: 'secret-key' }, passphrase);
    storeVault(envelope);
    expect(readStoredVault()).toBe(envelope);
    expect(window.localStorage.getItem(VAULT_STORAGE_KEY)).not.toContain('secret-key');
    clearStoredVault();
    expect(readStoredVault()).toBeNull();
  });
});
