import type { BookFormat } from './books';

export interface MinimalFileHandle {
  readonly kind: 'file';
  readonly name: string;
  getFile(): Promise<File>;
  queryPermission?(descriptor: { mode: 'read' }): Promise<PermissionState>;
  requestPermission?(descriptor: { mode: 'read' }): Promise<PermissionState>;
}

interface LibraryEntryBase {
  readonly id: string;
  readonly name: string;
  readonly format: BookFormat;
  readonly size: number;
  readonly addedAt: number;
  readonly lastOpenedAt: number;
  readonly favorite?: boolean;
}

export interface LibraryCopyEntry extends LibraryEntryBase {
  readonly kind: 'copy';
}

export interface LibraryHandleEntry extends LibraryEntryBase {
  readonly kind: 'handle';
  readonly handle: MinimalFileHandle;
}

export type LibraryEntry = LibraryCopyEntry | LibraryHandleEntry;

export interface LibraryContent {
  readonly id: string;
  readonly data: ArrayBuffer | string;
}

export interface PickerFileType {
  readonly description: string;
  readonly accept: Record<string, string[]>;
}

interface PickerWindow extends Window {
  showOpenFilePicker?: (
    options?: { multiple?: boolean; types?: readonly PickerFileType[] },
  ) => Promise<MinimalFileHandle[]>;
}

export const PICKER_TYPES: readonly PickerFileType[] = [
  {
    description: 'Books',
    accept: {
      'application/pdf': ['.pdf'],
      'application/epub+zip': ['.epub'],
      'text/markdown': ['.md', '.markdown', '.mdown'],
    },
  },
];

export function createId(): string {
  if (typeof crypto.randomUUID === 'function') {
    return crypto.randomUUID();
  }
  return `${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 10)}`;
}

export function canPickFiles(): boolean {
  const picker = (window as PickerWindow).showOpenFilePicker;
  return typeof picker === 'function';
}

export async function pickBookHandle(): Promise<MinimalFileHandle | null> {
  const picker = (window as PickerWindow).showOpenFilePicker;
  if (typeof picker !== 'function') {
    return null;
  }
  try {
    const handles = await picker({ multiple: false, types: PICKER_TYPES });
    return handles[0] ?? null;
  } catch (cause) {
    if (cause instanceof DOMException && cause.name === 'AbortError') {
      return null;
    }
    throw cause;
  }
}

async function ensureReadPermission(handle: MinimalFileHandle): Promise<boolean> {
  if (handle.queryPermission === undefined || handle.requestPermission === undefined) {
    return true;
  }
  const descriptor = { mode: 'read' } as const;
  if ((await handle.queryPermission(descriptor)) === 'granted') {
    return true;
  }
  return (await handle.requestPermission(descriptor)) === 'granted';
}

export async function readHandle(handle: MinimalFileHandle): Promise<File> {
  const permitted = await ensureReadPermission(handle);
  if (!permitted) {
    throw new Error('Permission to read this file was denied. Use Open to grant access again.');
  }
  return handle.getFile();
}
