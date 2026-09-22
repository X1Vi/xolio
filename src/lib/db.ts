import type { LibraryContent, LibraryEntry } from './library';

const DB_NAME = 'reader-library';
const DB_VERSION = 2;
const STORE_NAME = 'books';
const CONTENT_STORE_NAME = 'contents';

let databasePromise: Promise<IDBDatabase> | null = null;

function migrateContents(transaction: IDBTransaction): void {
  const books = transaction.objectStore(STORE_NAME);
  const contents = transaction.objectStore(CONTENT_STORE_NAME);
  const cursorRequest = books.openCursor();
  cursorRequest.onsuccess = () => {
    const cursor = cursorRequest.result;
    if (cursor === null) {
      return;
    }
    const record = cursor.value as Record<string, unknown>;
    if ('data' in record) {
      const id = record['id'];
      const data = record['data'];
      const metadata = { ...record };
      delete metadata['data'];
      if (typeof id === 'string') {
        contents.put({ id, data });
      }
      cursor.update(metadata);
    }
    cursor.continue();
  };
}

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise !== null) {
    return databasePromise;
  }
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = (event) => {
      const database = request.result;
      const transaction = request.transaction;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
      if (!database.objectStoreNames.contains(CONTENT_STORE_NAME)) {
        database.createObjectStore(CONTENT_STORE_NAME, { keyPath: 'id' });
      }
      if (event.oldVersion > 0 && event.oldVersion < 2 && transaction !== null) {
        migrateContents(transaction);
      }
    };
    request.onblocked = () => {
      reject(
        new Error(
          'Another tab is using an older version of the library. Close the other tab and reload.',
        ),
      );
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Could not open the library database.'));
    };
  }).catch((cause: unknown) => {
    // Allow a later call to retry instead of caching the failure for the whole session.
    databasePromise = null;
    throw cause;
  });
  return databasePromise;
}

function requestResult<T>(request: IDBRequest<T>): Promise<T> {
  return new Promise<T>((resolve, reject) => {
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Library database request failed.'));
    };
  });
}

function transactionDone(transaction: IDBTransaction): Promise<void> {
  return new Promise<void>((resolve, reject) => {
    transaction.oncomplete = () => {
      resolve();
    };
    transaction.onerror = () => {
      reject(transaction.error ?? new Error('Library database transaction failed.'));
    };
    transaction.onabort = () => {
      reject(transaction.error ?? new Error('Library database transaction was aborted.'));
    };
  });
}

export async function getAllLibraryEntries(): Promise<LibraryEntry[]> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const request = transaction.objectStore(STORE_NAME).getAll() as IDBRequest<LibraryEntry[]>;
  const entries = await requestResult(request);
  return [...entries].sort((a, b) => b.lastOpenedAt - a.lastOpenedAt);
}

export async function getLibraryEntry(id: string): Promise<LibraryEntry | undefined> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readonly');
  const request = transaction.objectStore(STORE_NAME).get(id) as IDBRequest<
    LibraryEntry | undefined
  >;
  return await requestResult(request);
}

export async function getLibraryContent(id: string): Promise<LibraryContent | undefined> {
  const database = await openDatabase();
  const transaction = database.transaction(CONTENT_STORE_NAME, 'readonly');
  const request = transaction.objectStore(CONTENT_STORE_NAME).get(id) as IDBRequest<
    LibraryContent | undefined
  >;
  return await requestResult(request);
}

export async function putLibraryEntry(
  entry: LibraryEntry,
  content?: LibraryContent,
): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([STORE_NAME, CONTENT_STORE_NAME], 'readwrite');
  transaction.objectStore(STORE_NAME).put(entry);
  if (content !== undefined) {
    transaction.objectStore(CONTENT_STORE_NAME).put(content);
  }
  await transactionDone(transaction);
}

export async function deleteLibraryEntry(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction([STORE_NAME, CONTENT_STORE_NAME], 'readwrite');
  transaction.objectStore(STORE_NAME).delete(id);
  transaction.objectStore(CONTENT_STORE_NAME).delete(id);
  await transactionDone(transaction);
}
