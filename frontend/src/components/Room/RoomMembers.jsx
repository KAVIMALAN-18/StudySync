import { useState, useEffect } from 'react';
import { Shield, Settings, UserMinus, ArrowUpCircle, Lock, Unlock, Users, Trophy } from 'lucide-react';
import { useAuth } from '../../hooks/useAuth';
import { rooms as roomsApi, sessions as sessionsApi } from '../../services/api';

export const RoomMembers = ({ roomId, initialMembers, room, onRefresh }) => {
  const formatMembersList = (rawMembers) => {
    return (rawMembers || []).map(m => {
      if (m && m.user) return m;
      const mId = m._id || m;
      const isMOwner = room?.createdBy?._id === mId || room?.createdBy === mId;
      const isMAdmin = isMOwner || (room?.admins || []).some(adminId => (adminId._id || adminId) === mId);
      return {
        user: m,
        role: isMOwner ? 'owner' : isMAdmin ? 'admin' : 'student'
      };
    });
  };

  const [members, setMembers] = useState(formatMembersList(initialMembers));
  const [leaderboard, setLeaderboard] = useState([]);
  const [isLocked, setIsLocked] = useState(room?.isLocked || false);
  const { user } = useAuth();
  
  const isOwner = room?.createdBy?._id === user._id || room?.createdBy === user._id;
  const isAdmin = isOwner || (room?.admins || []).some(adminId => (adminId._id || adminId) === user._id);

  useEffect(() => {
    setMembers(formatMembersList(initialMembers));
  }, [initialMembers, room]);

  useEffect(() => {
    if (room) {
      setIsLocked(room.isLocked || false);
    }
  }, [room]);

  useEffect(() => {
    if (!roomId) return;
    const loadLeaderboard = async () => {
      try {
        const res = await sessionsApi.getRoomLeaderboard(roomId);
        setLeaderboard(res.data || []);
      } catch (err) {
        console.error('Failed to load leaderboard', err);
      }
    };
    loadLeaderboard();
  }, [roomId]);

  const handlePromote = async (memberId) => {
    if (!window.confirm('Promote this member to admin?')) return;
    try {
      await roomsApi.updateRole(roomId, memberId, 'admin');
      onRefresh?.();
    } catch (err) {
      alert('Failed to promote member');
    }
  };

  const handleKick = async (memberId) => {
    if (!window.confirm('Remove this member from the room?')) return;
    try {
      await roomsApi.removeMember(roomId, memberId);
      onRefresh?.();
    } catch (err) {
      alert('Failed to remove member');
    }
  };

  const toggleLock = async () => {
    try {
      await roomsApi.toggleLock(roomId);
      setIsLocked(!isLocked);
      onRefresh?.();
    } catch (err) {
      alert('Failed to toggle lock status');
    }
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
      
      {/* Members List */}
      <div className="members-card">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '1rem' }}>
          <h3 className="section-title-sm" style={{ marginBottom: 0, display: 'flex', alignItems: 'center', gap: '0.3rem' }}>
            <Users size={14} /> Room Members ({members.length})
          </h3>
          {isAdmin && (
            <button 
              onClick={toggleLock} 
              className={`btn-icon ${isLocked ? 'locked' : ''}`}
              style={{ width: '26px', height: '26px', color: isLocked ? '#fca5a5' : '#6ee7b7' }}
              title={isLocked ? "Unlock Room" : "Lock Room"}
            >
              {isLocked ? <Lock size={14} /> : <Unlock size={14} />}
            </button>
          )}
        </div>

        {isLocked && (
          <div className="lock-banner" style={{ marginBottom: '1rem' }}>
            <Lock size={14} />
            Room is locked. New members cannot join.
          </div>
        )}

        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem', maxHeight: '300px', overflowY: 'auto' }}>
          {members.map((member) => {
            const mUser = member.user || {};
            const mRole = member.role;
            const isMe = mUser._id === user._id;
            const isTargetOwner = room?.createdBy?._id === mUser._id || room?.createdBy === mUser._id;

            return (
              <div key={mUser._id || Math.random()} className="member-item">
                <div className="member-avatar">
                  {(mUser.username?.[0] || '?').toUpperCase()}
                  {/* Status dot could be added here if synced via socket */}
                  <span className="member-online-dot" />
                </div>
                
                <div style={{ display: 'flex', flexDirection: 'column' }}>
                  <div className="member-name">
                    {mUser.username || 'Student'} {isMe && '(You)'}
                  </div>
                  <div className={`member-role ${isTargetOwner ? 'role-owner' : mRole === 'admin' ? 'role-admin' : 'role-student'}`}>
                    {isTargetOwner ? 'Owner' : mRole}
                  </div>
                </div>

                {isAdmin && !isTargetOwner && !isMe && (
                  <div className="member-actions">
                    {mRole !== 'admin' && (
                      <button 
                        className="member-action-btn member-promote" 
                        onClick={() => handlePromote(mUser._id)}
                        title="Promote to Admin"
                      >
                        <ArrowUpCircle size={14} />
                      </button>
                    )}
                    <button 
                      className="member-action-btn member-kick" 
                      onClick={() => handleKick(mUser._id)}
                      title="Remove from Room"
                    >
                      <UserMinus size={14} />
                    </button>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* Leaderboard */}
      <div className="members-card">
        <h3 className="section-title-sm" style={{ marginBottom: '1rem', display: 'flex', alignItems: 'center', gap: '0.3rem', color: '#fcd34d' }}>
          <Trophy size={14} /> Leaderboard
        </h3>
        
        <div style={{ display: 'flex', flexDirection: 'column', gap: '0.25rem' }}>
          {leaderboard.length === 0 ? (
            <div style={{ textAlign: 'center', padding: '1rem', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
              No sessions yet.
            </div>
          ) : (
            leaderboard.slice(0, 5).map((entry, index) => {
              const colors = ['#fcd34d', '#94a3b8', '#b45309', '#a5b4fc', '#a5b4fc'];
              const color = colors[index] || 'var(--text-secondary)';
              return (
                <div key={entry._id} className="leaderboard-item">
                  <div className="leaderboard-rank" style={{ color }}>#{index + 1}</div>
                  <div className="leaderboard-name">{entry.username}</div>
                  <div style={{ textAlign: 'right' }}>
                    <div className="leaderboard-mins">{entry.totalMinutes}m</div>
                    <div className="leaderboard-pom">{entry.sessions} 🍅</div>
                  </div>
                </div>
              );
            })
          )}
        </div>
      </div>
      
    </div>
  );
};
