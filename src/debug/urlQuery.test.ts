/**
 * parseUrlQuery のユニットテスト (Issue #30)。
 */
import { describe, it, expect, beforeEach } from 'vitest'
import { parseUrlQuery } from './urlQuery'

function setSearch(search: string): void {
  Object.defineProperty(window, 'location', {
    value: { search },
    writable: true,
    configurable: true,
  })
}

describe('parseUrlQuery', () => {
  beforeEach(() => {
    setSearch('')
  })

  it('パラメータなし → scene/difficulty ともに null', () => {
    setSearch('')
    expect(parseUrlQuery()).toEqual({ scene: null, difficulty: null })
  })

  it('scene=play → play を返す', () => {
    setSearch('?scene=play')
    expect(parseUrlQuery()).toEqual({ scene: 'play', difficulty: null })
  })

  it('scene=result → result を返す', () => {
    setSearch('?scene=result')
    expect(parseUrlQuery()).toEqual({ scene: 'result', difficulty: null })
  })

  it('scene=lineRush → lineRush を返す', () => {
    setSearch('?scene=lineRush')
    expect(parseUrlQuery()).toEqual({ scene: 'lineRush', difficulty: null })
  })

  it('scene=invalid → null を返す', () => {
    setSearch('?scene=title')
    expect(parseUrlQuery()).toEqual({ scene: null, difficulty: null })
  })

  it('difficulty=NORMAL → NORMAL を返す', () => {
    setSearch('?scene=play&difficulty=NORMAL')
    expect(parseUrlQuery()).toEqual({ scene: 'play', difficulty: 'NORMAL' })
  })

  it('difficulty=HARD → HARD を返す', () => {
    setSearch('?scene=play&difficulty=HARD')
    expect(parseUrlQuery()).toEqual({ scene: 'play', difficulty: 'HARD' })
  })

  it('difficulty=normal (小文字) → NORMAL を返す', () => {
    setSearch('?scene=play&difficulty=normal')
    expect(parseUrlQuery()).toEqual({ scene: 'play', difficulty: 'NORMAL' })
  })

  it('difficulty=hard (小文字) → HARD を返す', () => {
    setSearch('?scene=play&difficulty=hard')
    expect(parseUrlQuery()).toEqual({ scene: 'play', difficulty: 'HARD' })
  })

  it('difficulty=Hard (混在) → HARD を返す', () => {
    setSearch('?scene=play&difficulty=Hard')
    expect(parseUrlQuery()).toEqual({ scene: 'play', difficulty: 'HARD' })
  })

  it('difficulty=EASY (無効値) → null を返す', () => {
    setSearch('?scene=play&difficulty=EASY')
    expect(parseUrlQuery()).toEqual({ scene: 'play', difficulty: null })
  })

  it('scene なしで difficulty だけ → scene は null', () => {
    setSearch('?difficulty=HARD')
    expect(parseUrlQuery()).toEqual({ scene: null, difficulty: 'HARD' })
  })
})
