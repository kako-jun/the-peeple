/**
 * URL クエリパラメータを解析してデバッグ用シーン直接起動を支援する (Issue #30)。
 */

/** `scene` パラメータの有効値。 */
const VALID_SCENES = ['play', 'result', 'lineRush'] as const
export type DebugScene = (typeof VALID_SCENES)[number]

/** `difficulty` パラメータの有効値 (大文字小文字どちらも受け付ける)。 */
const VALID_DIFFICULTIES = ['NORMAL', 'HARD'] as const
export type DebugDifficulty = (typeof VALID_DIFFICULTIES)[number]

export interface UrlQueryResult {
  scene: DebugScene | null
  difficulty: DebugDifficulty | null
}

/**
 * `window.location.search` を読み取り、有効な scene / difficulty を返す。
 * 無効な値は null として扱う。ブラウザ専用（SSR / Node 環境では空結果を返す）。
 */
export function parseUrlQuery(): UrlQueryResult {
  if (typeof window === 'undefined') return { scene: null, difficulty: null }
  const params = new URLSearchParams(window.location.search)

  const rawScene = params.get('scene')
  const scene: DebugScene | null =
    rawScene !== null && (VALID_SCENES as readonly string[]).includes(rawScene)
      ? (rawScene as DebugScene)
      : null

  const rawDifficulty = params.get('difficulty')
  const normalized = rawDifficulty !== null ? rawDifficulty.toUpperCase() : null
  const difficulty: DebugDifficulty | null =
    normalized !== null &&
    (VALID_DIFFICULTIES as readonly string[]).includes(normalized)
      ? (normalized as DebugDifficulty)
      : null

  return { scene, difficulty }
}
