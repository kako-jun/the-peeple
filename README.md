# the-peeple (Stand Off / Line Rush)

男性用小便器が並んだ見下ろし 2D 画面で、次々にやってくる男性客をどの便器に
誘導するのがベストかをさばく、スマホ縦比率のパズルゲーム。
「隣を空ける」「端から埋める」など、男子トイレの暗黙ルール (心理の法則) で
スコアが決まる。サブタイトル候補は **Stand Off** (男子トイレ版 / 立ち位置戦略)
と **Line Rush** (女子トイレ版 / 行列戦略)。

技術スタック: **PixiJS 8 + TypeScript + Vite**。スマホ縦比率 (9:16, 360x640)
のキャンバスで描画する。プロジェクト雛形は同じ kako-jun の `amanuma` を
ベースに、`elevator-gurl` 経由で持ち込んでいる (落ち物パズル系のロジックは
持ち込まず、SceneManager / Keyboard / Touch / Sound の汎用骨格だけを流用)。

## ゲームルール

- 制限時間 **90 秒**、ミス **5 回**でゲームオーバー
- 便器をタップして客を誘導する
- 待機列が **6 人**を超えるとミス、**苛立ちゲージ (anger)** が満タンになってもミス
- `Esc` キーでギブアップ → 結果画面へ

### 心理スコアリングルール

| ルール            | 説明                         | 点数 |
| ----------------- | ---------------------------- | ---- |
| END_URINAL        | 端の便器を使用               | +10  |
| NO_NEIGHBOR       | 完全孤立 (両隣に誰もいない)  | +20  |
| SAME_COLUMN_TABOO | 直接隣に人がいる             | -15  |
| FORCED_ADJACENT   | 両隣が埋まっていて選択肢なし | ±0   |

### 客タイプ

| タイプ | 特徴                                        | 解放タイミング |
| ------ | ------------------------------------------- | -------------- |
| NORMAL | 標準                                        | ゲーム開始から |
| RUSHER | 急ぎ客。anger 上昇速度 3×、移動速度 1.8×    | 20 秒後        |
| GROUP  | 団体客。anger 上昇速度が低い、移動速度 0.9× | 40 秒後        |
| DRUNK  | 酔っぱらい。ランダムな便器へ突撃、移動 0.7× | 40 秒後        |

## 開発

```sh
npm install
npm run dev      # http://localhost:3000
npm run build    # tsc + vite build
npm test         # vitest
```

## アーキテクチャ

```
src/
  game/
    types.ts      # 全型定義 (Urinal / Char / CharType / CharState / GameStats)
    logic.ts      # ゲームロジック (updateGame / spawnChar / assignToUrinal)
    scoring.ts    # 心理スコアリング (evaluateAssignment)
    logic.test.ts # ユニットテスト (vitest)
  scenes/
    PlayScene.ts   # プレイ画面 (HUD / anger 表示 / ゲームオーバー判定)
    ResultScene.ts # 結果画面 (スコア / ミス / 適用ルール一覧 / 総評)
  main.ts          # エントリポイント (シーン遷移配線)
```
