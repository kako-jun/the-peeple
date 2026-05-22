/**
 * プレイ画面 (Issues #11-#16, #18)。
 *
 * ## レイアウト (360×640、PixiJS ローカル座標: 中央 = 0,0)
 *
 * - 左上 (-160, -260) に入口。
 * - キャラが入口 → 中央待機列 (0, -40) へ歩く。
 * - プレイヤーが便器をタップ → 先頭キャラを誘導。
 * - 便器は下部に4基横並び。
 * - 上部に HUD (時間 / スコア / ミス / 苛立ちゲージ)。
 * - ミスが MAX_MISSES に達したらゲームオーバー。
 *
 * ## 客タイプ別の色
 * - NORMAL  : 水色系の青 (CHAR_NORMAL)
 * - RUSHER  : オレンジ、白背景に映える (CHAR_RUSHER)
 * - GROUP   : 緑 (CHAR_GROUP)
 * - DRUNK   : 紫 (CHAR_DRUNK)
 */
import { Container, Graphics, Text } from 'pixi.js'
import type { KeyboardCommand, KeyboardManager } from '../input/KeyboardManager'
import type { TouchManager } from '../input/TouchManager'
import {
  UI_TEXT_PRIMARY,
  UI_TEXT_DIM,
  UI_TEXT_ON_DARK,
  GLOSS_HIGHLIGHT,
  URINAL_BODY,
  URINAL_OCCUPIED,
  URINAL_EMPTY_BORDER,
  URINAL_TAP_LABEL,
  CHAR_NORMAL,
  CHAR_RUSHER,
  CHAR_GROUP,
  CHAR_DRUNK,
  CHAR_OUTLINE,
  CHAR_USING,
  CHAR_LEAVING,
  ANGER_LOW,
  ANGER_MID,
  ANGER_HIGH,
  ANGER_BG,
  ENTRANCE_COLOR,
  ENTRANCE_BORDER,
  QUEUE_LINE,
} from '../constants/colors'
import type { Char, Difficulty, GameStats, Urinal } from '../game/types'
import {
  createUrinals,
  spawnChar,
  updateGame,
  assignToUrinal,
  createGameStats,
  ENTRANCE_X,
  ENTRANCE_Y,
} from '../game/logic'

// ---------------------------------------------------------------------------
// 定数
// ---------------------------------------------------------------------------

const VIEW_H = 640

/** NORMAL 難易度のスポーン間隔 (ms)。テスト用に export。 */
export const SPAWN_INTERVAL_NORMAL = 3000
/** HARD 難易度のスポーン間隔 (ms)。テスト用に export。 */
export const SPAWN_INTERVAL_HARD = 1800

/** ゲームオーバーになるミス数。 */
const MAX_MISSES = 5

/** ゲーム時間 (ms)。0 = 無制限。 */
const GAME_DURATION_MS = 90000 // 90秒

/** 入口アイコンのサイズ。 */
const ENTRANCE_W = 40
const ENTRANCE_H = 28

/** キャラ描画半径。 */
const CHAR_R = 10

/** 客タイプ別の色。 */
const CHAR_COLORS: Record<string, number> = {
  NORMAL: CHAR_NORMAL,
  RUSHER: CHAR_RUSHER,
  GROUP: CHAR_GROUP,
  DRUNK: CHAR_DRUNK,
}

// ---------------------------------------------------------------------------
// 内部型
// ---------------------------------------------------------------------------

interface UrinalEntry {
  id: number
  gfx: Graphics
  label: Text
}

interface CharEntry {
  id: number
  gfx: Graphics
  angerBar: Graphics
}

// ---------------------------------------------------------------------------
// PlayScene
// ---------------------------------------------------------------------------

export class PlayScene extends Container {
  private readonly urinals: Urinal[]
  private readonly chars: Char[] = []
  private stats: GameStats

  private readonly difficulty: Difficulty
  private readonly spawnIntervalMs: number

  private readonly urinalGfxMap = new Map<number, UrinalEntry>()
  private readonly charGfxMap = new Map<number, CharEntry>()

  private readonly urinalLayer: Container
  private readonly charLayer: Container
  private readonly hudLayer: Container

  private spawnAccum = 0

