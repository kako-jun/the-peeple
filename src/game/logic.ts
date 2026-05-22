/**
 * the-peeple ゲームロジック (Issues #11-#16, #18)。
 *
 * 純粋関数として設計し、描画から完全分離する。
 * `updateGame(chars, urinals, stats, deltaMS)` が毎フレーム呼ばれる。
 */
import type {
  Char,
  CharState,
  CharType,
  Difficulty,
  GameStats,
  Urinal,
} from './types'
import { evaluateAssignment } from './scoring'

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

/** 基準移動速度 (px/ms)。speedMult で倍率調整。 */
const BASE_WALK_SPEED = 0.08

/** キャラが目標に到着したと見なす距離 (px)。 */
const ARRIVE_DIST = 4

/** 退室完了と見なす X 座標 (画面左外)。 */
const EXIT_X = -300

/** 待機列が何人を超えたらミス (行列パンク) とするか。 */
export const QUEUE_MAX = 6

/** 中央待機列の X 座標 (PlayScene ローカル、中央原点ベース)。 */
export const QUEUE_X = 0

/** 中央待機列の先頭 Y 座標。 */
export const QUEUE_HEAD_Y = -40

/** 待機列の縦間隔 (px)。 */
export const QUEUE_SPACING = 36

/** 各客タイプのパラメータ。 */
const CHAR_PARAMS: Record<
  CharType,
  { angerRate: number; useDuration: [number, number]; speedMult: number }
> = {
  NORMAL: { angerRate: 0.004, useDuration: [5000, 10000], speedMult: 1.0 },
  RUSHER: { angerRate: 0.012, useDuration: [2000, 4000], speedMult: 1.8 },
  GROUP: { angerRate: 0.003, useDuration: [6000, 12000], speedMult: 0.9 },
  DRUNK: { angerRate: 0.006, useDuration: [8000, 14000], speedMult: 0.7 },
}

// ---------------------------------------------------------------------------
// ユーティリティ
// ---------------------------------------------------------------------------

/** 2点間距離。 */
function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  return Math.sqrt(dx * dx + dy * dy)
}

/**
 * キャラを目標方向へ deltaMS 分だけ進める。
 * 目標座標にスナップした場合 true を返す。
 */
function moveToward(char: Char, deltaMS: number): boolean {
  const speed = BASE_WALK_SPEED * char.speedMult
  const d = dist(char.x, char.y, char.targetX, char.targetY)
  if (d <= ARRIVE_DIST) {
    char.x = char.targetX
    char.y = char.targetY
    return true
  }
  const step = speed * deltaMS
  const ratio = Math.min(step / d, 1)
  char.x += (char.targetX - char.x) * ratio
  char.y += (char.targetY - char.y) * ratio
  if (d - step <= ARRIVE_DIST) {
    char.x = char.targetX
    char.y = char.targetY
    return true
  }
  return false
}

/** 待機列の位置を計算する (index 番目のキャラの座標)。 */
export function queuePosition(index: number): { x: number; y: number } {
  return {
    x: QUEUE_X,
    y: QUEUE_HEAD_Y - index * QUEUE_SPACING,
  }
}

// ---------------------------------------------------------------------------
// ゲームループ
// ---------------------------------------------------------------------------

/**
 * ゲーム状態を 1 フレーム進める。
 * @returns 今フレームで発生したミス数 (行列パンク + anger 満タン退場)。
 */
