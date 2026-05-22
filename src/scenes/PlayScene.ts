/**
 * プレイ画面 (Issues #11, #12)。
 *
 * ## レイアウト (360×640、PixiJS ローカル座標: 中央 = 0,0)
 *
 * - 左上 (-160, -260) に入口。
 * - キャラが入口 → 中央待機列 (0, -40) へ歩く。
 * - プレイヤーが便器をタップ → 先頭キャラを誘導。
 * - 便器は下部に4基横並び。
 *
 * ## 入力
 * - キーボード Esc → ギブアップ (onExit)。
 * - Pixi の pointerdown (便器タップ) → assignToUrinal。
 */
import { Container, Graphics, Text } from 'pixi.js'
import type { KeyboardCommand, KeyboardManager } from '../input/KeyboardManager'
import type { TouchManager } from '../input/TouchManager'
import { UI_TEXT_PRIMARY } from '../constants/colors'
import type { Char, Urinal } from '../game/types'
import {
  createUrinals,
  spawnChar,
  updateGame,
  assignToUrinal,
  ENTRANCE_X,
  ENTRANCE_Y,
} from '../game/logic'

// --- レイアウト定数 ---
const VIEW_H = 640

/** キャラスポーン間隔 (ms)。 */
const SPAWN_INTERVAL_MS = 3000

/** 便器の色。 */
const URINAL_COLOR_EMPTY = 0x4a9eff
const URINAL_COLOR_OCCUPIED = 0xe74c3c

/** 入口アイコンのサイズ。 */
const ENTRANCE_W = 40
const ENTRANCE_H = 28

/** キャラ描画半径。 */
const CHAR_R = 10

interface UrinalGraphics {
  id: number
  gfx: Graphics
  label: Text
}

interface CharGraphics {
  id: number
  gfx: Graphics
}

export class PlayScene extends Container {
  private readonly urinals: Urinal[]
  private readonly chars: Char[] = []

  private readonly urinalGfxMap = new Map<number, UrinalGraphics>()
  private readonly charGfxMap = new Map<number, CharGraphics>()

  private readonly urinalLayer: Container
  private readonly charLayer: Container
  private readonly hudLayer: Container

  private spawnAccum = 0
  private score = 0
  private scoreText!: Text

  constructor() {
    super()

    this.urinalLayer = new Container()
    this.charLayer = new Container()
    this.hudLayer = new Container()
    this.addChild(this.urinalLayer)
    this.addChild(this.charLayer)
    this.addChild(this.hudLayer)

    this.urinals = createUrinals(VIEW_H)
    this.buildUrinalGraphics()
    this.buildEntrance()
    this.buildHud()
    this.buildQueueMarker()
  }

  // -----------------------------------------------------------------------
  // 構築ヘルパー
  // -----------------------------------------------------------------------

