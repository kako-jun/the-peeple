/**
 * localStorage の薄いラッパー。テスト時にモック差し込み可能にする。
 * localStorage が使えない環境（SSR / プライベートモード）でも落ちない。
 */

export interface IStorageAdapter {
  getItem(key: string): string | null
  setItem(key: string, value: string): void
}

export class LocalStorageAdapter implements IStorageAdapter {
  getItem(key: string): string | null {
    try {
      return localStorage.getItem(key)
    } catch {
      return null
    }
  }

  setItem(key: string, value: string): void {
    try {
      localStorage.setItem(key, value)
    } catch {
      // 無視（プライベートモード等）
    }
  }
}
