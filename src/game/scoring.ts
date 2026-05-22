/**
 * 心理スコアリングルール (Issue #14)。
 *
 * 便器割当時にルールを判定し、スコア加算と AppliedRule 記録を返す。
 */
import type { AppliedRule, RuleId, Urinal } from './types'

/** ルール定義テーブル。 */
const RULES: Record<RuleId, { score: number; description: string }> = {
  END_URINAL: {
    score: 10,
    description: '端の便器を選んだ: +10',
  },
  NEIGHBOR_EMPTY: {
    score: 5,
    description: '隣を1つ空けて使用: +5',
  },
  NO_NEIGHBOR: {
    score: 20,
    description: '完全に隣がいない状態: +20',
  },
  SAME_COLUMN_TABOO: {
    score: -15,
    description: '隣に人がいる状態に誘導: -15',
  },
  FORCED_ADJACENT: {
    score: 0,
    description: '選択肢なし (隣接は仕方ない): ±0',
  },
}

/**
 * 便器割当時にルールを判定し、スコア差分と適用ルールリストを返す。
 *
 * @param urinalId  割り当てる便器 ID
 * @param urinals   全便器リスト
 * @returns { scoreDelta, rules }
 */
export function evaluateAssignment(
  urinalId: number,
  urinals: Urinal[]
): { scoreDelta: number; rules: AppliedRule[] } {
  const applied: AppliedRule[] = []
  let total = 0

  const target = urinals.find(u => u.id === urinalId)
  if (!target) return { scoreDelta: 0, rules: [] }

  // 隣接便器 (左右1つ) を取得。
  const left = urinals.find(u => u.id === urinalId - 1)
  const right = urinals.find(u => u.id === urinalId + 1)
  const leftOccupied = left?.state === 'OCCUPIED'
  const rightOccupied = right?.state === 'OCCUPIED'
  const hasLeft = left !== undefined
  const hasRight = right !== undefined

  // 端の便器判定 (左端 or 右端)。
  const isEnd = !hasLeft || !hasRight
  if (isEnd) {
    const r = applyRule('END_URINAL', urinalId)
    applied.push(r)
    total += r.scoreDelta
  }

  // 強制隣接判定: 両隣が全部埋まっている場合はペナルティなし。
  const forcedAdjacent = hasLeft && leftOccupied && hasRight && rightOccupied
  if (forcedAdjacent) {
    const r = applyRule('FORCED_ADJACENT', urinalId)
    applied.push(r)
    total += r.scoreDelta
    return { scoreDelta: total, rules: applied }
  }

  // 隣が誰もいない状態。
  const noNeighbor = !leftOccupied && !rightOccupied
  if (noNeighbor) {
    const r = applyRule('NO_NEIGHBOR', urinalId)
    applied.push(r)
    total += r.scoreDelta
  } else {
    // 片方だけ空いている = 隣1つ空けた。
    const oneNeighborEmpty =
      (leftOccupied && !rightOccupied) || (!leftOccupied && rightOccupied)
    if (oneNeighborEmpty) {
      const r = applyRule('NEIGHBOR_EMPTY', urinalId)
      applied.push(r)
      total += r.scoreDelta
    }
    // 同列タブー: 直接隣に人がいる。
    if (leftOccupied || rightOccupied) {
      const r = applyRule('SAME_COLUMN_TABOO', urinalId)
      applied.push(r)
      total += r.scoreDelta
    }
  }

  return { scoreDelta: total, rules: applied }
}

function applyRule(ruleId: RuleId, urinalId: number): AppliedRule {
  const def = RULES[ruleId]
  return {
    ruleId,
    urinalId,
    scoreDelta: def.score,
    description: def.description,
  }
}
