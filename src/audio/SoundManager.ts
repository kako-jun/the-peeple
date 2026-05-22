/**
 * サウンドマネージャ (Issue #22, #28)。
 *
 * WebAudio API の手続き型音響 (synth.ts) で SFX/BGM を生成する。
 * 外部ファイル (.mp3/.ogg) は不要。
 */

import {
  playSfxAssign,
  playSfxMiss,
  playSfxGameover,
  playSfxClear,
  playSfxUiSelect,
  startBgmPlay,
  stopBgmPlay,
} from './synth'

export type SfxKey =
  | 'sfx-assign' // 便器タップ・誘導成功
  | 'sfx-miss' // ミス（怒り満タン / 行列パンク）
  | 'sfx-gameover' // ゲームオーバー
  | 'sfx-clear' // タイム終了（クリア）
  | 'ui-select' // UI 選択

export type BgmKey = 'bgm-play' | 'bgm-title'

export interface SoundManagerOptions {
  /** 初期ミュート (loadPersisted で上書きされる)。 */
  muted?: boolean
}

/** localStorage キー。 */
const STORAGE_KEY = 'the_peeple_muted'

export class SoundManager {
  private muted: boolean
  /** Safari/iOS のオートプレイ解除用。 */
  private ctx: AudioContext | null = null
  private currentBgmKey: BgmKey | null = null
  /** ミュート切替や永続化リスナー (UI 表示更新用)。 */
  private readonly muteListeners: Set<(muted: boolean) => void> = new Set()

  constructor(opts: SoundManagerOptions = {}) {
    this.muted = opts.muted ?? false
  }

  /**
   * 初回ユーザー操作 (pointerdown / keydown) で呼ぶ。
   * - `AudioContext` を作って `resume()` する (オートプレイ解除)。
   * - 既に作成済みなら no-op。
   *
   * SFX/BGM 自体は HTMLAudioElement 経由なので AudioContext は厳密には
   * 必要ない。ただし「ユーザー操作直後」というフラグを作っておくと、
   * 続く HTMLAudio.play() も許可される (主にモバイル Safari 対策)。
   */
  unlock(): void {
    if (this.ctx !== null) return
    try {
      const Ctor =
        typeof window !== 'undefined'
          ? ((
              window as typeof window & {
                AudioContext?: typeof AudioContext
                webkitAudioContext?: typeof AudioContext
              }
            ).AudioContext ??
            (
              window as typeof window & {
                webkitAudioContext?: typeof AudioContext
              }
            ).webkitAudioContext)
          : undefined
      if (Ctor !== undefined) {
        this.ctx = new Ctor()
        // resume は Promise だが、await 不要 (失敗時の処理は無し)。
        const r = this.ctx.resume()
        if (r && typeof r.then === 'function') {
          r.catch(() => {
            /* 失敗しても致命的ではないので無視 */
          })
        }
      }
    } catch {
      // AudioContext 作成失敗。SFX/BGM は HTMLAudio で動くので致命的ではない。
      this.ctx = null
    }
    // unlock 直後に BGM を再開する（ミュートでない場合）。
    if (!this.muted && this.currentBgmKey === 'bgm-play') {
      this.synthBgmPlay()
    }
  }

  // ----------------------------------------------------------------------
  // SFX
  // ----------------------------------------------------------------------

  /**
   * 単発の効果音を再生する。
   * - ミュート時は何もしない。
   * - ファイル未配置 (404) や再生失敗は黙って無視する。
   * - 毎回 `new Audio()` するので複数同時再生も可。
   */
  playSfx(key: SfxKey): void {
    if (this.muted) return
    this.synthSfx(key)
  }

  /** Web Audio API で SFX を直接生成する。 */
  private synthSfx(key: SfxKey): void {
    switch (key) {
      case 'sfx-assign':
        playSfxAssign()
        break
      case 'sfx-miss':
        playSfxMiss()
        break
      case 'sfx-gameover':
        playSfxGameover()
        break
      case 'sfx-clear':
        playSfxClear()
        break
      case 'ui-select':
        playSfxUiSelect()
        break
    }
  }

