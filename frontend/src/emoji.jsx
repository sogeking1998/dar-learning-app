import { useState } from 'react'

// Google Noto emoji — free (Apache 2.0). Rendered as SVG images so every
// device shows the same style.
const NOTO_BASE = 'https://cdn.jsdelivr.net/gh/googlefonts/noto-emoji@main/svg/emoji_u'

const codepoints = seg =>
  [...seg].map(c => c.codePointAt(0).toString(16)).filter(c => c !== 'fe0f').join('_')

export const notoUrl = seg => `${NOTO_BASE}${codepoints(seg)}.svg`

// Single emoji as an image, with a graceful fallback to the native glyph.
export function NotoEmoji({ char, size = 20, inline = false }) {
  const [failed, setFailed] = useState(false)
  if (failed) {
    return <span style={{ fontSize: `${Math.round(size * 0.92)}px`, lineHeight: 1 }}>{char}</span>
  }
  return (
    <img
      className={`noto-emoji${inline ? ' inline' : ''}`}
      src={notoUrl(char)} alt={char} width={size} height={size}
      draggable="false" onError={() => setFailed(true)}
    />
  )
}

// Matches emoji (incl. ZWJ sequences, keycaps, flags) within free text.
const EMOJI_RE = /(\p{Extended_Pictographic}(?:️|‍\p{Extended_Pictographic})*⃣?|[#*0-9]️?⃣|\p{Regional_Indicator}{2})/gu

// Turn a text string into an array of strings + <NotoEmoji> for inline use.
export function renderEmoji(text) {
  if (!text) return text
  const out = []
  let last = 0, m, i = 0
  EMOJI_RE.lastIndex = 0
  while ((m = EMOJI_RE.exec(text))) {
    if (m.index > last) out.push(text.slice(last, m.index))
    out.push(<NotoEmoji key={i++} char={m[0]} size={19} inline />)
    last = m.index + m[0].length
  }
  if (last < text.length) out.push(text.slice(last))
  return out
}
