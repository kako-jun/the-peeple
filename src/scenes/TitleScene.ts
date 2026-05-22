/**
 * タイトル画面 (Issue #18)。
 *
 * ## レイアウト (360×640、PixiJS ローカル座標: 中央 = 0,0)
 *
 * - 上部  : 「The Peeple」ロゴ
 * - 中段  : モード選択 (Stand Off / Line Rush) 2 ボタン横並び
 * - 下段  : 難易度選択 (NORMAL / HARD) 2 ボタン横並び
 * - 最下部: スタートボタン
 *
 * ## 選択状態の視覚フィードバック
 * - 選択中ボタン: fillAlpha 0.35 + Cyan 枠線 (UI_SECONDARY)
 * - 非選択 hover : fillAlpha 0.6  + Cyan 枠線 (UI_SECONDARY)
 * - 非選択 通常  : fillAlpha 0.4  + Primary 枠線 (UI_PRIMARY)
 * - Coming Soon  : fillAlpha 0.15 + グレーアウト + ポインタ不可
 */
import { Container, Graphics, Text } from 'pixi.js'
import type { KeyboardCommand, KeyboardManager } from '../input/KeyboardManager'
import {
  UI_PRIMARY,
  UI_SECONDARY,
  UI_TEXT_PRIMARY,
  UI_TEXT_DIM,
  GLASS_FILL,
  GLASS_FILL_ALPHA,
  GLASS_BORDER_ALPHA,
} from '../constants/colors'
import type { SoundManager } from '../audio/SoundManager'
import type { Difficulty, GameMode } from '../game/types'

// ---------------------------------------------------------------------------
// 公開型
// ---------------------------------------------------------------------------

export interface TitleSelection {
  mode: GameMode
  difficulty: Difficulty
}

// ---------------------------------------------------------------------------
// ボタン定数
// ---------------------------------------------------------------------------

const START_BTN_W = 144
const START_BTN_H = 52
const RADIUS = 8

/** 選択トグルボタン1つの幅 (モード/難易度行)。 */
const TOGGLE_W = 140
const TOGGLE_H = 48

/** セクションラベル。 */
const LABEL_STYLE = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 11,
  fontWeight: '500' as const,
  fill: UI_TEXT_DIM as number,
  align: 'center' as const,
}

const BUTTON_STYLE = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 14,
  fontWeight: '600' as const,
  fill: UI_TEXT_PRIMARY as number,
  align: 'center' as const,
}

const START_STYLE = {
  fontFamily: 'Inter, system-ui, sans-serif',
  fontSize: 16,
  fontWeight: '700' as const,
  fill: UI_TEXT_PRIMARY as number,
  align: 'center' as const,
}

// Y オフセット基準。
const LOGO_Y = -200
const SUBTITLE_Y = -150
const MODE_LABEL_Y = -100
const MODE_BTN_Y = -68
const DIFF_LABEL_Y = -8
const DIFF_BTN_Y = 28
const START_BTN_Y = 104

// ---------------------------------------------------------------------------
// 内部型
// ---------------------------------------------------------------------------

interface ToggleEntry<T extends string> {
  value: T
  label: string
  cx: number
  cy: number
  graphics: Graphics
  text: Text
  hovered: boolean
  disabled: boolean
}

interface StartEntry {
  graphics: Graphics
  text: Text
  hovered: boolean
}

// ---------------------------------------------------------------------------
// TitleScene
// ---------------------------------------------------------------------------

export class TitleScene extends Container {
  private selectedMode: GameMode = 'STAND_OFF'
  private selectedDiff: Difficulty = 'NORMAL'

  private modeEntries: ToggleEntry<GameMode>[] = []
  private diffEntries: ToggleEntry<Difficulty>[] = []
  private startEntry!: StartEntry
  private subtitleText!: Text

  private readonly onStart: (sel: TitleSelection) => void
  private readonly soundManager: SoundManager | null

  constructor(
    onStart: (sel: TitleSelection) => void,
    soundManager: SoundManager | null = null
  ) {
    super()
    this.onStart = onStart
    this.soundManager = soundManager

    this.buildLogo()
    this.buildModeSection()
    this.buildDifficultySection()
    this.buildStartButton()

    this.eventMode = 'static'
    this.cursor = 'default'
  }

