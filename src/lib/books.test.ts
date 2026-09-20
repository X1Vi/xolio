import { describe, expect, it } from 'vitest';
import { detectFormat, loadBook, UnsupportedFormatError } from './books';

describe('detectFormat', () => {
  it('detects supported formats case-insensitively', () => {
    expect(detectFormat('novel.EPUB')).toBe('epub');
    expect(detectFormat('paper.pdf')).toBe('pdf');
    expect(detectFormat('notes.markdown')).toBe('markdown');
    expect(detectFormat('notes.md')).toBe('markdown');
  });

  it('returns null for unsupported files', () => {
    expect(detectFormat('book.mobi')).toBeNull();
    expect(detectFormat('archive.zip')).toBeNull();
  });
});

describe('loadBook', () => {
  it('loads markdown as text', async () => {
    const file = new File(['# Title'], 'notes.md', { type: 'text/markdown' });
    const book = await loadBook(file);
    expect(book.format).toBe('markdown');
    if (book.format === 'markdown') {
      expect(book.text).toBe('# Title');
    }
  });

  it('loads binary formats as array buffers', async () => {
    const file = new File([new Uint8Array([1, 2, 3])], 'paper.pdf');
    const book = await loadBook(file);
    expect(book.format).toBe('pdf');
    if (book.format === 'pdf') {
      expect(book.data.byteLength).toBe(3);
    }
  });

  it('rejects unsupported formats', async () => {
    const file = new File(['x'], 'book.mobi');
    await expect(loadBook(file)).rejects.toBeInstanceOf(UnsupportedFormatError);
  });
});