export function updateGame(
  chars: Char[],
  urinals: Urinal[],
  stats: GameStats,
  deltaMS: number
): { scoreGain: number; missCount: number } {
  let scoreGain = 0
  let missCount = 0

  // 経過時間更新。
  stats.elapsed += deltaMS

  // 待機列インデックス (QUEUING キャラ順序維持)。
  const queueChars = chars.filter(c => c.state === 'QUEUING')

  for (const char of chars) {
    switch (char.state as CharState) {
      case 'ENTERING': {
        const arrived = moveToward(char, deltaMS)
        if (arrived) {
          // 行列パンク判定。
          if (queueChars.length >= QUEUE_MAX) {
            // 行列に入れない → ミス扱いで即退場。
            missCount++
            char.quitByMiss = true
            char.state = 'LEAVING'
            char.targetX = EXIT_X
            char.targetY = char.y
          } else {
            char.state = 'QUEUING'
            const idx = queueChars.length
            queueChars.push(char)
            const pos = queuePosition(idx)
            char.x = pos.x
            char.y = pos.y
            char.targetX = pos.x
            char.targetY = pos.y
          }
        }
        break
      }
      case 'QUEUING': {
        moveToward(char, deltaMS)
        // 苛立ちゲージ更新。
        char.anger = Math.min(100, char.anger + char.angerRate * deltaMS)
        if (char.anger >= 100) {
          // 怒って退場 → ミス。
          missCount++
          char.quitByMiss = true
          char.state = 'LEAVING'
          char.targetX = EXIT_X
          char.targetY = char.y
          // 便器の割当はない (QUEUING 中) ので解放不要。
        }
        break
      }
      case 'APPROACHING': {
        const arrived = moveToward(char, deltaMS)
        if (arrived && char.assignedUrinalId !== null) {
          char.state = 'USING'
        }
        break
      }
      case 'USING': {
        char.useTimeRemaining -= deltaMS
        if (char.useTimeRemaining <= 0) {
          char.state = 'LEAVING'
          char.targetX = EXIT_X
          char.targetY = char.y
          // 便器を解放。
          if (char.assignedUrinalId !== null) {
            const u = urinals.find(u => u.id === char.assignedUrinalId)
            if (u) {
              u.state = 'EMPTY'
              u.occupantId = null
            }
            char.assignedUrinalId = null
          }
        }
        break
      }
      case 'LEAVING': {
        const exited = moveToward(char, deltaMS)
        if (exited) {
          // 正常退室のみスコア加算 (anger 退場・パンク退場は scoreDelta なし)。
          if (!char.quitByMiss) {
            scoreGain++
          }
        }
        break
      }
    }
  }

  // 退室完了キャラを削除。
  for (let i = chars.length - 1; i >= 0; i--) {
    if (chars[i].state === 'LEAVING' && chars[i].x <= EXIT_X) {
      chars.splice(i, 1)
    }
  }

  // 待機列の目標座標を最新インデックスで更新。
  const updatedQueue = chars.filter(c => c.state === 'QUEUING')
  updatedQueue.forEach((c, i) => {
    const pos = queuePosition(i)
    c.targetX = pos.x
    c.targetY = pos.y
  })

  // 苛立ち最大値を更新。
  stats.maxAnger = chars.reduce((max, c) => Math.max(max, c.anger), 0)

  // ミス数・スコアを stats に反映。
  stats.misses += missCount
  stats.score += scoreGain

  return { scoreGain, missCount }
}

// ---------------------------------------------------------------------------
// 便器割当 (#12 + #14)
// ---------------------------------------------------------------------------

/**
 * 指定便器にキャラを割り当て、心理スコアリングを実施する。
 * QUEUING 先頭のキャラを使用。
 * 割当できた場合 true を返す。
 */
export function assignToUrinal(
  chars: Char[],
  urinals: Urinal[],
  stats: GameStats,
  urinalId: number
): boolean {
  const urinal = urinals.find(u => u.id === urinalId)
  if (!urinal || urinal.state !== 'EMPTY') return false

  const queueChars = chars.filter(c => c.state === 'QUEUING')
  if (queueChars.length === 0) return false

  // DRUNK は最前列ではなくランダムに選ぶ。
  let char: Char
  const drunks = queueChars.filter(c => c.type === 'DRUNK')
  if (drunks.length > 0 && Math.random() < 0.5) {
    char = drunks[Math.floor(Math.random() * drunks.length)]
  } else {
    char = queueChars[0]
  }

  char.state = 'APPROACHING'
  char.assignedUrinalId = urinalId
  char.targetX = urinal.x
  char.targetY = urinal.y - urinal.height / 2 - 16
  urinal.state = 'OCCUPIED'
  urinal.occupantId = char.id

  // 心理スコアリング。
  const { scoreDelta, rules } = evaluateAssignment(urinalId, urinals)
  stats.score += scoreDelta
  stats.appliedRules.push(...rules)

  return true
}