  // -------------------------------------------------------------------------
  // 入力
  // -------------------------------------------------------------------------

  attachInputs(keyboard: KeyboardManager): () => void {
    const handler = (cmd: KeyboardCommand): void => {
      switch (cmd) {
        case 'confirm':
        case 'select1':
          this.fireStart()
          break
        default:
          break
      }
    }
    return keyboard.onCommand(handler)
  }

  // -------------------------------------------------------------------------
  // 構築ヘルパー
  // -------------------------------------------------------------------------

  private buildLogo(): void {
    const logo = new Text({
      text: 'The Peeple',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 44,
        fontWeight: '700',
        fill: UI_TEXT_PRIMARY,
        align: 'center',
      },
    })
    logo.anchor.set(0.5)
    logo.x = 0
    logo.y = LOGO_Y
    this.addChild(logo)

    const subtitle = new Text({
      text: 'Stand Off',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 16,
        fontWeight: '400',
        fill: UI_TEXT_PRIMARY,
        align: 'center',
      },
    })
    subtitle.anchor.set(0.5)
    subtitle.alpha = 0.5
    subtitle.x = 0
    subtitle.y = SUBTITLE_Y
    this.subtitleText = subtitle
    this.addChild(subtitle)
  }

  private buildModeSection(): void {
    const label = new Text({ text: 'モード', style: LABEL_STYLE })
    label.anchor.set(0.5)
    label.x = 0
    label.y = MODE_LABEL_Y
    this.addChild(label)

    const modes: { value: GameMode; label: string; disabled: boolean }[] = [
      { value: 'STAND_OFF', label: 'Stand Off', disabled: false },
      { value: 'LINE_RUSH', label: 'Line Rush\n(coming soon)', disabled: true },
    ]

    const spacing = TOGGLE_W + 12
    modes.forEach((m, i) => {
      const cx = (i - 0.5) * spacing
      const entry = this.makeToggleEntry<GameMode>(
        m.value,
        m.label,
        cx,
        MODE_BTN_Y,
        m.disabled,
        v => {
          this.selectedMode = v
          // 副題をモードに合わせて更新。
          const labels: Record<GameMode, string> = {
            STAND_OFF: 'Stand Off',
            LINE_RUSH: 'Line Rush',
          }
          this.subtitleText.text = labels[v]
        }
      )
      this.modeEntries.push(entry)
      this.addChild(entry.graphics)
      this.addChild(entry.text)
      this.drawToggle(entry, this.selectedMode === m.value)
    })
  }

  private buildDifficultySection(): void {
    const label = new Text({ text: '難易度', style: LABEL_STYLE })
    label.anchor.set(0.5)
    label.x = 0
    label.y = DIFF_LABEL_Y
    this.addChild(label)

    const diffs: { value: Difficulty; label: string }[] = [
      { value: 'NORMAL', label: 'NORMAL' },
      { value: 'HARD', label: 'HARD' },
    ]

    const spacing = TOGGLE_W + 12
    diffs.forEach((d, i) => {
      const cx = (i - 0.5) * spacing
      const entry = this.makeToggleEntry<Difficulty>(
        d.value,
        d.label,
        cx,
        DIFF_BTN_Y,
        false,
        v => {
          this.selectedDiff = v
        }
      )
      this.diffEntries.push(entry)
      this.addChild(entry.graphics)
      this.addChild(entry.text)
      this.drawToggle(entry, this.selectedDiff === d.value)
    })
  }

  private makeToggleEntry<T extends string>(
    value: T,
    label: string,
    cx: number,
    cy: number,
    disabled: boolean,
    onSelect: (value: T) => void
  ): ToggleEntry<T> {
    const g = new Graphics()
    if (!disabled) {
      g.eventMode = 'static'
      g.cursor = 'pointer'
    }

    const t = new Text({
      text: label,
      style: {
        ...BUTTON_STYLE,
        fill: disabled ? (UI_TEXT_DIM as number) : UI_TEXT_PRIMARY,
      },
    })
    t.anchor.set(0.5)
    t.x = cx
    t.y = cy

    const entry: ToggleEntry<T> = {
      value,
      label,
      cx,
      cy,
      graphics: g,
      text: t,
      hovered: false,
      disabled,
    }

    if (!disabled) {
      g.on('pointerover', () => {
        entry.hovered = true
        this.refreshToggleGroup()
      })
      g.on('pointerout', () => {
        entry.hovered = false
        this.refreshToggleGroup()
      })
      g.on('pointertap', () => {
        this.soundManager?.playSfx('ui-select')
        onSelect(value)
        this.refreshToggleGroup()
      })
    }

    return entry
  }

  private buildStartButton(): void {
    const g = new Graphics()
    g.eventMode = 'static'
    g.cursor = 'pointer'

    const t = new Text({ text: 'スタート', style: START_STYLE })
    t.anchor.set(0.5)
    t.x = 0
    t.y = START_BTN_Y

    const entry: StartEntry = { graphics: g, text: t, hovered: false }
    this.startEntry = entry

    g.on('pointerover', () => {
      entry.hovered = true
      this.drawStartButton()
    })
    g.on('pointerout', () => {
      entry.hovered = false
      this.drawStartButton()
    })
    g.on('pointertap', () => {
      this.fireStart()
    })

    this.addChild(g)
    this.addChild(t)
    this.drawStartButton()
  }

  // -------------------------------------------------------------------------
  // 描画ヘルパー
  // -------------------------------------------------------------------------

  private drawToggle<T extends string>(
    entry: ToggleEntry<T>,
    selected: boolean
  ): void {
    const { graphics: g, cx, cy, disabled } = entry
    const x = cx - TOGGLE_W / 2
    const y = cy - TOGGLE_H / 2

    const fillAlpha = disabled
      ? 0.15
      : selected
        ? 0.35
        : entry.hovered
          ? 0.6
          : 0.4
    const borderColor = disabled
      ? UI_TEXT_DIM
      : selected
        ? UI_SECONDARY
        : entry.hovered
          ? UI_SECONDARY
          : UI_PRIMARY
    const borderAlpha = disabled
      ? 0.3
      : selected
        ? 1.0
        : entry.hovered
          ? 0.8
          : 0.45

    g.clear()
    g.roundRect(x, y, TOGGLE_W, TOGGLE_H, RADIUS)
      .fill({
        color: selected && !disabled ? UI_SECONDARY : GLASS_FILL,
        alpha: fillAlpha,
      })
      .stroke({
        color: borderColor,
        width: selected ? 2 : 1,
        alpha: borderAlpha,
      })
  }

  private drawStartButton(): void {
    const { graphics: g, hovered } = this.startEntry
    const x = -START_BTN_W / 2
    const y = START_BTN_Y - START_BTN_H / 2
    const fillAlpha = hovered ? GLASS_FILL_ALPHA : 0.45
    const borderAlpha = hovered ? GLASS_BORDER_ALPHA : 0.6
    const borderColor = hovered ? UI_SECONDARY : UI_PRIMARY
    g.clear()
    g.roundRect(x, y, START_BTN_W, START_BTN_H, RADIUS)
      .fill({ color: GLASS_FILL, alpha: fillAlpha })
      .stroke({
        color: borderColor,
        width: hovered ? 2 : 1,
        alpha: borderAlpha,
      })
  }

  private refreshToggleGroup(): void {
    for (const e of this.modeEntries) {
      this.drawToggle(e, this.selectedMode === e.value)
    }
    for (const e of this.diffEntries) {
      this.drawToggle(e, this.selectedDiff === e.value)
    }
  }

  // -------------------------------------------------------------------------
  // アクション
  // -------------------------------------------------------------------------

  private fireStart(): void {
    this.soundManager?.playSfx('ui-select')
    this.onStart({ mode: this.selectedMode, difficulty: this.selectedDiff })
  }

  // -------------------------------------------------------------------------
  // Getters (テスト用)
  // -------------------------------------------------------------------------

  getSelectedMode(): GameMode {
    return this.selectedMode
  }

  getSelectedDifficulty(): Difficulty {
    return this.selectedDiff
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    super.destroy(options ?? { children: true })
  }
}
