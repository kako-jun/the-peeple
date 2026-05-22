/**
 * ゲームロジックのユニットテスト (Issues #11-#16)。
 */
import { describe, expect, it, beforeEach } from 'vitest'
import {
  createUrinals,
  spawnChar,
  updateGame,
  assignToUrinal,
  resetCharIdCounter,
  createGameStats,
  ENTRANCE_X,
  ENTRANCE_Y,
  queuePosition,
  QUEUE_MAX,
} from './logic'
import type { Char, Urinal } from './types'

// ---------------------------------------------------------------------------
// createUrinals
// ---------------------------------------------------------------------------
describe('createUrinals', () => {
  it('4基の便器を生成する', () => {
    expect(createUrinals(640)).toHaveLength(4)
  })

  it('全便器の初期状態は EMPTY', () => {
    for (const u of createUrinals(640)) {
      expect(u.state).toBe('EMPTY')
      expect(u.occupantId).toBeNull()
    }
  })

  it('便器は横並び (Y が同じ)', () => {
    const ys = createUrinals(640).map(u => u.y)
    expect(new Set(ys).size).toBe(1)
  })

  it('便器が左から右へ X が増える', () => {
    const urinals = createUrinals(640)
    for (let i = 1; i < urinals.length; i++) {
      expect(urinals[i].x).toBeGreaterThan(urinals[i - 1].x)
    }
  })
})

// ---------------------------------------------------------------------------
// spawnChar
// ---------------------------------------------------------------------------
describe('spawnChar', () => {
  beforeEach(() => resetCharIdCounter())

  it('入口座標にキャラを生成する', () => {
    const char = spawnChar()
    expect(char.x).toBe(ENTRANCE_X)
    expect(char.y).toBe(ENTRANCE_Y)
  })

  it('初期状態は ENTERING', () => {
    expect(spawnChar().state).toBe('ENTERING')
  })

  it('連続生成でユニーク ID になる', () => {
    const a = spawnChar()
    const b = spawnChar()
    expect(a.id).not.toBe(b.id)
  })

  it('type フィールドを持つ', () => {
    const types = ['NORMAL', 'RUSHER', 'GROUP', 'DRUNK']
    expect(types).toContain(spawnChar().type)
  })

  it('anger フィールドが 0 で初期化される', () => {
    expect(spawnChar().anger).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// updateGame — ENTERING → QUEUING
// ---------------------------------------------------------------------------
describe('updateGame — ENTERING → QUEUING', () => {
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
    updateGame(chars, urinals, createGameStats(), 1000)
    expect(chars[0].state).toBe('QUEUING')
  })
})

// ---------------------------------------------------------------------------
// updateGame — 行列パンクミス
// ---------------------------------------------------------------------------
describe('updateGame — 行列パンク', () => {
  let chars: Char[]
  let urinals: Urinal[]

  beforeEach(() => {
    resetCharIdCounter()
    urinals = createUrinals(640)
    // QUEUE_MAX 人を QUEUING 状態で積んでおく。
    chars = []
    for (let i = 0; i < QUEUE_MAX; i++) {
      const c = spawnChar()
      c.state = 'QUEUING'
      c.x = queuePosition(i).x
      c.y = queuePosition(i).y
      c.targetX = c.x
      c.targetY = c.y
      chars.push(c)
    }
    // 満員の状態で ENTERING キャラを追加。
    const entering = spawnChar()
    entering.targetX = entering.x + 1
    entering.targetY = entering.y + 1
    chars.push(entering)
  })

  it('パンク時に missCount が増える', () => {
    const stats = createGameStats()
    const { missCount } = updateGame(chars, urinals, stats, 1000)
    expect(missCount).toBeGreaterThanOrEqual(1)
    expect(stats.misses).toBeGreaterThanOrEqual(1)
  })
})

// ---------------------------------------------------------------------------
// updateGame — WALKING_OUT → 退室完了 (スコア加算・1回のみ)
// ---------------------------------------------------------------------------
describe('updateGame — LEAVING → 退室完了', () => {
  let chars: Char[]
  let urinals: Urinal[]

  beforeEach(() => {
    resetCharIdCounter()
    urinals = createUrinals(640)
    chars = [spawnChar()]
    chars[0].state = 'LEAVING'
    chars[0].x = -299
    chars[0].y = 0
    chars[0].targetX = -300
    chars[0].targetY = 0
  })

  it('EXIT_X 到達でスコアが 1 加算される', () => {
    const stats = createGameStats()
    updateGame(chars, urinals, stats, 200)
    expect(stats.score).toBe(1)
  })

  it('退室完了キャラは chars から削除される', () => {
    updateGame(chars, urinals, createGameStats(), 200)
    expect(chars).toHaveLength(0)
  })

  it('次フレームでは同キャラのスコアが加算されない (二重カウント防止)', () => {
    const stats = createGameStats()
    updateGame(chars, urinals, stats, 200)
    const prevScore = stats.score
    updateGame(chars, urinals, stats, 200)
    expect(stats.score).toBe(prevScore)
  })

  it('anger 満タンで退室したキャラはスコアが加算されない', () => {
    chars[0].anger = 100
    const stats = createGameStats()
    updateGame(chars, urinals, stats, 200)
    expect(stats.score).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// assignToUrinal
// ---------------------------------------------------------------------------
describe('assignToUrinal', () => {
  let chars: Char[]
  let urinals: Urinal[]

  beforeEach(() => {
    resetCharIdCounter()
    urinals = createUrinals(640)
    chars = [spawnChar()]
    chars[0].state = 'QUEUING'
  })

  it('空き便器へ先頭キャラを割り当てられる', () => {
    const stats = createGameStats()
    const ok = assignToUrinal(chars, urinals, stats, 0)
    expect(ok).toBe(true)
    expect(chars[0].state).toBe('APPROACHING')
    expect(urinals[0].state).toBe('OCCUPIED')
  })

  it('QUEUING キャラがいないと割り当て失敗', () => {
    chars[0].state = 'ENTERING'
    const ok = assignToUrinal(chars, urinals, createGameStats(), 0)
    expect(ok).toBe(false)
  })

  it('既に OCCUPIED の便器には割り当て失敗', () => {
    urinals[0].state = 'OCCUPIED'
    const ok = assignToUrinal(chars, urinals, createGameStats(), 0)
    expect(ok).toBe(false)
  })

  it('割当時にスコアリングルールが適用される', () => {
    const stats = createGameStats()
    assignToUrinal(chars, urinals, stats, 0) // 端の便器
    expect(stats.appliedRules.length).toBeGreaterThan(0)
  })
})

// ---------------------------------------------------------------------------
// queuePosition
// ---------------------------------------------------------------------------
describe('queuePosition', () => {
  it('index 0 は先頭位置', () => {
    expect(queuePosition(0).x).toBe(0)
  })

  it('index が増えるほど Y が減る (上に並ぶ)', () => {
    expect(queuePosition(1).y).toBeLessThan(queuePosition(0).y)
  })
})
