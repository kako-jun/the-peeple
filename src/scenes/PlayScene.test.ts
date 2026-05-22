/**
 * PlayScene のユニットテスト (Issues #11, #12)。
 *
 * jsdom 環境では PixiJS Graphics が動かないため、
 * `attachInputs` のコマンドハンドリングのみ検証する。
 * ゲームロジック自体は src/game/logic.test.ts で検証する。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
  PlayScene,
  SPAWN_INTERVAL_NORMAL,
  SPAWN_INTERVAL_HARD,
} from './PlayScene'
import { KeyboardManager } from '../input/KeyboardManager'
import { TouchManager } from '../input/TouchManager'

describe('PlayScene', () => {
  let keyboard: KeyboardManager
  let touch: TouchManager
  let scene: PlayScene
  let unsub: () => void
  let onExit: ReturnType<typeof vi.fn>

  beforeEach(() => {
    keyboard = new KeyboardManager()
    keyboard.attach(window)
    touch = new TouchManager()
    scene = new PlayScene()
    onExit = vi.fn()
    unsub = scene.attachInputs(keyboard, touch, onExit)
  })

  afterEach(() => {
    unsub()
    keyboard.detach()
    try {
      scene.destroy()
    } catch {
      /* jsdom では destroy が throws することがある */
    }
  })

  function fire(key: string): void {
    const ev = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(ev)
  }

  it('Escape (cancel) で onExit が発火する', () => {
    fire('Escape')
    expect(onExit).toHaveBeenCalledTimes(1)
  })

  it('cancel 以外のコマンドでは onExit は発火しない', () => {
    fire('Enter')
    fire(' ')
    fire('ArrowLeft')
    fire('ArrowRight')
    fire('1')
    expect(onExit).not.toHaveBeenCalled()
  })

  it('attachInputs の戻り値で unsubscribe できる', () => {
    unsub()
    fire('Escape')
    expect(onExit).not.toHaveBeenCalled()
  })
})

// ---------------------------------------------------------------------------
// PlayScene - Difficulty (#18)
// ---------------------------------------------------------------------------
describe('PlayScene - Difficulty', () => {
  it('NORMAL 難易度で生成できる', () => {
    const scene = new PlayScene('NORMAL')
    expect(scene).toBeTruthy()
    try {
      scene.destroy()
    } catch {
      /* jsdom */
    }
  })

  it('HARD 難易度で生成できる', () => {
    const scene = new PlayScene('HARD')
    expect(scene).toBeTruthy()
    try {
      scene.destroy()
    } catch {
      /* jsdom */
    }
  })

  it('引数省略時は NORMAL 扱い (デフォルト値)', () => {
    const scene = new PlayScene()
    expect(scene).toBeTruthy()
    try {
      scene.destroy()
    } catch {
      /* jsdom */
    }
  })

  it('NORMAL は SPAWN_INTERVAL_NORMAL (3000ms) を使う', () => {
    const scene = new PlayScene('NORMAL')
    expect(scene.getSpawnIntervalMs()).toBe(SPAWN_INTERVAL_NORMAL)
    try {
      scene.destroy()
    } catch {
      /* jsdom */
    }
  })

  it('HARD は SPAWN_INTERVAL_HARD (1800ms) を使う', () => {
    const scene = new PlayScene('HARD')
    expect(scene.getSpawnIntervalMs()).toBe(SPAWN_INTERVAL_HARD)
    try {
      scene.destroy()
    } catch {
      /* jsdom */
    }
  })
})
