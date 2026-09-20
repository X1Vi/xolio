import type { LibraryEntry } from './library';

const DB_NAME = 'reader-library';
const DB_VERSION = 1;
const STORE_NAME = 'books';

let databasePromise: Promise<IDBDatabase> | null = null;

function openDatabase(): Promise<IDBDatabase> {
  if (databasePromise !== null) {
    return databasePromise;
  }
  databasePromise = new Promise<IDBDatabase>((resolve, reject) => {
    const request = window.indexedDB.open(DB_NAME, DB_VERSION);
    request.onupgradeneeded = () => {
      const database = request.result;
      if (!database.objectStoreNames.contains(STORE_NAME)) {
        database.createObjectStore(STORE_NAME, { keyPath: 'id' });
      }
    };
    request.onsuccess = () => {
      resolve(request.result);
    };
    request.onerror = () => {
      reject(request.error ?? new Error('Could not open the library database.'));
    };
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

export async function putLibraryEntry(entry: LibraryEntry): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const request = transaction.objectStore(STORE_NAME).put(entry);
  await requestResult(request);
}

export async function deleteLibraryEntry(id: string): Promise<void> {
  const database = await openDatabase();
  const transaction = database.transaction(STORE_NAME, 'readwrite');
  const request = transaction.objectStore(STORE_NAME).delete(id);
  await requestResult(request);
}
