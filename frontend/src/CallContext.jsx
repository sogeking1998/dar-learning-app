import { createContext, useContext, useState, useEffect, useRef, useCallback } from 'react'
import { supabase } from './supabaseClient'
import { useAuth } from './AuthContext'
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

  useEffect(() => { callRef.current = call }, [call])

  const clearTimer = () => { if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null } }

  const cleanup = useCallback(() => {
    if (timerRef.current) { clearTimeout(timerRef.current); timerRef.current = null }
    if (pcRef.current) { try { pcRef.current.close() } catch {} pcRef.current = null }
    if (localRef.current) { localRef.current.getTracks().forEach(t => t.stop()); localRef.current = null }
    if (chRef.current) { supabase.removeChannel(chRef.current); chRef.current = null }
    pendingIce.current = []
    setLocalStream(null); setRemoteStream(null); setMuted(false); setCamOff(false)
    setCall(null)
  }, [])

  const send = (event, payload) => {
    if (chRef.current) chRef.current.send({ type: 'broadcast', event, payload })
  }

  const newPeer = useCallback(() => {
    const pc = new RTCPeerConnection(ICE)
    pc.onicecandidate = e => { if (e.candidate) send('ice', e.candidate.toJSON()) }
    pc.ontrack = e => setRemoteStream(new MediaStream(e.streams[0].getTracks()))
    pc.onconnectionstatechange = () => {
      const st = pc.connectionState
      if (st === 'connected') { clearTimer(); setCall(c => c ? { ...c, status: 'connected' } : c) }
      else if (st === 'disconnected' || st === 'failed') {
        // Don't auto-hang-up — a brief drop (e.g. when turning video on) can recover.
        setCall(c => (c && c.status === 'connected') ? { ...c, status: 'reconnecting' } : c)
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
    const stream = await navigator.mediaDevices.getUserMedia({ audio: true, video: mode === 'video' })
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
    ch.on('broadcast', { event: 'bye' }, () => cleanup())
    ch.on('broadcast', { event: 'decline' }, () => { setCall(c => c ? { ...c, status: 'declined' } : c); setTimeout(cleanup, 1500) })
    ch.subscribe()
    chRef.current = ch
    return ch
  }

  // ── Caller ──
  const start = async (user, mode) => {
    if (!me || call) return
    const room = `${me}__${user.id}__${Date.now()}`
    roleRef.current = 'caller'
    try {
      await getMedia(mode)
    } catch {
      alert('Could not access your microphone/camera. Please allow permission and try again.')
      return
    }
    const pc = newPeer()
    localRef.current.getTracks().forEach(t => pc.addTrack(t, localRef.current))
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
    setCall(c => ({ ...c, status: 'connecting' }))
    send('accept')
  }

  const decline = () => { send('decline'); cleanup() }
  const hangup = () => { send('bye'); cleanup() }

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
    try { v = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingRef.current } }) }
    catch { alert('Could not access the camera.'); return }
    const track = v.getVideoTracks()[0]
    ls.addTrack(track)
    setLocalStream(new MediaStream(ls.getTracks()))
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')
    if (sender) await sender.replaceTrack(track)
    else { pc.addTrack(track, ls); await renegotiate() }
    setCamOff(false)
  }

  // Switch between front and back camera (mobile).
  const flipCamera = async () => {
    const pc = pcRef.current, ls = localRef.current
    if (!pc || !ls || !ls.getVideoTracks().length) return
    facingRef.current = facingRef.current === 'user' ? 'environment' : 'user'
    let v
    try { v = await navigator.mediaDevices.getUserMedia({ video: { facingMode: facingRef.current } }) }
    catch { return }
    const track = v.getVideoTracks()[0]
    const sender = pc.getSenders().find(s => s.track && s.track.kind === 'video')
    if (sender) await sender.replaceTrack(track)
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
