/**
 * リザルト画面 (Issues #10 + #17)。
 *
 * - スコア / ミス数 / 経過時間を表示。
 * - 適用された心理ルールを列挙して総評を生成。
 * - 「もう一度」「タイトルへ」のボタン。
 */
import { Container, Graphics, Text } from 'pixi.js'
import type { KeyboardCommand, KeyboardManager } from '../input/KeyboardManager'
import {
  UI_PRIMARY,
  UI_SECONDARY,
  UI_TEXT_PRIMARY,
  UI_TEXT_DIM,
  ANGER_LOW,
  ANGER_HIGH,
  COMMENT_GOLD,
} from '../constants/colors'
import type { SoundManager } from '../audio/SoundManager'
import type { GameStats } from '../game/types'

export type ResultKind = 'gameover' | 'clear'

export interface ResultSceneOptions {
  onRestart: () => void
  onTitle: () => void
  soundManager?: SoundManager | null
}

const HEADLINE_TEXT: Record<ResultKind, string> = {
  gameover: 'ゲームオーバー',
  clear: 'タイム終了！',
}

interface ButtonAction {
  key: 'restart' | 'title'
  label: string
  centerX: number
  centerY: number
  graphics: Graphics
  hovered: boolean
}

const BUTTON_WIDTH = 220
const BUTTON_HEIGHT = 52
const BUTTON_GAP = 16
const BUTTON_RADIUS = 8

export class ResultScene extends Container {
  private readonly opts: ResultSceneOptions
  private readonly buttons: ButtonAction[] = []
  private readonly soundManager: SoundManager | null
  private readonly headline: Text
  private readonly summaryContainer: Container
  private currentKind: ResultKind = 'gameover'

  constructor(opts: ResultSceneOptions) {
    super()
    this.opts = opts
    this.soundManager = opts.soundManager ?? null

    // 見出し。
    this.headline = new Text({
      text: HEADLINE_TEXT[this.currentKind],
      style: {
        fontFamily: 'Inter, system-ui, sans-serif',
        fontSize: 36,
        fontWeight: '700',
        fill: UI_TEXT_PRIMARY,
        align: 'center',
      },
    })
    this.headline.anchor.set(0.5)
    this.headline.x = 0
    this.headline.y = -270
    this.addChild(this.headline)

    // 結果サマリ (setResult で毎回作り直す)。
    this.summaryContainer = new Container()
    this.summaryContainer.x = 0
    this.summaryContainer.y = -200
    this.addChild(this.summaryContainer)

    // ボタン。
    const defs: { key: 'restart' | 'title'; label: string }[] = [
      { key: 'restart', label: 'もう一度 (R)' },
      { key: 'title', label: 'タイトルへ (Esc)' },
    ]
    for (let i = 0; i < defs.length; i++) {
      const cy = 170 + i * (BUTTON_HEIGHT + BUTTON_GAP)
      this.addButton(defs[i].key, defs[i].label, 0, cy)
    }
  }

  // -------------------------------------------------------------------------
  // 公開 API
  // -------------------------------------------------------------------------

  /**
   * 結果を設定して表示を更新する。
   * stats を渡すとルール解説・総評を生成する。
   */
  setResult(opts: { kind: ResultKind; stats?: GameStats }): void {
    this.currentKind = opts.kind
    this.headline.text = HEADLINE_TEXT[opts.kind]
    this.buildSummary(opts.stats)
  }

  attachInputs(keyboard: KeyboardManager): () => void {
    const handler = (cmd: KeyboardCommand): void => {
      switch (cmd) {
        case 'restart':
        case 'confirm':
          this.soundManager?.playSfx('ui-select')
          this.opts.onRestart()
          break
        case 'cancel':
          this.soundManager?.playSfx('ui-select')
          this.opts.onTitle()
          break
        default:
          break
      }
    }
    return keyboard.onCommand(handler)
  }

  // -------------------------------------------------------------------------
  // サマリ生成 (#17)
  // -------------------------------------------------------------------------

