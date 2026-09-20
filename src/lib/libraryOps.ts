import { loadBook, type Book } from './books';
import { getLibraryContent, putLibraryEntry } from './db';
import {
  createId,
  readHandle,
  type LibraryContent,
  type LibraryEntry,
  type MinimalFileHandle,
} from './library';

export interface NewLibraryEntry {
  readonly entry: LibraryEntry;
  readonly content?: LibraryContent;
}

export function createCopyEntry(file: File, book: Book): NewLibraryEntry {
  const id = createId();
  return {
    entry: {
      id,
      kind: 'copy',
      name: file.name,
      format: book.format,
      size: file.size,
      addedAt: Date.now(),
      lastOpenedAt: Date.now(),
    },
    content: {
      id,
      data: book.format === 'markdown' ? book.text : book.data,
    },
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
  const content = await getLibraryContent(entry.id);
  if (content === undefined) {
    throw new Error('This library entry is missing its contents. Remove it and add the book again.');
  }
  const { data } = content;
  if (entry.format === 'markdown') {
    return {
      format: 'markdown',
      name: entry.name,
      text: typeof data === 'string' ? data : new TextDecoder().decode(data),
    };
  }
  if (!(data instanceof ArrayBuffer)) {
    throw new Error('This library entry is missing its contents. Remove it and add the book again.');
  }
  if (entry.format === 'pdf') {
    return { format: 'pdf', name: entry.name, data };
  }
  return { format: 'epub', name: entry.name, data };
}

export async function saveNewEntry(created: NewLibraryEntry): Promise<void> {
  await putLibraryEntry(created.entry, created.content);
}
