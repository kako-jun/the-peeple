/**
 * the-peeple ゲーム共通型定義 (Issues #11, #12)。
 */

/** 便器の状態。 */
export type UrinalState = 'EMPTY' | 'OCCUPIED'

/** 便器1基の定義。 */
export interface Urinal {
  id: number
  /** PlayScene ローカル座標 (中央原点)。 */
  x: number
  y: number
  width: number
  height: number
  state: UrinalState
  /** 現在使用中の CharId (OCCUPIED/FINISHING 時)。 */
  occupantId: number | null
}

/** キャラクターの状態。 */
export type CharState =
  | 'WALKING_TO_QUEUE' // 入口 → 中央待機列へ
  | 'QUEUING' // 待機列で並んでいる
  | 'WALKING_TO_URINAL' // 待機列 → 便器へ
  | 'USING' // 使用中
  | 'WALKING_OUT' // 退室 (画面外へ)

/** キャラクター1人の定義。 */
export interface Char {
  id: number
  x: number
  y: number
  /** 目標座標 (移動中)。 */
  targetX: number
  targetY: number
  state: CharState
  /** 使用中 / 割当済みの便器 ID (WALKING_TO_URINAL / USING 時)。 */
  assignedUrinalId: number | null
  /** 用を足す残り時間 (ms)。USING 状態でのみカウント。 */
  useTimeRemaining: number
}
