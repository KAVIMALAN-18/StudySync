import { Users } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useState, useEffect } from 'react';

export const RoomMembers = ({ roomId }) => {
  const [members, setMembers] = useState([]);
  const { socket } = useSocket();

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.on('room:members-updated', (data) => {
      if (data.roomId === roomId) {
        setMembers(data.members || []);
      }
    });

    return () => {
      socket.off('room:members-updated');
    };
  }, [socket, roomId]);

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow">
      <div className="flex items-center gap-2 mb-4">
        <Users className="w-5 h-5 text-blue-600" />
        <h3 className="font-semibold text-gray-900">
          Members ({members.length})
        </h3>
      </div>

      <div className="space-y-3">
        {members.length === 0 ? (
          <p className="text-gray-500 text-sm text-center py-4">
            No members yet
          </p>
        ) : (
          members.map((member) => (
            <div
              key={member._id}
              className="flex items-center gap-3 p-3 rounded-lg bg-gray-50 hover:bg-gray-100 transition"
            >
              <div className="w-8 h-8 bg-blue-500 rounded-full flex items-center justify-center text-white text-xs font-bold">
                {member.username[0].toUpperCase()}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-sm font-medium text-gray-900 truncate">
                  {member.username}
                </p>
              </div>
              <div className="w-2 h-2 bg-green-500 rounded-full"></div>
            </div>
          ))
        )}
      </div>
    </div>
  );
};
