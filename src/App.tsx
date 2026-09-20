import { useCallback, useEffect, useState } from 'react';
import { Library } from './components/Library';
import { ReaderShell } from './components/ReaderShell';
import { useTheme } from './hooks/useTheme';
import { loadBook, type Book } from './lib/books';
import { deleteLibraryEntry, getAllLibraryEntries, putLibraryEntry } from './lib/db';
import { canPickFiles, pickBookHandle, type LibraryEntry } from './lib/library';
import { createCopyEntry, createHandleEntry, openEntry, saveNewEntry, type NewLibraryEntry } from './lib/libraryOps';

interface ActiveBook {
  readonly entryId: string;
  readonly book: Book;
}

function describeError(cause: unknown): string {
  return cause instanceof Error ? cause.message : 'Something went wrong.';
}

export function App() {
  const [entries, setEntries] = useState<readonly LibraryEntry[] | null>(null);
  const [active, setActive] = useState<ActiveBook | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const { theme, toggleTheme } = useTheme();

  const refresh = useCallback(async () => {
    try {
      setEntries(await getAllLibraryEntries());
    } catch (cause) {
      setError(describeError(cause));
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    getAllLibraryEntries()
      .then((loaded) => {
        if (!cancelled) {
          setEntries(loaded);
        }
      })
      .catch((cause: unknown) => {
        if (!cancelled) {
          setError(describeError(cause));
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const openBook = useCallback((entryId: string, book: Book) => {
    setActive({ entryId, book });
    setError(null);
  }, []);

  const addFromFile = useCallback(
    async (file: File) => {
      setBusy(true);
      setError(null);
      try {
        const book = await loadBook(file);
        const created = createCopyEntry(file, book);
        await saveNewEntry(created);
        await refresh();
        openBook(created.entry.id, book);
      } catch (cause) {
        setError(describeError(cause));
      } finally {
        setBusy(false);
      }
    },
    [openBook, refresh],
  );

  const addViaPicker = useCallback(async () => {
    setError(null);
    try {
      const handle = await pickBookHandle();
      if (handle === null) {
        return;
      }
      setBusy(true);
      const file = await handle.getFile();
      const book = await loadBook(file);
      let created: NewLibraryEntry = { entry: createHandleEntry(handle, book, file.size) };
      try {
        await saveNewEntry(created);
      } catch {
        created = createCopyEntry(file, book);
        await saveNewEntry(created);
      }
      await refresh();
      openBook(created.entry.id, book);
    } catch (cause) {
      setError(describeError(cause));
    } finally {
      setBusy(false);
    }
  }, [openBook, refresh]);

  const openFromLibrary = useCallback(
    async (entry: LibraryEntry) => {
      setBusy(true);
      setError(null);
      try {
        const book = await openEntry(entry);
        await putLibraryEntry({ ...entry, lastOpenedAt: Date.now() });
        await refresh();
        openBook(entry.id, book);
      } catch (cause) {
        setError(describeError(cause));
      } finally {
        setBusy(false);
      }
    },
    [openBook, refresh],
  );

  const removeFromLibrary = useCallback(
    (entry: LibraryEntry) => {
      if (!window.confirm(`Remove "${entry.name}" from the library?`)) {
        return;
      }
      void (async () => {
        try {
          await deleteLibraryEntry(entry.id);
          await refresh();
        } catch (cause) {
          setError(describeError(cause));
        }
      })();
    },
    [refresh],
  );

  const toggleFavorite = useCallback(
    (entry: LibraryEntry) => {
      void (async () => {
        setError(null);
        try {
          await putLibraryEntry({ ...entry, favorite: !entry.favorite });
          await refresh();
        } catch (cause) {
          setError(describeError(cause));
        }
      })();
    },
    [refresh],
  );

  if (active === null) {
    return (
      <Library
        entries={entries}
        busy={busy}
        error={error}
        canPick={canPickFiles()}
        onAddFile={(file) => {
          void addFromFile(file);
        }}
        onAddViaPicker={() => {
          void addViaPicker();
        }}
        onOpen={(entry) => {
          void openFromLibrary(entry);
        }}
        onDelete={removeFromLibrary}
        onToggleFavorite={toggleFavorite}
      />
    );
  }

  return (
    <ReaderShell
      key={active.entryId}
      entryId={active.entryId}
      book={active.book}
      theme={theme}
      error={error}
      onToggleTheme={toggleTheme}
      onClose={() => {
        setActive(null);
        setError(null);
      }}
      onOpenFile={(file) => {
        void addFromFile(file);
      }}
    />
  );
}
