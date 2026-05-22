# the-peeple アーキテクチャ仕様

## 技術スタック

| ライブラリ / ツール | バージョン       | 用途                              |
| ------------------- | ---------------- | --------------------------------- |
| pixi.js             | ^8.6.6           | 2D レンダリング（Canvas / WebGL） |
| TypeScript          | ^5.7.3           | 型付き開発言語                    |
| Vite                | ^6.0.11          | バンドラ・開発サーバ              |
| Vitest              | ^2.1.9           | ユニットテスト                    |
| ESLint              | ^9.18.0          | 静的解析                          |
| Prettier            | ^3.4.2           | コードフォーマット                |
| Husky + lint-staged | ^9.1.7 / ^16.2.6 | コミット前フック                  |

---

## ディレクトリ構成

```
the-peeple/
├── src/
│   ├── main.ts              エントリーポイント。bootstrap() の定義
│   ├── index.css            グローバルスタイル
│   ├── constants/
│   │   └── colors.ts        UI・環境・キャラ・便器カラー定数（0xRRGGBB）
│   ├── scenes/
│   │   ├── SceneManager.ts  カメラ tween・シーン登録・誌面管理
│   │   ├── TitleScene.ts    タイトル画面（モード・難易度選択）
│   │   ├── PlayScene.ts     プレイ画面（ゲームループ統合）
│   │   ├── ResultScene.ts   リザルト画面（スコア・ルール表示）
│   │   └── LineRushScene.ts Line Rush モード stub（Coming Soon）
│   ├── game/
│   │   ├── types.ts         共通型定義（Char / Urinal / GameStats 等）
│   │   ├── logic.ts         純粋関数ゲームロジック（状態遷移・スポーン）
│   │   └── scoring.ts       心理スコアリングルール評価
│   ├── input/
│   │   ├── KeyboardManager.ts キーボードコマンド変換・配信
│   │   └── TouchManager.ts    タッチ/マウスジェスチャ変換・配信
│   └── audio/
│       ├── SoundManager.ts  SFX・BGM・ミュート・localStorage 永続化
│       └── MuteButton.ts    PixiJS ミュートボタン UI
├── public/
│   └── sounds/              音声アセット置き場（現状は空）
├── docs/
│   └── specs/               仕様書ディレクトリ
├── DESIGN.md                ビジュアル・レイアウト・ゲームルール設計書
├── CLAUDE.md                開発メモ（AI エージェント向け）
└── package.json
```

---

## 起動フロー

```mermaid
flowchart TD
    A[index.html #root] --> B[bootstrap()]
    B --> C[Application.init\n360×640, UI_BG背景]
    B --> D[KeyboardManager.attach\nwindow]
    B --> E[TouchManager.attach\ncanvas]
    B --> F[SoundManager.loadPersisted\nミュート復元]
    B --> G[SceneManager 生成\nworld コンテナを stage に追加]
    G --> H[TitleScene 生成 → world に追加]
    G --> I[PlayScene 生成 → world に追加]
    G --> J[LineRushScene 生成 → world に追加]
    G --> K[ResultScene 生成 → world に追加]
    K --> L[navigateTo title 0ms\n即スナップ]
    L --> M[app.ticker.add\nSceneManager.update + 各シーン.update]
```

- `bootstrap()` はトップレベルで `void bootstrap()` として呼ばれる
- `MuteButton` は `world` ではなく `app.stage` 直下に固定配置（カメラに追従しない）
- 初回ユーザー操作（pointerdown / keydown / touchstart）で `SoundManager.unlock()` を一度だけ呼ぶ
- `PlayScene` はゲーム開始のたびに `destroy()` + 再生成（`difficulty` 変更を確実に反映するため `reset()` は非推奨）

---

## シーン一覧

| シーン名  | クラス          | 役割                                   | 遷移先                          |
| --------- | --------------- | -------------------------------------- | ------------------------------- |
| タイトル  | `TitleScene`    | モード・難易度選択、スタートトリガー   | PlayScene / LineRushScene       |
| プレイ    | `PlayScene`     | ゲームループ、便器タップ誘導、HUD 表示 | ResultScene                     |
| リザルト  | `ResultScene`   | スコア・ルール一覧・総評表示           | PlayScene（再挑戦）/ TitleScene |
| Line Rush | `LineRushScene` | Coming Soon プレースホルダ             | TitleScene                      |

遷移アニメーション: `SceneManager.navigateTo(key, 800)` で `cubicInOut` 800ms カメラ tween。
タイトル初期表示のみ `navigateTo(key, 0)` で即スナップ。

### 誌面上のシーン座標（Y軸）

| シーン          | 誌面 Y 中心 |
| --------------- | ----------- |
| title           | 320 px      |
| play / lineRush | 960 px      |
| result          | 1600 px     |

---

## ゲームロジック

`src/game/logic.ts` はすべて純粋関数。描画コードを含まない。

