import { describe, it, expect } from 'vitest'
import {
  loadHighscore,
  saveHighscore,
  isNewRecord,
  HIGHSCORE_KEY,
} from './highscore'
import type { StorageAdapter } from './StorageAdapter'

function makeStorage(initial: Record<string, string> = {}): StorageAdapter {
  const store = { ...initial }
  return {
    getItem: (key: string) => store[key] ?? null,
    setItem: (key: string, value: string) => {
      store[key] = value
    },
  }
}

describe('loadHighscore', () => {
  it('未保存の場合は 0 を返す', () => {
    const storage = makeStorage()
    expect(loadHighscore(storage)).toBe(0)
  })

  it('保存済みスコアを返す', () => {
    const storage = makeStorage({ [HIGHSCORE_KEY]: '120' })
    expect(loadHighscore(storage)).toBe(120)
  })

  it('不正な値の場合は 0 を返す', () => {
    const storage = makeStorage({ [HIGHSCORE_KEY]: 'invalid' })
    expect(loadHighscore(storage)).toBe(0)
  })
})

describe('saveHighscore', () => {
  it('スコアを文字列として保存する', () => {
    const store: Record<string, string> = {}
    const storage: StorageAdapter = {
      getItem: key => store[key] ?? null,
      setItem: (key, value) => {
        store[key] = value
      },
    }
    saveHighscore(storage, 99)
    expect(store[HIGHSCORE_KEY]).toBe('99')
  })

  it('saveHighscore → loadHighscore の往復で同じ値を返す', () => {
    const storage = makeStorage()
    saveHighscore(storage, 42)
    expect(loadHighscore(storage)).toBe(42)
  })
})

describe('isNewRecord', () => {
  it('スコアがベストを超えていれば true', () => {
    const storage = makeStorage({ [HIGHSCORE_KEY]: '50' })
    expect(isNewRecord(storage, 51)).toBe(true)
  })

  it('スコアがベストと同じなら false', () => {
    const storage = makeStorage({ [HIGHSCORE_KEY]: '50' })
    expect(isNewRecord(storage, 50)).toBe(false)
  })

  it('スコアがベスト未満なら false', () => {
    const storage = makeStorage({ [HIGHSCORE_KEY]: '50' })
    expect(isNewRecord(storage, 30)).toBe(false)
  })

  it('未保存（0）のとき、スコア > 0 なら true', () => {
    const storage = makeStorage()
    expect(isNewRecord(storage, 1)).toBe(true)
  })

  it('スコアが 0 のとき false（0 > 0 は false）', () => {
    const storage = makeStorage()
    expect(isNewRecord(storage, 0)).toBe(false)
  })
})
