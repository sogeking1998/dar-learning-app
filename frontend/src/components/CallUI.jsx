import { useEffect, useRef } from 'react'
import { Phone, PhoneOff, Mic, MicOff, Video, VideoOff, SwitchCamera } from 'lucide-react'
import { useCall } from '../CallContext'
import { initials } from '../UserContext'
import { startRing } from '../ring'
import './CallUI.css'

export default function CallUI() {
  const {
    call, localStream, remoteStream, muted, camOff,
    answer, decline, hangup, toggleMute, toggleCam, openCamera, flipCamera,
  } = useCall()
  const remoteVideo = useRef(null)
  const localVideo = useRef(null)
  const remoteAudio = useRef(null)

  const hasLocalVideo = !!localStream && localStream.getVideoTracks().length > 0 && !camOff
  const hasRemoteVideo = !!remoteStream && remoteStream.getVideoTracks().length > 0

  useEffect(() => { if (remoteVideo.current && remoteStream) remoteVideo.current.srcObject = remoteStream }, [remoteStream, hasRemoteVideo])
  useEffect(() => { if (localVideo.current && localStream) localVideo.current.srcObject = localStream }, [localStream, hasLocalVideo])
  useEffect(() => { if (remoteAudio.current && remoteStream) remoteAudio.current.srcObject = remoteStream }, [remoteStream])

  // Ring while incoming (callee) or calling (caller).
  useEffect(() => {
    if (!call) return
    let stop
    if (call.status === 'incoming') stop = startRing('incoming')
    else if (call.status === 'calling') stop = startRing('calling')
    return () => { if (stop) stop() }
  }, [call?.status]) // eslint-disable-line

  if (!call) return null
  const isVideo = call.mode === 'video'

  if (call.status === 'incoming') {
    return (
      <div className="callui-overlay">
        <div className="callui-incoming">
          <div className="callui-avatar ring">{initials(call.peerName)}</div>
          <p className="callui-name">{call.peerName}</p>
          <p className="callui-sub">Incoming {isVideo ? 'video' : 'audio'} call…</p>
          <div className="callui-incoming-btns">
            <button className="callui-btn decline" onClick={decline} title="Decline"><PhoneOff size={22} /></button>
            <button className="callui-btn accept" onClick={answer} title="Answer"><Phone size={22} /></button>
          </div>
        </div>
      </div>
    )
  }

  const statusText = call.status === 'calling' ? 'Calling…'
    : call.status === 'connecting' ? 'Connecting…'
    : call.status === 'reconnecting' ? 'Reconnecting…'
    : call.status === 'declined' ? 'Call declined'
    : call.status === 'noanswer' ? 'No answer'
    : 'Connected'

  return (
    <div className="callui-overlay">
      {!hasRemoteVideo && <audio ref={remoteAudio} autoPlay />}
      <div className="callui-stage">
        {hasRemoteVideo ? (
          <video ref={remoteVideo} autoPlay playsInline className="callui-remote-video" />
        ) : (
          <div className="callui-audio-center">
            <div className="callui-avatar big">{initials(call.peerName)}</div>
            <p className="callui-name lg">{call.peerName}</p>
            <p className="callui-sub">{statusText}</p>
          </div>
        )}
        {hasLocalVideo && <video ref={localVideo} autoPlay playsInline muted className="callui-local-video" />}
        {hasRemoteVideo && <div className="callui-topbar">{call.peerName} · {statusText}</div>}
      </div>

      <div className="callui-controls">
        <button className={`callui-ctl${muted ? ' on' : ''}`} onClick={toggleMute} title={muted ? 'Unmute' : 'Mute'}>
          {muted ? <MicOff size={20} /> : <Mic size={20} />}
        </button>

        {localStream && localStream.getVideoTracks().length > 0 ? (
          <>
            <button className={`callui-ctl${camOff ? ' on' : ''}`} onClick={toggleCam} title={camOff ? 'Turn camera on' : 'Turn camera off'}>
              {camOff ? <VideoOff size={20} /> : <Video size={20} />}
            </button>
            <button className="callui-ctl" onClick={flipCamera} title="Flip camera (front / back)"><SwitchCamera size={20} /></button>
          </>
        ) : (
          <button className="callui-ctl" onClick={openCamera} title="Turn on camera"><Video size={20} /></button>
        )}

        <button className="callui-ctl hangup" onClick={hangup} title="End call"><PhoneOff size={20} /></button>
      </div>
    </div>
  )
}
