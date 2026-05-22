/**
 * the-peeple ゲームロジック (Issues #11, #12)。
 *
 * 純粋関数として設計し、描画から完全分離する。
 * `update(state, deltaMS)` が毎フレーム呼ばれ、新しい state を返す。
 */
import type { Char, CharState, Urinal } from './types'

/** キャラ移動速度 px/ms。 */
const WALK_SPEED = 0.08

/** キャラが目標に到着したと見なす距離 (px)。 */
const ARRIVE_DIST = 4

/** 中央待機列の X 座標 (PlayScene ローカル、中央原点ベース)。 */
export const QUEUE_X = 0

/** 中央待機列の先頭 Y 座標。上から並ぶ。 */
export const QUEUE_HEAD_Y = -40

/** 待機列の縦間隔。 */
export const QUEUE_SPACING = 40

/** 2点間距離。 */
function dist(ax: number, ay: number, bx: number, by: number): number {
  const dx = bx - ax
  const dy = by - ay
  return Math.sqrt(dx * dx + dy * dy)
}

/** キャラを目標方向へ deltaMS 分だけ進める。到着したら true を返す。 */
function moveToward(char: Char, deltaMS: number): boolean {
  const d = dist(char.x, char.y, char.targetX, char.targetY)
  if (d <= ARRIVE_DIST) {
    char.x = char.targetX
    char.y = char.targetY
    return true
  }
  const step = WALK_SPEED * deltaMS
  const ratio = Math.min(step / d, 1)
  char.x += (char.targetX - char.x) * ratio
  char.y += (char.targetY - char.y) * ratio
  return d - step <= ARRIVE_DIST
}

/** 待機列の位置を計算する (index 番目のキャラの座標)。 */
export function queuePosition(index: number): { x: number; y: number } {
  return {
    x: QUEUE_X,
    y: QUEUE_HEAD_Y - index * QUEUE_SPACING,
  }
}

/**
 * ゲーム状態を 1 フレーム進める。
 * - chars / urinals を直接変更して返す (mutable update)。
 * @returns スコア加算分 (この frame で退室完了したキャラ数)。
 */
export function updateGame(
  chars: Char[],
  urinals: Urinal[],
  deltaMS: number
): number {
  let scoreGain = 0

  // 待機列インデックスを再計算 (QUEUING 状態のキャラを順序維持で並べる)。
  const queueChars = chars.filter(c => c.state === 'QUEUING')

  // 各キャラを処理。
  for (const char of chars) {
    switch (char.state as CharState) {
      case 'WALKING_TO_QUEUE': {
        const arrived = moveToward(char, deltaMS)
        if (arrived) {
          char.state = 'QUEUING'
          // 待機列の末尾に追加。
          const idx = queueChars.length
          queueChars.push(char)
          const pos = queuePosition(idx)
          char.targetX = pos.x
          char.targetY = pos.y
          char.x = pos.x
          char.y = pos.y
        }
        break
      }
      case 'QUEUING': {
        // 待機列内で目標位置に向かってゆっくり詰める。
        moveToward(char, deltaMS)
        break
      }
      case 'WALKING_TO_URINAL': {
        const arrived = moveToward(char, deltaMS)
        if (arrived && char.assignedUrinalId !== null) {
          char.state = 'USING'
          char.useTimeRemaining = 5000 + Math.random() * 5000 // 5〜10秒
        }
        break
      }
      case 'USING': {
        char.useTimeRemaining -= deltaMS
        if (char.useTimeRemaining <= 0) {
          // 使い終わり → 退室。
          char.state = 'WALKING_OUT'
          char.targetX = -300 // 画面左外 (入口と逆方向)
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
      case 'WALKING_OUT': {
        moveToward(char, deltaMS)
        if (char.x <= -260) {
          scoreGain++
        }
        break
      }
    }
  }

  // 退室完了キャラを削除。
  const toRemove = chars.filter(c => c.state === 'WALKING_OUT' && c.x <= -260)
  for (const c of toRemove) {
    const idx = chars.indexOf(c)
    if (idx >= 0) chars.splice(idx, 1)
  }

  // 待機列の目標座標を最新インデックスで更新。
  const updatedQueue = chars.filter(c => c.state === 'QUEUING')
  updatedQueue.forEach((c, i) => {
    const pos = queuePosition(i)
    c.targetX = pos.x
    c.targetY = pos.y
  })

  return scoreGain
}

/**
 * 指定便器にキャラを割り当てる。
 * QUEUING 先頭のキャラを使用。
 * 割当できた場合 true を返す。
 */
export function assignToUrinal(
  chars: Char[],
  urinals: Urinal[],
  urinalId: number
): boolean {
  const urinal = urinals.find(u => u.id === urinalId)
  if (!urinal || urinal.state !== 'EMPTY') return false

  const queueChars = chars.filter(c => c.state === 'QUEUING')
  if (queueChars.length === 0) return false

  const char = queueChars[0] // 先頭
  char.state = 'WALKING_TO_URINAL'
  char.assignedUrinalId = urinalId
  char.targetX = urinal.x
  char.targetY = urinal.y - urinal.height / 2 - 16 // 便器の手前
  urinal.state = 'OCCUPIED'
  urinal.occupantId = char.id

  return true
}

/** 初期 Urinal 配列を生成する。
 * 座標は PlayScene ローカル (中央原点)。
 * 縦長画面 (360×640) の下部に4基横並び。
 */
export function createUrinals(_viewW: number, viewH: number): Urinal[] {
  const count = 4
  const uW = 44
  const uH = 60
  const gap = 12
  const totalW = count * uW + (count - 1) * gap
  const startX = -totalW / 2 + uW / 2
  // 中央原点ベースでの Y (下方向が +)。画面下部に配置。
  const bottomY = viewH / 2 - 80
  const y = bottomY - uH / 2

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

let nextCharId = 0

/** 入口位置 (PlayScene ローカル、中央原点)。左上。 */
export const ENTRANCE_X = -160
export const ENTRANCE_Y = -260

/** 入口から中央待機列への中間地点 Y (一旦この Y まで下りてから列に合流)。 */
export const QUEUE_GATHER_Y = QUEUE_HEAD_Y

/** 新規キャラを入口に生成。 */
export function spawnChar(): Char {
  const id = nextCharId++
  return {
    id,
    x: ENTRANCE_X,
    y: ENTRANCE_Y,
    targetX: QUEUE_X,
    targetY: QUEUE_GATHER_Y,
    state: 'WALKING_TO_QUEUE',
    assignedUrinalId: null,
    useTimeRemaining: 0,
  }
}

/** nextCharId リセット (テスト用)。 */
export function resetCharIdCounter(): void {
  nextCharId = 0
}
