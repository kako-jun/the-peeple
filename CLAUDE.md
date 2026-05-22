# the-peeple - 開発メモ

PixiJS 8 + TypeScript + Vite の縦長 640x960 (2:3) パズルゲーム。
男性用小便器に客を誘導してスコアを取る「立ち位置パズル」(サブタイトル: Stand Off)。
プロジェクト構造は `amanuma` の雛形を `elevator-gurl` 経由で持ち込んだもの。

- `src/main.ts`: エントリーポイント。Title / Play / Result の 3 シーンを SceneManager に登録
- `src/scenes/`: 各シーン (TitleScene / PlayScene / ResultScene) + SceneManager (カメラ tween)
- `src/input/`: KeyboardManager / TouchManager (amanuma → elevator-gurl からそのまま流用)
- `src/audio/`: SoundManager / MuteButton (localStorage キーは `the_peeple_muted`)
- `src/constants/colors.ts`: UI 色のみ (落ち物パズル用のブロック色は持ち込まない)

詳細仕様は notes リポの `notes/dev/the-peeple.md` 側で管理する。

## 表示サイズ

canvas は CSS で拡大しない。`src/main.ts` で viewport に収まる 2:3 の実表示サイズを計算し、`renderer.resize()` と `stage.scale` で 640x960 の論理座標をブラウザサイズに合わせる。