| 関数名               | 引数                                                                   | 戻り値                                     | 説明                                                                            |
| -------------------- | ---------------------------------------------------------------------- | ------------------------------------------ | ------------------------------------------------------------------------------- |
| `updateGame`         | `chars: Char[], urinals: Urinal[], stats: GameStats, deltaMS: number`  | `{ scoreGain: number; missCount: number }` | 1 フレーム分の状態遷移・怒り蓄積・退室処理。stats を直接書き換える              |
| `assignToUrinal`     | `chars: Char[], urinals: Urinal[], stats: GameStats, urinalId: number` | `boolean`                                  | 待機列先頭キャラを指定便器に割り当て、心理スコアリングを実施。割当成功で `true` |
| `createUrinals`      | `viewH: number`                                                        | `Urinal[]`                                 | 便器4基を下部横並びで生成（44×60px、間隔12px）                                  |
| `spawnChar`          | `elapsedMs?: number, difficulty?: Difficulty`                          | `Char`                                     | 経過時間と難易度からタイプを抽選して入口座標に新規キャラを生成                  |
| `queuePosition`      | `index: number`                                                        | `{ x: number; y: number }`                 | 待機列 index 番目のローカル座標を返す                                           |
| `createGameStats`    | —                                                                      | `GameStats`                                | ゼロ初期化した GameStats を返す                                                 |
| `resetCharIdCounter` | —                                                                      | `void`                                     | `nextCharId` をリセット（テスト用）                                             |

### 定数（logic.ts export）

| 定数            | 値     | 説明                                        |
| --------------- | ------ | ------------------------------------------- |
| `QUEUE_MAX`     | `6`    | 行列パンク判定人数                          |
| `QUEUE_X`       | `0`    | 待機列 X 座標（PlayScene ローカル中央原点） |
| `QUEUE_HEAD_Y`  | `-40`  | 待機列先頭 Y 座標                           |
| `QUEUE_SPACING` | `36`   | 列縦間隔 px                                 |
| `ENTRANCE_X`    | `-160` | 入口 X 座標                                 |
| `ENTRANCE_Y`    | `-260` | 入口 Y 座標                                 |

---

## 客タイプ

| タイプ   | カラー定数    | angerRate (anger/ms) | useDuration    | speedMult | 解放タイミング（NORMAL）         |
| -------- | ------------- | -------------------- | -------------- | --------- | -------------------------------- |
| `NORMAL` | `CHAR_NORMAL` | 0.004                | 5000〜10000 ms | 1.0       | ゲーム開始から                   |
| `RUSHER` | `CHAR_RUSHER` | 0.012（3×）          | 2000〜4000 ms  | 1.8       | 経過 20 秒後                     |
| `GROUP`  | `CHAR_GROUP`  | 0.003                | 6000〜12000 ms | 0.9       | 経過 40 秒後                     |
| `DRUNK`  | `CHAR_DRUNK`  | 0.006                | 8000〜14000 ms | 0.7       | 経過 40 秒後（ランダム便器突撃） |

- `DRUNK` は `assignToUrinal` 内でランダムに選出（50% 確率で待機列中の DRUNK から抽選）
- `GROUP` の隣接ペナルティ免除は未実装（Issue #25）

---

## 苛立ちゲージ

QUEUING 状態のキャラに毎フレーム `anger += angerRate × deltaMS` が加算される。

| しきい値          | カラー定数   | 色 HEX    | 意味           |
| ----------------- | ------------ | --------- | -------------- |
| anger < 50%       | `ANGER_LOW`  | `#44cc88` | 余裕あり（緑） |
| 50% ≤ anger ≤ 80% | `ANGER_MID`  | `#ffaa00` | 注意（琥珀色） |
| anger > 80%       | `ANGER_HIGH` | `#ff3322` | 危険（赤）     |
| ゲージ背景        | `ANGER_BG`   | `#c8dde8` | 薄い水色       |

anger が 100 に達すると即ミス扱いで強制退場。

---

## キーボード入力

`KeyboardManager` がキーコードを `KeyboardCommand` に変換して配信する。

| コマンド      | キー          | 動作                                                     |
| ------------- | ------------- | -------------------------------------------------------- |
| `confirm`     | Enter / Space | リザルト→再挑戦、タイトル→スタート                       |
| `restart`     | R / r         | リザルト→再挑戦                                          |
| `cancel`      | Escape        | プレイ→ギブアップ（ResultScene へ）、リザルト→タイトルへ |
| `select1`     | 1             | タイトル→スタート                                        |
| `select2`     | 2             | （現在未割当）                                           |
| `left`        | ArrowLeft     | （現在未割当）                                           |
| `right`       | ArrowRight    | （現在未割当）                                           |
| `drop`        | ArrowDown     | （現在未割当）                                           |
| `togglePause` | P / p         | （現在未割当）                                           |
| `mute`        | M / m         | ミュート切替                                             |

