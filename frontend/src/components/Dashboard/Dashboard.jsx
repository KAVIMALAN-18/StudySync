import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Plus, Users, AlertCircle } from 'lucide-react';
import { rooms as roomsApi, users as usersApi, sessions as sessionsApi } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';

export const Dashboard = () => {
  const [publicRooms, setPublicRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [stats, setStats] = useState({ totalFocusMinutes: 0, totalBreakMinutes: 0, totalPomodoros: 0, streak: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomDuration, setRoomDuration] = useState(30);
  const [creating, setCreating] = useState(false);
  const navigate = useNavigate();
  const { socket, emit, on, off } = useSocket();
  const { user } = useAuth();

  useEffect(() => {
    loadData();
    emit('user:online', { userId: user._id, username: user.username, avatar: user.avatar });

    on('users:list', (users) => {
      setOnlineUsers(users);
    });

    return () => {
      off('users:list', () => {});
    };
  }, [user._id, user.username, user.avatar, emit, on, off]);

  const loadData = async () => {
    try {
      setLoading(true);
      setError(null);
      const [allRooms, userRooms, userStats, userHistory] = await Promise.all([
        roomsApi.getAll(),
        roomsApi.getMyRooms(),
        sessionsApi.getStats(),
        sessionsApi.getHistory()
      ]);
      setPublicRooms(allRooms.data || []);
      setMyRooms(userRooms.data || []);
      setStats(userStats.data || { totalFocusMinutes: 0, totalBreakMinutes: 0, totalPomodoros: 0, streak: 0 });
      setHistory(userHistory.data || []);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load data:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      const newRoom = await roomsApi.create({
        name: roomName,
        description: roomDescription,
        studyDuration: parseInt(roomDuration),
        isPrivate: false,
      });
      setMyRooms([...myRooms, newRoom.data]);
      setShowCreateRoom(false);
      setRoomName('');
      setRoomDescription('');
      setRoomDuration(30);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to create room:', err);
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      await roomsApi.join(roomId);
      socket?.emit('room:join', { roomId, userId: user._id });
      navigate(`/room/${roomId}`);
    } catch (err) {
      console.error('Failed to join room:', err);
      alert(err.message || 'Failed to join room');
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading dashboard...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto">
      {error && (
        <div className="mb-6 bg-red-50 border border-red-200 rounded-lg p-4 flex items-gap-3">
          <AlertCircle className="w-5 h-5 text-red-600 flex-shrink-0 mt-0.5" />
          <div>
            <p className="text-red-800 text-sm font-semibold">Error</p>
            <p className="text-red-700 text-sm">{error}</p>
          </div>
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        {/* Main Content */}
        <div className="lg:col-span-2 space-y-8">
          {/* My Rooms */}
          <section>
            <div className="flex items-center justify-between mb-4">
              <h2 className="text-2xl font-bold text-gray-900">My Study Rooms</h2>
              <button
                onClick={() => setShowCreateRoom(!showCreateRoom)}
                className="flex items-center gap-2 bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition"
              >
                <Plus className="w-5 h-5" />
                Create Room
              </button>
            </div>

            {showCreateRoom && (
              <form onSubmit={handleCreateRoom} className="bg-blue-50 p-6 rounded-lg mb-6 border border-blue-200">
                <div className="space-y-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Room Name
                    </label>
                    <input
                      type="text"
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="e.g., Math Study Group"
                      required
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Description
                    </label>
                    <textarea
                      value={roomDescription}
                      onChange={(e) => setRoomDescription(e.target.value)}
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                      placeholder="What will you study?"
                      rows="3"
                    />
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700 mb-1">
                      Study Duration (minutes)
                    </label>
                    <input
                      type="number"
                      value={roomDuration}
                      onChange={(e) => setRoomDuration(e.target.value)}
                      min="5"
                      max="240"
                      className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                    />
                  </div>

                  <div className="flex gap-3">
                    <button
                      type="submit"
                      disabled={creating}
                      className="flex-1 bg-blue-600 hover:bg-blue-700 disabled:bg-gray-400 text-white py-2 rounded-lg transition font-semibold"
                    >
                      {creating ? 'Creating...' : 'Create'}
                    </button>
                    <button
                      type="button"
                      onClick={() => setShowCreateRoom(false)}
                      className="flex-1 bg-gray-300 hover:bg-gray-400 text-gray-800 py-2 rounded-lg transition font-semibold"
                    >
                      Cancel
                    </button>
                  </div>
                </div>
              </form>
            )}

            {myRooms.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No rooms yet. Create one to get started!</p>
            ) : (
              <div className="grid gap-4">
                {myRooms.map((room) => (
                  <div
                    key={room._id}
                    onClick={() => navigate(`/room/${room._id}`)}
                    className="bg-white p-6 rounded-lg shadow hover:shadow-lg cursor-pointer transition border border-gray-200"
                  >
                    <h3 className="text-lg font-semibold text-gray-900 mb-2">{room.name}</h3>
                    <p className="text-gray-600 text-sm mb-3">{room.description}</p>
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-4 text-sm text-gray-600">
                        <span>{room.members?.length || 0} members</span>
                        <span>{room.studyDuration} min</span>
                      </div>
                      <span className={`px-3 py-1 rounded-full text-xs font-medium ${
                        room.status === 'active'
                          ? 'bg-green-100 text-green-800'
                          : 'bg-gray-100 text-gray-800'
                      }`}>
                        {room.status}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>

          {/* Public Rooms */}
          <section>
            <h2 className="text-2xl font-bold text-gray-900 mb-4">Public Study Rooms</h2>
            {publicRooms.length === 0 ? (
              <p className="text-gray-600 text-center py-8">No public rooms available</p>
            ) : (
              <div className="grid gap-4">
                {publicRooms.map((room) => (
                  <div
                    key={room._id}
                    className="bg-white p-6 rounded-lg shadow hover:shadow-lg transition border border-gray-200"
                  >
                    <div className="flex items-start justify-between">
                      <div className="flex-1">
                        <h3 className="text-lg font-semibold text-gray-900 mb-2">{room.name}</h3>
                        <p className="text-gray-600 text-sm mb-3">{room.description}</p>
                        <div className="flex items-center gap-4 text-sm text-gray-600">
                          <span>{room.members?.length || 0} members</span>
                          <span>{room.studyDuration} min</span>
                        </div>
                      </div>
                      <button
                        onClick={() => handleJoinRoom(room._id)}
                        className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg transition whitespace-nowrap"
                      >
                        Join
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </section>
        </div>

        {/* Sidebar */}
        <aside className="space-y-6">
          {/* Online Users */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <div className="flex items-center gap-2 mb-4">
              <Users className="w-5 h-5 text-blue-600" />
              <h3 className="font-semibold text-gray-900">Online Now</h3>
            </div>
            <div className="space-y-3">
              {onlineUsers.length === 0 ? (
                <p className="text-gray-600 text-sm text-center py-4">No one online</p>
              ) : (
                onlineUsers.slice(0, 8).map((u, idx) => (
                  <div key={idx} className="flex items-center gap-3 p-2 rounded hover:bg-gray-50">
                    <div className="w-8 h-8 bg-blue-200 rounded-full flex items-center justify-center flex-shrink-0">
                      <span className="text-blue-600 text-xs font-bold">
                        {(u.username?.[0] || 'U').toUpperCase()}
                      </span>
                    </div>
                    <span className="text-sm text-gray-700 truncate flex-1">
                      {u.username || 'Student'}
                    </span>
                    <div className="w-2 h-2 bg-green-500 rounded-full flex-shrink-0"></div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* My Study Stats */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 font-sans">My Study Stats</h3>
            <div className="grid grid-cols-2 gap-4">
              <div className="bg-blue-50 p-3 rounded-lg text-center">
                <p className="text-xs text-blue-600 font-semibold uppercase">Focus Time</p>
                <p className="text-xl font-bold text-blue-900 mt-1">{stats.totalFocusMinutes}m</p>
              </div>
              <div className="bg-green-50 p-3 rounded-lg text-center">
                <p className="text-xs text-green-600 font-semibold uppercase">Break Time</p>
                <p className="text-xl font-bold text-green-900 mt-1">{stats.totalBreakMinutes}m</p>
              </div>
              <div className="bg-purple-50 p-3 rounded-lg text-center">
                <p className="text-xs text-purple-600 font-semibold uppercase">Pomodoros</p>
                <p className="text-xl font-bold text-purple-900 mt-1">{stats.totalPomodoros}</p>
              </div>
              <div className="bg-orange-50 p-3 rounded-lg text-center">
                <p className="text-xs text-orange-600 font-semibold uppercase">Streak</p>
                <p className="text-xl font-bold text-orange-900 mt-1">{stats.streak}🔥</p>
              </div>
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4 font-sans">Recent Sessions</h3>
            {history.length === 0 ? (
              <p className="text-gray-500 text-sm text-center py-4">No recent sessions</p>
            ) : (
              <div className="space-y-3 max-h-60 overflow-y-auto pr-1">
                {history.map((session, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded-lg bg-gray-50 hover:bg-gray-100 text-xs">
                    <div className="min-w-0 flex-1 mr-2">
                      <p className="font-semibold text-gray-800 truncate">
                        {session.roomId?.name || 'Study Room'}
                      </p>
                      <p className="text-gray-500 mt-0.5">
                        {new Date(session.sessionDate).toLocaleDateString()}
                      </p>
                    </div>
                    <div className="text-right flex-shrink-0">
                      <p className="font-bold text-blue-600">{session.focusMinutes}m focus</p>
                      <p className="text-gray-500 mt-0.5">{session.pomodoroCount} cycle(s)</p>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Quick Stats */}
          <div className="bg-white p-6 rounded-lg shadow border border-gray-200">
            <h3 className="font-semibold text-gray-900 mb-4">Stats</h3>
            <div className="space-y-3">
              <div>
                <p className="text-sm text-gray-600">Active Rooms</p>
                <p className="text-2xl font-bold text-blue-600">{publicRooms.length}</p>
              </div>
              <div>
                <p className="text-sm text-gray-600">Online Students</p>
                <p className="text-2xl font-bold text-green-600">{onlineUsers.length}</p>
              </div>
            </div>
          </div>
        </aside>
      </div>
    </div>
  );
};
