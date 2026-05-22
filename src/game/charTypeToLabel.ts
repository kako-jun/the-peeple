/**
 * 客タイプ → 表示ラベル文字への変換 (Issue #26)。
 * UI に表示する 1〜2 文字のイニシャルを返す純粋関数。
 */
import type { CharType } from './types'

/**
 * 客タイプに対応する表示ラベルを返す。
 * - NORMAL : `N`
 * - RUSHER : `R!`
 * - GROUP  : `G`
 * - DRUNK  : `?`
 */
export function charTypeToLabel(type: CharType): string {
  switch (type) {
    case 'NORMAL':
      return 'N'
    case 'RUSHER':
      return 'R!'
    case 'GROUP':
      return 'G'
    case 'DRUNK':
      return '?'
  }
}