タッチ入力は `TouchManager` が処理する。便器タップは PixiJS の `pointerdown` イベントで直接 `assignToUrinal` を呼ぶ（TouchManager を経由しない）。

---

## カラー定数一覧

### 環境カラー（トイレ空間）

| 定数名            | HEX       | 用途                 |
| ----------------- | --------- | -------------------- |
| `ROOM_BG`         | `#e8f4f8` | 室内背景（極薄水色） |
| `TILE_WALL`       | `#f0f8fc` | タイル壁面           |
| `TILE_GROUT`      | `#c8dce6` | タイル目地           |
| `FLOOR_BG`        | `#d6ecf4` | 床                   |
| `GLOSS_HIGHLIGHT` | `#ffffff` | 磁器・タイルの光沢   |
| `SHADOW_SOFT`     | `#b0ccd8` | 影（薄い青灰色）     |

### UI カラー

| 定数名            | HEX       | 用途                                 |
| ----------------- | --------- | ------------------------------------ |
| `UI_BG`           | `#dff0f8` | アプリ背景（Application background） |
| `UI_PRIMARY`      | `#0077aa` | メインアクション・ボタン枠線         |
| `UI_SECONDARY`    | `#00bbdd` | ホバー・選択中ハイライト             |
| `UI_TEXT_PRIMARY` | `#1a3a4a` | 本文テキスト（濃い紺）               |
| `UI_TEXT_DIM`     | `#5a8a9a` | 補助テキスト・ラベル                 |
| `UI_TEXT_ON_DARK` | `#ffffff` | 暗い背景上のテキスト                 |

### 便器カラー

| 定数名                | HEX       | 用途                                        |
| --------------------- | --------- | ------------------------------------------- |
| `URINAL_BODY`         | `#f8fcff` | 便器本体（白磁・EMPTY 状態）                |
| `URINAL_RIM`          | `#d0e8f4` | 縁・影                                      |
| `URINAL_GLOSS`        | `#ffffff` | 光沢ハイライト                              |
| `URINAL_OCCUPIED`     | `#ff6655` | 使用中（赤橙）                              |
| `URINAL_EMPTY_BORDER` | `#aaccdd` | 空き状態の枠線（水色）                      |
| `URINAL_TAP_LABEL`    | `#0077aa` | 「タップ」ラベル色（`UI_PRIMARY` の alias） |

### 客タイプ別カラー

| 定数名         | HEX       | 用途                         |
| -------------- | --------- | ---------------------------- |
| `CHAR_NORMAL`  | `#2288cc` | 普通の客                     |
| `CHAR_RUSHER`  | `#ff6600` | 急ぎ客                       |
| `CHAR_GROUP`   | `#22aa66` | 団体客                       |
| `CHAR_DRUNK`   | `#aa44cc` | 酔っぱらい                   |
| `CHAR_OUTLINE` | `#ffffff` | キャラ輪郭（白背景から分離） |
| `CHAR_USING`   | `#ffaa00` | 使用中（琥珀色）             |
| `CHAR_LEAVING` | `#99bbcc` | 退室中（薄い水色グレー）     |

### 苛立ちゲージカラー

| 定数名       | HEX       | 用途                    |
| ------------ | --------- | ----------------------- |
| `ANGER_LOW`  | `#44cc88` | anger < 50%（緑）       |
| `ANGER_MID`  | `#ffaa00` | anger 50〜80%（琥珀色） |
| `ANGER_HIGH` | `#ff3322` | anger > 80%（赤）       |
| `ANGER_BG`   | `#c8dde8` | ゲージ背景              |

### 入口・施設カラー

| 定数名            | HEX       | 用途                                      |
| ----------------- | --------- | ----------------------------------------- |
| `ENTRANCE_COLOR`  | `#22aa66` | 入口マーカー（緑、`CHAR_GROUP` の alias） |
| `ENTRANCE_BORDER` | `#ffffff` | 入口枠線                                  |
| `QUEUE_LINE`      | `#88aabb` | 待機ライン（点線）                        |

### すりガラスオーバーレイ（Frosted Glass）

| 定数名               | 値        | 用途             |
| -------------------- | --------- | ---------------- |
| `GLASS_FILL`         | `#e8f4f8` | すりガラス塗り色 |
| `GLASS_FILL_ALPHA`   | `0.82`    | 半透明度         |
| `GLASS_BORDER`       | `#ffffff` | 枠線（白）       |
| `GLASS_BORDER_ALPHA` | `0.9`     | 枠線不透明度     |
| `GLASS_SHADOW`       | `#aaccdd` | 外縁の影         |

### テキスト装飾カラー

| 定数名         | HEX       | 用途                           |
| -------------- | --------- | ------------------------------ |
| `COMMENT_GOLD` | `#cc8800` | リザルト総評テキスト（琥珀金） |
