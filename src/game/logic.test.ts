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
import { evaluateAssignment } from './scoring'
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

  it('パンク退場キャラはスコアを加算しない', () => {
    const stats = createGameStats()
    // ENTERING キャラが満員列に到着するよう十分な deltaMS を与える。
    updateGame(chars, urinals, stats, 1000)
    // 退場キャラが画面外に出るまで追加フレームを流す。
    for (let i = 0; i < 10; i++) {
      updateGame(chars, urinals, stats, 1000)
    }
    expect(stats.score).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// updateGame — LEAVING → 退室完了 (スコア加算・1回のみ)
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
    chars[0].quitByMiss = true
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

// ---------------------------------------------------------------------------
// updateGame — anger 満タンミス
// ---------------------------------------------------------------------------
describe('updateGame — anger 満タン退場', () => {
  let chars: Char[]
  let urinals: Urinal[]

  beforeEach(() => {
    resetCharIdCounter()
    urinals = createUrinals(640)
    chars = [spawnChar()]
    chars[0].state = 'QUEUING'
    chars[0].anger = 99.999 // 次フレームで必ず 100 になる
  })

  it('anger が 100 に達するとミスが増える', () => {
    const stats = createGameStats()
    const { missCount } = updateGame(chars, urinals, stats, 100)
    expect(missCount).toBeGreaterThanOrEqual(1)
    expect(stats.misses).toBeGreaterThanOrEqual(1)
  })

  it('anger 満タン退場キャラはスコアを加算しない', () => {
    const stats = createGameStats()
    updateGame(chars, urinals, stats, 100)
    // 退場キャラが画面外に出るまで追加フレームを流す。
    for (let i = 0; i < 10; i++) {
      updateGame(chars, urinals, stats, 1000)
    }
    expect(stats.score).toBe(0)
  })
})

// ---------------------------------------------------------------------------
// evaluateAssignment — 心理スコアリングルール
// ---------------------------------------------------------------------------
describe('evaluateAssignment — スコアリングルール', () => {
  let urinals: Urinal[]

  beforeEach(() => {
    urinals = createUrinals(640)
  })

  it('END_URINAL: 端の便器 (id=0) に誰もいない状態で割当 → END_URINAL + NO_NEIGHBOR', () => {
    urinals[0].state = 'OCCUPIED'
    const { rules } = evaluateAssignment(0, urinals)
    const ids = rules.map(r => r.ruleId)
    expect(ids).toContain('END_URINAL')
    expect(ids).toContain('NO_NEIGHBOR')
  })

  it('NO_NEIGHBOR: 両隣が空の便器に割当 → NO_NEIGHBOR のみ (SAME_COLUMN_TABOO なし)', () => {
    // 便器1 (中間) に割当、0/2/3 は空。
    urinals[1].state = 'OCCUPIED'
    const { rules } = evaluateAssignment(1, urinals)
    const ids = rules.map(r => r.ruleId)
    expect(ids).toContain('NO_NEIGHBOR')
    expect(ids).not.toContain('SAME_COLUMN_TABOO')
  })

  it('NEIGHBOR_EMPTY: 片方だけ隣が占有 → SAME_COLUMN_TABOO (4台構成では distance=1 のためタブー)', () => {
    // 便器1 を先に占有した状態で便器2 を割当（直接隣）。
    urinals[1].state = 'OCCUPIED'
    urinals[1].occupantId = 99
    urinals[2].state = 'OCCUPIED'
    const { rules } = evaluateAssignment(2, urinals)
    const ids = rules.map(r => r.ruleId)
    // 4台構成では distance=1 の直接隣接なので SAME_COLUMN_TABOO。
    expect(ids).toContain('SAME_COLUMN_TABOO')
    expect(ids).not.toContain('NEIGHBOR_EMPTY')
  })

  it('SAME_COLUMN_TABOO: 直接隣に人がいる → SAME_COLUMN_TABOO', () => {
    // 便器0を占有、便器1に割当。
    urinals[0].state = 'OCCUPIED'
    urinals[0].occupantId = 99
    urinals[1].state = 'OCCUPIED'
    const { rules } = evaluateAssignment(1, urinals)
    const ids = rules.map(r => r.ruleId)
    expect(ids).toContain('SAME_COLUMN_TABOO')
    expect(ids).not.toContain('NEIGHBOR_EMPTY')
  })

  it('FORCED_ADJACENT: 両隣が埋まっていても FORCED_ADJACENT でペナルティなし', () => {
    // 便器0/2 を占有、便器1 に割当。
    urinals[0].state = 'OCCUPIED'
    urinals[0].occupantId = 99
    urinals[2].state = 'OCCUPIED'
    urinals[2].occupantId = 100
    urinals[1].state = 'OCCUPIED'
    const { rules, scoreDelta } = evaluateAssignment(1, urinals)
    const ids = rules.map(r => r.ruleId)
    expect(ids).toContain('FORCED_ADJACENT')
    expect(scoreDelta).toBe(0)
  })

  it('GROUP: 隣に人がいても SAME_COLUMN_TABOO を適用しない', () => {
    // 便器0を占有、GROUP タイプで便器1 に割当 → ペナルティなし。
    urinals[0].state = 'OCCUPIED'
    urinals[0].occupantId = 99
    urinals[1].state = 'OCCUPIED'
    const groupChar = { type: 'GROUP' } as Char
    const { rules } = evaluateAssignment(1, urinals, groupChar)
    const ids = rules.map(r => r.ruleId)
    expect(ids).not.toContain('SAME_COLUMN_TABOO')
  })

  it('GROUP: 隣に人がいない場合は通常通り NO_NEIGHBOR が適用される', () => {
    urinals[1].state = 'OCCUPIED'
    const groupChar = { type: 'GROUP' } as Char
    const { rules } = evaluateAssignment(1, urinals, groupChar)
    const ids = rules.map(r => r.ruleId)
    expect(ids).toContain('NO_NEIGHBOR')
    expect(ids).not.toContain('SAME_COLUMN_TABOO')
  })

  it('DRUNK: 隣に人がいれば通常通り SAME_COLUMN_TABOO が適用される', () => {
    // DRUNK は GROUP 免除対象外。
    urinals[0].state = 'OCCUPIED'
    urinals[0].occupantId = 99
    urinals[1].state = 'OCCUPIED'
    const drunkChar = { type: 'DRUNK' } as Char
    const { rules } = evaluateAssignment(1, urinals, drunkChar)
    const ids = rules.map(r => r.ruleId)
    expect(ids).toContain('SAME_COLUMN_TABOO')
  })

  it('char 省略時（undefined）は既存の SAME_COLUMN_TABOO 動作を維持', () => {
    urinals[0].state = 'OCCUPIED'
    urinals[0].occupantId = 99
    urinals[1].state = 'OCCUPIED'
    const { rules } = evaluateAssignment(1, urinals)
    const ids = rules.map(r => r.ruleId)
    expect(ids).toContain('SAME_COLUMN_TABOO')
  })
})

// ---------------------------------------------------------------------------
// spawnChar with Difficulty (#18)
// ---------------------------------------------------------------------------
describe('spawnChar - Difficulty', () => {
  beforeEach(() => {
    resetCharIdCounter()
  })

  it('NORMAL 難易度ではデフォルトと同じ型が返る', () => {
    const char = spawnChar(0, 'NORMAL')
    expect(['NORMAL', 'RUSHER', 'GROUP', 'DRUNK']).toContain(char.type)
  })

  it('HARD 難易度でも有効な CharType が返る', () => {
    const char = spawnChar(30000, 'HARD')
    expect(['NORMAL', 'RUSHER', 'GROUP', 'DRUNK']).toContain(char.type)
  })

  it('NORMAL 難易度で経過0msは常に NORMAL タイプ', () => {
    // 乱数に依存しない序盤 — 10回試行して全て NORMAL であることを確認。
    for (let i = 0; i < 10; i++) {
      resetCharIdCounter()
      const char = spawnChar(0, 'NORMAL')
      expect(char.type).toBe('NORMAL')
    }
  })
})
