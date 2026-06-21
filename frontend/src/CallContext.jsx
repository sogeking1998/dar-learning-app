import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
import { useMessages } from './MessagesContext'
import CallUI from './components/CallUI'

const ICE = {
  iceServers: [
    { urls: 'stun:stun.l.google.com:19302' },
    { urls: 'turn:openrelay.metered.ca:80', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443', username: 'openrelayproject', credential: 'openrelayproject' },
    { urls: 'turn:openrelay.metered.ca:443?transport=tcp', username: 'openrelayproject', credential: 'openrelayproject' },
  ],
}

const CallContext = createContext(null)

export function CallProvider({ children }) {
  const { session } = useAuth()
  const { sendMessage } = useMessages()
  const me = session?.user?.id
  const myName = session?.user?.user_metadata?.name || session?.user?.email?.split('@')[0] || 'DAR member'

  const [call, setCall] = useState(null)   // {status, role, peerId, peerName, mode, room}
  const [localStream, setLocalStream] = useState(null)
  const [remoteStream, setRemoteStream] = useState(null)
  const [muted, setMuted] = useState(false)
  const [camOff, setCamOff] = useState(false)

  const pcRef = useRef(null)
  const chRef = useRef(null)
  const localRef = useRef(null)
  const roleRef = useRef(null)
  const pendingIce = useRef([])
  const timerRef = useRef(null)
  const facingRef = useRef('user')
  const callRef = useRef(null)
  const restartRef = useRef(null)
  const connectedAtRef = useRef(null)
  const loggedRef = useRef(false)

  useEffect(() => { callRef.current = call }, [call])

  // The caller writes a single call-log message into the conversation.
  const logCall = () => {
    if (loggedRef.current || roleRef.current !== 'caller') return
    const c = callRef.current
    if (!c || !c.peerId) return
    loggedRef.current = true
    let text
    if (connectedAtRef.current) {
      const secs = Math.max(1, Math.round((Date.now() - connectedAtRef.current) / 1000))
      const dur = `${Math.floor(secs / 60)}:${String(secs % 60).padStart(2, '0')}`
      text = `${c.mode === 'video' ? '📹 Video' : '📞 Audio'} call · ${dur}`
    } else {
      text = `📞 Missed ${c.mode === 'video' ? 'video ' : ''}call`
    }
    if (sendMessage) sendMessage(c.peerId, text)
  }

  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null } }

  const videoConstraints = () => ({
    facingMode: facingRef.current,
    width: { ideal: 640 }, height: { ideal: 480 }, frameRate: { ideal: 24 },
  })

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (restartRef.current) { clearTimeout(restartRef.current); restartRef.current = null }
    if (pcRef.current) { try { pcRef.current.close() } catch {} pcRef.current = null }
    if (localRef.current) { localRef.current.getTracks().forEach(t => t.stop()); localRef.current = null }
    if (chRef.current) { supabase.removeChannel(chRef.current); chRef.current = null }
    pendingIce.current = []
    connectedAtRef.current = null
    setLocalStream(null); setRemoteStream(null); setMuted(false); setCamOff(false)
    setCall(null)
  }, [])

  const send = (event, payload) => {
    if (chRef.current) chRef.current.send({ type: 'broadcast', event, payload })
  }

  // Keep video light so it doesn't overwhelm the relay.
  const capBitrate = async () => {
    const pc = pcRef.current; if (!pc) return
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')
    if (!sender || !sender.getParameters) return
    try {
      const p = sender.getParameters()
      p.encodings = (p.encodings && p.encodings.length) ? p.encodings : [{}]
      p.encodings[0].maxBitrate = 600000
      p.encodings[0].maxFramerate = 24
      await sender.setParameters(p)
    } catch {}
  }

  // Recover a dropped connection without ending the call.
  const restartIce = async () => {
    const pc = pcRef.current; if (!pc) return
    try {
      const offer = await pc.createOffer({ iceRestart: true })
      await pc.setLocalDescription(offer)
      send('offer', { type: offer.type, sdp: offer.sdp })
    } catch {}
  }

  const newPeer = useCallback(() => {
    const pc = new RTCPeerConnection(ICE)
    pc.onicecandidate = e => { if (e.candidate) send('ice', e.candidate.toJSON()) }
    pc.ontrack = e => setRemoteStream(new MediaStream(e.streams[0].getTracks()))
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState
      if (st === 'connected') {
        clearTimer()
        if (restartRef.current) { clearTimeout(restartRef.current); restartRef.current = null }
        if (!connectedAtRef.current) connectedAtRef.current = Date.now()
        setCall(c => c ? { ...c, status: 'connected' } : c)
      } else if (st === 'disconnected' || st === 'failed') {
        // Don't auto-hang-up — try to recover with an ICE restart (caller drives it).
        setCall(c => (c && c.status === 'connected') ? { ...c, status: 'reconnecting' } : c)
        if (roleRef.current === 'caller') {
          if (restartRef.current) clearTimeout(restartRef.current)
          restartRef.current = setTimeout(() => {
            const p = pcRef.current
            if (p && (p.connectionState === 'disconnected' || p.connectionState === 'failed')) restartIce()
          }, 1500)
        }
      }
    }
    pcRef.current = pc
    return pc
  }, []) // eslint-disable-line

  const flushIce = async () => {
    const pc = pcRef.current
    if (!pc || !pc.remoteDescription) return
    for (const c of pendingIce.current) { try { await pc.addIceCandidate(new RTCIceCandidate(c)) } catch {} }
    pendingIce.current = []
  }

  const getMedia = async mode => {
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' ? videoConstraints() : false })
    localRef.current = stream
    setLocalStream(stream)
    return stream
  }

  // Attach the per-call signaling channel + handlers (both sides).
  const openChannel = (room, mode) => {
    const ch = supabase.channel(`call:${room}`, { config: { broadcast: { self: false } } })
    ch.on('broadcast', { event: 'accept' }, async () => {
      if (roleRef.current !== 'caller') return
      clearTimer()
      const pc = pcRef.current
      const offer = await pc.createOffer()
      await pc.setLocalDescription(offer)
      send('offer', { type: offer.type, sdp: offer.sdp })
      setCall(c => c ? { ...c, status: 'connecting' } : c)
    })
    ch.on('broadcast', { event: 'offer' }, async ({ payload }) => {
      const pc = pcRef.current
      if (!pc) return
      await pc.setRemoteDescription(new RTCSessionDescription(payload))
      await flushIce()
      const answer = await pc.createAnswer()
      await pc.setLocalDescription(answer)
      send('answer', { type: answer.type, sdp: answer.sdp })
    })
    ch.on('broadcast', { event: 'answer' }, async ({ payload }) => {
      const pc = pcRef.current
      if (!pc) return
      await pc.setRemoteDescription(new RTCSessionDescription(payload))
      await flushIce()
    })
    ch.on('broadcast', { event: 'ice' }, async ({ payload }) => {
      const pc = pcRef.current
      if (!pc) { pendingIce.current.push(payload); return }
      if (!pc.remoteDescription) pendingIce.current.push(payload)
      else { try { await pc.addIceCandidate(new RTCIceCandidate(payload)) } catch {} }
    })
    ch.on('broadcast', { event: 'bye' }, () => { logCall(); cleanup() })
    ch.on('broadcast', { event: 'decline' }, () => { logCall(); setCall(c => c ? { ...c, status: 'declined' } : c); setTimeout(cleanup, 1500) })
    ch.subscribe()
    chRef.current = ch
    return ch
  }

  // ── Caller ──
  const start = async (user, mode) => {
    if (!me || call) return
    const room = `${me}__${user.id}__${Date.now()}`
    roleRef.current = 'caller'
    connectedAtRef.current = null
    loggedRef.current = false
    try {
      await getMedia(mode)
    } catch {
      alert('Could not access your microphone/camera. Please allow permission and try again.')
      return
    }
    const pc = newPeer()
    localRef.current.getTracks().forEach(t => pc.addTrack(t, localRef.current))
    capBitrate()
    openChannel(room, mode)
    setCall({ status: 'calling', role: 'caller', peerId: user.id, peerName: user.name, mode, room })

    // Ring the callee's inbox.
    const inbox = supabase.channel(`call-inbox:${user.id}`)
    inbox.subscribe(s => {
      if (s === 'SUBSCRIBED') {
        inbox.send({ type: 'broadcast', event: 'ring', payload: { room, from: me, fromName: myName, mode } })
        setTimeout(() => supabase.removeChannel(inbox), 1500)
      }
    })

    // No answer after 35s → give up (only if still ringing).
    timerRef.current = setTimeout(() => {
      if (callRef.current && callRef.current.status === 'calling') {
        send('bye')
        logCall()
        setCall(c => c ? { ...c, status: 'noanswer' } : c)
        setTimeout(cleanup, 1800)
      }
    }, 35000)
  }

  // ── Callee ──
  const handleRing = useCallback(({ room, from, fromName, mode }) => {
    if (pcRef.current || chRef.current) return  // already busy
    roleRef.current = 'callee'
    openChannel(room, mode)
    setCall({ status: 'incoming', role: 'callee', peerId: from, peerName: fromName, mode, room })
  }, []) // eslint-disable-line

  const answer = async () => {
    if (!call || call.status !== 'incoming') return
    if (timerRef.current) clearTimeout(timerRef.current)
    try {
      await getMedia(call.mode)
    } catch {
      alert('Could not access your microphone/camera. Please allow permission.')
      decline()
      return
    }
    const pc = newPeer()
    localRef.current.getTracks().forEach(t => pc.addTrack(t, localRef.current))
    capBitrate()
    setCall(c => ({ ...c, status: 'connecting' }))
    send('accept')
  }

  const decline = () => { send('decline'); cleanup() }
  const hangup = () => { logCall(); send('bye'); cleanup() }

  const toggleMute = () => {
    const s = localRef.current; if (!s) return
    s.getAudioTracks().forEach(t => { t.enabled = !t.enabled })
    setMuted(m => !m)
  }
  const toggleCam = () => {
    const s = localRef.current; if (!s) return
    s.getVideoTracks().forEach(t => { t.enabled = !t.enabled })
    setCamOff(v => !v)
  }

  const renegotiate = async () => {
    const pc = pcRef.current; if (!pc) return
    const offer = await pc.createOffer()
    await pc.setLocalDescription(offer)
    send('offer', { type: offer.type, sdp: offer.sdp })
  }

  // Turn the camera on — works even if the call started as audio-only.
  const openCamera = async () => {
    const pc = pcRef.current, ls = localRef.current
    if (!pc || !ls) return
    if (ls.getVideoTracks().length) { ls.getVideoTracks().forEach(t => { t.enabled = true }); setCamOff(false); return }
    let v
    try { v = await navigator.mediaDevices.getUserMedia({ video: videoConstraints() }) }
    catch { alert('Could not access the camera.'); return }
    const track = v.getVideoTracks()[0]
    ls.addTrack(track)
    setLocalStream(new MediaStream(ls.getTracks()))
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')
    if (sender) await sender.replaceTrack(track)
    else { pc.addTrack(track, ls); await renegotiate() }
    await capBitrate()
    setCamOff(false)
  }

  // Switch between front and back camera (mobile).
  const flipCamera = async () => {
    const pc = pcRef.current, ls = localRef.current
    if (!pc || !ls || !ls.getVideoTracks().length) return
    facingRef.current = facingRef.current === 'user' ? 'environment' : 'user'
    let v
    try { v = await navigator.mediaDevices.getUserMedia({ video: videoConstraints() }) }
    catch { return }
    const track = v.getVideoTracks()[0]
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')
    if (sender) { await sender.replaceTrack(track); await capBitrate() }
    const old = ls.getVideoTracks()[0]
    if (old) { ls.removeTrack(old); old.stop() }
    ls.addTrack(track)
    setLocalStream(new MediaStream(ls.getTracks()))
  }

  // Always-on inbox: listen for incoming calls while logged in.
  useEffect(() => {
    if (!me) return
    const inbox = supabase.channel(`call-inbox:${me}`, { config: { broadcast: { self: false } } })
    inbox.on('broadcast', { event: 'ring' }, ({ payload }) => handleRing(payload))
    inbox.subscribe()
    return () => { supabase.removeChannel(inbox) }
  }, [me, handleRing])

  return (
    <CallContext.Provider value={{ call, localStream, remoteStream, muted, camOff, start, answer, decline, hangup, toggleMute, toggleCam, openCamera, flipCamera }}>
      {children}
      {call && <CallUI />}
    </CallContext.Provider>
  )
}

export const useCall = () => useContext(CallContext)
