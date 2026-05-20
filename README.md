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

## 開発

```sh
npm install
npm run dev      # http://localhost:3000
npm run build    # tsc + vite build
npm test         # vitest
```
