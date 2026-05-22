/**
 * カラー定数。
 *
 * DESIGN.md のカラーパレット定義に完全準拠。
 * PixiJS の色指定は 0xRRGGBB 形式。alpha は別途指定。
 * 更新時は必ず DESIGN.md を正典として参照すること。
 */

// ──────────────────────────────────────────
// 環境カラー（トイレ空間）
// ──────────────────────────────────────────

/** 室内背景（極薄水色、蛍光灯の青白い光） */
export const ROOM_BG = 0xe8f4f8

/** タイル壁面（白に近い水色） */
export const TILE_WALL = 0xf0f8fc

/** タイル目地（薄いグレー水色） */
export const TILE_GROUT = 0xc8dce6

/** 床（壁より少し濃い水色） */
export const FLOOR_BG = 0xd6ecf4

/** 磁器・タイルの光沢ハイライト（純白） */
export const GLOSS_HIGHLIGHT = 0xffffff

/** 影（薄い青灰色。深い影は使わない） */
export const SHADOW_SOFT = 0xb0ccd8

// ──────────────────────────────────────────
// UI カラー
// ──────────────────────────────────────────

/** アプリ背景（明るい水色）。`PIXI.Application` の background と一致させる。 */
export const UI_BG = 0xdff0f8

/** メインアクション（深めの水色・青） */
export const UI_PRIMARY = 0x0077aa

/** ホバー・選択中のハイライト（明るい水色） */
export const UI_SECONDARY = 0x00bbdd

/** 本文テキスト（濃い紺） */
export const UI_TEXT_PRIMARY = 0x1a3a4a

/** 補助テキスト・ラベル（くすんだ水色） */
export const UI_TEXT_DIM = 0x5a8a9a

/** 暗い背景上のテキスト（白） */
export const UI_TEXT_ON_DARK = 0xffffff

// ──────────────────────────────────────────
// 便器カラー（磁器の白・光沢）
// ──────────────────────────────────────────

/** 便器本体（白磁） */
export const URINAL_BODY = 0xf8fcff

/** 縁・影（薄い水色） */
export const URINAL_RIM = 0xd0e8f4

/** 光沢ハイライト（純白の点） */
export const URINAL_GLOSS = 0xffffff

/** 使用中（鮮やかな赤橙。白背景で映える） */
export const URINAL_OCCUPIED = 0xff6655

/** 空き枠線（水色） */
export const URINAL_EMPTY_BORDER = 0xaaccdd

/** 「タップ」テキスト色（= UI_PRIMARY） */
export const URINAL_TAP_LABEL = UI_PRIMARY

// ──────────────────────────────────────────
// 客タイプ別カラー
// ──────────────────────────────────────────

/** 普通の客（水色系の青） */
export const CHAR_NORMAL = 0x2288cc

/** 急ぎ客（オレンジ。白背景に映える） */
export const CHAR_RUSHER = 0xff6600

/** 団体客（緑） */
export const CHAR_GROUP = 0x22aa66

/** 酔っぱらい（紫） */
export const CHAR_DRUNK = 0xaa44cc

/** キャラ輪郭（白でタイルと分離） */
export const CHAR_OUTLINE = 0xffffff

/** 使用中（琥珀色） */
export const CHAR_USING = 0xffaa00

/** 退室中（薄い水色グレー） */
export const CHAR_LEAVING = 0x99bbcc

// ──────────────────────────────────────────
// 苛立ちゲージカラー
// ──────────────────────────────────────────

/** anger < 50%（清潔な緑。白背景に馴染む） */
export const ANGER_LOW = 0x44cc88

/** anger 50〜80%（琥珀色） */
export const ANGER_MID = 0xffaa00

/** anger > 80%（鮮烈な赤） */
export const ANGER_HIGH = 0xff3322

/** ゲージ背景（薄い水色） */
export const ANGER_BG = 0xc8dde8

// ──────────────────────────────────────────
// 入口・施設カラー
// ──────────────────────────────────────────

/** 入口マーカー（緑、= CHAR_GROUP） */
export const ENTRANCE_COLOR = CHAR_GROUP

/** 入口枠線（白） */
export const ENTRANCE_BORDER = 0xffffff

/** 待機ライン（点線、水色グレー） */
export const QUEUE_LINE = 0x88aabb

// ──────────────────────────────────────────
// すりガラスオーバーレイ（Frosted Glass）
// ──────────────────────────────────────────

/** すりガラス塗り（ROOM_BG と同色） */
export const GLASS_FILL = 0xe8f4f8

/** すりガラス半透明度（向こうがうっすら透ける） */
export const GLASS_FILL_ALPHA = 0.82

/** 枠線（光沢ある白） */
export const GLASS_BORDER = 0xffffff

/** 枠線不透明度（高め） */
export const GLASS_BORDER_ALPHA = 0.9

/** 外縁の影（淡い水色） */
export const GLASS_SHADOW = 0xaaccdd

// ──────────────────────────────────────────
// テキスト装飾カラー
// ──────────────────────────────────────────

/** リザルト総評テキスト（琥珀金。白背景でコントラスト維持） */
export const COMMENT_GOLD = 0xcc8800