  private buildSummary(stats?: GameStats): void {
    // 既存の子をクリア。
    this.summaryContainer.removeChildren()

    if (!stats) return

    const textStyle = {
      fontFamily: 'Inter, system-ui, sans-serif',
      fontSize: 14,
      fill: UI_TEXT_PRIMARY,
      align: 'center' as const,
    }
    const smallStyle = {
      ...textStyle,
      fontSize: 12,
      fill: UI_TEXT_DIM,
    }

    let y = 0

    // スコア / ミス / 時間。
    const secElapsed = Math.floor(stats.elapsed / 1000)
    const statsText = new Text({
      text: `SCORE: ${stats.score}   MISS: ${stats.misses}   TIME: ${secElapsed}s`,
      style: { ...textStyle, fontSize: 16, fontWeight: '700' },
    })
    statsText.anchor.set(0.5, 0)
    statsText.x = 0
    statsText.y = y
    this.summaryContainer.addChild(statsText)
    y += 28

    // 総評テキスト。
    const comment = this.generateComment(stats)
    const commentText = new Text({
      text: comment,
      style: { ...textStyle, fontSize: 13, fill: COMMENT_GOLD },
    })
    commentText.anchor.set(0.5, 0)
    commentText.x = 0
    commentText.y = y
    this.summaryContainer.addChild(commentText)
    y += 28

    // 適用ルール一覧 (最大5件)。
    if (stats.appliedRules.length > 0) {
      const rulesLabel = new Text({
        text: '── 適用ルール ──',
        style: smallStyle,
      })
      rulesLabel.anchor.set(0.5, 0)
      rulesLabel.x = 0
      rulesLabel.y = y
      this.summaryContainer.addChild(rulesLabel)
      y += 20

      // ルールを集計 (同一 ruleId の回数を数える)。
      const ruleCounts = new Map<
        string,
        { desc: string; count: number; score: number }
      >()
      for (const r of stats.appliedRules) {
        const key = r.ruleId
        const prev = ruleCounts.get(key)
        if (prev) {
          prev.count++
          prev.score += r.scoreDelta
        } else {
          ruleCounts.set(key, {
            desc: r.description,
            count: 1,
            score: r.scoreDelta,
          })
        }
      }

      const sorted = [...ruleCounts.entries()]
        .sort((a, b) => Math.abs(b[1].score) - Math.abs(a[1].score))
        .slice(0, 5)

      for (const [, info] of sorted) {
        const sign = info.score > 0 ? '+' : ''
        const line = new Text({
          text: `${info.desc.replace(/:.+/, '')} × ${info.count}  (${sign}${info.score})`,
          style: {
            ...smallStyle,
            fill: info.score >= 0 ? ANGER_LOW : ANGER_HIGH,
          },
        })
        line.anchor.set(0.5, 0)
        line.x = 0
        line.y = y
        this.summaryContainer.addChild(line)
        y += 18
      }
    }
  }

  /** スコア・ミス数から一言総評を生成。 */
  private generateComment(stats: GameStats): string {
    const { score, misses } = stats
    if (misses === 0 && score >= 100) return '完璧な誘導！礼儀正しさの達人'
    if (misses === 0) return '誰も怒らせなかった。紳士的です'
    if (score >= 80) return 'なかなかの手腕。あと少しで達人'
    if (misses >= 4) return 'かなり怒らせてしまった…修行が必要'
    if (score >= 40) return '平均的な誘導。もう少し端を意識して'
    return 'まだまだ練習が必要です'
  }

  // -------------------------------------------------------------------------
  // ボタン描画
  // -------------------------------------------------------------------------

  private addButton(
    key: 'restart' | 'title',
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

    const entry: ButtonAction = {
      key,
      label,
      centerX: cx,
      centerY: cy,
      graphics: g,
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
      this.soundManager?.playSfx('ui-select')
      if (entry.key === 'restart') this.opts.onRestart()
      else this.opts.onTitle()
    })
  }

  private drawButton(entry: ButtonAction): void {
    const { graphics: g, centerX, centerY, hovered } = entry
    const x = centerX - BUTTON_WIDTH / 2
    const y = centerY - BUTTON_HEIGHT / 2
    g.clear()
    g.roundRect(x, y, BUTTON_WIDTH, BUTTON_HEIGHT, BUTTON_RADIUS)
      .fill({ color: UI_PRIMARY, alpha: hovered ? 0.35 : 0.2 })
      .stroke({
        color: hovered ? UI_SECONDARY : UI_PRIMARY,
        width: 1,
        alpha: hovered ? 0.9 : 0.5,
      })
  }

  override destroy(options?: Parameters<Container['destroy']>[0]): void {
    super.destroy(options ?? { children: true })
  }
}
