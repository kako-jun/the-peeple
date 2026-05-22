/**
 * PlayScene のユニットテスト (Issues #11, #12)。
 *
 * jsdom 環境では PixiJS Graphics が動かないため、
 * `attachInputs` のコマンドハンドリングのみ検証する。
 * ゲームロジック自体は src/game/logic.test.ts で検証する。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { PlayScene } from './PlayScene'
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
