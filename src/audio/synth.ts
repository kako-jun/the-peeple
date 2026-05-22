/**
 * 手続き型音響 (Issue #28)。
 *
 * Web Audio API の OscillatorNode / GainNode で SFX と BGM を生成する。
 * 外部ファイル (.ogg/.mp3) に依存しない。
 */

/** AudioContext を遅延生成して使い回す。 */
let _ctx: AudioContext | null = null

function getCtx(): AudioContext | null {
  if (typeof window === 'undefined') return null
  if (_ctx) return _ctx
  try {
    const Ctor =
      (
        window as typeof window & {
          AudioContext?: typeof AudioContext
          webkitAudioContext?: typeof AudioContext
        }
      ).AudioContext ??
      (
        window as typeof window & {
          webkitAudioContext?: typeof AudioContext
        }
      ).webkitAudioContext
    if (!Ctor) return null
    _ctx = new Ctor()
    return _ctx
  } catch {
    return null
  }
}

/** 指定コンテキストを注入する (テスト用)。 */
export function injectAudioContext(ctx: AudioContext): void {
  _ctx = ctx
}

// ---------------------------------------------------------------------------
// SFX
// ---------------------------------------------------------------------------

/** sfx-assign: 短い「ぽん」音。440→880Hz、50ms。 */
export function playSfxAssign(): void {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(440, now)
  osc.frequency.linearRampToValueAtTime(880, now + 0.05)
  gain.gain.setValueAtTime(0.3, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.05)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.05)
}

/** sfx-miss: 低い「ぶぶー」音。200→80Hz、200ms。 */
export function playSfxMiss(): void {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(200, now)
  osc.frequency.linearRampToValueAtTime(80, now + 0.2)
  gain.gain.setValueAtTime(0.4, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.2)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.2)
}

/** sfx-gameover: 「ざわー」音。ノイズ + 低下、300ms。 */
export function playSfxGameover(): void {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime
  const dur = 0.3

  // ホワイトノイズ buffer。
  const bufLen = Math.ceil(ctx.sampleRate * dur)
  const buf = ctx.createBuffer(1, bufLen, ctx.sampleRate)
  const data = buf.getChannelData(0)
  for (let i = 0; i < bufLen; i++) {
    data[i] = (Math.random() * 2 - 1) * (1 - i / bufLen)
  }
  const src = ctx.createBufferSource()
  src.buffer = buf

  // 低域フィルタ。
  const filter = ctx.createBiquadFilter()
  filter.type = 'lowpass'
  filter.frequency.setValueAtTime(800, now)
  filter.frequency.linearRampToValueAtTime(100, now + dur)

  const gain = ctx.createGain()
  gain.gain.setValueAtTime(0.5, now)
  gain.gain.linearRampToValueAtTime(0, now + dur)

  src.connect(filter)
  filter.connect(gain)
  gain.connect(ctx.destination)
  src.start(now)
}

/** sfx-clear: 明るい上昇音。440→660→880Hz 各100ms。 */
export function playSfxClear(): void {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime
  const freqs = [440, 660, 880]
  freqs.forEach((freq, i) => {
    const t = now + i * 0.1
    const osc = ctx.createOscillator()
    const gain = ctx.createGain()
    osc.type = 'sine'
    osc.frequency.setValueAtTime(freq, t)
    gain.gain.setValueAtTime(0.3, t)
    gain.gain.linearRampToValueAtTime(0, t + 0.1)
    osc.connect(gain)
    gain.connect(ctx.destination)
    osc.start(t)
    osc.stop(t + 0.1)
  })
}

/** ui-select: 短い「ピ」音。880Hz、30ms。 */
export function playSfxUiSelect(): void {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(880, now)
  gain.gain.setValueAtTime(0.25, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.03)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.03)
}

// ---------------------------------------------------------------------------
// BGM (bgm-play): 4拍子ビートを setInterval でループ
// ---------------------------------------------------------------------------

let bgmPlayTimer: ReturnType<typeof setInterval> | null = null

const BPM = 120
const BEAT_MS = (60 / BPM) * 1000 // 500ms per beat

function playKick(): void {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'sine'
  osc.frequency.setValueAtTime(50, now)
  gain.gain.setValueAtTime(0.5, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.08)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.08)
}

function playHihat(): void {
  const ctx = getCtx()
  if (!ctx) return
  const now = ctx.currentTime
  const osc = ctx.createOscillator()
  const gain = ctx.createGain()
  osc.type = 'square'
  osc.frequency.setValueAtTime(8000, now)
  gain.gain.setValueAtTime(0.05, now)
  gain.gain.linearRampToValueAtTime(0, now + 0.03)
  osc.connect(gain)
  gain.connect(ctx.destination)
  osc.start(now)
  osc.stop(now + 0.03)
}

let beatCount = 0

/** bgm-play の手続き型ループを開始する。 */
export function startBgmPlay(): void {
  if (bgmPlayTimer !== null) return
  beatCount = 0
  const tick = (): void => {
    // 拍 0, 2: キック。拍 1, 3: ハイハット。
    if (beatCount % 2 === 0) {
      playKick()
    }
    playHihat()
    beatCount++
  }
  tick()
  bgmPlayTimer = setInterval(tick, BEAT_MS)
}

/** bgm-play の手続き型ループを停止する。 */
export function stopBgmPlay(): void {
  if (bgmPlayTimer !== null) {
    clearInterval(bgmPlayTimer)
    bgmPlayTimer = null
  }
}
