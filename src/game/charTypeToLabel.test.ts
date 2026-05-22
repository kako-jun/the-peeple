import { describe, it, expect } from 'vitest'
import { charTypeToLabel } from './charTypeToLabel'
import type { CharType } from './types'

describe('charTypeToLabel', () => {
  it('NORMAL → N', () => {
    expect(charTypeToLabel('NORMAL')).toBe('N')
  })

  it('RUSHER → R!', () => {
    expect(charTypeToLabel('RUSHER')).toBe('R!')
  })

  it('GROUP → G', () => {
    expect(charTypeToLabel('GROUP')).toBe('G')
  })

  it('DRUNK → ?', () => {
    expect(charTypeToLabel('DRUNK')).toBe('?')
  })

  it('全タイプで文字列を返す', () => {
    const types: CharType[] = ['NORMAL', 'RUSHER', 'GROUP', 'DRUNK']
    for (const t of types) {
      expect(typeof charTypeToLabel(t)).toBe('string')
      expect(charTypeToLabel(t).length).toBeGreaterThan(0)
    }
  })
})