  // ----------------------------------------------------------------------
  // BGM
  // ----------------------------------------------------------------------

  playBgm(key: BgmKey, _opts: { loop?: boolean; fadeMs?: number } = {}): void {
    if (this.muted) return
    if (this.currentBgmKey === key) return
    // 前の BGM を停止。
    this.synthBgmStop()
    this.currentBgmKey = key
    if (key === 'bgm-play') {
      this.synthBgmPlay()
    }
    // bgm-title は no-op。
  }

  /** bgm-play 手続き型ループを開始する（内部用）。 */
  private synthBgmPlay(): void {
    startBgmPlay()
  }

  /** bgm-play 手続き型ループを停止する（内部用）。 */
  private synthBgmStop(): void {
    stopBgmPlay()
  }

  /** 現在の BGM を止める。fadeMs は互換性のために受け取るが現在は無視。 */
  stopBgm(_fadeMs: number = 0): void {
    this.synthBgmStop()
    this.currentBgmKey = null
  }

  /** 現在再生中の BGM キー (デバッグ・テスト用)。 */
  getCurrentBgmKey(): BgmKey | null {
    return this.currentBgmKey
  }

  // ----------------------------------------------------------------------
  // ミュート / 永続化
  // ----------------------------------------------------------------------

  setMuted(muted: boolean): void {
    if (this.muted === muted) return
    this.muted = muted
    if (muted) {
      this.synthBgmStop()
    } else if (this.currentBgmKey === 'bgm-play') {
      this.synthBgmPlay()
    }
    this.persist()
    for (const l of [...this.muteListeners]) l(muted)
  }

  isMuted(): boolean {
    return this.muted
  }

  toggleMute(): void {
    this.setMuted(!this.muted)
  }

  /** ミュート切替の通知を受け取る (MuteButton 等の UI 用)。 */
  onMuteChange(listener: (muted: boolean) => void): () => void {
    this.muteListeners.add(listener)
    return () => {
      this.muteListeners.delete(listener)
    }
  }

  /**
   * localStorage からミュート状態を復元する。
   * localStorage 自体が無い環境 (SSR, テスト, プライベートモード) では no-op。
   */
  loadPersisted(): void {
    try {
      if (typeof localStorage === 'undefined') return
      const v = localStorage.getItem(STORAGE_KEY)
      if (v === '1') this.muted = true
      else if (v === '0') this.muted = false
    } catch {
      /* SecurityError 等は無視 */
    }
  }

  /** 現在のミュート状態を localStorage に保存する。 */
  persist(): void {
    try {
      if (typeof localStorage === 'undefined') return
      localStorage.setItem(STORAGE_KEY, this.muted ? '1' : '0')
    } catch {
      /* QuotaExceededError 等は無視 */
    }
  }

  // ----------------------------------------------------------------------
  // 内部ヘルパ
  // ----------------------------------------------------------------------

  /**
   * SoundManager のリソースを解放する (N19)。
   *
   * - 進行中の cross-fade interval を停止
   * - 現在の BGM を pause し、`src` を空にして参照を解除
   * - mute listener を全クリア
   * - AudioContext を close する (失敗は無視)
   *
   * 本 SPA では `bootstrap` の `sound` インスタンスを使い回すため、main.ts 側で
   * destroy を呼ぶ必要は無い。ホットリロードや将来のテスト・組込みシナリオで
   * SoundManager を安全に破棄するための API として用意する。
   */
  destroy(): void {
    this.synthBgmStop()
    this.currentBgmKey = null
    this.muteListeners.clear()
    if (this.ctx !== null) {
      try {
        void this.ctx.close()
      } catch {
        /* 無視 */
      }
      this.ctx = null
    }
  }
}
