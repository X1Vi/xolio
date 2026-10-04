import { describe, expect, it, vi } from 'vitest'
import { filesFromLaunch } from './launch'

function fakeHandle(file: File): FileSystemFileHandle {
  return { getFile: () => Promise.resolve(file) } as unknown as FileSystemFileHandle
}

describe('filesFromLaunch', () => {
  it('returns readable files', async () => {
    const file = new File(['hello'], 'book.epub', { type: 'application/epub+zip' })
    const files = await filesFromLaunch({ files: [fakeHandle(file)] })
    expect(files).toHaveLength(1)
    expect(files[0]?.name).toBe('book.epub')
  })

  it('skips handles that fail to read', async () => {
    const bad = { getFile: vi.fn(() => Promise.reject(new Error('revoked'))) } as unknown as FileSystemFileHandle
    const good = fakeHandle(new File(['x'], 'ok.pdf', { type: 'application/pdf' }))
    const files = await filesFromLaunch({ files: [bad, good] })
    expect(files.map((file) => file.name)).toEqual(['ok.pdf'])
  })

  it('handles launches without files', async () => {
    expect(await filesFromLaunch({})).toEqual([])
  })
})