// ---------------------------------------------------------------------------
// 便器生成
// ---------------------------------------------------------------------------

/** 便器4基を下部横並びで生成。 */
export function createUrinals(viewH: number): Urinal[] {
  const count = 4
  const uW = 44
  const uH = 60
  const gap = 12
  const totalW = count * uW + (count - 1) * gap
  const startX = -totalW / 2 + uW / 2
  const y = viewH / 2 - 80 - uH / 2

  return Array.from({ length: count }, (_, i) => ({
    id: i,
    x: startX + i * (uW + gap),
    y,
    width: uW,
    height: uH,
    state: 'EMPTY' as const,
    occupantId: null,
  }))
}

// ---------------------------------------------------------------------------
// キャラ生成 (#16 バリエーション)
// ---------------------------------------------------------------------------

let nextCharId = 0

/** 入口位置 (PlayScene ローカル、中央原点)。左上。 */
export const ENTRANCE_X = -160
export const ENTRANCE_Y = -260

/**
 * 経過時間に応じた客タイプ抽選 (時間経過でバリエーション増加)。
 * @param elapsedMs ゲーム経過時間 (ms)。
 */
function pickCharType(
  elapsedMs: number,
  difficulty: Difficulty = 'NORMAL'
): CharType {
  const r = Math.random()
  if (difficulty === 'HARD') {
    // HARD: 序盤から RUSHER/DRUNK が登場し、終盤は高確率。
    if (elapsedMs < 10000) {
      return r < 0.3 ? 'RUSHER' : 'NORMAL'
    } else if (elapsedMs < 25000) {
      if (r < 0.25) return 'RUSHER'
      if (r < 0.35) return 'DRUNK'
      return 'NORMAL'
    } else {
      if (r < 0.25) return 'RUSHER'
      if (r < 0.4) return 'GROUP'
      if (r < 0.55) return 'DRUNK'
      return 'NORMAL'
    }
  }
  // NORMAL。
  if (elapsedMs < 20000) {
    // 序盤: NORMAL のみ。
    return 'NORMAL'
  } else if (elapsedMs < 40000) {
    // 中盤: RUSHER 登場。
    return r < 0.25 ? 'RUSHER' : 'NORMAL'
  } else {
    // 終盤: 全バリエーション。
    if (r < 0.15) return 'RUSHER'
    if (r < 0.25) return 'GROUP'
    if (r < 0.35) return 'DRUNK'
    return 'NORMAL'
  }
}

/** 新規キャラを入口に生成。 */
export function spawnChar(
  elapsedMs: number = 0,
  difficulty: Difficulty = 'NORMAL'
): Char {
  const id = nextCharId++
  const type = pickCharType(elapsedMs, difficulty)
  const params = CHAR_PARAMS[type]
  const [dMin, dMax] = params.useDuration
  const useDuration = dMin + Math.random() * (dMax - dMin)
  return {
    id,
    type,
    x: ENTRANCE_X,
    y: ENTRANCE_Y,
    targetX: QUEUE_X,
    targetY: QUEUE_HEAD_Y,
    state: 'ENTERING',
    assignedUrinalId: null,
    useTimeRemaining: useDuration,
    anger: 0,
    angerRate: params.angerRate,
    speedMult: params.speedMult,
    quitByMiss: false,
  }
}

/** nextCharId リセット (テスト用)。 */
export function resetCharIdCounter(): void {
  nextCharId = 0
}

/** 初期 GameStats を生成。 */
export function createGameStats(): GameStats {
  return {
    elapsed: 0,
    score: 0,
    misses: 0,
    maxAnger: 0,
    appliedRules: [],
  }
}
