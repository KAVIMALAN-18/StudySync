import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { rooms as roomsApi } from '../../services/api';
import { ChatPanel } from './ChatPanel';
import { AIAssistant } from './AIAssistant';
import { FileSharingPanel } from './FileSharingPanel';
import { StudyTimer } from './StudyTimer';
import { RoomMembers } from './RoomMembers';
import { 
  MessageSquare, 
  Sparkles, 
  FolderUp, 
  Users, 
  Info, 
  Settings, 
  LogOut, 
  ArrowLeft, 
  ShieldAlert, 
  Copy, 
  Check, 
  ChevronLeft, 
  ChevronRight, 
  X,
  Maximize2,
  Minimize2
} from 'lucide-react';

// ─── Component: RoomInfoPanel ───
const RoomInfoPanel = ({ room, copiedCode, copiedLink, copyRoomCode, copyInviteLink }) => {
  if (!room) return null;

  return (
    <div className="room-info-panel-content" style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '1rem', height: '100%', overflowY: 'auto' }}>
      <h3 className="panel-header-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '0.5rem' }}>
        <Info size={16} color="#818cf8" /> Room Details
      </h3>
      
      <div style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem' }}>
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Subject</div>
          <div style={{ fontSize: '0.875rem', color: 'var(--text-secondary)', fontWeight: 600 }}>{room.subject || 'General Study'}</div>
        </div>
        
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Description</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.4 }}>{room.description || 'No description provided.'}</div>
        </div>
        
        {room.code && (
          <div>
            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Room Code</div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <code style={{ fontSize: '0.9rem', padding: '0.25rem 0.5rem', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', color: '#818cf8', fontWeight: 'bold', letterSpacing: '0.05em' }}>{room.code}</code>
              <button onClick={copyRoomCode} style={{ background: 'none', border: 'none', cursor: 'pointer', color: 'var(--text-muted)', display: 'flex', alignItems: 'center' }} title="Copy Room Code">
                {copiedCode ? <Check size={14} color="#10b981" /> : <Copy size={14} />}
              </button>
            </div>
          </div>
        )}
        
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Invite Link</div>
          <button onClick={copyInviteLink} className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.375rem', borderColor: 'rgba(255,255,255,0.1)' }}>
            {copiedLink ? <><Check size={12} color="#10b981" /> Copied Link</> : <><Copy size={12} /> Copy Invite Link</>}
          </button>
        </div>
        
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Created By</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{room.createdBy?.username || 'Unknown'}</div>
        </div>
        
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Privacy</div>
          <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{room.isPrivate ? '🔒 Private (Invite only)' : '🌐 Public Room'}</div>
        </div>
        
        <div>
          <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)', marginBottom: '0.2rem', textTransform: 'uppercase', letterSpacing: '0.05em' }}>Room Status</div>
          <div style={{ display: 'inline-block', padding: '0.25rem 0.5rem', background: 'rgba(16,185,129,0.1)', color: '#6ee7b7', borderRadius: '4px', fontSize: '0.75rem', fontWeight: 600, width: 'fit-content' }}>
            {room.status || 'active'}
          </div>
        </div>
      </div>
    </div>
  );
};

