import { fireEvent, render, screen } from '@testing-library/react';
import { describe, expect, it, vi } from 'vitest';
import type { MarksBundle } from '../lib/marks';
import { MarksPanel } from './MarksPanel';

const marks: MarksBundle = {
  bookmarks: [
    {
      id: 'bookmark-1',
      createdAt: 1700000000000,
      label: 'Old title',
      location: { kind: 'pdf', page: 3, label: 'Page 3' },
    },
  ],
  highlights: [],
};

describe('MarksPanel', () => {
  it('renames a bookmark through the inline form', () => {
    const onRenameBookmark = vi.fn();
    render(
      <MarksPanel
        marks={marks}
        onJump={() => undefined}
        onRemoveBookmark={() => undefined}
        onRenameBookmark={onRenameBookmark}
        onRemoveHighlight={() => undefined}
        onClose={() => undefined}
      />,
    );
    fireEvent.click(screen.getByRole('button', { name: 'Rename' }));
    const input = screen.getByLabelText('Bookmark title');
    fireEvent.change(input, { target: { value: 'New title' } });
    fireEvent.click(screen.getByRole('button', { name: 'Save' }));
    expect(onRenameBookmark).toHaveBeenCalledWith('bookmark-1', 'New title');
  });

  it('jumps to a bookmark location', () => {
    const onJump = vi.fn();
    render(
      <MarksPanel
        marks={marks}
        onJump={onJump}
        onRemoveBookmark={() => undefined}
        onRenameBookmark={() => undefined}
        onRemoveHighlight={() => undefined}
        onClose={() => undefined}
      />,
    );
    fireEvent.click(screen.getByText('Old title'));
    expect(onJump).toHaveBeenCalledWith({
      location: { kind: 'pdf', page: 3, label: 'Page 3' },
    });
  });
});
