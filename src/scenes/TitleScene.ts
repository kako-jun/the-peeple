/**
 * タイトル画面 (the-peeple テンプレ初期版)。
 *
 * - 中央に「The Peeple」 (タイトル) + 副題「Stand Off」
 * - 下に 1 つのグラスボタン: 「スタート」
 * - キーボード Enter / Space / 1 で開始
 *
 * グラスボタンの見た目は amanuma の DESIGN.md 準拠 (Violet 半透明 + 1px 枠線 + 角丸 8px)。
 * hover 時は枠線色を Cyan に切り替え、塗り alpha を上げる。
 */
import { Container, Graphics, Text } from 'pixi.js'
import type { KeyboardCommand, KeyboardManager } from '../input/KeyboardManager'
import { UI_PRIMARY, UI_SECONDARY, UI_TEXT_PRIMARY } from '../constants/colors'
import type { SoundManager } from '../audio/SoundManager'

export type TitleAction = 'start'

/** ボタン 1 個分の幅・高さ。タッチ最小 48px を超える。 */
const BUTTON_WIDTH = 220
const BUTTON_HEIGHT = 56
const BUTTON_RADIUS = 8

/** ロゴ・副題のレイアウト基点 (TitleScene ローカル座標で「中心」)。 */
const LOGO_OFFSET_Y = -140
const SUBTITLE_OFFSET_Y = -56
const BUTTON_OFFSET_Y = 40

interface ButtonEntry {
  action: TitleAction
  label: string
  graphics: Graphics
  text: Text
  centerX: number
  centerY: number
  hovered: boolean
}

export class TitleScene extends Container {
  private readonly buttons: ButtonEntry[] = []
  private readonly onSelect: (action: TitleAction) => void
  private readonly soundManager: SoundManager | null

  constructor(
    onSelect: (action: TitleAction) => void,
    soundManager: SoundManager | null = null
  ) {
    super()
    this.onSelect = onSelect
    this.soundManager = soundManager

    // ロゴ (タイトル)。
    const logo = new Text({
      text: 'The Peeple',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 48,
        fontWeight: '700',
        fill: UI_TEXT_PRIMARY,
        align: 'center',
      },
    })
    logo.anchor.set(0.5)
    logo.x = 0
    logo.y = LOGO_OFFSET_Y
    this.addChild(logo)

    // 副題。
    const subtitle = new Text({
      text: 'Stand Off',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 18,
        fontWeight: '400',
        fill: UI_TEXT_PRIMARY,
        align: 'center',
      },
    })
    subtitle.anchor.set(0.5)
    subtitle.alpha = 0.7
    subtitle.x = 0
    subtitle.y = SUBTITLE_OFFSET_Y
    this.addChild(subtitle)

    // スタートボタン (1 個だけ)。
    this.addButton('start', 'スタート', 0, BUTTON_OFFSET_Y)

    this.eventMode = 'static'
    this.cursor = 'default'
  }

  /**
   * KeyboardManager のコマンドを subscribe する。
   * 戻り値は unsubscribe。
   */
  attachInputs(keyboard: KeyboardManager): () => void {
    const handler = (cmd: KeyboardCommand): void => {
      switch (cmd) {
        case 'confirm':
        case 'select1':
          this.fireSelect('start')
          break
        default:
          break
      }
    }
    return keyboard.onCommand(handler)
  }

  /** 共通: ui-select 音 + 上位通知。 */
  private fireSelect(action: TitleAction): void {
    this.soundManager?.playSfx('ui-select')
    this.onSelect(action)
  }

  private addButton(
    action: TitleAction,
    label: string,
    cx: number,
    cy: number
  ): void {
    const g = new Graphics()
    g.eventMode = 'static'
    g.cursor = 'pointer'

    const text = new Text({
      text: label,
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 16,
        fontWeight: '600',
        fill: UI_TEXT_PRIMARY,
        align: 'center',
      },
    })
    text.anchor.set(0.5)
    text.x = cx
    text.y = cy

    const entry: ButtonEntry = {
      action,
      label,
      graphics: g,
      text,
      centerX: cx,
      centerY: cy,
      hovered: false,
    }
    this.buttons.push(entry)
    this.addChild(g)
    this.addChild(text)
    this.drawButton(entry)

    g.on('pointerover', () => {
      entry.hovered = true
      this.drawButton(entry)
    })
    g.on('pointerout', () => {
      entry.hovered = false
      this.drawButton(entry)
    })
    g.on('pointertap', () => {
      this.fireSelect(entry.action)
    })
  }

  private drawButton(entry: ButtonEntry): void {
    const { graphics: g, centerX, centerY, hovered } = entry
    const x = centerX - BUTTON_WIDTH / 2
    const y = centerY - BUTTON_HEIGHT / 2
    const fillAlpha = hovered ? 0.35 : 0.2
    const borderAlpha = hovered ? 0.9 : 0.5
    const borderColor = hovered ? UI_SECONDARY : UI_PRIMARY
    g.clear()
    g.roundRect(x, y, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS)
      .fill({ color: UI_PRIMARY, alpha: fillAlpha })
      .stroke({ color: borderColor, width: 1, alpha: borderAlpha })
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    super.destroy(options ?? { children: true })
  }
}
