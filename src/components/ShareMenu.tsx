import { useCallback, useEffect, useId, useRef, useState } from 'react'
import { createPortal } from 'react-dom'
import { SHARE_TARGETS, share } from '../lib/share'
import type { SharePayload, ShareTarget } from '../lib/share'

interface ShareMenuProps {
  readonly payload: SharePayload
  readonly label?: string
  readonly onRead?: (() => void) | undefined
  readonly readLabel?: string
}

function outcomeMessage(target: ShareTarget, status: 'shared' | 'copied' | 'opened'): string {
  if (status === 'shared') {
    return 'Shared'
  }
  if (status === 'copied') {
    return target === 'copy-link' ? 'Link copied' : 'Copied'
  }
  return `Opening ${SHARE_TARGETS.find((entry) => entry.id === target)?.label ?? target}…`
}

export function ShareMenu({
  payload,
  label = 'Share',
  onRead,
  readLabel = 'Read it in Xolio',
}: ShareMenuProps) {
  const [open, setOpen] = useState(false)
  const [status, setStatus] = useState<string | null>(null)
  const triggerRef = useRef<HTMLButtonElement>(null)
  const dialogRef = useRef<HTMLElement>(null)
  const linkId = useId()

  const close = useCallback(() => {
    setOpen(false)
    setStatus(null)
    triggerRef.current?.focus()
  }, [])

  useEffect(() => {
    if (!open) {
      return
    }
    dialogRef.current?.focus()
    const handler = (event: KeyboardEvent): void => {
      if (event.key === 'Escape') {
        close()
      }
    }
    window.addEventListener('keydown', handler)
    return () => {
      window.removeEventListener('keydown', handler)
    }
  }, [open, close])

  const run = (target: ShareTarget): void => {
    void (async () => {
      try {
        const outcome = await share(target, payload)
        setStatus(outcomeMessage(target, outcome.status))
      } catch {
        setStatus('Could not share')
      }
    })()
  }

  return (
    <>
      <button
        ref={triggerRef}
        type="button"
        className="icon-button"
        aria-haspopup="dialog"
        aria-expanded={open}
        onClick={() => {
          setOpen(true)
        }}
      >
        {label}
      </button>

      {open &&
        createPortal(
          <div
            className="share-dialog-backdrop"
            onMouseDown={(event) => {
              if (event.target === event.currentTarget) {
                close()
              }
            }}
          >
            <section
              ref={dialogRef}
              className="share-dialog"
              role="dialog"
              aria-modal="true"
              aria-label={`Share “${payload.title}”`}
              tabIndex={-1}
            >
              <header className="share-dialog-header">
                <h2>Share this book</h2>
                <button
                  type="button"
                  className="icon-button"
                  onClick={close}
                  aria-label="Close share dialog"
                >
                  Close
                </button>
              </header>

              <p className="share-dialog-title">{payload.title}</p>

              <div className="share-link">
                <label htmlFor={linkId}>Book link</label>
                <div className="share-link-row">
                  <input
                    id={linkId}
                    readOnly
                    value={payload.url}
                    onFocus={(event) => {
                      event.target.select()
                    }}
                  />
                  <button
                    type="button"
                    className="icon-button"
                    onClick={() => {
                      run('copy-link')
                    }}
                  >
                    Copy
                  </button>
                </div>
              </div>

              {onRead !== undefined && (
                <button
                  type="button"
                  className="primary-button share-read"
                  onClick={() => {
                    close()
                    onRead()
                  }}
                >
                  {readLabel}
                </button>
              )}

              <div className="share-targets">
                {SHARE_TARGETS.map((target) => (
                  <button
                    key={target.id}
                    type="button"
                    className="share-target"
                    onClick={() => {
                      run(target.id)
                    }}
                  >
                    <span>{target.label}</span>
                    <small>{target.description}</small>
                  </button>
                ))}
              </div>

              {status !== null && (
                <p className="share-status" role="status">
                  {status}
                </p>
              )}
            </section>
          </div>,
          document.body,
        )}
    </>
  )
}
