import { Users, Lock, Unlock, ShieldAlert, UserMinus } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useState, useEffect } from 'react';
import { sessions as sessionsApi, rooms as roomsApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';

export const RoomMembers = ({ roomId, initialMembers = [], room = null, onRefresh = null }) => {
  const [members, setMembers] = useState(initialMembers);
  const [prevInitialMembers, setPrevInitialMembers] = useState(initialMembers);
  const [roomStats, setRoomStats] = useState([]);
  const { socket } = useSocket();
  const { user: currentUser } = useAuth();

  if (initialMembers !== prevInitialMembers) {
    setPrevInitialMembers(initialMembers);
    setMembers(initialMembers);
  }

  useEffect(() => {
    if (!socket || !roomId) return;

    const handleMembersUpdated = (data) => {
      if (data.roomId === roomId) {
        setMembers(data.members || []);
      }
    };

    socket.on('room:members-updated', handleMembersUpdated);

    return () => {
      socket.off('room:members-updated', handleMembersUpdated);
    };
  }, [socket, roomId]);

  useEffect(() => {
    if (!roomId) return;

    const fetchRoomStats = async () => {
      try {
        const res = await sessionsApi.getRoomStats(roomId);
        setRoomStats(res.data || []);
      } catch (err) {
        console.error('Failed to fetch room stats:', err);
      }
    };

    fetchRoomStats();
    const interval = setInterval(fetchRoomStats, 15000); // refresh every 15s

    return () => clearInterval(interval);
  }, [roomId, members]);

  const handlePromote = async (targetUserId) => {
    if (!window.confirm('Are you sure you want to promote this user to Admin?')) return;
    try {
      await roomsApi.promote(roomId, targetUserId);
      if (onRefresh) onRefresh();
      alert('User promoted to Admin!');
    } catch (err) {
      alert(err.message || 'Failed to promote user');
    }
  };

  const handleKick = async (targetUserId) => {
    if (!window.confirm('Are you sure you want to kick this user from the room?')) return;
    try {
      await roomsApi.kick(roomId, targetUserId);
      if (onRefresh) onRefresh();
      // Socket event to notify about user being kicked
      socket?.emit('room:leave', { roomId, userId: targetUserId });
      alert('User kicked from room!');
    } catch (err) {
      alert(err.message || 'Failed to kick user');
    }
  };

  const handleToggleLock = async () => {
    try {
      await roomsApi.lock(roomId);
      if (onRefresh) onRefresh();
    } catch (err) {
      alert(err.message || 'Failed to lock/unlock room');
    }
  };

  // Helper check roles
  const ownerId = room?.createdBy?._id || room?.createdBy;
  const isOwner = String(ownerId) === String(currentUser?._id);
  const adminsList = room?.admins || [];
  const isAdmin = adminsList.map(a => String(a._id || a)).includes(String(currentUser?._id));
  const canManage = isOwner || isAdmin;

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow space-y-6">
      {/* Title & Lock Status */}
      <div className="flex items-center justify-between pb-4 border-b border-gray-100">
        <div className="flex items-center gap-2">
          <Users className="w-5 h-5 text-blue-600" />
          <h3 className="font-semibold text-gray-900">
            Members ({members.length})
          </h3>
        </div>
        {canManage && (
          <button
            onClick={handleToggleLock}
            className={`p-1.5 rounded-lg border transition ${
              room?.isLocked
                ? 'bg-red-50 border-red-200 text-red-600 hover:bg-red-100'
                : 'bg-green-50 border-green-200 text-green-600 hover:bg-green-100'
            }`}
            title={room?.isLocked ? 'Unlock Room' : 'Lock Room'}
          >
            {room?.isLocked ? <Lock className="w-4 h-4" /> : <Unlock className="w-4 h-4" />}
          </button>
        )}
      </div>

      {room?.isLocked && (
        <div className="bg-red-50 border border-red-200 rounded-lg p-2.5 flex items-center gap-2 text-xs text-red-700">
          <Lock className="w-4 h-4 text-red-600 flex-shrink-0" />
          <span>This room is currently locked. No new members can join.</span>
        </div>
      )}

      {/* Members List */}
      <div className="space-y-3">
        {members.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No members yet
          </p>
        ) : (
          members.filter(m => m).map((member) => {
            const memberId = String(member._id);
            const isMemberOwner = memberId === String(ownerId);
            const isMemberAdmin = adminsList.map(a => String(a._id || a)).includes(memberId);

            return (
              <div
                key={member._id}
                className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition text-xs"
              >
                <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold flex-shrink-0">
                  {(member.username?.[0] || 'U').toUpperCase()}
                </div>
                <div className="flex-1 min-w-0">
                  <p className="font-semibold text-gray-900 truncate">
                    {member.username || 'Student'}
                  </p>
                  <p className="text-gray-500 text-[10px] uppercase font-bold tracking-wider mt-0.5">
                    {isMemberOwner ? (
                      <span className="text-amber-600">👑 Owner</span>
                    ) : isMemberAdmin ? (
                      <span className="text-purple-600">🛡️ Admin</span>
                    ) : (
                      <span className="text-gray-400">Student</span>
                    )}
                  </p>
                </div>

                {/* Role Actions */}
                {canManage && String(currentUser?._id) !== memberId && !isMemberOwner && (
                  <div className="flex gap-1.5 flex-shrink-0">
                    {isOwner && !isMemberAdmin && (
                      <button
                        onClick={() => handlePromote(member._id)}
                        className="p-1 rounded bg-purple-50 hover:bg-purple-100 text-purple-600 border border-purple-200"
                        title="Promote to Admin"
                      >
                        <ShieldAlert className="w-3.5 h-3.5" />
                      </button>
                    )}
                    {(!isMemberAdmin || isOwner) && (
                      <button
                        onClick={() => handleKick(member._id)}
                        className="p-1 rounded bg-red-50 hover:bg-red-100 text-red-600 border border-red-200"
                        title="Kick Member"
                      >
                        <UserMinus className="w-3.5 h-3.5" />
                      </button>
                    )}
                  </div>
                )}
                <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
              </div>
            );
          })
        )}
      </div>

      {/* Room Leaderboard Section */}
      <div className="pt-6 border-t border-gray-100">
        <h3 className="font-semibold text-gray-900 mb-4 flex items-center gap-2">
          🏆 Room Leaderboard
        </h3>
        {roomStats.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No session stats yet
          </p>
        ) : (
          <div className="space-y-3">
            {roomStats.map((stat, index) => (
              <div
                key={stat.userId}
                className="flex items-center justify-between p-2.5 rounded-lg bg-gray-50 text-xs"
              >
                <div className="flex items-center gap-2 min-w-0">
                  <span className={`font-bold w-5 text-center ${index === 0 ? 'text-yellow-500' : index === 1 ? 'text-gray-400' : index === 2 ? 'text-amber-600' : 'text-gray-400'}`}>
                    {index + 1}
                  </span>
                  <span className="font-semibold text-gray-800 truncate">
                    {stat.username}
                  </span>
                </div>
                <div className="text-right flex-shrink-0">
                  <span className="font-bold text-blue-600">{stat.totalFocusMinutes}m</span>
                  <span className="text-gray-500 ml-1">({stat.totalPomodoros} 🍅)</span>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
};
