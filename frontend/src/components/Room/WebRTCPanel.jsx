import { useState, useEffect, useRef } from 'react';
import { Mic, MicOff, Video, VideoOff, MonitorUp, PhoneOff } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

export const WebRTCPanel = ({ roomId, userId }) => {
  const { socket, connected } = useSocket();
  const [localStream, setLocalStream] = useState(null);
  const [isJoined, setIsJoined] = useState(false);
  
  const [audioEnabled, setAudioEnabled] = useState(true);
  const [videoEnabled, setVideoEnabled] = useState(true);
  const [isScreenSharing, setIsScreenSharing] = useState(false);

  const localVideoRef = useRef(null);
  const remoteVideosRef = useRef({});
  const peersRef = useRef({});
  const [peersList, setPeersList] = useState([]);

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      leaveCall();
    };
  }, []);

  // Socket event listeners for WebRTC
  useEffect(() => {
    if (!socket || !connected || !isJoined) return;

    socket.on('webrtc:user-joined', handleUserJoined);
    socket.on('webrtc:offer', handleReceiveOffer);
    socket.on('webrtc:answer', handleReceiveAnswer);
    socket.on('webrtc:ice-candidate', handleNewICECandidateMsg);
    socket.on('webrtc:user-left', handleUserLeft);

    return () => {
      socket.off('webrtc:user-joined', handleUserJoined);
      socket.off('webrtc:offer', handleReceiveOffer);
      socket.off('webrtc:answer', handleReceiveAnswer);
      socket.off('webrtc:ice-candidate', handleNewICECandidateMsg);
      socket.off('webrtc:user-left', handleUserLeft);
    };
  }, [socket, connected, isJoined]);

  // STUN servers configuration
  const configuration = {
    iceServers: [
      { urls: 'stun:stun.l.google.com:19302' },
      { urls: 'stun:stun1.l.google.com:19302' }
    ]
  };

  const joinCall = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ video: true, audio: true });
      setLocalStream(stream);
      if (localVideoRef.current) {
        localVideoRef.current.srcObject = stream;
      }
      setIsJoined(true);
      socket.emit('webrtc:join', { roomId, userId });
    } catch (err) {
      console.error('Error accessing media devices.', err);
      alert('Could not access camera/microphone. Please grant permissions.');
    }
  };

  const leaveCall = () => {
    if (localStream) {
      localStream.getTracks().forEach(track => track.stop());
      setLocalStream(null);
    }
    Object.values(peersRef.current).forEach(peer => peer.close());
    peersRef.current = {};
    setPeersList([]);
    setIsJoined(false);
    setIsScreenSharing(false);
    if (socket && connected) {
      socket.emit('webrtc:leave', { roomId, userId });
    }
  };

  const toggleAudio = () => {
    if (localStream) {
      const audioTrack = localStream.getAudioTracks()[0];
      if (audioTrack) {
        audioTrack.enabled = !audioTrack.enabled;
        setAudioEnabled(audioTrack.enabled);
      }
    }
  };

  const toggleVideo = () => {
    if (localStream) {
      const videoTrack = localStream.getVideoTracks()[0];
      if (videoTrack) {
        videoTrack.enabled = !videoTrack.enabled;
        setVideoEnabled(videoTrack.enabled);
      }
    }
  };

  const toggleScreenShare = async () => {
    if (!isScreenSharing) {
      try {
        const screenStream = await navigator.mediaDevices.getDisplayMedia({ video: true });
        const screenTrack = screenStream.getVideoTracks()[0];
        
        screenTrack.onended = () => {
          stopScreenShare();
        };

        if (localVideoRef.current) {
          localVideoRef.current.srcObject = screenStream;
        }

        // Replace track in all peers
        Object.values(peersRef.current).forEach(peer => {
          const sender = peer.getSenders().find(s => s.track.kind === 'video');
          if (sender) sender.replaceTrack(screenTrack);
        });

        setIsScreenSharing(true);
      } catch (err) {
        console.error('Error sharing screen:', err);
      }
    } else {
      stopScreenShare();
    }
  };

  const stopScreenShare = () => {
    if (!localStream) return;
    const videoTrack = localStream.getVideoTracks()[0];
    
    if (localVideoRef.current) {
      localVideoRef.current.srcObject = localStream;
    }

    Object.values(peersRef.current).forEach(peer => {
      const sender = peer.getSenders().find(s => s.track.kind === 'video');
      if (sender) sender.replaceTrack(videoTrack);
    });

    setIsScreenSharing(false);
  };

  // --- WebRTC Signaling ---

  const createPeerConnection = (targetUserId) => {
    const peer = new RTCPeerConnection(configuration);

    peer.onicecandidate = (event) => {
      if (event.candidate) {
        socket.emit('webrtc:ice-candidate', {
          roomId,
          target: targetUserId,
          candidate: event.candidate,
        });
      }
    };

    peer.ontrack = (event) => {
      setPeersList(prev => {
        if (prev.includes(targetUserId)) return prev;
        return [...prev, targetUserId];
      });

      // Need to assign stream to a video element after state updates
      setTimeout(() => {
        const videoElement = document.getElementById(`remote-video-${targetUserId}`);
        if (videoElement && event.streams[0]) {
          videoElement.srcObject = event.streams[0];
        }
      }, 100);
    };

    if (localStream) {
      localStream.getTracks().forEach(track => {
        peer.addTrack(track, localStream);
      });
    }

    peersRef.current[targetUserId] = peer;
    return peer;
  };

  const handleUserJoined = async ({ userId: newUserId }) => {
    if (newUserId === userId) return;
    const peer = createPeerConnection(newUserId);
    try {
      const offer = await peer.createOffer();
      await peer.setLocalDescription(offer);
      socket.emit('webrtc:offer', {
        roomId,
        target: newUserId,
        caller: userId,
        sdp: offer,
      });
    } catch (err) {
      console.error('Error creating offer', err);
    }
  };

  const handleReceiveOffer = async ({ caller, sdp }) => {
    const peer = createPeerConnection(caller);
    try {
      await peer.setRemoteDescription(new RTCSessionDescription(sdp));
      const answer = await peer.createAnswer();
      await peer.setLocalDescription(answer);
      socket.emit('webrtc:answer', {
        roomId,
        target: caller,
        sdp: answer,
      });
    } catch (err) {
      console.error('Error receiving offer', err);
    }
  };

  const handleReceiveAnswer = async ({ sender, sdp }) => {
    const peer = peersRef.current[sender];
    if (peer) {
      try {
        await peer.setRemoteDescription(new RTCSessionDescription(sdp));
      } catch (err) {
        console.error('Error receiving answer', err);
      }
    }
  };

  const handleNewICECandidateMsg = async ({ sender, candidate }) => {
    const peer = peersRef.current[sender];
    if (peer) {
      try {
        await peer.addIceCandidate(new RTCIceCandidate(candidate));
      } catch (err) {
        console.error('Error adding ICE candidate', err);
      }
    }
  };

  const handleUserLeft = ({ userId: leftUserId }) => {
    if (peersRef.current[leftUserId]) {
      peersRef.current[leftUserId].close();
      delete peersRef.current[leftUserId];
      setPeersList(prev => prev.filter(id => id !== leftUserId));
    }
  };

  return (
    <div className="webrtc-panel">
      {!isJoined ? (
        <div className="webrtc-idle">
          <Video size={48} style={{ opacity: 0.2 }} />
          <div>
            <h3 style={{ fontSize: '1.25rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '0.5rem' }}>Join Video Call</h3>
            <p style={{ fontSize: '0.85rem', maxWidth: '300px', margin: '0 auto' }}>
              Connect with your study group face-to-face. Turn on your camera and microphone to start.
            </p>
          </div>
          <button className="btn btn-primary" onClick={joinCall} style={{ marginTop: '1rem', padding: '0.75rem 2rem' }}>
            <Video size={16} /> Join Call
          </button>
        </div>
      ) : (
        <>
          <div className="video-grid">
            {/* Local Video */}
            <div className="video-tile">
              <video ref={localVideoRef} autoPlay playsInline muted />
              <div className="video-tile-label">You {isScreenSharing ? '(Screen)' : ''}</div>
              {!videoEnabled && (
                <div className="video-off-overlay">
                  <VideoOff size={32} color="var(--text-muted)" />
                </div>
              )}
            </div>

            {/* Remote Videos */}
            {peersList.map((peerId) => (
              <div key={peerId} className="video-tile">
                <video id={`remote-video-${peerId}`} autoPlay playsInline />
                <div className="video-tile-label">Peer {peerId.substring(0,4)}</div>
              </div>
            ))}
          </div>

          <div className="webrtc-controls">
            <button 
              className={`btn-round ${!audioEnabled ? 'danger' : ''}`} 
              onClick={toggleAudio}
              title={audioEnabled ? "Mute Microphone" : "Unmute Microphone"}
            >
              {audioEnabled ? <Mic size={20} /> : <MicOff size={20} />}
            </button>
            <button 
              className={`btn-round ${!videoEnabled ? 'danger' : ''}`} 
              onClick={toggleVideo}
              title={videoEnabled ? "Turn Off Camera" : "Turn On Camera"}
            >
              {videoEnabled ? <Video size={20} /> : <VideoOff size={20} />}
            </button>
            <button 
              className={`btn-round ${isScreenSharing ? 'active' : ''}`} 
              onClick={toggleScreenShare}
              title={isScreenSharing ? "Stop Sharing Screen" : "Share Screen"}
            >
              <MonitorUp size={20} />
            </button>
            <button 
              className="btn-round danger" 
              onClick={leaveCall}
              title="Leave Call"
              style={{ marginLeft: '1rem' }}
            >
              <PhoneOff size={20} />
            </button>
          </div>
        </>
      )}
    </div>
  );
};
