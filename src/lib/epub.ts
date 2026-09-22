import ePub from 'epubjs';

export interface EpubNavItem {
  readonly id: string;
  readonly href: string;
  readonly label: string;
  readonly subitems?: readonly EpubNavItem[];
}

export interface EpubSection {
  readonly index: number;
  readonly document?: Document;
  load(request: (path: string) => Promise<unknown>): Promise<unknown>;
  unload(): void;
  cfiFromRange(range: Range): string;
}

export interface EpubContents {
  readonly document: Document;
  readonly window: Window;
}

export interface EpubLocation {
  readonly start: {
    readonly cfi: string;
    readonly href: string;
    readonly displayed: {
      readonly page: number;
      readonly total: number;
    };
  };
}

export interface EpubRendition {
  display(target?: string | number): Promise<void>;
  resize(width?: number, height?: number): void;
  next(): Promise<void>;
  prev(): Promise<void>;
  destroy(): void;
  themes: {
    default(theme: Record<string, Record<string, string>>): void;
  };
  annotations: {
    highlight(
      cfi: string,
      data?: Record<string, unknown>,
      callback?: () => void,
      className?: string,
      styles?: Record<string, string>,
    ): unknown;
    remove(cfi: string, type: string): void;
  };
  hooks: {
    content: {
      register(callback: (contents: EpubContents) => void): void;
    };
  };
  on(event: 'relocated', listener: (location: EpubLocation) => void): void;
  on(event: 'selected', listener: (cfiRange: string, contents: EpubContents) => void): void;
  on(event: string, listener: (...args: readonly unknown[]) => void): void;
}

export interface EpubBookHandle {
  renderTo(element: Element, options: Record<string, unknown>): EpubRendition;
  spine: {
    readonly spineItems: readonly EpubSection[];
  };
  loaded: {
    readonly navigation: Promise<{ readonly toc: readonly EpubNavItem[] }>;
  };
  load(path: string): Promise<unknown>;
  destroy(): void;
}

export function openEpub(data: ArrayBuffer): EpubBookHandle {
  const book = ePub(data);
  return book as unknown as EpubBookHandle;
}
