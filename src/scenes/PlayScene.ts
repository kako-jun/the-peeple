/**
 * プレイ画面 (elevator-gurl テンプレ初期版)。
 *
 * Issue #10 ではゲームロジックは実装せず、シーン枠のみを置く。
 * - 中央に「Play (実装はこれから)」のテキストだけ表示する
 * - `attachInputs(keyboard, touch, onExit)` で Esc / cancel ジェスチャを購読し、
 *   呼ばれたら `onExit()` を発火 (= タイトルへ戻す)
 *
 * 後続 Issue (#11 以降) でゲームロジックをここに実装していく。
 */
import { Container, Text } from 'pixi.js'
import type { KeyboardCommand, KeyboardManager } from '../input/KeyboardManager'
import type { TouchManager } from '../input/TouchManager'
import { UI_TEXT_PRIMARY } from '../constants/colors'

export class PlayScene extends Container {
  constructor() {
    super()

    const placeholder = new Text({
      text: 'Play (実装はこれから)',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 24,
        fontWeight: '600',
        fill: UI_TEXT_PRIMARY,
        align: 'center',
      },
    })
    placeholder.anchor.set(0.5)
    placeholder.x = 0
    placeholder.y = 0
    this.addChild(placeholder)
  }

  /**
   * KeyboardManager / TouchManager を購読し、`Esc` (キーボード) で `onExit` を呼ぶ。
   *
   * TouchManager 側にも `cancel` 相当のジェスチャは無いため、現状は keyboard のみ
   * 監視する。touch はシグネチャ互換のために受け取るが将来の拡張用 (stub)。
   *
   * 戻り値は unsubscribe。
   */
  attachInputs(
    keyboard: KeyboardManager,
    _touch: TouchManager,
    onExit: () => void
  ): () => void {
    const handler = (cmd: KeyboardCommand): void => {
      if (cmd === 'cancel') {
        onExit()
      }
    }
    return keyboard.onCommand(handler)
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    super.destroy(options ?? { children: true })
  }
}
