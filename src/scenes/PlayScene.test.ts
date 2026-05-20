/**
 * PlayScene のユニットテスト (Issue #11)。
 *
 * jsdom + KeyboardEvent ベースで「Esc (cancel コマンド) で onExit が発火する」ことを検証する。
 * Graphics 描画自体は jsdom では動かないが、PIXI.Container を継承する構造と
 * `attachInputs(keyboard, touch, onExit)` のコマンドハンドリングは確認できる。
 *
 * amanuma 側 `src/scenes/TitleScene.test.ts` のスタイルを踏襲。
 */
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { Container } from 'pixi.js'
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
    if (!scene.destroyed) scene.destroy()
  })

  function fire(key: string): void {
    const ev = new KeyboardEvent('keydown', {
      key,
      bubbles: true,
      cancelable: true,
    })
    window.dispatchEvent(ev)
  }

  it('Container を継承している', () => {
    expect(scene).toBeInstanceOf(Container)
  })

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