  // HUD テキスト。
  private hudTimeText!: Text
  private hudScoreText!: Text
  private hudMissText!: Text
  private hudAngerBar!: Graphics
  private hudAngerLabel!: Text

  /** ゲームオーバー / 時間切れ時に呼ばれるコールバック。 */
  private onGameOver: ((stats: GameStats) => void) | null = null

  private gameEnded = false

  constructor(difficulty: Difficulty = 'NORMAL') {
    super()

    this.difficulty = difficulty
    this.spawnIntervalMs =
      difficulty === 'HARD' ? SPAWN_INTERVAL_HARD : SPAWN_INTERVAL_NORMAL

    this.stats = createGameStats()

    this.urinalLayer = new Container()
    this.charLayer = new Container()
    this.hudLayer = new Container()
    this.addChild(this.urinalLayer)
    this.addChild(this.charLayer)
    this.addChild(this.hudLayer)

    this.urinals = createUrinals(VIEW_H)
    this.buildUrinalGraphics()
    this.buildEntrance()
    this.buildQueueMarker()
    this.buildHud()
  }

  // -------------------------------------------------------------------------
  // 公開 API
  // -------------------------------------------------------------------------

  /** 現在の難易度でのスポーン間隔 (ms)。テスト用。 */
  getSpawnIntervalMs(): number {
    return this.spawnIntervalMs
  }

  /** ゲームオーバー時に呼ぶコールバックを登録。 */
  setOnGameOver(cb: (stats: GameStats) => void): void {
    this.onGameOver = cb
  }

  /** 最終 stats を取得 (Result 画面用)。 */
  getStats(): GameStats {
    return this.stats
  }

  /**
   * ゲームをリセットして最初から始める。
   *
   * @deprecated difficulty が変わる場合は `destroy()` 後に新しい `PlayScene` を生成すること。
   * 同一 difficulty で再スタートする場合のみ使用可。
   */
  reset(): void {
    this.chars.length = 0
    this.stats = createGameStats()
    this.spawnAccum = 0
    this.gameEnded = false
    // 便器をすべて EMPTY に。
    for (const u of this.urinals) {
      u.state = 'EMPTY'
      u.occupantId = null
    }
    // charGfxMap をクリア。
    for (const entry of this.charGfxMap.values()) {
      entry.gfx.destroy()
      entry.angerBar.destroy()
    }
    this.charGfxMap.clear()
  }

  // -------------------------------------------------------------------------
  // 構築ヘルパー
  // -------------------------------------------------------------------------

  private buildUrinalGraphics(): void {
    for (const u of this.urinals) {
      const gfx = new Graphics()
      gfx.eventMode = 'static'
      gfx.cursor = 'pointer'
      gfx.on('pointerdown', () => {
        if (this.gameEnded) return
        assignToUrinal(this.chars, this.urinals, this.stats, u.id)
      })
      this.urinalLayer.addChild(gfx)

      const label = new Text({
        text: '',
        style: {
          fontFamily: 'Inter, system-ui, sans-serif',
          fontSize: 10,
          fill: UI_TEXT_PRIMARY,
          align: 'center',
        },
      })
      label.anchor.set(0.5)
      this.urinalLayer.addChild(label)

      this.urinalGfxMap.set(u.id, { id: u.id, gfx, label })
      this.redrawUrinal(u)
    }
  }

  private redrawUrinal(u: Urinal): void {
    const entry = this.urinalGfxMap.get(u.id)
    if (!entry) return
    const { gfx, label } = entry

    const occupied = u.state === 'OCCUPIED'
    const color = occupied ? URINAL_OCCUPIED : URINAL_BODY
    const fillAlpha = occupied ? 0.9 : 0.95
    const strokeColor = occupied ? GLOSS_HIGHLIGHT : URINAL_EMPTY_BORDER
    const strokeAlpha = occupied ? 0.5 : 0.7

    gfx.clear()
    gfx
      .roundRect(u.x - u.width / 2, u.y - u.height / 2, u.width, u.height, 6)
      .fill({ color, alpha: fillAlpha })
      .stroke({ color: strokeColor, width: 1.5, alpha: strokeAlpha })

    label.x = u.x
    label.y = u.y + u.height / 2 + 10
    label.text = u.state === 'EMPTY' ? 'タップ' : ''
    label.style.fill = URINAL_TAP_LABEL
  }

