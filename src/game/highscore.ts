import type { IStorageAdapter } from './StorageAdapter'

export const HIGHSCORE_KEY = 'the_peeple_highscore'

export function loadHighscore(storage: IStorageAdapter): number {
  const raw = storage.getItem(HIGHSCORE_KEY)
  if (raw === null) return 0
  const n = parseInt(raw, 10)
  return isNaN(n) ? 0 : n
}

export function saveHighscore(storage: IStorageAdapter, score: number): void {
  storage.setItem(HIGHSCORE_KEY, String(score))
}

export function isNewRecord(storage: IStorageAdapter, score: number): boolean {
  return score > loadHighscore(storage)
}
