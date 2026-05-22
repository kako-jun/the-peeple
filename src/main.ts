/**
 * the-peeple エントリーポイント (Issues #9-#17)。
 */
import { Application } from 'pixi.js'
import { SceneManager, type SceneKey } from './scenes/SceneManager'
import { TitleScene } from './scenes/TitleScene'
import { PlayScene } from './scenes/PlayScene'
import { ResultScene } from './scenes/ResultScene'
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
  window.addEventListener('pointerdown', unlockOnce, { once: false })
  window.addEventListener('keydown', unlockOnce, { once: false })
  window.addEventListener('touchstart', unlockOnce, { once: false })
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
  const titleScene = new TitleScene(() => startPlay(), sound)
  titleScene.x = SCENE_TRANSFORMS.title.x
  titleScene.y = SCENE_TRANSFORMS.title.y
  sceneManager.world.addChild(titleScene)

  // Play シーン。
  const playScene = new PlayScene()
  playScene.x = SCENE_TRANSFORMS.play.x
  playScene.y = SCENE_TRANSFORMS.play.y
  sceneManager.world.addChild(playScene)

  // ゲームオーバー / 時間切れを PlayScene から受け取る。
  playScene.setOnGameOver(stats => {
    resultScene.setResult({ kind: 'clear', stats })
    setActiveScene('result')
    void sceneManager.navigateTo('result', 800)
  })

  // Result シーン (常駐)。
  const resultScene = new ResultScene({
    soundManager: sound,
    onRestart: () => {
      startPlay()
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
  void sceneManager.navigateTo('title', 0)
  setActiveScene('title')

  let isPlayActive = false
  app.ticker.add(ticker => {
    sceneManager.update(ticker.deltaMS)
    if (isPlayActive) playScene.update(ticker.deltaMS)
  })

  // シーン遷移ハンドラ。
  function setActiveScene(key: SceneKey): void {
    activeUnsub?.()
    activeUnsub = null
    switch (key) {
      case 'title':
        isPlayActive = false
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
      case 'result':
        isPlayActive = false
        activeUnsub = resultScene.attachInputs(keyboard)
        break
    }
  }

  function startPlay(): void {
    playScene.reset()
    setActiveScene('play')
    void sceneManager.navigateTo('play', 800)
  }
}

void bootstrap()
