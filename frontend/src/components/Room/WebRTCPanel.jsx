import { useState, useEffect, useRef } from 'react';
import { Video, VideoOff, Mic, MicOff, Monitor, Phone, PhoneOff, User } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

export const WebRTCPanel = ({ roomId, userId }) => {
  const [inCall, setInCall] = useState(false);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [screenShare, setScreenShare] = useState(false);
  const [participants, setParticipants] = useState([]); // Array of { socketId, userId, stream }
  
  const { socket } = useSocket();
  const localVideoRef = useRef(null);
  const localStreamRef = useRef(null);
  const peerConnections = useRef(new Map()); // socketId -> RTCPeerConnection

  useEffect(() => {
    if (!socket || !inCall) return;

    const handleUserJoined = async ({ socketId, userId: peerUserId }) => {
      console.log('Peer joined video call:', socketId);
      const pc = createPeerConnection(socketId, peerUserId);
      
      // Create offer
      try {
        const offer = await pc.createOffer();
        await pc.setLocalDescription(offer);
        socket.emit('webrtc:signal', {
          targetSocketId: socketId,
          signal: { type: 'offer', sdp: pc.localDescription }
        });
      } catch (err) {
        console.error('Failed to create WebRTC offer:', err);
      }
    };

    const handleSignal = async ({ senderSocketId, signal }) => {
      let pc = peerConnections.current.get(senderSocketId);
      
      if (!pc) {
        pc = createPeerConnection(senderSocketId, 'Unknown');
      }

      try {
        if (signal.type === 'offer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
          const answer = await pc.createAnswer();
          await pc.setLocalDescription(answer);
          socket.emit('webrtc:signal', {
            targetSocketId: senderSocketId,
            signal: { type: 'answer', sdp: pc.localDescription }
          });
        } else if (signal.type === 'answer') {
          await pc.setRemoteDescription(new RTCSessionDescription(signal.sdp));
        } else if (signal.candidate) {
          await pc.addIceCandidate(new RTCIceCandidate(signal.candidate));
        }
      } catch (err) {
        console.error('Error handling WebRTC signal:', err);
      }
    };

    const handleUserLeft = ({ socketId }) => {
      closePeerConnection(socketId);
    };

    // Listen for peer joins
    socket.on('webrtc:user-joined', handleUserJoined);
    // Listen for signaling data
    socket.on('webrtc:signal', handleSignal);
    // Listen for peer leaves
    socket.on('webrtc:user-left', handleUserLeft);

    return () => {
      socket.off('webrtc:user-joined', handleUserJoined);
      socket.off('webrtc:signal', handleSignal);
      socket.off('webrtc:user-left', handleUserLeft);
    };
  }, [socket, inCall]);

  const createPeerConnection = (socketId, peerUserId) => {
    const pc = new RTCPeerConnection({
      iceServers: [{ urls: 'stun:stun.l.google.com:19302' }]
    });

    peerConnections.current.set(socketId, pc);

    // Add local stream tracks
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => {
        pc.addTrack(track, localStreamRef.current);
      });
    }

    // Handle remote stream tracks
    pc.ontrack = (event) => {
      const [remoteStream] = event.streams;
      setParticipants(prev => {
        const filtered = prev.filter(p => p.socketId !== socketId);
        return [...filtered, { socketId, userId: peerUserId, stream: remoteStream }];
      });
    };

    // Handle ICE candidates
    pc.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:signal', {
          targetSocketId: socketId,
          signal: { candidate: event.candidate }
        });
      }
    };

    return pc;
  };

  const closePeerConnection = (socketId) => {
    const pc = peerConnections.current.get(socketId);
    if (pc) {
      pc.close();
      peerConnections.current.delete(socketId);
    }
    setParticipants(prev => prev.filter(p => p.socketId !== socketId));
  };

  const startCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({
        video: true,
        audio: true
      });
      localStreamRef.current = stream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setInCall(true);
      socket?.emit('webrtc:join', { roomId, userId });
    } catch (err) {
      console.warn('getUserMedia failed, starting in audio-only or simulation mode:', err.message);
      // Create empty/dummy stream for browser simulation if camera is unavailable
      const canvas = document.createElement('canvas');
      canvas.width = 320;
      canvas.height = 240;
      const ctx = canvas.getContext('2d');
      ctx.fillStyle = '#1e293b';
      ctx.fillRect(0, 0, 320, 240);
      const fakeStream = canvas.captureStream(10);
      localStreamRef.current = fakeStream;
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = fakeStream;
      }
      setInCall(true);
      socket?.emit('webrtc:join', { roomId, userId });
    }
  };

  const stopCall = () => {
    if (localStreamRef.current) {
      localStreamRef.current.getTracks().forEach(track => track.stop());
      localStreamRef.current = null;
    }
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = null;
    }
    peerConnections.current.forEach((pc, socketId) => {
      pc.close();
    });
    peerConnections.current.clear();
    setParticipants([]);
    setInCall(false);
    setScreenShare(false);
    socket?.emit('webrtc:leave', { roomId });
  };

  const toggleVideo = () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleAudio = () => {
    if (localStreamRef.current) {
      const audioTrack = localStreamRef.current.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!screenShare) {
      try {
        const stream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const videoTrack = stream.getVideoTracks()[0];
        
        // Replace video track in all peer connections
        peerConnections.current.forEach(pc => {
          const sender = pc.getSenders().find(s => s.track.kind === 'video');
          if (sender) sender.replaceTrack(videoTrack);
        });

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = stream;
        }

        videoTrack.onended = () => {
          stopScreenShare();
        };

        setScreenShare(true);
      } catch (err) {
        console.error('Failed to share screen:', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = async () => {
    if (localStreamRef.current) {
      const videoTrack = localStreamRef.current.getVideoTracks()[0];
      peerConnections.current.forEach(pc => {
        const sender = pc.getSenders().find(s => s.track.kind === 'video');
        if (sender && videoTrack) sender.replaceTrack(videoTrack);
      });
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = localStreamRef.current;
      }
      setScreenShare(false);
    }
  };

  return (
    <div className="bg-white rounded-xl border border-gray-200 shadow-sm overflow-hidden flex flex-col h-[500px]">
      {/* Header */}
      <div className="flex items-center justify-between px-4 py-3 bg-gradient-to-r from-teal-600 to-emerald-600 text-white">
        <h3 className="font-semibold text-sm">Study Room Video & Voice</h3>
        <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold ${inCall ? 'bg-red-500 text-white animate-pulse' : 'bg-teal-500'}`}>
          {inCall ? 'Live Call' : 'Idle'}
        </span>
      </div>

      {/* Video Screen Grid */}
      <div className="flex-1 bg-slate-900 p-4 grid grid-cols-2 gap-3 overflow-y-auto">
        {!inCall ? (
          <div className="col-span-2 flex flex-col items-center justify-center text-slate-400 space-y-3">
            <Phone className="w-10 h-10 stroke-1 text-slate-500" />
            <p className="text-xs text-center px-6">Collaborate with video, voice, or screen sharing. Join the call below.</p>
            <button
              onClick={startCall}
              className="bg-teal-600 hover:bg-teal-700 text-white font-semibold text-xs px-4 py-2.5 rounded-xl transition"
            >
              Start / Join Call
            </button>
          </div>
        ) : (
          <>
            {/* Local User Feed */}
            <div className="relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700 aspect-video flex items-center justify-center">
              <video
                ref={localVideoRef}
                autoPlay
                playsInline
                muted
                className="w-full h-full object-cover"
              />
              <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white">
                You {screenShare && '🖥️ (Sharing)'}
              </div>
              {!videoEnabled && (
                <div className="absolute inset-0 bg-slate-800 flex items-center justify-center">
                  <VideoOff className="w-6 h-6 text-slate-500" />
                </div>
              )}
            </div>

            {/* Remote Participants */}
            {participants.map((p, idx) => (
              <div key={idx} className="relative bg-slate-800 rounded-lg overflow-hidden border border-slate-700 aspect-video flex items-center justify-center">
                <video
                  ref={el => {
                    if (el && p.stream) el.srcObject = p.stream;
                  }}
                  autoPlay
                  playsInline
                  className="w-full h-full object-cover"
                />
                <div className="absolute bottom-2 left-2 bg-black/60 px-2 py-0.5 rounded text-[10px] text-white">
                  Student {p.socketId.slice(0, 4)}
                </div>
              </div>
            ))}
          </>
        )}
      </div>

      {/* Controls Bar */}
      {inCall && (
        <div className="p-3 bg-slate-950 border-t border-slate-800 flex items-center justify-center gap-4">
          <button
            onClick={toggleAudio}
            className={`p-3 rounded-full transition-all ${audioEnabled ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-600 text-white'}`}
          >
            {audioEnabled ? <Mic className="w-4 h-4" /> : <MicOff className="w-4 h-4" />}
          </button>
          
          <button
            onClick={toggleVideo}
            className={`p-3 rounded-full transition-all ${videoEnabled ? 'bg-slate-800 hover:bg-slate-700 text-white' : 'bg-red-600 text-white'}`}
          >
            {videoEnabled ? <Video className="w-4 h-4" /> : <VideoOff className="w-4 h-4" />}
          </button>

          <button
            onClick={toggleScreenShare}
            className={`p-3 rounded-full transition-all ${screenShare ? 'bg-teal-600 text-white' : 'bg-slate-800 hover:bg-slate-700 text-white'}`}
            title="Share Screen"
          >
            <Monitor className="w-4 h-4" />
          </button>

          <button
            onClick={stopCall}
            className="p-3 bg-red-600 hover:bg-red-700 text-white rounded-full transition-all"
            title="Leave Call"
          >
            <PhoneOff className="w-4 h-4" />
          </button>
        </div>
      )}
    </div>
  );
};
