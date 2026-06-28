import { useParams, useNavigate } from 'react-router-dom';
import { useState, useEffect, useCallback } from 'react';
import { ArrowLeft } from 'lucide-react';
import { rooms as roomsApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { ChatPanel } from './ChatPanel';
import { StudyTimer } from './StudyTimer';
import { RoomMembers } from './RoomMembers';
import { AIAssistant } from './AIAssistant';
import { WebRTCPanel } from './WebRTCPanel';
import { FileSharingPanel } from './FileSharingPanel';

export const StudyRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { user } = useAuth();
  const { socket, connected } = useSocket();
  const [room, setRoom] = useState(null);
  const [activeTab, setActiveTab] = useState('chat');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);

  const loadRoom = useCallback(async () => {
    try {
      setLoading(true);
      const data = await roomsApi.getDetail(roomId);
      setRoom(data.data);
      setError(null);
    } catch (err) {
      setError(err.message);
      console.error('Failed to load room:', err);
    } finally {
      setLoading(false);
    }
  }, [roomId]);

  useEffect(() => {
    const timer = setTimeout(() => {
      loadRoom();
    }, 0);
    return () => clearTimeout(timer);
  }, [loadRoom]);

  useEffect(() => {
    if (socket && connected && roomId && user) {
      socket.emit('room:join', { roomId, userId: user._id });
    }

    // Cleanup: emit room:leave when component unmounts (navigating away, tab close)
    return () => {
      if (socket && roomId && user) {
        socket.emit('room:leave', { roomId, userId: user._id });
      }
    };
  }, [socket, connected, roomId, user]);

  const handleLeaveRoom = async () => {
    if (!window.confirm('Are you sure you want to leave this study room?')) return;
    try {
      await roomsApi.leave(roomId);
      socket?.emit('room:leave', { roomId, userId: user._id });
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to leave room:', err);
      setError('Failed to leave room: ' + (err.message || 'Unknown error'));
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh]">
        <div className="text-center">
          <div className="w-12 h-12 border-4 border-blue-500 border-t-transparent rounded-full animate-spin mx-auto mb-4"></div>
          <p className="text-gray-600">Loading room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="max-w-7xl mx-auto px-4 py-8">
        <div className="bg-red-50 border border-red-200 rounded-lg p-6 text-center">
          <p className="text-red-800 font-semibold">Failed to load room</p>
          <p className="text-red-600 text-sm mt-2">{error}</p>
          <button
            onClick={() => navigate('/dashboard')}
            className="mt-4 bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg"
          >
            Back to Dashboard
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="max-w-7xl mx-auto px-4 py-8">
      {/* Header */}
      <div className="mb-6 flex items-center justify-between">
        <div className="flex items-center gap-4">
          <button
            onClick={() => navigate('/dashboard')}
            className="p-2 hover:bg-gray-200 rounded-lg transition"
          >
            <ArrowLeft className="w-5 h-5 text-gray-600" />
          </button>
          <div>
            <h1 className="text-3xl font-bold text-gray-900">{room.name}</h1>
            <p className="text-gray-600 mt-1">{room.description}</p>
          </div>
        </div>
        <button
          onClick={handleLeaveRoom}
          className="bg-red-600 hover:bg-red-700 text-white px-4 py-2 rounded-lg transition"
        >
          Leave Room
        </button>
      </div>

      {/* Main Layout */}
      <div className="grid grid-cols-1 lg:grid-cols-4 gap-6">
        {/* Left Sidebar - Timer */}
        <div className="lg:col-span-1">
          <StudyTimer roomId={roomId} duration={room.studyDuration} />
        </div>

        {/* Center - Interactive Workspace */}
        <div className="lg:col-span-2 flex flex-col space-y-4">
          {/* Tab Selector */}
          <div className="flex bg-gray-100 p-1.5 rounded-xl border border-gray-200">
            {[
              { id: 'chat', label: '💬 Chat' },
              { id: 'ai', label: '🤖 Gemini AI' },
              { id: 'webrtc', label: '📹 Call' },
              { id: 'files', label: '📂 Shared Files' }
            ].map(tab => (
              <button
                key={tab.id}
                onClick={() => setActiveTab(tab.id)}
                className={`flex-1 py-2 text-xs font-bold rounded-lg transition-all ${
                  activeTab === tab.id
                    ? 'bg-white text-blue-600 shadow-sm'
                    : 'text-gray-600 hover:text-gray-900 hover:bg-gray-50'
                }`}
              >
                {tab.label}
              </button>
            ))}
          </div>

          {/* Active Tab Panel */}
          <div className="flex-grow">
            {activeTab === 'chat' && <ChatPanel roomId={roomId} />}
            {activeTab === 'ai' && <AIAssistant roomId={roomId} />}
            {activeTab === 'webrtc' && <WebRTCPanel roomId={roomId} userId={user._id} />}
            {activeTab === 'files' && <FileSharingPanel roomId={roomId} />}
          </div>
        </div>

        {/* Right Sidebar - Members */}
        <div className="lg:col-span-1">
          <RoomMembers roomId={roomId} initialMembers={room.members} room={room} onRefresh={loadRoom} />
        </div>
      </div>

      {/* Room Info Footer */}
      <div className="mt-8 bg-blue-50 border border-blue-200 rounded-lg p-4">
        <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
          <div>
            <p className="text-sm text-blue-600 font-semibold">Created by</p>
            <p className="text-gray-900">{room.createdBy?.username}</p>
          </div>
          <div>
            <p className="text-sm text-blue-600 font-semibold">Members</p>
            <p className="text-gray-900">{room.members?.length || 0}</p>
          </div>
          <div>
            <p className="text-sm text-blue-600 font-semibold">Duration</p>
            <p className="text-gray-900">{room.studyDuration} minutes</p>
          </div>
          <div>
            <p className="text-sm text-blue-600 font-semibold">Status</p>
            <p className="text-gray-900 capitalize">{room.status}</p>
          </div>
        </div>
      </div>
    </div>
  );
};
