import { fireEvent, render, screen, waitFor } from '@testing-library/react'
import { afterEach, describe, expect, it, vi } from 'vitest'
import { ShareMenu } from './ShareMenu'
import type { SharePayload } from '../lib/share'

const payload: SharePayload = {
  title: 'A Christmas Carol — Charles Dickens',
  url: 'https://standardebooks.org/ebooks/charles-dickens/a-christmas-carol',
  text: 'Free ebook: A Christmas Carol by Charles Dickens',
  tags: ['freebooks', 'classics'],
  source: 'xolio',
}

afterEach(() => {
  Reflect.deleteProperty(window.navigator, 'clipboard')
})

describe('ShareMenu', () => {
  it('opens a dialog with the book link and share targets', () => {
    render(<ShareMenu payload={payload} />)

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))

    expect(screen.getByRole('dialog', { name: /A Christmas Carol/ })).toBeInTheDocument()
    expect(screen.getByLabelText('Book link')).toHaveValue(payload.url)
    expect(screen.getByRole('button', { name: /WhatsApp/ })).toBeInTheDocument()
    expect(screen.getByRole('button', { name: /Bluesky/ })).toBeInTheDocument()
    expect(screen.queryByRole('button', { name: 'Read it in Xolio' })).not.toBeInTheDocument()
  })

  it('offers Read it in Xolio when a reader action is provided', () => {
    const onRead = vi.fn()
    render(<ShareMenu payload={payload} onRead={onRead} />)

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    fireEvent.click(screen.getByRole('button', { name: 'Read it in Xolio' }))

    expect(onRead).toHaveBeenCalledOnce()
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('closes on Escape and on a backdrop click', () => {
    render(<ShareMenu payload={payload} />)

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    fireEvent.keyDown(window, { key: 'Escape' })
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    const backdrop = screen.getByRole('dialog').parentElement
    if (backdrop === null) throw new Error('missing backdrop')
    fireEvent.mouseDown(backdrop)
    expect(screen.queryByRole('dialog')).not.toBeInTheDocument()
  })

  it('copies the book link', async () => {
    const writeText = vi.fn(() => Promise.resolve())
    Object.defineProperty(window.navigator, 'clipboard', {
      value: { writeText },
      configurable: true,
    })
    render(<ShareMenu payload={payload} />)

    fireEvent.click(screen.getByRole('button', { name: 'Share' }))
    fireEvent.click(screen.getByRole('button', { name: 'Copy' }))

    await waitFor(() => {
      expect(screen.getByRole('status')).toHaveTextContent('Link copied')
    })
    expect(writeText).toHaveBeenCalledWith(expect.stringContaining(payload.url))
  })
})
