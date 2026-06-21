import { useEffect, useRef } from 'react'
import { X } from 'lucide-react'
import './CallModal.css'

const JITSI_DOMAIN = 'meet.jit.si'
let scriptPromise = null

function loadJitsi() {
  if (window.JitsiMeetExternalAPI) return Promise.resolve()
  if (scriptPromise) return scriptPromise
  scriptPromise = new Promise((resolve, reject) => {
    const s = document.createElement('script')
    s.src = `https://${JITSI_DOMAIN}/external_api.js`
    s.async = true
    s.onload = resolve
    s.onerror = reject
    document.body.appendChild(s)
  })
  return scriptPromise
}

export default function CallModal({ room, mode, name, withName, onClose }) {
  const stageRef = useRef(null)
  const apiRef = useRef(null)
  const closeRef = useRef(onClose)
  closeRef.current = onClose

  useEffect(() => {
    let active = true
    loadJitsi().then(() => {
      if (!active || !stageRef.current) return
      const api = new window.JitsiMeetExternalAPI(JITSI_DOMAIN, {
        roomName: room,
        parentNode: stageRef.current,
        width: '100%',
        height: '100%',
        userInfo: { displayName: name },
        configOverwrite: {
          startWithVideoMuted: mode === 'audio',
          startWithAudioMuted: false,
          prejoinPageEnabled: false,
          disableDeepLinking: true,
        },
        interfaceConfigOverwrite: {
          MOBILE_APP_PROMO: false,
          SHOW_JITSI_WATERMARK: false,
        },
      })
      apiRef.current = api
      api.addListener('readyToClose', () => closeRef.current && closeRef.current())
    }).catch(() => {})

    return () => {
      active = false
      if (apiRef.current) { apiRef.current.dispose(); apiRef.current = null }
    }
  }, [room, mode, name])

  return (
    <div className="call-overlay">
      <div className="call-bar">
        <span className="call-title">
          {mode === 'audio' ? 'Audio call' : 'Video call'}{withName ? ` with ${withName}` : ''}
        </span>
        <button className="call-end" onClick={onClose}><X size={16} /> End call</button>
      </div>
      <div className="call-stage" ref={stageRef} />
    </div>
  )
}
