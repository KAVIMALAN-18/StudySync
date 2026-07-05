import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { rooms as roomsApi } from '../../services/api';
import { ChatPanel } from './ChatPanel';
import { AIAssistant } from './AIAssistant';
import { FileSharingPanel } from './FileSharingPanel';
import { StudyTimer } from './StudyTimer';
import { WebRTCPanel } from './WebRTCPanel';
import { RoomMembers } from './RoomMembers';
import { MessageSquare, Sparkles, FolderUp, Video, LogOut, ArrowLeft, ShieldAlert, Copy, Check } from 'lucide-react';

export const StudyRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  const copyRoomCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const fetchRoomData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await roomsApi.getById(roomId);
      setRoom(res.data);
      setMembers(res.data.members || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load room');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!roomId) return;
    fetchRoomData();
  }, [roomId]);

  useEffect(() => {
    if (!socket || !roomId || !user) return;

    if (connected) {
      socket.emit('room:join', { roomId, userId: user._id });
    }

    const handleMembersUpdated = (data) => {
      if (data.roomId === roomId) {
        setMembers(data.members || []);
      }
    };

    const handleRoomError = (err) => {
      setError(err.message || 'Room error occurred');
    };
    
    const handleForceLeave = () => {
      alert('You have been removed from this room.');
      navigate('/dashboard');
    };

    socket.on('room:members-updated', handleMembersUpdated);
    socket.on('room:error', handleRoomError);
    socket.on('room:force-leave', handleForceLeave);

    return () => {
      socket.emit('room:leave', { roomId, userId: user._id });
      socket.off('room:members-updated', handleMembersUpdated);
      socket.off('room:error', handleRoomError);
      socket.off('room:force-leave', handleForceLeave);
    };
  }, [socket, roomId, user, connected, navigate]);

  const handleLeaveRoom = async () => {
    if (!window.confirm('Are you sure you want to leave this room?')) return;
    try {
      if (socket) {
        socket.emit('room:leave', { roomId, userId: user._id });
      }
      await roomsApi.leave(roomId);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to leave room:', err);
      navigate('/dashboard');
    }
  };

  if (loading) {
    return (
      <div className="room-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Entering study room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="room-shell">
        <div className="empty-state glass-card" style={{ maxWidth: '400px', margin: '4rem auto' }}>
          <ShieldAlert size={40} className="empty-state-icon" color="#ef4444" style={{ opacity: 1 }} />
          <div className="empty-state-title" style={{ color: '#fca5a5' }}>Access Denied</div>
          <div className="empty-state-sub">{error || 'Room not found'}</div>
          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')} style={{ marginTop: '1rem' }}>
            <ArrowLeft size={16} /> Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="room-shell animate-fade-in">
      {/* ── Room Header ── */}
      <div className="room-header">
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <button className="room-back-btn" onClick={() => navigate('/dashboard')} title="Back to Dashboard">
            <ArrowLeft size={16} />
          </button>
          <div>
            <h1 className="room-title">{room.name}</h1>
            <p className="room-desc">{room.description || 'No description provided'}</p>
          </div>
        </div>
        
        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.375rem' }}>
            <span className={`chat-status-dot ${connected ? 'chat-status-live' : 'chat-status-offline'}`} />
            <span style={{ fontSize: '0.75rem', fontWeight: 600, color: connected ? '#6ee7b7' : '#fca5a5' }}>
              {connected ? 'CONNECTED' : 'DISCONNECTED'}
            </span>
          </div>
          
          <button className="btn btn-danger" onClick={handleLeaveRoom} style={{ padding: '0.5rem 1rem' }}>
            <LogOut size={15} /> Leave Room
          </button>
        </div>
      </div>

      <div className="room-layout">
        {/* ── Left Column (Timer & Members) ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <StudyTimer roomId={roomId} duration={room.studyDuration} isOwner={room?.createdBy === user?._id || room?.createdBy?._id === user?._id} />
          <RoomMembers 
            roomId={roomId} 
            initialMembers={members} 
            room={room} 
            onRefresh={() => fetchRoomData(false)}
          />
        </div>

        {/* ── Center Column (Main Workspace) ── */}
        <div style={{ display: 'flex', flexDirection: 'column' }}>
          {/* Tabs */}
          <div className="tab-pills">
            <button className={`tab-pill ${activeTab === 'chat' ? 'active' : ''}`} onClick={() => setActiveTab('chat')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                <MessageSquare size={14} /> Chat
              </div>
            </button>
            <button className={`tab-pill ${activeTab === 'ai' ? 'active' : ''}`} onClick={() => setActiveTab('ai')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                <Sparkles size={14} /> AI Assistant
              </div>
            </button>
            <button className={`tab-pill ${activeTab === 'files' ? 'active' : ''}`} onClick={() => setActiveTab('files')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                <FolderUp size={14} /> Files
              </div>
            </button>
            <button className={`tab-pill ${activeTab === 'video' ? 'active' : ''}`} onClick={() => setActiveTab('video')}>
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem' }}>
                <Video size={14} /> Video Call
              </div>
            </button>
          </div>

          {/* Active Panel */}
          <div className="panel-card">
            {activeTab === 'chat' && <ChatPanel roomId={roomId} />}
            {activeTab === 'ai' && <AIAssistant roomId={roomId} />}
            {activeTab === 'files' && <FileSharingPanel roomId={roomId} />}
            {activeTab === 'video' && <WebRTCPanel roomId={roomId} userId={user._id} />}
          </div>
        </div>

        {/* ── Right Column (Room Details Sidebar) ── */}
        <div className="glass-card" style={{ padding: '1.25rem', height: 'fit-content' }}>
          <h3 style={{ fontSize: '0.85rem', fontWeight: 700, color: 'var(--text-primary)', marginBottom: '1rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
            Room Info
          </h3>
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>SUBJECT</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
                {room.subject || 'General Study'}
              </div>
            </div>
            
            {room.code && (
              <div>
                <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>ROOM CODE</div>
                <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <code style={{ fontSize: '0.85rem', padding: '0.2rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: '#818cf8', fontWeight: 'bold', letterSpacing: '0.05em' }}>
                    {room.code}
                  </code>
                  <button 
                    onClick={copyRoomCode} 
                    style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }}
                    title="Copy Room Code"
                  >
                    {copiedCode ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
                  </button>
                </div>
              </div>
            )}

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>INVITE LINK</div>
              <button 
                onClick={copyInviteLink} 
                className="btn btn-ghost" 
                style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', borderColor: 'rgba(255,255,255,0.1)' }}
              >
                {copiedLink ? (
                  <><Check size={12} color="#10b981" /> Copied Link</>
                ) : (
                  <><Copy size={12} /> Copy Invite Link</>
                )}
              </button>
            </div>

            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>CREATED BY</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {room.createdBy?.username || 'Unknown'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>PRIVACY</div>
              <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>
                {room.isPrivate ? 'Private (Invite only)' : 'Public Room'}
              </div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem' }}>STATUS</div>
              <div style={{ display: 'inline-block', padding: '0.2rem 0.5rem', background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600 }}>
                {room.status || 'active'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};
