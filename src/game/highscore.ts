import type { StorageAdapter } from './StorageAdapter'

export const HIGHSCORE_KEY = 'the_peeple_highscore'

export function loadHighscore(storage: StorageAdapter): number {
  const raw = storage.getItem(HIGHSCORE_KEY)
  if (raw === null) return 0
  const n = parseInt(raw, 10)
  return isNaN(n) ? 0 : n
}

export function saveHighscore(storage: StorageAdapter, score: number): void {
  storage.setItem(HIGHSCORE_KEY, String(score))
}

export function isNewRecord(storage: StorageAdapter, score: number): boolean {
  return score > loadHighscore(storage)
}
