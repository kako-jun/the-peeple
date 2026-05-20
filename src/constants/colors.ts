/**
 * カラー定数 (elevator-gurl テンプレ初期版)。
 *
 * amanuma の `src/constants/colors.ts` をベースにしているが、
 * ブロック色 (落ち物パズル用) は持ち込まない。UI のグラスボタンや背景に使う
 * Violet / Cyan / 白だけを抽出した最小セット。
 */

/** 画面背景 (`bg`)。`PIXI.Application` の background と一致させる。 */
export const UI_BG = 0x0f0f1a

/** ボード枠線・グラスボタンの塗りに使う Violet (`primary`)。 */
export const UI_PRIMARY = 0x7c3aed

/** ハイライト用 Cyan (`secondary`)。hover 時の枠線色など。 */
export const UI_SECONDARY = 0x06b6d4

/** 本文テキストに使う白 (`text-primary`)。 */
export const UI_TEXT_PRIMARY = 0xffffff