// ─── Component: RoomSettingsPanel ───
const RoomSettingsPanel = ({ roomId, room, onRefresh, user }) => {
  const isOwner = room?.createdBy?._id === user?._id || room?.createdBy === user?._id;
  const [name, setName] = useState(room?.name || '');
  const [description, setDescription] = useState(room?.description || '');
  const [subject, setSubject] = useState(room?.subject || '');
  const [studyDuration, setStudyDuration] = useState(room?.studyDuration || 30);
  const [isLocked, setIsLocked] = useState(room?.isLocked || false);
  const [saving, setSaving] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();

  useEffect(() => {
    if (room) {
      setName(room.name || '');
      setDescription(room.description || '');
      setSubject(room.subject || '');
      setStudyDuration(room.studyDuration || 30);
      setIsLocked(room.isLocked || false);
    }
  }, [room]);

  const handleSave = async (e) => {
    e.preventDefault();
    if (!isOwner) return;
    try {
      setSaving(true);
      setErrorMsg('');
      setSuccessMsg('');
      
      await roomsApi.update(roomId, {
        name,
        description,
        subject,
        studyDuration: Number(studyDuration)
      });

      if (isLocked !== room.isLocked) {
        await roomsApi.toggleLock(roomId);
      }

      setSuccessMsg('Settings updated successfully!');
      setTimeout(() => setSuccessMsg(''), 3000);
      onRefresh?.();
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update settings');
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!isOwner) return;
    if (!window.confirm('🚨 WARNING: Are you absolutely sure you want to delete this room? This action is permanent and cannot be undone.')) return;
    
    try {
      await roomsApi.delete(roomId);
      alert('Room deleted successfully.');
      navigate('/dashboard');
    } catch (err) {
      setErrorMsg(err.message || 'Failed to delete room');
    }
  };

  return (
    <div className="room-settings-panel" style={{ padding: '1.25rem', height: '100%', overflowY: 'auto' }}>
      <h3 className="panel-header-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderBottom: '1px solid var(--border-color)', paddingBottom: '0.75rem', marginBottom: '1rem' }}>
        <Settings size={16} color="#a855f7" /> Room Settings
      </h3>

      {!isOwner && (
        <div className="lock-banner" style={{ marginBottom: '1rem', background: 'rgba(245,158,11,0.08)', border: '1px solid rgba(245,158,11,0.2)', color: '#fcd34d' }}>
          🔒 Settings are read-only. Only the room creator can modify settings.
        </div>
      )}

      {successMsg && <div className="inline-toast inline-toast-success" style={{ marginBottom: '1rem' }}>{successMsg}</div>}
      {errorMsg && <div className="inline-toast inline-toast-error" style={{ marginBottom: '1rem' }}>{errorMsg}</div>}

      <form onSubmit={handleSave} style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', fontWeight: 600 }}>Room Name</label>
          <input
            type="text"
            value={name}
            onChange={(e) => setName(e.target.value)}
            disabled={!isOwner || saving}
            className="chat-input"
            style={{ width: '100%' }}
            required
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', fontWeight: 600 }}>Description</label>
          <textarea
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            disabled={!isOwner || saving}
            className="chat-input"
            style={{ width: '100%', minHeight: '60px', resize: 'vertical', fontFamily: 'inherit' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', fontWeight: 600 }}>Subject</label>
          <input
            type="text"
            value={subject}
            onChange={(e) => setSubject(e.target.value)}
            disabled={!isOwner || saving}
            className="chat-input"
            style={{ width: '100%' }}
          />
        </div>

        <div>
          <label style={{ display: 'block', fontSize: '0.72rem', color: 'var(--text-muted)', marginBottom: '0.3rem', textTransform: 'uppercase', fontWeight: 600 }}>Study Duration (minutes)</label>
          <select
            value={studyDuration}
            onChange={(e) => setStudyDuration(Number(e.target.value))}
            disabled={!isOwner || saving}
            className="chat-input"
            style={{ width: '100%', background: '#0f172a' }}
          >
            <option value={15}>15 Minutes</option>
            <option value={25}>25 Minutes</option>
            <option value={30}>30 Minutes</option>
            <option value={45}>45 Minutes</option>
            <option value={60}>60 Minutes</option>
            <option value={90}>90 Minutes</option>
            <option value={120}>120 Minutes</option>
          </select>
        </div>

        {isOwner && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', margin: '0.25rem 0' }}>
            <input
              type="checkbox"
              id="lockRoomCheckbox"
              checked={isLocked}
              onChange={(e) => setIsLocked(e.target.checked)}
              disabled={saving}
              style={{ cursor: 'pointer' }}
            />
            <label htmlFor="lockRoomCheckbox" style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', cursor: 'pointer', userSelect: 'none' }}>
              Lock Room (prevent new members)
            </label>
          </div>
        )}

        {isOwner && (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
            <button
              type="submit"
              className="btn btn-primary"
              disabled={saving}
              style={{ width: '100%', padding: '0.6rem' }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>

            <button
              type="button"
              className="btn btn-danger"
              onClick={handleDeleteRoom}
              style={{ width: '100%', padding: '0.6rem', background: 'rgba(239,68,68,0.1)', borderColor: 'rgba(239,68,68,0.2)', color: '#fca5a5' }}
            >
              Delete Room
            </button>
          </div>
        )}
      </form>
    </div>
  );
};

// ─── Main Component: StudyRoom ───
export const StudyRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Navigation & panels states
  const [activePanel, setActivePanel] = useState(null); // 'chat' | 'ai' | 'files' | 'members' | 'info' | 'settings' | null
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  const effectiveSidebarCollapsed = isSidebarCollapsed || isPanelExpanded;

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

  const handleTogglePanel = (panelName) => {
    if (activePanel === panelName) {
      setActivePanel(null); // Close if already open
    } else {
      setActivePanel(panelName); // Switch panel
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

  // Calculate if the user has controls over the timer (owners and admins)
  const isOwner = room?.createdBy?._id === user?._id || room?.createdBy === user?._id;
  const isAdmin = isOwner || (room?.admins || []).some(adminId => (adminId._id || adminId || adminId) === user?._id);

  return (
    <div className={`room-layout-container animate-fade-in ${isPanelExpanded ? 'panel-expanded' : ''}`}>
      
      {/* Collapsible Left Sidebar */}
      <div className={`room-sidebar ${effectiveSidebarCollapsed ? 'collapsed' : ''}`}>
        <div className="sidebar-brand">
          <div className="brand-logo">📚</div>
          {!effectiveSidebarCollapsed && <span className="brand-text">StudySync</span>}
        </div>
        
        <div className="sidebar-nav">
          <button 
            className={`sidebar-nav-item ${activePanel === 'chat' ? 'active' : ''}`}
            onClick={() => handleTogglePanel('chat')}
            title="Room Chat"
          >
            <MessageSquare size={18} />
            {!isSidebarCollapsed && <span>Chat</span>}
          </button>
          
          <button 
            className={`sidebar-nav-item ${activePanel === 'ai' ? 'active' : ''}`}
            onClick={() => handleTogglePanel('ai')}
            title="Gemini AI Assistant"
          >
            <Sparkles size={18} />
            {!isSidebarCollapsed && <span>AI Assistant</span>}
          </button>
          
          <button 
            className={`sidebar-nav-item ${activePanel === 'files' ? 'active' : ''}`}
            onClick={() => handleTogglePanel('files')}
            title="Shared Files"
          >
            <FolderUp size={18} />
            {!isSidebarCollapsed && <span>Shared Files</span>}
          </button>

          <button 
            className={`sidebar-nav-item ${activePanel === 'members' ? 'active' : ''}`}
            onClick={() => handleTogglePanel('members')}
            title="Room Members & Leaderboard"
          >
            <Users size={18} />
            {!isSidebarCollapsed && <span>Members</span>}
          </button>
          
          <button 
            className={`sidebar-nav-item ${activePanel === 'info' ? 'active' : ''}`}
            onClick={() => handleTogglePanel('info')}
            title="Room Information"
          >
            <Info size={18} />
            {!isSidebarCollapsed && <span>Room Info</span>}
          </button>

          <button 
            className={`sidebar-nav-item ${activePanel === 'settings' ? 'active' : ''}`}
            onClick={() => handleTogglePanel('settings')}
            title="Room Settings"
          >
            <Settings size={18} />
            {!isSidebarCollapsed && <span>Settings</span>}
          </button>
        </div>

        <div className="sidebar-footer">
          <button 
            className="sidebar-nav-item"
            onClick={() => navigate('/dashboard')}
            title="Back to Dashboard"
          >
            <ArrowLeft size={18} />
            {!isSidebarCollapsed && <span>Dashboard</span>}
          </button>
          
          <button 
            className="sidebar-nav-item danger"
            onClick={handleLeaveRoom}
            title="Leave Study Room"
          >
            <LogOut size={18} />
            {!effectiveSidebarCollapsed && <span>Leave Room</span>}
          </button>

          <div className="divider" style={{ margin: '0.5rem 0', background: 'rgba(255,255,255,0.06)' }} />

          <button 
            className="sidebar-collapse-btn" 
            onClick={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
            disabled={isPanelExpanded}
            title={effectiveSidebarCollapsed ? "Expand Sidebar" : "Collapse Sidebar"}
            style={{ opacity: isPanelExpanded ? 0.5 : 1, cursor: isPanelExpanded ? 'not-allowed' : 'pointer' }}
          >
            {effectiveSidebarCollapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>
      </div>

      {/* Side Active Panel (renders beside the sidebar only when activePanel is set) */}
      {activePanel && (
        <div className={`room-side-panel-container animate-fade-in ${isPanelExpanded ? 'expanded' : ''}`}>
          <div className="side-panel-header">
            <button 
              className="panel-expand-btn" 
              onClick={() => setIsPanelExpanded(!isPanelExpanded)} 
              title={isPanelExpanded ? 'Collapse Panel (Zoom Out)' : 'Expand Panel (Zoom In)'}
            >
              {isPanelExpanded ? <Minimize2 size={14} /> : <Maximize2 size={14} />}
            </button>
            <button className="panel-close-btn" onClick={() => { setActivePanel(null); setIsPanelExpanded(false); }} title="Close Panel">
              <X size={16} />
            </button>
          </div>
          <div className="side-panel-content">
            {activePanel === 'chat' && <ChatPanel roomId={roomId} />}
            {activePanel === 'ai' && <AIAssistant roomId={roomId} />}
            {activePanel === 'files' && <FileSharingPanel roomId={roomId} />}
            {activePanel === 'members' && (
              <RoomMembers 
                roomId={roomId} 
                initialMembers={members} 
                room={room} 
                onRefresh={() => fetchRoomData(false)}
              />
            )}
            {activePanel === 'info' && (
              <RoomInfoPanel 
                room={room}
                copiedCode={copiedCode}
                copiedLink={copiedLink}
                copyRoomCode={copyRoomCode}
                copyInviteLink={copyInviteLink}
              />
            )}
            {activePanel === 'settings' && (
              <RoomSettingsPanel 
                roomId={roomId} 
                room={room} 
                onRefresh={() => fetchRoomData(false)} 
                user={user}
              />
            )}
          </div>
        </div>
      )}

      {/* Central Study Focus Area (Always visible, prominent) */}
      <div className="study-center-area">
        <div className="study-center-header">
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <span className={`chat-status-dot ${connected ? 'chat-status-live' : 'chat-status-offline'}`} />
            <span style={{ fontSize: '0.72rem', fontWeight: 700, color: connected ? '#6ee7b7' : '#fca5a5', letterSpacing: '0.05em' }}>
              {connected ? 'SYNCED' : 'OFFLINE'}
            </span>
          </div>
          <div style={{ fontSize: '0.75rem', color: 'var(--text-secondary)', fontWeight: 600 }}>
            👥 {members.length} active
          </div>
        </div>

        <div className="study-center-content animate-fade-in">
          <div style={{ marginBottom: '2.5rem' }}>
            <h1 className="room-hero-title">{room.name}</h1>
            <p className="room-hero-desc">{room.description || 'Welcome to your focused study session.'}</p>
          </div>
          
          <StudyTimer 
            roomId={roomId} 
            duration={room.studyDuration} 
            isOwner={isAdmin} 
          />
        </div>
      </div>

    </div>
  );
};
