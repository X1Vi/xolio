import { loadBook, type Book } from './books';
import { putLibraryEntry } from './db';
import {
  createId,
  readHandle,
  type LibraryEntry,
  type MinimalFileHandle,
} from './library';

export function createCopyEntry(file: File, book: Book): LibraryEntry {
  const data = book.format === 'markdown' ? book.text : book.data;
  return {
    id: createId(),
    kind: 'copy',
    name: file.name,
    format: book.format,
    size: file.size,
    addedAt: Date.now(),
    lastOpenedAt: Date.now(),
    data,
  };
}

export function createHandleEntry(handle: MinimalFileHandle, book: Book, size: number): LibraryEntry {
  return {
    id: createId(),
    kind: 'handle',
    name: book.name,
    format: book.format,
    size,
    addedAt: Date.now(),
    lastOpenedAt: Date.now(),
    handle,
  };
}

export async function openEntry(entry: LibraryEntry): Promise<Book> {
  if (entry.kind === 'handle') {
    const file = await readHandle(entry.handle);
    return await loadBook(file);
  }
  if (entry.format === 'markdown') {
    return {
      format: 'markdown',
      name: entry.name,
      text: typeof entry.data === 'string' ? entry.data : '',
    };
  }
  if (!(entry.data instanceof ArrayBuffer)) {
    throw new Error('This library entry is missing its contents. Remove it and add the book again.');
  }
  if (entry.format === 'pdf') {
    return { format: 'pdf', name: entry.name, data: entry.data.slice(0) };
  }
  return { format: 'epub', name: entry.name, data: entry.data.slice(0) };
}

export async function saveEntry(entry: LibraryEntry): Promise<void> {
  await putLibraryEntry(entry);
}
