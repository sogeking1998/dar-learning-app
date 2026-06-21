import { useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff } from 'lucide-react'
import { useCall } from '../CallContext'
import { initials } from '../UserContext'
import './CallUI.css'

export default function CallUI() {
  const { call, localStream, remoteStream, muted, camOff, answer, decline, hangup, toggleMute, toggleCam } = useCall()
  const remoteVideo = useRef(null)
  const localVideo = useRef(null)
  const remoteAudio = useRef(null)

  useEffect(() => { if (remoteVideo.current && remoteStream) remoteVideo.current.srcObject = remoteStream }, [remoteStream, call?.status])
  useEffect(() => { if (localVideo.current && localStream) localVideo.current.srcObject = localStream }, [localStream, call?.status])
  useEffect(() => { if (remoteAudio.current && remoteStream) remoteAudio.current.srcObject = remoteStream }, [remoteStream])

  if (!call) return null
  const isVideo = call.mode === 'video'

  // Incoming call → ring screen with Answer / Decline.
  if (call.status === 'incoming') {
    return (
      <div className="callui-overlay">
        <div className="callui-incoming">
          <div className="callui-avatar ring">{initials(call.peerName)}</div>
          <p className="callui-name">{call.peerName}</p>
          <p className="callui-sub">Incoming {isVideo ? 'video' : 'audio'} call…</p>
          <div className="callui-incoming-btns">
            <button className="callui-btn decline" onClick={decline}><PhoneOff size={22} /></button>
            <button className="callui-btn accept" onClick={answer}><Phone size={22} /></button>
          </div>
        </div>
      </div>
    )
  }

  const statusText = call.status === 'calling' ? 'Calling…'
    : call.status === 'connecting' ? 'Connecting…'
    : call.status === 'declined' ? 'Call declined'
    : call.status === 'noanswer' ? 'No answer'
    : 'Connected'

  return (
    <div className="callui-overlay">
      <audio ref={remoteAudio} autoPlay />
      <div className="callui-stage">
        {isVideo && remoteStream ? (
          <video ref={remoteVideo} autoPlay playsInline className="callui-remote-video" />
        ) : (
          <div className="callui-audio-center">
            <div className="callui-avatar big">{initials(call.peerName)}</div>
            <p className="callui-name lg">{call.peerName}</p>
            <p className="callui-sub">{statusText}</p>
          </div>
        )}
        {isVideo && (
          <video ref={localVideo} autoPlay playsInline muted className="callui-local-video" />
        )}
        {isVideo && <div className="callui-topbar">{call.peerName} · {statusText}</div>}
      </div>

      <div className="callui-controls">
        <button className={`callui-ctl${muted ? ' on' : ''}`} onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>
        {isVideo && (
          <button className={`callui-ctl${camOff ? ' on' : ''}`} onClick={toggleCam} title={camOff ? 'Camera on' : 'Camera off'}>
            {camOff ? <VideoOff size={20} /> : <Video size={20} />}
          </button>
        )}
        <button className="callui-ctl hangup" onClick={hangup} title="End call"><PhoneOff size={20} /></button>
      </div>
    </div>
  )
}
