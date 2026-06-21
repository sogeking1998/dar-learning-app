// Synthesized ring tones (no audio files needed).
let audioCtx = null
function getCtx() {
  if (!audioCtx) audioCtx = new (window.AudioContext || window.webkitAudioContext)()
  if (audioCtx.state === 'suspended') audioCtx.resume()
  return audioCtx
}

function blip(c, t, freq, dur, vol = 0.18) {
  const o = c.createOscillator(), g = c.createGain()
  o.type = 'sine'
  o.frequency.value = freq
  o.connect(g); g.connect(c.destination)
  g.gain.setValueAtTime(0.0001, t)
  g.gain.exponentialRampToValueAtTime(vol, t + 0.02)
  g.gain.setValueAtTime(vol, t + dur - 0.06)
  g.gain.exponentialRampToValueAtTime(0.0001, t + dur)
  o.start(t)
  o.stop(t + dur + 0.03)
}

// kind: 'incoming' (callee ringtone) or 'calling' (caller ringback)
export function startRing(kind) {
  let stopped = false
  let c
  try { c = getCtx() } catch { return () => {} }

  const play = () => {
    if (stopped) return
    const t = c.currentTime + 0.02
    if (kind === 'incoming') {
      blip(c, t, 880, 0.28)
      blip(c, t + 0.4, 760, 0.28)
    } else {
      blip(c, t, 440, 0.9, 0.12)
    }
  }
  play()
  const iv = setInterval(play, kind === 'incoming' ? 2200 : 3200)
  return () => { stopped = true; clearInterval(iv) }
}
