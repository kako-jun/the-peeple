/**
 * the-peeple エントリーポイント (Issues #9-#19)。
 */
import { Application } from 'pixi.js'
import { SceneManager, type SceneKey } from './scenes/SceneManager'
import { TitleScene, type TitleSelection } from './scenes/TitleScene'
import { PlayScene } from './scenes/PlayScene'
import { ResultScene } from './scenes/ResultScene'
import { LineRushScene } from './scenes/LineRushScene'
import { KeyboardManager } from './input/KeyboardManager'
import { TouchManager } from './input/TouchManager'
import { SoundManager } from './audio/SoundManager'
import { MuteButton } from './audio/MuteButton'
import { UI_BG } from './constants/colors'
import './index.css'

const VIEW_W = 360
const VIEW_H = 640

const SCENE_TRANSFORMS = {
  title: { x: VIEW_W / 2, y: VIEW_H / 2, scale: 1 },
  play: { x: VIEW_W / 2, y: VIEW_H / 2 + VIEW_H, scale: 1 },
  result: { x: VIEW_W / 2, y: VIEW_H / 2 + VIEW_H * 2, scale: 1 },
  // lineRush は play と同じ Y 位置: Stand Off の play エリアを共有。
  lineRush: { x: VIEW_W / 2, y: VIEW_H / 2 + VIEW_H, scale: 1 },
} as const

async function bootstrap(): Promise<void> {
  const container = document.getElementById('root')
  if (!container) throw new Error('Mount element #root not found in index.html')

  const app = new Application()
  await app.init({
    width: VIEW_W,
    height: VIEW_H,
    background: UI_BG,
    antialias: true,
    resolution: window.devicePixelRatio,
    autoDensity: true,
  })
  container.appendChild(app.canvas)

  // 入力 Manager。
  const keyboard = new KeyboardManager()
  keyboard.attach(window)
  const touch = new TouchManager()
  if (app.canvas instanceof HTMLCanvasElement) touch.attach(app.canvas)

  // SoundManager。
  const sound = new SoundManager()
  sound.loadPersisted()
  let unlocked = false
  const unlockOnce = (): void => {
    if (unlocked) return
    unlocked = true
    sound.unlock()
  }
  window.addEventListener('pointerdown', unlockOnce, { once: true })
  window.addEventListener('keydown', unlockOnce, { once: true })
  window.addEventListener('touchstart', unlockOnce, { once: true })
  keyboard.onCommand(cmd => {
    if (cmd === 'mute') sound.toggleMute()
  })

  // SceneManager + シーン群。
  const sceneManager = new SceneManager(VIEW_W, VIEW_H)
  app.stage.addChild(sceneManager.world)

  const muteButton = new MuteButton(sound, 32)
  muteButton.x = VIEW_W - 32 - 8
  muteButton.y = 8
  app.stage.addChild(muteButton)

  let activeUnsub: (() => void) | null = null

  // Title シーン。
  const titleScene = new TitleScene(
    (sel: TitleSelection) => startGame(sel),
    sound
  )
  titleScene.x = SCENE_TRANSFORMS.title.x
  titleScene.y = SCENE_TRANSFORMS.title.y
  sceneManager.world.addChild(titleScene)

  // Stand Off (Play) シーン — startGame 呼び出し時に difficulty を指定して再生成。
  let playScene = new PlayScene('NORMAL')
  playScene.x = SCENE_TRANSFORMS.play.x
  playScene.y = SCENE_TRANSFORMS.play.y
  sceneManager.world.addChild(playScene)

  /** PlayScene のゲームオーバーコールバックを登録する。 */
  const setupPlayGameOver = (scene: PlayScene): void => {
    scene.setOnGameOver(stats => {
      resultScene.setResult({ kind: 'clear', stats })
      setActiveScene('result')
      void sceneManager.navigateTo('result', 800)
    })
  }
  setupPlayGameOver(playScene)

  // Line Rush シーン (stub, Issue #19)。
  const lineRushScene = new LineRushScene({
    soundManager: sound,
    onTitle: () => {
      setActiveScene('title')
      void sceneManager.navigateTo('title', 800)
    },
  })
  lineRushScene.x = SCENE_TRANSFORMS.lineRush.x
  lineRushScene.y = SCENE_TRANSFORMS.lineRush.y
  sceneManager.world.addChild(lineRushScene)

  // Result シーン (常駐)。
  const resultScene = new ResultScene({
    soundManager: sound,
    onRestart: () => {
      // タイトルの現在選択値で再挑戦。
      // タイトルに戻らずに同じ設定で即スタートするユーザー体験を意図している。
      const sel: TitleSelection = {
        mode: titleScene.getSelectedMode(),
        difficulty: titleScene.getSelectedDifficulty(),
      }
      startGame(sel)
    },
    onTitle: () => {
      setActiveScene('title')
      void sceneManager.navigateTo('title', 800)
    },
  })
  resultScene.x = SCENE_TRANSFORMS.result.x
  resultScene.y = SCENE_TRANSFORMS.result.y
  sceneManager.world.addChild(resultScene)

  sceneManager.registerScene('title', SCENE_TRANSFORMS.title)
  sceneManager.registerScene('play', SCENE_TRANSFORMS.play)
  sceneManager.registerScene('result', SCENE_TRANSFORMS.result)
  sceneManager.registerScene('lineRush', SCENE_TRANSFORMS.lineRush)
  void sceneManager.navigateTo('title', 0)
  setActiveScene('title')

  let isPlayActive = false
  let isLineRushActive = false
  app.ticker.add(ticker => {
    sceneManager.update(ticker.deltaMS)
    if (isPlayActive) playScene.update(ticker.deltaMS)
    if (isLineRushActive) lineRushScene.update(ticker.deltaMS)
  })

  // シーン遷移ハンドラ。
  function setActiveScene(key: SceneKey): void {
    activeUnsub?.()
    activeUnsub = null
    isPlayActive = false
    isLineRushActive = false
    switch (key) {
      case 'title':
        activeUnsub = titleScene.attachInputs(keyboard)
        break
      case 'play':
        isPlayActive = true
        activeUnsub = playScene.attachInputs(keyboard, touch, () => {
          // Esc = ギブアップ。現在の stats で Result に遷移。
          resultScene.setResult({
            kind: 'gameover',
            stats: playScene.getStats(),
          })
          setActiveScene('result')
          void sceneManager.navigateTo('result', 800)
        })
        break
      case 'lineRush':
        isLineRushActive = true
        activeUnsub = lineRushScene.attachInputs(keyboard)
        break
      case 'result':
        activeUnsub = resultScene.attachInputs(keyboard)
        break
    }
  }

  function startGame(sel: TitleSelection): void {
    if (sel.mode === 'LINE_RUSH') {
      // Line Rush stub シーンへ遷移。
      setActiveScene('lineRush')
      void sceneManager.navigateTo('lineRush', 800)
      return
    }
    // Stand Off: difficulty を指定して PlayScene を再生成する。
    // reset() ではなく再生成することで difficulty 変更を確実に反映する。
    const oldPlay = playScene
    const newPlay = new PlayScene(sel.difficulty)
    newPlay.x = SCENE_TRANSFORMS.play.x
    newPlay.y = SCENE_TRANSFORMS.play.y
    setupPlayGameOver(newPlay)
    sceneManager.world.addChild(newPlay)
    playScene = newPlay
    sceneManager.world.removeChild(oldPlay)
    oldPlay.destroy()

    setActiveScene('play')
    void sceneManager.navigateTo('play', 800)
  }
}

void bootstrap()
