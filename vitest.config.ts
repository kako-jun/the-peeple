/**
 * Vitest 設定 (Issue #11)。
 *
 * amanuma 側 (`/home/ariori/repos/2025/amanuma/vitest.config.ts`) を踏襲。
 * - 既定は Node 環境で純粋関数を検証する。
 * - `src/input/**`, `src/scenes/**`, `src/audio/**` のテストは `jsdom` 環境で実行する。
 *   KeyboardEvent / PointerEvent や PIXI.Container の初期化に `window` が必要なため。
 *   Graphics の WebGL/Canvas 描画自体は jsdom で動かないので、対象はライフサイクルと
 *   コマンドハンドラの発火確認に限定する。
 */
import { defineConfig } from 'vitest/config'

export default defineConfig({
  test: {
    environment: 'node',
    include: ['src/**/*.test.ts'],
    environmentMatchGlobs: [
      ['src/input/**/*.test.ts', 'jsdom'],
      ['src/scenes/**/*.test.ts', 'jsdom'],
      ['src/audio/**/*.test.ts', 'jsdom'],
      ['src/**/*.test.ts', 'node'],
    ],
  },
})
