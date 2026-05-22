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

  it('未知の値を渡しても runtime エラーにならない', () => {
    // TypeScript の型外の値を実行時に渡した場合、クラッシュせず undefined を返す
    // （switch に default がないため exhaustive check は型レベルで担保）
    const result = charTypeToLabel('UNKNOWN' as CharType)
    // undefined が返るか、文字列が返るかのいずれかであることを確認
    expect(result === undefined || typeof result === 'string').toBe(true)
  })

  it('null を渡しても runtime エラーにならない', () => {
    // null を渡した場合もクラッシュしないことを確認
    const result = charTypeToLabel(null as unknown as CharType)
    expect(result === undefined || typeof result === 'string').toBe(true)
  })

  it('各タイプのラベルが期待値と完全一致する（境界値）', () => {
    expect(charTypeToLabel('NORMAL')).toBe('N')
    expect(charTypeToLabel('RUSHER')).toBe('R!')
    expect(charTypeToLabel('GROUP')).toBe('G')
    expect(charTypeToLabel('DRUNK')).toBe('?')
  })
})
