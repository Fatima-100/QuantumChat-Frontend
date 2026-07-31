import { useCallback, useEffect, useRef, useState } from 'react';
import { getSocket } from '../api/socket.js';
import {
  ICE_SERVERS,
  emitSealedEnvelope,
  newSignalId,
  registerSignalHandlers,
  unsealCallEnvelope,
} from '../utils/callSignalTransport.js';
import { startDialingSound } from '../utils/sounds.js';

const ICE_RESTART_FAILSAFE_MS = 10_000;

/**
 * DM WebRTC call state machine.
 * Signaling is X5 sealed-box envelopes; media is peer-to-peer.
 */
export default function useWebRTCCall({ userId, resolvePeerPublicKeys, onMissed, onEnd } = {}) {
  const [call, setCall] = useState(null);
  const pcRef = useRef(null);
  const localStreamRef = useRef(null);
  const remoteStreamRef = useRef(null);
  const [localStream, setLocalStream] = useState(null);
  const [remoteStream, setRemoteStream] = useState(null);
  const [muted, setMuted] = useState(false);
  const [cameraOff, setCameraOff] = useState(false);
  const callRef = useRef(null);
  const pendingIceRef = useRef([]);
  const peerKeysCacheRef = useRef(new Map());
  const resolvePeerPublicKeysRef = useRef(resolvePeerPublicKeys);
  const onMissedRef = useRef(onMissed);
  const onEndRef = useRef(onEnd);
  const stopDialingSoundRef = useRef(null);
  const iceRestartTimerRef = useRef(null);
  resolvePeerPublicKeysRef.current = resolvePeerPublicKeys;
  onMissedRef.current = onMissed;
  onEndRef.current = onEnd;

  useEffect(() => {
    callRef.current = call;
  }, [call]);

  const getPeerKeys = useCallback(
    async (peerId) => {
      const id = String(peerId);
      if (peerKeysCacheRef.current.has(id)) return peerKeysCacheRef.current.get(id);
      const keys = (await resolvePeerPublicKeysRef.current?.(id)) || [];
      peerKeysCacheRef.current.set(id, keys);
      return keys;
    },
    []
  );

  const emitSealed = useCallback(
    async (eventName, { to, callId, payload }) => {
      const peerKeys = await getPeerKeys(to);
      await emitSealedEnvelope(eventName, { to, callId, payload, peerKeys });
    },
    [getPeerKeys]
  );

  const clearIceRestartFailsafe = useCallback(() => {
    if (iceRestartTimerRef.current) {
      window.clearTimeout(iceRestartTimerRef.current);
      iceRestartTimerRef.current = null;
    }
  }, []);

  const cleanupMedia = useCallback(() => {
    stopDialingSoundRef.current?.();
    stopDialingSoundRef.current = null;
    clearIceRestartFailsafe();
    pendingIceRef.current = [];
    if (pcRef.current) {
      try {
        pcRef.current.close();
      } catch {
        /* ignore */
      }
      pcRef.current = null;
    }
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach((t) => t.stop());
      localStreamRef.current = null;
    }
    setLocalStream(null);
    remoteStreamRef.current = null;
    setRemoteStream(null);
    setMuted(false);
    setCameraOff(false);
  }, [clearIceRestartFailsafe]);

  const endCallLocal = useCallback((reason) => {
    const c = callRef.current;
    try {
      if (c) {
        const startedAt = c.startedAt || null;
        const answered = Boolean(startedAt);
        const durationSeconds = answered ? Math.floor((Date.now() - startedAt) / 1000) : 0;
        try {
          onEndRef.current?.({
            callId: c.callId,
            peerId: c.peerId,
            video: c.video,
            role: c.role,
            answered,
            durationSeconds,
            reason: reason || null,
          });
        } catch (e) {
          /* swallow callback errors */
        }
      }
    } finally {
      cleanupMedia();
      callRef.current = null;
      setCall(null);
    }
  }, [cleanupMedia]);

  const ensurePc = useCallback(
    (peerId) => {
      if (pcRef.current) return pcRef.current;
      const pc = new RTCPeerConnection({ iceServers: ICE_SERVERS });
      pcRef.current = pc;

      pc.onicecandidate = (e) => {
        if (!e.candidate) return;
        const c = callRef.current;
        if (!c) return;
        emitSealed('call:ice', {
          to: peerId,
          callId: c.callId,
          payload: { type: 'ice', callId: c.callId, candidate: e.candidate.toJSON() },
        }).catch(() => {});
      };

      pc.ontrack = (e) => {
        const stream = e.streams?.[0] || new MediaStream([e.track]);
        remoteStreamRef.current = stream;
        setRemoteStream(stream);
      };

      // A 'failed' state during an otherwise long-lived call (e.g. a Wi-Fi
      // blip) shouldn't hang up immediately — try an ICE restart first, only
      // the caller side re-offers to avoid both peers racing. If the
      // connection hasn't recovered within the failsafe window, hang up.
      pc.onconnectionstatechange = () => {
        if (pc.connectionState === 'connected') {
          clearIceRestartFailsafe();
          return;
        }
        if (pc.connectionState === 'failed') {
          if (!iceRestartTimerRef.current) {
            iceRestartTimerRef.current = window.setTimeout(() => {
              iceRestartTimerRef.current = null;
              const current = pcRef.current;
              if (current && (current.connectionState === 'failed' || current.connectionState === 'disconnected')) {
                endCallLocal('connection_lost');
              }
            }, ICE_RESTART_FAILSAFE_MS);
          }
          const c = callRef.current;
          if (c && c.role === 'caller') {
            (async () => {
              try {
                const offer = await pc.createOffer({ iceRestart: true });
                await pc.setLocalDescription(offer);
                await emitSealed('call:offer', {
                  to: c.peerId,
                  callId: c.callId,
                  payload: { type: 'offer', callId: c.callId, sdp: offer },
                });
              } catch {
                /* best effort; the failsafe timer above hangs up if this doesn't recover */
              }
            })();
          }
          return;
        }
        if (pc.connectionState === 'closed') {
          endCallLocal();
        }
      };

      return pc;
    },
    [endCallLocal, emitSealed, clearIceRestartFailsafe]
  );

  const attachLocalMedia = useCallback(async (video) => {
    const stream = await navigator.mediaDevices.getUserMedia({
      audio: true,
      video: Boolean(video),
    });
    localStreamRef.current = stream;
    setLocalStream(stream);
    return stream;
  }, []);

  const startCall = useCallback(
    async ({ peerId, peerName, video = false }) => {
      if (!peerId || callRef.current) return;
      const callId = newSignalId('call');
      const next = {
        callId,
        peerId: String(peerId),
        peerName: peerName || 'User',
        video: Boolean(video),
        role: 'caller',
        status: 'ringing',
      };
      setCall(next);
      callRef.current = next;
      stopDialingSoundRef.current?.();
      stopDialingSoundRef.current = startDialingSound();
      try {
        await emitSealed('call:invite', {
          to: peerId,
          callId,
          payload: { type: 'invite', callId, video: Boolean(video) },
        });
      } catch (err) {
        endCallLocal('signaling_failed');
        throw err;
      }
    },
    [emitSealed, endCallLocal]
  );

  const acceptCall = useCallback(async () => {
    const c = callRef.current;
    if (!c || c.role !== 'callee') return;
    try {
      const stream = await attachLocalMedia(c.video);
      const pc = ensurePc(c.peerId);
      stream.getTracks().forEach((track) => pc.addTrack(track, stream));
      await emitSealed('call:accept', {
        to: c.peerId,
        callId: c.callId,
        payload: { type: 'accept', callId: c.callId },
      });
      setCall((prev) => (prev ? { ...prev, status: 'connecting' } : prev));
    } catch (err) {
      await emitSealed('call:reject', {
        to: c.peerId,
        callId: c.callId,
        payload: { type: 'reject', callId: c.callId, reason: 'media_failed' },
      }).catch(() => {});
      endCallLocal();
      throw err;
    }
  }, [attachLocalMedia, ensurePc, endCallLocal, emitSealed]);

  const rejectCall = useCallback(() => {
    const c = callRef.current;
    if (!c) return;
    emitSealed('call:reject', {
      to: c.peerId,
      callId: c.callId,
      payload: { type: 'reject', callId: c.callId, reason: 'rejected' },
    }).catch(() => {});
    endCallLocal();
  }, [endCallLocal, emitSealed]);

  const hangup = useCallback(() => {
    const c = callRef.current;
    if (c) {
      emitSealed('call:hangup', {
        to: c.peerId,
        callId: c.callId,
        payload: { type: 'hangup', callId: c.callId },
      }).catch(() => {});
    }
    endCallLocal();
  }, [endCallLocal, emitSealed]);

  const toggleMute = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !muted;
    stream.getAudioTracks().forEach((t) => {
      t.enabled = !next;
    });
    setMuted(next);
  }, [muted]);

  const toggleCamera = useCallback(() => {
    const stream = localStreamRef.current;
    if (!stream) return;
    const next = !cameraOff;
    stream.getVideoTracks().forEach((t) => {
      t.enabled = !next;
    });
    setCameraOff(next);
  }, [cameraOff]);

  useEffect(() => {
    const socket = getSocket();
    if (!userId) return undefined;

    async function flushIce(pc) {
      const queued = pendingIceRef.current.splice(0);
      for (const candidate of queued) {
        try {
          await pc.addIceCandidate(candidate);
        } catch {
          /* ignore */
        }
      }
    }

    function openEnvelope(envelope) {
      return unsealCallEnvelope(envelope, userId);
    }

    function onInvite({ from, callId, envelope }) {
      if (!from || !callId) return;
      const body = openEnvelope(envelope);
      if (!body || body.type !== 'invite') return;
      if (callRef.current) {
        emitSealed('call:reject', {
          to: from,
          callId,
          payload: { type: 'reject', callId, reason: 'busy' },
        }).catch(() => {});
        return;
      }
      const next = {
        callId: String(callId),
        peerId: String(from),
        peerName: 'Incoming call',
        video: Boolean(body.video),
        role: 'callee',
        status: 'incoming',
      };
      setCall(next);
      callRef.current = next;
    }

    async function onAccept({ from, callId, envelope }) {
      const body = openEnvelope(envelope);
      if (!body || body.type !== 'accept') return;
      const c = callRef.current;
      if (!c || c.role !== 'caller' || String(c.callId) !== String(callId)) return;
      stopDialingSoundRef.current?.();
      stopDialingSoundRef.current = null;
      try {
        const stream = await attachLocalMedia(c.video);
        const pc = ensurePc(c.peerId);
        stream.getTracks().forEach((track) => pc.addTrack(track, stream));
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        await emitSealed('call:offer', {
          to: from,
          callId: c.callId,
          payload: { type: 'offer', callId: c.callId, sdp: offer },
        });
          setCall((prev) =>
            prev ? { ...prev, status: 'connecting' } : prev
          );
      } catch {
        hangup();
      }
    }

    async function onOffer({ from, callId, envelope }) {
      const body = openEnvelope(envelope);
      if (!body || body.type !== 'offer' || !body.sdp) return;
      const c = callRef.current;
      if (!c || String(c.callId) !== String(callId)) return;
      const pc = ensurePc(c.peerId);
      await pc.setRemoteDescription(body.sdp);
      await flushIce(pc);
      const answer = await pc.createAnswer();
      await pc.setLocalDescription(answer);
      await emitSealed('call:answer', {
        to: from,
        callId: c.callId,
        payload: { type: 'answer', callId: c.callId, sdp: answer },
      });
      setCall((prev) =>
        prev ? { ...prev, status: 'active', startedAt: prev.startedAt || Date.now() } : prev
      );
    }

    async function onAnswer({ callId, envelope }) {
      const body = openEnvelope(envelope);
      if (!body || body.type !== 'answer' || !body.sdp) return;
      const c = callRef.current;
      if (!c || String(c.callId) !== String(callId) || !pcRef.current) return;
      await pcRef.current.setRemoteDescription(body.sdp);
      await flushIce(pcRef.current);
      setCall((prev) =>
        prev ? { ...prev, status: 'active', startedAt: prev.startedAt || Date.now() } : prev
      );
    }

    async function onIce({ callId, envelope }) {
      const body = openEnvelope(envelope);
      if (!body || body.type !== 'ice' || !body.candidate) return;
      const c = callRef.current;
      if (!c || String(c.callId) !== String(callId)) return;
      if (!pcRef.current?.remoteDescription) {
        pendingIceRef.current.push(body.candidate);
        return;
      }
      try {
        await pcRef.current.addIceCandidate(body.candidate);
      } catch {
        /* ignore */
      }
    }

    function onReject({ callId, envelope }) {
      const body = openEnvelope(envelope);
      if (!body || body.type !== 'reject') return;
      const c = callRef.current;
      if (!c || String(c.callId) !== String(callId)) return;
      onMissedRef.current?.(c);
      endCallLocal();
    }

    function onHangup({ callId, envelope }) {
      const body = openEnvelope(envelope);
      if (!body || body.type !== 'hangup') return;
      const c = callRef.current;
      if (!c || String(c.callId) !== String(callId)) return;
      endCallLocal();
    }

    const handlers = {
      'call:invite': onInvite,
      'call:accept': onAccept,
      'call:reject': onReject,
      'call:hangup': onHangup,
      'call:offer': onOffer,
      'call:answer': onAnswer,
      'call:ice': onIce,
    };

    for (const [eventName, handler] of Object.entries(handlers)) {
      socket?.on(eventName, handler);
    }
    const unregisterRestFallback = registerSignalHandlers(handlers);

    return () => {
      unregisterRestFallback();
      for (const [eventName, handler] of Object.entries(handlers)) {
        socket?.off(eventName, handler);
      }
    };
  }, [userId, attachLocalMedia, ensurePc, endCallLocal, hangup, emitSealed]);

  useEffect(() => {
    if (!call || (call.status !== 'ringing' && call.status !== 'incoming')) {
      return undefined;
    }
    const timer = window.setTimeout(() => {
      const current = callRef.current;
      if (!current || current.callId !== call.callId) return;
      const eventName = current.role === 'caller' ? 'call:hangup' : 'call:reject';
      emitSealed(eventName, {
        to: current.peerId,
        callId: current.callId,
        payload: {
          type: current.role === 'caller' ? 'hangup' : 'reject',
          callId: current.callId,
          reason: 'no_answer',
        },
      }).catch(() => {});
      onMissedRef.current?.(current);
      endCallLocal('no_answer');
    }, 45_000);
    return () => window.clearTimeout(timer);
  }, [call, emitSealed, endCallLocal]);

  useEffect(() => () => cleanupMedia(), [cleanupMedia]);

  return {
    call,
    localStream,
    remoteStream,
    muted,
    cameraOff,
    startCall,
    acceptCall,
    rejectCall,
    hangup,
    toggleMute,
    toggleCamera,
  };
}
