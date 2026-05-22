/**
 * Line Rush シーン (Issue #19 stub)。
 *
 * 女子トイレ行列版のプレースホルダー。
 * 仕様は Issue #19 にてコメントで詰める。
 *
 * ## 現状の表示
 * - 「LINE RUSH」タイトル
 * - 「Coming Soon」メッセージ
 * - 「← タイトルに戻る」ボタン (Esc / Enter)
 */
import { Container, Graphics, Text } from 'pixi.js'
import type { KeyboardCommand, KeyboardManager } from '../input/KeyboardManager'
import { UI_PRIMARY, UI_SECONDARY, UI_TEXT_PRIMARY } from '../constants/colors'
import type { SoundManager } from '../audio/SoundManager'

const BUTTON_W = 220
const BUTTON_H = 52
const RADIUS = 8

interface LineRushSceneOptions {
  onTitle: () => void
  soundManager?: SoundManager | null
}

export class LineRushScene extends Container {
  private readonly onTitle: () => void
  private readonly soundManager: SoundManager | null

  private btnGfx!: Graphics
  private btnHovered = false

  constructor(options: LineRushSceneOptions) {
    super()
    this.onTitle = options.onTitle
    this.soundManager = options.soundManager ?? null
    this.buildUI()
    this.eventMode = 'static'
  }

  // -------------------------------------------------------------------------
  // 構築
  // -------------------------------------------------------------------------

  private buildUI(): void {
    // タイトル。
    const title = new Text({
      text: 'LINE RUSH',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 40,
        fontWeight: '700',
        fill: UI_TEXT_PRIMARY,
        align: 'center',
      },
    })
    title.anchor.set(0.5)
    title.x = 0
    title.y = -160
    this.addChild(title)

    // Coming Soon。
    const msg = new Text({
      text: 'Coming Soon',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 20,
        fontWeight: '400',
        fill: UI_TEXT_PRIMARY,
        align: 'center',
      },
    })
    msg.anchor.set(0.5)
    msg.alpha = 0.6
    msg.x = 0
    msg.y = -80
    this.addChild(msg)

    // 説明文。
    const desc = new Text({
      text: '女子が小を我慢するゲーム\n複数行列のうちどれに並ぶか選ぶ\n隣の人が出てきそうかを読む',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 13,
        fontWeight: '400',
        fill: UI_TEXT_PRIMARY,
        align: 'center',
        lineHeight: 22,
      },
    })
    desc.anchor.set(0.5)
    desc.alpha = 0.4
    desc.x = 0
    desc.y = 20
    this.addChild(desc)

    // タイトルに戻るボタン。
    this.btnGfx = new Graphics()
    this.btnGfx.eventMode = 'static'
    this.btnGfx.cursor = 'pointer'
    this.btnGfx.on('pointerover', () => {
      this.btnHovered = true
      this.drawBtn()
    })
    this.btnGfx.on('pointerout', () => {
      this.btnHovered = false
      this.drawBtn()
    })
    this.btnGfx.on('pointertap', () => {
      this.goTitle()
    })
    this.addChild(this.btnGfx)

    const btnText = new Text({
      text: '← タイトルに戻る',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 14,
        fontWeight: '600',
        fill: UI_TEXT_PRIMARY,
        align: 'center',
      },
    })
    btnText.anchor.set(0.5)
    btnText.x = 0
    btnText.y = 120
    this.addChild(btnText)

    this.drawBtn()
  }

  private drawBtn(): void {
    const g = this.btnGfx
    const x = -BUTTON_W / 2
    const y = 120 - BUTTON_H / 2
    const fillAlpha = this.btnHovered ? 0.3 : 0.15
    const borderColor = this.btnHovered ? UI_SECONDARY : UI_PRIMARY
    const borderAlpha = this.btnHovered ? 0.85 : 0.45
    g.clear()
    g.roundRect(x, y, BUTTON_W, BUTTON_H, RADIUS)
      .fill({ color: UI_PRIMARY, alpha: fillAlpha })
      .stroke({ color: borderColor, width: 1, alpha: borderAlpha })
  }

  // -------------------------------------------------------------------------
  // 入力
  // -------------------------------------------------------------------------

  attachInputs(keyboard: KeyboardManager): () => void {
    const handler = (cmd: KeyboardCommand): void => {
      if (cmd === 'cancel' || cmd === 'confirm') {
        this.goTitle()
      }
    }
    return keyboard.onCommand(handler)
  }

  // -------------------------------------------------------------------------
  // 更新 (Ticker から呼ばれるが stub では何もしない)
  // -------------------------------------------------------------------------

  update(_deltaMS: number): void {
    // stub
  }

  // -------------------------------------------------------------------------
  // アクション
  // -------------------------------------------------------------------------

  private goTitle(): void {
    this.soundManager?.playSfx('ui-select')
    this.onTitle()
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    super.destroy(options ?? { children: true })
  }
}
