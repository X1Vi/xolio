export type BookFormat = 'pdf' | 'epub' | 'markdown';

interface BaseBook {
  readonly name: string;
}

export interface PdfBook extends BaseBook {
  readonly format: 'pdf';
  readonly data: ArrayBuffer;
}

export interface EpubBookSource extends BaseBook {
  readonly format: 'epub';
  readonly data: ArrayBuffer;
}

export interface MarkdownBook extends BaseBook {
  readonly format: 'markdown';
  readonly text: string;
}

export type Book = PdfBook | EpubBookSource | MarkdownBook;

export class UnsupportedFormatError extends Error {
  readonly fileName: string;

  constructor(fileName: string) {
    super(`Unsupported file type: ${fileName}. Open a PDF, EPUB, or Markdown file.`);
    this.name = 'UnsupportedFormatError';
    this.fileName = fileName;
  }
}

export function detectFormat(fileName: string): BookFormat | null {
  const lower = fileName.toLowerCase();
  if (lower.endsWith('.pdf')) {
    return 'pdf';
  }
  if (lower.endsWith('.epub')) {
    return 'epub';
  }
  if (lower.endsWith('.md') || lower.endsWith('.markdown') || lower.endsWith('.mdown')) {
    return 'markdown';
  }
  return null;
}

export async function loadBook(file: File): Promise<Book> {
  const format = detectFormat(file.name);
  if (format === null) {
    throw new UnsupportedFormatError(file.name);
  }
  if (format === 'markdown') {
    return { format, name: file.name, text: await file.text() };
  }
  return { format, name: file.name, data: await file.arrayBuffer() };
}