  private buildEntrance(): void {
    const gfx = new Graphics()
    gfx
      .roundRect(
        ENTRANCE_X - ENTRANCE_W / 2,
        ENTRANCE_Y - ENTRANCE_H / 2,
        ENTRANCE_W,
        ENTRANCE_H,
        4
      )
      .fill({ color: ENTRANCE_COLOR, alpha: 0.9 })
      .stroke({ color: ENTRANCE_BORDER, width: 1, alpha: 0.6 })
    this.addChild(gfx)

    const label = new Text({
      text: '入口',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fill: UI_TEXT_ON_DARK,
        align: 'center',
      },
    })
    label.anchor.set(0.5)
    label.x = ENTRANCE_X
    label.y = ENTRANCE_Y
    this.addChild(label)
  }

  private buildQueueMarker(): void {
    const gfx = new Graphics()
    const x = 0
    const yTop = -180
    const yBottom = -40
    const dashLen = 6
    const dashGap = 8
    for (let y = yTop; y < yBottom; y += dashLen + dashGap) {
      gfx.moveTo(x, y).lineTo(x, Math.min(y + dashLen, yBottom))
      gfx.stroke({ color: QUEUE_LINE, width: 1, alpha: 0.4 })
    }
    this.addChild(gfx)

    const qLabel = new Text({
      text: '待機',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 10,
        fill: UI_TEXT_DIM,
        align: 'center',
      },
    })
    qLabel.anchor.set(0.5)
    qLabel.x = 28
    qLabel.y = -110
    this.addChild(qLabel)
  }

  /** HUD: 画面上部に時間 / スコア / ミス + 苛立ちゲージ。 */
  private buildHud(): void {
    const TOP = -VIEW_H / 2 + 8
    const textStyle = {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 14,
      fontWeight: '600' as const,
      fill: UI_TEXT_PRIMARY,
    }

    // 時間 (左)。
    this.hudTimeText = new Text({ text: '90s', style: textStyle })
    this.hudTimeText.anchor.set(0, 0)
    this.hudTimeText.x = -170
    this.hudTimeText.y = TOP
    this.hudLayer.addChild(this.hudTimeText)

    // スコア (中央)。
    this.hudScoreText = new Text({
      text: 'SCORE: 0',
      style: { ...textStyle, fontSize: 16 },
    })
    this.hudScoreText.anchor.set(0.5, 0)
    this.hudScoreText.x = 0
    this.hudScoreText.y = TOP
    this.hudLayer.addChild(this.hudScoreText)

    // ミス (右)。
    this.hudMissText = new Text({
      text: `MISS: 0/${MAX_MISSES}`,
      style: textStyle,
    })
    this.hudMissText.anchor.set(1, 0)
    this.hudMissText.x = 170
    this.hudMissText.y = TOP
    this.hudLayer.addChild(this.hudMissText)

    // 苛立ちゲージ背景。
    const bgBar = new Graphics()
    bgBar
      .roundRect(-80, TOP + 24, 160, 8, 4)
      .fill({ color: ANGER_BG, alpha: 0.8 })
    this.hudLayer.addChild(bgBar)

    // 苛立ちゲージ本体 (毎フレーム更新)。
    this.hudAngerBar = new Graphics()
    this.hudLayer.addChild(this.hudAngerBar)

    // 苛立ちラベル。
    this.hudAngerLabel = new Text({
      text: '苛立ち',
      style: { ...textStyle, fontSize: 10, fill: UI_TEXT_DIM },
    })
    this.hudAngerLabel.anchor.set(0, 0)
    this.hudAngerLabel.x = -80
    this.hudAngerLabel.y = TOP + 34
    this.hudLayer.addChild(this.hudAngerLabel)
  }

  private updateHud(): void {
    // 残り時間。
    const remaining = Math.max(0, GAME_DURATION_MS - this.stats.elapsed)
    const sec = Math.ceil(remaining / 1000)
    this.hudTimeText.text = `${sec}s`

    // スコア。
    this.hudScoreText.text = `SCORE: ${this.stats.score}`

    // ミス。
    this.hudMissText.text = `MISS: ${this.stats.misses}/${MAX_MISSES}`
    this.hudMissText.style.fill =
      this.stats.misses >= MAX_MISSES - 1 ? ANGER_HIGH : UI_TEXT_PRIMARY

    // 苛立ちゲージ。
    const angerRatio = Math.min(1, this.stats.maxAnger / 100)
    const barW = Math.round(160 * angerRatio)
    const angerColor =
      angerRatio > 0.8 ? ANGER_HIGH : angerRatio > 0.5 ? ANGER_MID : ANGER_LOW
    const TOP = -VIEW_H / 2 + 8
    this.hudAngerBar.clear()
    if (barW > 0) {
      this.hudAngerBar
        .roundRect(-80, TOP + 24, barW, 8, 4)
        .fill({ color: angerColor, alpha: 0.9 })
    }
  }

  // -------------------------------------------------------------------------
  // キャラ描画
  // -------------------------------------------------------------------------

  private getOrCreateCharEntry(char: Char): CharEntry {
    let entry = this.charGfxMap.get(char.id)
    if (!entry) {
      const gfx = new Graphics()
      const angerBar = new Graphics()
      this.charLayer.addChild(gfx)
      this.charLayer.addChild(angerBar)
      entry = { id: char.id, gfx, angerBar }
      this.charGfxMap.set(char.id, entry)
    }
    return entry
  }

  private syncCharGraphics(): void {
    const aliveIds = new Set(this.chars.map(c => c.id))

    for (const char of this.chars) {
      const entry = this.getOrCreateCharEntry(char)
      const { gfx, angerBar } = entry

      // キャラ本体。
      const baseColor = CHAR_COLORS[char.type] ?? CHAR_NORMAL
      const color =
        char.state === 'USING'
          ? CHAR_USING
          : char.state === 'LEAVING'
            ? CHAR_LEAVING
            : baseColor
      gfx.clear()
      gfx
        .circle(char.x, char.y, CHAR_R)
        .fill({ color, alpha: 0.9 })
        .stroke({ color: CHAR_OUTLINE, width: 1.5, alpha: 0.7 })

      // 客タイプのイニシャル。
      // (テキストを毎フレーム生成するのは重いので Graphics のみとし文字省略)

      // 苛立ちゲージ (キャラ頭上の小さいバー)。
      angerBar.clear()
      if (char.state === 'QUEUING' && char.anger > 0) {
        const barW = CHAR_R * 2
        const ratio = char.anger / 100
        const bColor =
          ratio > 0.8 ? ANGER_HIGH : ratio > 0.5 ? ANGER_MID : ANGER_LOW
        angerBar
          .rect(
            char.x - CHAR_R,
            char.y - CHAR_R - 5,
            Math.round(barW * ratio),
            3
          )
          .fill({ color: bColor, alpha: 0.9 })
      }
    }

    // 退室済みキャラの gfx を削除。
    for (const [id, entry] of this.charGfxMap) {
      if (!aliveIds.has(id)) {
        entry.gfx.destroy()
        entry.angerBar.destroy()
        this.charGfxMap.delete(id)
      }
    }
  }

  // -------------------------------------------------------------------------
  // 更新 (Ticker から呼ぶ)
  // -------------------------------------------------------------------------

  update(deltaMS: number): void {
    if (this.gameEnded) return

    // スポーン。
    this.spawnAccum += deltaMS
    if (this.spawnAccum >= this.spawnIntervalMs) {
      this.spawnAccum -= this.spawnIntervalMs
      this.chars.push(spawnChar(this.stats.elapsed, this.difficulty))
    }

    // ゲームロジック更新。
    updateGame(this.chars, this.urinals, this.stats, deltaMS)

    // ゲームオーバー判定。
    const timeUp =
      GAME_DURATION_MS > 0 && this.stats.elapsed >= GAME_DURATION_MS
    const missOut = this.stats.misses >= MAX_MISSES
    if (timeUp || missOut) {
      this.gameEnded = true
      this.onGameOver?.(this.stats)
    }

    // 描画同期。
    this.syncCharGraphics()
    for (const u of this.urinals) {
      this.redrawUrinal(u)
    }
    this.updateHud()
  }

  // -------------------------------------------------------------------------
  // 入力
  // -------------------------------------------------------------------------

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
