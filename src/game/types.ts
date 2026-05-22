/**
 * the-peeple ゲーム共通型定義 (Issues #11-#17)。
 */

// ---------------------------------------------------------------------------
// 便器
// ---------------------------------------------------------------------------

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
  /** 現在使用中の CharId。 */
  occupantId: number | null
}

// ---------------------------------------------------------------------------
// キャラクター
// ---------------------------------------------------------------------------

/**
 * 客タイプ。
 * - NORMAL    : 普通の客。
 * - RUSHER    : 急ぎ客。待ち時間が短く、歩くのが速い。
 * - GROUP     : 団体客 (2人セット)。隣同士を嫌がらない。
 *               TODO: scoring.ts の隣接ペナルティ免除は未実装 (#16 follow-up)。
 * - DRUNK     : 酔っぱらい。ランダムな便器へ突撃しようとする。
 */
export type CharType = 'NORMAL' | 'RUSHER' | 'GROUP' | 'DRUNK'

/**
 * キャラクターの状態。
 * Issue #13 の仕様に合わせて細分化。
 *   ENTERING          : 入口に出現〜中央待機列へ向かう (旧 WALKING_TO_QUEUE)
 *   QUEUING           : 待機列で並んでいる
 *   APPROACHING       : 割当便器へ向かう (旧 WALKING_TO_URINAL)
 *   USING             : 使用中
 *   LEAVING           : 退室中 (旧 WALKING_OUT)
 */
export type CharState =
  | 'ENTERING' // 入口 → 中央待機列
  | 'QUEUING' // 待機列待機
  | 'APPROACHING' // 割当便器へ移動
  | 'USING' // 使用中
  | 'LEAVING' // 退室中 (画面外へ)

/** キャラクター1人の定義。 */
export interface Char {
  id: number
  type: CharType
  x: number
  y: number
  /** 目標座標 (移動中)。 */
  targetX: number
  targetY: number
  state: CharState
  /** 割当済みの便器 ID。 */
  assignedUrinalId: number | null
  /** 用を足す残り時間 (ms)。USING 状態でのみカウント。 */
  useTimeRemaining: number
  /**
   * 苛立ちゲージ (0〜100)。QUEUING 中に時間が経つほど増加。
   * 100 になるとミス扱いで強制退場。
   */
  anger: number
  /** 待機時の苛立ち上昇速度 (anger/ms)。タイプ別に異なる。 */
  angerRate: number
  /** 移動速度倍率 (1.0 = 標準)。 */
  speedMult: number
  /**
   * ミス扱いで退場したかどうか。
   * true = anger 満タン退場 or 行列パンク退場 → スコア加算なし。
   * false = 正常に用を足して退場 → スコア加算あり。
   */
  quitByMiss: boolean
}

// ---------------------------------------------------------------------------
// 心理スコアリングルール (#14)
// ---------------------------------------------------------------------------

/** ルール ID。 */
export type RuleId =
  | 'END_URINAL' // 端の便器を使用 (+)
  | 'NEIGHBOR_EMPTY' // 隣を1つ空けた (+)
  | 'NO_NEIGHBOR' // 隣が全員いない状態 (++)
  | 'SAME_COLUMN_TABOO' // 隣に人がいる (-)
  | 'FORCED_ADJACENT' // 両隣が埋まっていて選択肢なし (+-0: ペナルティなし)

/** 適用されたルールの記録。 */
export interface AppliedRule {
  ruleId: RuleId
  urinalId: number
  scoreDelta: number
  /** 日本語説明 (Result 画面用)。 */
  description: string
}

// ---------------------------------------------------------------------------
// ゲーム状態サマリ (#15 HUD / #17 Result)
// ---------------------------------------------------------------------------

export interface GameStats {
  /** 経過時間 (ms)。 */
  elapsed: number
  /** スコア合計。 */
  score: number
  /** ミス数 (anger 満タン退場 + 行列パンク)。 */
  misses: number
  /** 苛立ち最大値 (= max anger across all current chars)。 */
  maxAnger: number
  /** 適用されたルール履歴。 */
  appliedRules: AppliedRule[]
}