  private buildUrinalGraphics(): void {
    for (const u of this.urinals) {
      const gfx = new Graphics()
      gfx.eventMode = 'static'
      gfx.cursor = 'pointer'
      gfx.on('pointerdown', () => {
        assignToUrinal(this.chars, this.urinals, u.id)
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

    const color =
      u.state === 'OCCUPIED' ? URINAL_COLOR_OCCUPIED : URINAL_COLOR_EMPTY

    gfx.clear()
    // 便器本体 (角丸矩形)。
    gfx
      .roundRect(u.x - u.width / 2, u.y - u.height / 2, u.width, u.height, 6)
      .fill({ color, alpha: 0.85 })
      .stroke({ color: 0xffffff, width: 1.5, alpha: 0.4 })

    // タップ誘導テキスト (空のときだけ)。
    label.x = u.x
    label.y = u.y + u.height / 2 + 10
    label.text = u.state === 'EMPTY' ? 'タップ' : ''
  }

  /** 入口マーカー (左上)。 */
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
      .fill({ color: 0x27ae60, alpha: 0.9 })
      .stroke({ color: 0xffffff, width: 1, alpha: 0.6 })
    this.addChild(gfx)

    const label = new Text({
      text: '入口',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 12,
        fill: 0xffffff,
        align: 'center',
      },
    })
    label.anchor.set(0.5)
    label.x = ENTRANCE_X
    label.y = ENTRANCE_Y
    this.addChild(label)
  }

  /** 中央待機列マーカー (薄い点線風)。 */
  private buildQueueMarker(): void {
    const gfx = new Graphics()
    // 縦の破線ガイド (ループで短い線を並べる)。
    const x = 0
    const yTop = -160
    const yBottom = -40
    const dashLen = 6
    const dashGap = 8
    for (let y = yTop; y < yBottom; y += dashLen + dashGap) {
      gfx.moveTo(x, y).lineTo(x, Math.min(y + dashLen, yBottom))
      gfx.stroke({ color: 0xaaaaaa, width: 1, alpha: 0.3 })
    }
    this.addChild(gfx)

    const label = new Text({
      text: '待機',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 10,
        fill: 0xaaaaaa,
        align: 'center',
      },
    })
    label.anchor.set(0.5)
    label.x = 28 // QUEUE_X=0 から少し右にオフセット (ガイド線と重ならないよう)
    label.y = -100
    this.addChild(label)
  }

  /** HUD (スコア表示)。 */
  private buildHud(): void {
    this.scoreText = new Text({
      text: 'スコア: 0',
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 18,
        fontWeight: '600',
        fill: UI_TEXT_PRIMARY,
      },
    })
    this.scoreText.anchor.set(0.5, 0)
    this.scoreText.x = 0
    this.scoreText.y = -VIEW_H / 2 + 12
    this.hudLayer.addChild(this.scoreText)
  }

  // -----------------------------------------------------------------------
  // キャラ描画
  // -----------------------------------------------------------------------

  private getOrCreateCharGfx(char: Char): Graphics {
    let entry = this.charGfxMap.get(char.id)
    if (!entry) {
      const gfx = new Graphics()
      this.charLayer.addChild(gfx)
      entry = { id: char.id, gfx }
      this.charGfxMap.set(char.id, entry)
    }
    return entry.gfx
  }

  private syncCharGraphics(): void {
    // 生存キャラ描画。
    const aliveIds = new Set(this.chars.map(c => c.id))
    for (const char of this.chars) {
      const gfx = this.getOrCreateCharGfx(char)
      gfx.clear()
      const color =
        char.state === 'USING'
          ? 0xf39c12
          : char.state === 'QUEUING'
            ? 0x3498db
            : char.state === 'WALKING_OUT'
              ? 0x95a5a6
              : 0x2ecc71
      gfx
        .circle(char.x, char.y, CHAR_R)
        .fill({ color, alpha: 0.9 })
        .stroke({ color: 0xffffff, width: 1.5, alpha: 0.7 })
    }
    // 退室済み (chars から消えた) キャラの gfx を削除。
    for (const [id, entry] of this.charGfxMap) {
      if (!aliveIds.has(id)) {
        entry.gfx.destroy()
        this.charGfxMap.delete(id)
      }
    }
  }

  // -----------------------------------------------------------------------
  // 更新 (ticker から呼ぶ)
  // -----------------------------------------------------------------------

  update(deltaMS: number): void {
    // スポーン。
    this.spawnAccum += deltaMS
    if (this.spawnAccum >= SPAWN_INTERVAL_MS) {
      this.spawnAccum -= SPAWN_INTERVAL_MS
      this.chars.push(spawnChar())
    }

    // ゲームロジック更新。
    const gained = updateGame(this.chars, this.urinals, deltaMS)
    this.score += gained
    if (gained > 0) {
      this.scoreText.text = `スコア: ${this.score}`
    }

    // 描画同期。
    this.syncCharGraphics()
    for (const u of this.urinals) {
      this.redrawUrinal(u)
    }
  }

  // -----------------------------------------------------------------------
  // 入力
  // -----------------------------------------------------------------------

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
