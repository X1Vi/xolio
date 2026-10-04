import { useState } from 'react';
import type { Bookmark, MarksBundle, ReaderLocation } from '../lib/marks';
import { learnTopicUrl } from '../lib/store';
import { ShareMenu } from './ShareMenu';

export interface MarksJumpTarget {
  readonly location: ReaderLocation;
  readonly quote?: string;
}

interface MarksPanelProps {
  readonly marks: MarksBundle;
  readonly bookTitle: string;
  readonly onJump: (target: MarksJumpTarget) => void;
  readonly onRemoveBookmark: (id: string) => void;
  readonly onRenameBookmark: (id: string, title: string) => void;
  readonly onTogglePinBookmark: (id: string) => void;
  readonly onRemoveHighlight: (id: string) => void;
  readonly onClose: () => void;
}

interface BookmarkRowProps {
  readonly bookmark: Bookmark;
  readonly onJump: (target: MarksJumpTarget) => void;
  readonly onRename: (id: string, title: string) => void;
  readonly onTogglePin: (id: string) => void;
  readonly onRemove: (id: string) => void;
}

function BookmarkRow({ bookmark, onJump, onRename, onTogglePin, onRemove }: BookmarkRowProps) {
  const [editing, setEditing] = useState(false);
  const [draft, setDraft] = useState(bookmark.label);

  return (
    <li className="marks-item">
      {editing ? (
        <form
          className="marks-rename"
          onSubmit={(event) => {
            event.preventDefault();
            onRename(bookmark.id, draft);
            setEditing(false);
          }}
        >
          <input
            className="marks-rename-input"
            aria-label="Bookmark title"
            value={draft}
            autoFocus
            onChange={(event) => {
              setDraft(event.target.value);
            }}
          />
          <button type="submit" className="icon-button">
            Save
          </button>
          <button
            type="button"
            className="icon-button"
            onClick={() => {
              setEditing(false);
            }}
          >
            Cancel
          </button>
        </form>
      ) : (
        <>
          <button
            type="button"
            className="marks-jump"
            onClick={() => {
              onJump({ location: bookmark.location });
            }}
          >
            <span className="marks-label">
              {bookmark.pinned === true && <span className="marks-pinned">Pinned</span>}
              {bookmark.label}
            </span>
            <span className="marks-meta">{new Date(bookmark.createdAt).toLocaleString()}</span>
          </button>
          <div className="marks-item-actions">
            <button
              type="button"
              className="icon-button"
              aria-pressed={bookmark.pinned === true}
              onClick={() => {
                onTogglePin(bookmark.id);
              }}
            >
              {bookmark.pinned === true ? 'Unpin' : 'Pin'}
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => {
                setDraft(bookmark.label);
                setEditing(true);
              }}
            >
              Rename
            </button>
            <button
              type="button"
              className="icon-button"
              onClick={() => {
                onRemove(bookmark.id);
              }}
            >
              Delete
            </button>
          </div>
        </>
      )}
    </li>
  );
}

export function MarksPanel(props: MarksPanelProps) {
  const { marks, bookTitle, onJump, onRemoveBookmark, onRenameBookmark, onTogglePinBookmark, onRemoveHighlight, onClose } = props;

  const highlightDigest = marks.highlights
    .slice(0, 10)
    .map((highlight) => `• ${highlight.quote}`)
    .join('\n')
  const sharePayload = {
    title: `Marks from ${bookTitle}`,
    url: `${window.location.origin}/`,
    text:
      highlightDigest.length > 0
        ? `Highlights from “${bookTitle}”:\n\n${highlightDigest}`.slice(0, 1200)
        : `Bookmarked “${bookTitle}” while reading in Xolio`,
    tags: ['reading', 'books'],
    source: 'xolio',
  }

  return (
    <aside className="marks-panel" aria-label="Bookmarks and highlights">
      <div className="ai-panel-header">
        <span className="ai-panel-title">Marks</span>
        <ShareMenu payload={sharePayload} label="Share marks" />
        <button type="button" className="icon-button" onClick={onClose} aria-label="Close marks panel">
          Close
        </button>
      </div>
      <div className="ai-panel-body">
        <section>
          <span className="ai-section-label">Bookmarks</span>
          {marks.bookmarks.length === 0 ? (
            <p className="ai-hint">No bookmarks yet. Use the Bookmark button while reading.</p>
          ) : (
            <ul className="marks-list">
              {marks.bookmarks.map((bookmark) => (
                <BookmarkRow
                  key={bookmark.id}
                  bookmark={bookmark}
                  onJump={onJump}
                  onRename={onRenameBookmark}
                  onTogglePin={onTogglePinBookmark}
                  onRemove={onRemoveBookmark}
                />
              ))}
            </ul>
          )}
        </section>

        <section>
          <span className="ai-section-label">Highlights</span>
          {marks.highlights.length === 0 ? (
            <p className="ai-hint">
              No highlights yet. Select text, then use the Highlight button in the header.
            </p>
          ) : (
            <ul className="marks-list">
              {marks.highlights.map((highlight) => (
                <li key={highlight.id} className="marks-item">
                  <button
                    type="button"
                    className="marks-jump"
                    onClick={() => {
                      onJump({ location: highlight.location, quote: highlight.quote });
                    }}
                  >
                    <span className="marks-quote">{highlight.quote}</span>
                    <span className="marks-meta">
                      {highlight.location.label} ·{' '}
                      {new Date(highlight.createdAt).toLocaleDateString()}
                    </span>
                  </button>
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => {
                      onRemoveHighlight(highlight.id);
                    }}
                  >
                    Delete
                  </button>
                  <a
                    className="icon-button"
                    href={learnTopicUrl(highlight.quote)}
                    target="_blank"
                    rel="noopener noreferrer"
                    title="Find learning resources about this highlight"
                  >
                    Learn
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </aside>
  );
}
