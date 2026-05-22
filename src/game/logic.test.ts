/**
 * ゲームロジックのユニットテスト (Issues #11, #12)。
 */
import { describe, expect, it, beforeEach } from 'vitest'
import {
  createUrinals,
  spawnChar,
  updateGame,
  assignToUrinal,
  resetCharIdCounter,
  ENTRANCE_X,
  ENTRANCE_Y,
  queuePosition,
} from './logic'
import type { Char, Urinal } from './types'

describe('createUrinals', () => {
  it('4基の便器を生成する', () => {
    const urinals = createUrinals(640)
    expect(urinals).toHaveLength(4)
  })

  it('全便器の初期状態は EMPTY', () => {
    const urinals = createUrinals(640)
    for (const u of urinals) {
      expect(u.state).toBe('EMPTY')
      expect(u.occupantId).toBeNull()
    }
  })

  it('便器は横並び (Y が同じ)', () => {
    const urinals = createUrinals(640)
    const ys = urinals.map(u => u.y)
    expect(new Set(ys).size).toBe(1)
  })

  it('便器が左から右へ X が増える', () => {
    const urinals = createUrinals(640)
    for (let i = 1; i < urinals.length; i++) {
      expect(urinals[i].x).toBeGreaterThan(urinals[i - 1].x)
    }
  })
})

describe('spawnChar', () => {
  beforeEach(() => resetCharIdCounter())

  it('入口座標にキャラを生成する', () => {
    const char = spawnChar()
    expect(char.x).toBe(ENTRANCE_X)
    expect(char.y).toBe(ENTRANCE_Y)
  })

  it('初期状態は WALKING_TO_QUEUE', () => {
    const char = spawnChar()
    expect(char.state).toBe('WALKING_TO_QUEUE')
  })

  it('連続生成でユニーク ID になる', () => {
    const a = spawnChar()
    const b = spawnChar()
    expect(a.id).not.toBe(b.id)
  })
})

describe('updateGame — WALKING_TO_QUEUE → QUEUING', () => {
  let chars: Char[]
  let urinals: Urinal[]

  beforeEach(() => {
    resetCharIdCounter()
    urinals = createUrinals(640)
    chars = [spawnChar()]
    // 目標を近くに設定して即到着させる。
    chars[0].targetX = chars[0].x + 1
    chars[0].targetY = chars[0].y + 1
  })

  it('目標到達後に QUEUING になる', () => {
    updateGame(chars, urinals, 1000)
    expect(chars[0].state).toBe('QUEUING')
  })
})

describe('updateGame — WALKING_OUT → 退室完了 (スコア加算・1回のみ)', () => {
  let chars: Char[]
  let urinals: Urinal[]

  beforeEach(() => {
    resetCharIdCounter()
    urinals = createUrinals(640)
    // WALKING_OUT 状態のキャラを直接作成。TARGET まで残りわずか。
    chars = [spawnChar()]
    chars[0].state = 'WALKING_OUT'
    chars[0].x = -299
    chars[0].y = 0
    chars[0].targetX = -300
    chars[0].targetY = 0
  })

  it('EXIT_X 到達でスコアが 1 加算される', () => {
    const score = updateGame(chars, urinals, 200)
    expect(score).toBe(1)
  })

  it('退室完了キャラは chars から削除される', () => {
    updateGame(chars, urinals, 200)
    expect(chars).toHaveLength(0)
  })

  it('次フレームでは同キャラのスコアが加算されない (二重カウント防止)', () => {
    updateGame(chars, urinals, 200) // 退室完了・削除
    const score2 = updateGame(chars, urinals, 200) // chars は空
    expect(score2).toBe(0)
  })
})

describe('assignToUrinal', () => {
  let chars: Char[]
  let urinals: Urinal[]

  beforeEach(() => {
    resetCharIdCounter()
    urinals = createUrinals(640)
    chars = [spawnChar()]
    // 直接 QUEUING 状態にする。
    chars[0].state = 'QUEUING'
  })

  it('空き便器へ先頭キャラを割り当てられる', () => {
    const ok = assignToUrinal(chars, urinals, 0)
    expect(ok).toBe(true)
    expect(chars[0].state).toBe('WALKING_TO_URINAL')
    expect(chars[0].assignedUrinalId).toBe(0)
    expect(urinals[0].state).toBe('OCCUPIED')
  })

  it('QUEUING キャラがいないと割り当て失敗', () => {
    chars[0].state = 'WALKING_TO_QUEUE'
    const ok = assignToUrinal(chars, urinals, 0)
    expect(ok).toBe(false)
  })

  it('既に OCCUPIED の便器には割り当て失敗', () => {
    urinals[0].state = 'OCCUPIED'
    const ok = assignToUrinal(chars, urinals, 0)
    expect(ok).toBe(false)
  })
})

describe('queuePosition', () => {
  it('index 0 は先頭位置', () => {
    const pos = queuePosition(0)
    expect(pos.x).toBe(0)
  })

  it('index が増えるほど Y が減る (上に並ぶ)', () => {
    const p0 = queuePosition(0)
    const p1 = queuePosition(1)
    expect(p1.y).toBeLessThan(p0.y)
  })
})
