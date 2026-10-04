import { describe, expect, it } from 'vitest'
import { STORE_ORIGIN, cleanBookTitle, learnTopicUrl } from './store'

describe('cleanBookTitle', () => {
  it('strips extensions and separators', () => {
    expect(cleanBookTitle('the_rust_programming_language.epub')).toBe(
      'the rust programming language',
    )
    expect(cleanBookTitle('Deep Work.pdf')).toBe('Deep Work')
  })

  it('keeps markdown extensions handled', () => {
    expect(cleanBookTitle('notes.markdown')).toBe('notes')
  })

  it('falls back to the raw name', () => {
    expect(cleanBookTitle('.pdf')).toBe('.pdf')
  })
})

describe('learnTopicUrl', () => {
  it('encodes the topic and caps length', () => {
    const url = learnTopicUrl('  distributed   systems  ')
    expect(url).toBe(`${STORE_ORIGIN}/store/learning?q=distributed+systems`)

    const long = learnTopicUrl('x'.repeat(300))
    expect(new URL(long).searchParams.get('q')).toHaveLength(140)
  })
})
