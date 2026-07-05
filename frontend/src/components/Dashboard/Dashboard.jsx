import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Users, AlertCircle, Clock, BookOpen, Target, Flame, 
  ChevronRight, Activity, Code, Shield, Key, Sparkles, BookOpenCheck, ArrowRight, Lightbulb
} from 'lucide-react';
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
  
  // Create Room States
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [roomDescription, setRoomDescription] = useState('');
  const [roomDuration, setRoomDuration] = useState(30);
  const [roomSubject, setRoomSubject] = useState('General Study');
  const [roomIsPrivate, setRoomIsPrivate] = useState(false);
  const [creating, setCreating] = useState(false);

  // Join by Code States
  const [roomCodeToJoin, setRoomCodeToJoin] = useState('');
  const [joiningByCode, setJoiningByCode] = useState(false);
  
  const navigate = useNavigate();
  const { socket, emit, on, off } = useSocket();
  const { user } = useAuth();

  const SUBJECTS = [
    'General Study',
    'Java Interview Prep',
    'DSA Practice',
    'DBMS Revision',
    'Operating Systems',
    'Aptitude Practice',
    'Web Development',
    'Machine Learning'
  ];

  const ONBOARDING_TIPS = [
    { title: "Create a Room", desc: "Start a public or private study room to get your invite link & room code." },
    { title: "Add Friends", desc: "Go to the Collaborators tab, search for usernames, and send requests." },
    { title: "Invite to Session", desc: "Once a friend is online, click Invite next to their name to pull them into your room." },
    { title: "Auto Analytics", desc: "Every finished Pomodoro session automatically updates your stats and weekly charts." }
  ];

  const MOTIVATIONAL_QUOTES = [
    { quote: "Focus is a muscle, and you are building it right now.", author: "StudySync Guide" },
    { quote: "It always seems impossible until it's done.", author: "Nelson Mandela" },
    { quote: "Quality is not an act, it is a habit.", author: "Aristotle" },
    { quote: "The secret of getting ahead is getting started.", author: "Mark Twain" }
  ];

  // Pick a quote based on username length or day streak so it stays static per session
  const quoteIndex = (user?.username?.length || 0) % MOTIVATIONAL_QUOTES.length;
  const todayQuote = MOTIVATIONAL_QUOTES[quoteIndex];

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

  useEffect(() => {
    loadData();
    if (socket) {
      socket.emit('user:online', { userId: user._id, username: user.username, avatar: user.avatar });

      const handleUsersList = (users) => {
        setOnlineUsers(users);
      };

      const handleStatsUpdated = () => {
        loadData();
      };

      socket.on('users:list', handleUsersList);
      socket.on('stats:updated', handleStatsUpdated);

      return () => {
        socket.off('users:list', handleUsersList);
        socket.off('stats:updated', handleStatsUpdated);
      };
    }
  }, [user._id, user.username, user.avatar, socket]);

  const handleCreateRoom = async (e) => {
    e.preventDefault();
    try {
      setCreating(true);
      const newRoom = await roomsApi.create({
        name: roomName,
        description: roomDescription,
        subject: roomSubject,
        studyDuration: parseInt(roomDuration),
        isPrivate: roomIsPrivate,
      });
      
      const roomId = newRoom.data._id;
      setMyRooms([...myRooms, newRoom.data]);
      setShowCreateRoom(false);
      setRoomName('');
      setRoomDescription('');
      setRoomDuration(30);
      setRoomSubject('General Study');
      setRoomIsPrivate(false);
      setError(null);

      // Join the socket room instantly and navigate
      if (socket) {
        socket.emit('room:join', { roomId, userId: user._id });
      }
      navigate(`/room/${roomId}`);
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

  const handleJoinByCode = async (e) => {
    e.preventDefault();
    if (!roomCodeToJoin.trim()) return;

    try {
      setJoiningByCode(true);
      setError(null);
      const res = await roomsApi.joinByCode(roomCodeToJoin.trim());
      const roomId = res.data._id;
      
      if (socket) {
        socket.emit('room:join', { roomId, userId: user._id });
      }
      navigate(`/room/${roomId}`);
    } catch (err) {
      setError(err.message || 'Invalid or inactive room code');
      console.error('Failed to join by code:', err);
    } finally {
      setJoiningByCode(false);
      setRoomCodeToJoin('');
    }
  };

  const getWeeklyProgressData = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    
    // Find Monday of the current week
    const today = new Date();
    const currentDay = today.getDay(); // 0 is Sunday, 1 is Monday...
    const distanceToMonday = currentDay === 0 ? -6 : 1 - currentDay;
    
    const monday = new Date(today);
    monday.setDate(today.getDate() + distanceToMonday);
    monday.setHours(0, 0, 0, 0);

    for (let i = 0; i < 7; i++) {
      const d = new Date(monday);
      d.setDate(monday.getDate() + i);

      const daySessions = history.filter((s) => {
        const sDate = new Date(s.sessionDate);
        sDate.setHours(0, 0, 0, 0);
        return sDate.getTime() === d.getTime();
      });

      const minutes = daySessions.reduce((sum, s) => sum + (s.focusMinutes || 0), 0);
      const label = `${dayNames[d.getDay()]} ${d.getDate()} ${monthNames[d.getMonth()]}`;
      result.push({ label, minutes });
    }
    return result;
  };

  const weeklyData = getWeeklyProgressData();
  const maxMinutes = Math.max(...weeklyData.map((d) => d.minutes), 60);

  // Continue last session logic
  const lastSessionRoom = history.length > 0 ? history[0].roomId : null;

  if (loading) {
    return (
      <div className="dashboard-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading your study command center...</p>
        </div>
      </div>
    );
  }

  return (
    <div className="dashboard-shell animate-fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      
      {/* ── Welcome and Motivate section ── */}
      <div className="dashboard-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: '1.5rem' }}>
        <div>
          <h1 className="dashboard-greeting" style={{ fontSize: '2rem' }}>Welcome back, <span>{user.fullName || user.username}</span>!</h1>
          {(user.city || user.country) && (
            <div style={{ fontSize: '0.82rem', color: '#a5b4fc', marginTop: '0.2rem', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <span>📍 Studying from {[user.city, user.country].filter(Boolean).join(', ')}</span>
            </div>
          )}
          <p className="dashboard-sub" style={{ fontSize: '0.95rem' }}>
            "{todayQuote.quote}" — <span style={{ color: 'var(--text-secondary)', fontStyle: 'italic' }}>{todayQuote.author}</span>
          </p>
        </div>
        
        {/* Continue Last Session Quick Action */}
        {lastSessionRoom && (
          <div className="glass-card animate-pulse-glow" style={{ padding: '0.75rem 1.25rem', border: '1px solid rgba(129,140,248,0.25)', borderRadius: '12px', display: 'flex', alignItems: 'center', gap: '1rem', background: 'rgba(99, 102, 241, 0.05)' }}>
            <div>
              <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>CONTINUE STUDYING</div>
              <div style={{ fontSize: '0.85rem', fontWeight: 700, color: 'white' }}>{lastSessionRoom.name}</div>
            </div>
            <button 
              onClick={() => navigate(`/room/${lastSessionRoom._id}`)} 
              className="btn btn-primary" 
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}
            >
              Resume <ArrowRight size={14} />
            </button>
          </div>
        )}
      </div>

      {error && (
        <div className="inline-toast inline-toast-error animate-slide-up" style={{ marginBottom: '1.5rem' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* ── Top Stat Cards ── */}
      <div className="stat-cards-grid" style={{ marginBottom: '2rem' }}>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#a5b4fc' }}>
            <Clock size={20} />
          </div>
          <div className="stat-value">{stats.totalFocusMinutes}m</div>
          <div className="stat-label">Total Focus Time</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7' }}>
            <Target size={20} />
          </div>
          <div className="stat-value">{stats.totalPomodoros}</div>
          <div className="stat-label">Pomodoros Done</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#fcd34d' }}>
            <Flame size={20} />
          </div>
          <div className="stat-value">{stats.streak}</div>
          <div className="stat-label">Daily Streak</div>
        </div>
        <div className="stat-card">
          <div className="stat-icon" style={{ background: 'rgba(217,70,239,0.1)', color: '#f0abfc' }}>
            <BookOpen size={20} />
          </div>
          <div className="stat-value">{myRooms.length}</div>
          <div className="stat-label">Active Rooms</div>
        </div>
      </div>

      {/* ── Two-Column Layout ── */}
      <div className="dashboard-grid">
        
        {/* ── Left Main Content ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Weekly Analytics Chart */}
          <div className="chart-card">
            <h2 className="section-title"><Activity size={18} color="#a5b4fc" /> Focus Progress & Metrics</h2>
            <div style={{ height: '180px', marginTop: '1.5rem', position: 'relative' }}>
              <svg width="100%" height="100%" viewBox="0 0 700 180" preserveAspectRatio="none">
                <defs>
                  <linearGradient id="barGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#818cf8" />
                    <stop offset="100%" stopColor="#4f46e5" />
                  </linearGradient>
                </defs>
                
                {/* Grid Lines */}
                <line x1="0" y1="140" x2="700" y2="140" className="chart-grid-line" strokeWidth="1" />
                <line x1="0" y1="70" x2="700" y2="70" className="chart-grid-line" strokeWidth="1" strokeDasharray="4 4" />

                {weeklyData.map((d, i) => {
                  const barWidth = 40;
                  const gap = (700 - (7 * barWidth)) / 8;
                  const barHeight = Math.max((d.minutes / maxMinutes) * 120, 4); // min height 4
                  const x = gap + i * (barWidth + gap);
                  const y = 140 - barHeight;

                  return (
                    <g key={i}>
                      {/* Background Bar */}
                      <rect x={x} y="20" width={barWidth} height="120" rx="4" className="chart-bar-bg" />
                      {/* Foreground Bar */}
                      <rect x={x} y={y} width={barWidth} height={barHeight} rx="4" className="chart-bar-fill" />
                      
                      {d.minutes > 0 && (
                        <text x={x + barWidth/2} y={y - 8} textAnchor="middle" className="chart-val-label">
                          {d.minutes}m
                        </text>
                      )}
                      
                      <text x={x + barWidth/2} y="165" textAnchor="middle" className="chart-label">
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Room Controls (Create Room & Join Code Inline) */}
          <div style={{ display: 'flex', gap: '1rem', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap' }}>
            <h2 className="section-title" style={{ marginBottom: 0 }}><BookOpen size={18} color="#a5b4fc" /> My Study Rooms</h2>
            
            <div style={{ display: 'flex', gap: '0.75rem', alignItems: 'center' }}>
              {/* Join by Code Mini Form */}
              <form onSubmit={handleJoinByCode} style={{ display: 'flex', gap: '0.375rem' }}>
                <input 
                  type="text" 
                  value={roomCodeToJoin}
                  onChange={(e) => setRoomCodeToJoin(e.target.value)}
                  placeholder="Enter Room Code"
                  className="input-dark"
                  style={{ width: '130px', padding: '0.4rem 0.75rem', fontSize: '0.8rem', borderRadius: '6px' }}
                  required
                />
                <button type="submit" disabled={joiningByCode} className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem', borderColor: 'rgba(255,255,255,0.1)' }}>
                  <Key size={12} /> {joiningByCode ? 'Joining...' : 'Join'}
                </button>
              </form>
              
              <button className="btn btn-primary" onClick={() => setShowCreateRoom(!showCreateRoom)} style={{ padding: '0.45rem 1rem', fontSize: '0.8rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                <Plus size={16} /> Create Room
              </button>
            </div>
          </div>

          {showCreateRoom && (
            <form onSubmit={handleCreateRoom} className="create-room-panel animate-scale-up" style={{ padding: '1.75rem', borderRadius: '12px', background: 'rgba(15, 23, 42, 0.8)', border: '1px solid rgba(255,255,255,0.08)' }}>
              <h3 className="section-title-sm" style={{ marginBottom: '1.25rem', color: 'var(--text-primary)' }}>Create New Study Space</h3>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="auth-label">Room Name</label>
                  <input
                    type="text"
                    value={roomName}
                    onChange={(e) => setRoomName(e.target.value)}
                    className="input-dark"
                    placeholder="e.g., Late Night DSA Grind"
                    required
                  />
                </div>
                
                <div style={{ gridColumn: 'span 2' }}>
                  <label className="auth-label">Description</label>
                  <textarea
                    value={roomDescription}
                    onChange={(e) => setRoomDescription(e.target.value)}
                    className="input-dark"
                    placeholder="What are the goals of this session?"
                    rows="2"
                    style={{ resize: 'none' }}
                  />
                </div>

                <div>
                  <label className="auth-label">Subject</label>
                  <select 
                    value={roomSubject}
                    onChange={(e) => setRoomSubject(e.target.value)}
                    className="input-dark"
                    style={{ width: '100%', background: 'rgba(15,23,42,0.8)' }}
                  >
                    {SUBJECTS.map((sub) => (
                      <option key={sub} value={sub}>{sub}</option>
                    ))}
                  </select>
                </div>

                <div>
                  <label className="auth-label">Focus Duration</label>
                  <select 
                    value={roomDuration}
                    onChange={(e) => setRoomDuration(e.target.value)}
                    className="input-dark"
                    style={{ width: '100%', background: 'rgba(15,23,42,0.8)' }}
                  >
                    <option value="25">25 mins (Pomodoro standard)</option>
                    <option value="30">30 mins</option>
                    <option value="45">45 mins</option>
                    <option value="50">50 mins</option>
                    <option value="60">60 mins</option>
                    <option value="90">90 mins</option>
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2' }}>
                  <label className="auth-label">Room Privacy</label>
                  <select 
                    value={roomIsPrivate ? 'private' : 'public'}
                    onChange={(e) => setRoomIsPrivate(e.target.value === 'private')}
                    className="input-dark"
                    style={{ width: '100%', background: 'rgba(15,23,42,0.8)' }}
                  >
                    <option value="public">Public Study Room (visible to everyone)</option>
                    <option value="private">Private Study Room (accessible via invitation/invite link only)</option>
                  </select>
                </div>

                <div style={{ gridColumn: 'span 2', display: 'flex', gap: '0.75rem', marginTop: '0.5rem' }}>
                  <button type="submit" disabled={creating} className="btn btn-primary" style={{ flex: 1 }}>
                    {creating ? 'Spawning Space...' : 'Spawn Room'}
                  </button>
                  <button type="button" onClick={() => setShowCreateRoom(false)} className="btn btn-ghost" style={{ flex: 1 }}>
                    Cancel
                  </button>
                </div>
              </div>
            </form>
          )}

          {/* Rooms Grid */}
          {myRooms.length === 0 ? (
            <div className="empty-state glass-card" style={{ padding: '3rem 2rem' }}>
              <BookOpenCheck size={36} className="empty-state-icon" style={{ color: '#818cf8', opacity: 0.6 }} />
              <div className="empty-state-title">No Custom Rooms Yet</div>
              <div className="empty-state-sub" style={{ marginBottom: '1.25rem' }}>Your personal study spaces will be listed here. You can make them public for anyone to join, or keep them private for close friends.</div>
              <button className="btn btn-primary" onClick={() => setShowCreateRoom(true)}>
                <Plus size={16} /> Spawn Your First Room
              </button>
            </div>
          ) : (
            <div className="rooms-grid">
              {myRooms.map((room) => (
                <div key={room._id} onClick={() => navigate(`/room/${room._id}`)} className="room-card" style={{ cursor: 'pointer' }}>
                  <div className={`room-card-accent ${room.isPrivate ? 'private' : ''}`} style={{ background: room.isPrivate ? 'linear-gradient(135deg, #c084fc, #a855f7)' : 'linear-gradient(135deg, #818cf8, #4f46e5)' }} />
                  <div className="room-card-body">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span className="room-subject" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{room.subject || 'General Study'}</span>
                      {room.isPrivate && <span style={{ fontSize: '0.65rem', padding: '0.1rem 0.4rem', borderRadius: '4px', background: 'rgba(192, 132, 252, 0.1)', color: '#c084fc', border: '1px solid rgba(192, 132, 252, 0.2)' }}>Private</span>}
                    </div>
                    <h3 className="room-card-title">{room.name}</h3>
                    <p className="room-card-desc">{room.description || 'No description provided.'}</p>
                    <div className="room-card-meta" style={{ marginTop: '1rem' }}>
                      <div className="room-card-stat">
                        <Users size={14} /> {room.members?.length || 0} studying
                      </div>
                      <div className="room-card-stat">
                        <Clock size={14} /> {room.studyDuration}m session
                      </div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}

          {/* Public Study Spaces */}
          <h2 className="section-title"><Users size={18} color="#6ee7b7" /> Join Active Public Rooms</h2>
          {publicRooms.length === 0 ? (
            <div className="empty-state glass-card-sm" style={{ padding: '2.5rem 1.5rem' }}>
              <Users size={32} className="empty-state-icon" style={{ opacity: 0.3 }} />
              <div className="empty-state-title">All Quiet Here</div>
              <div className="empty-state-sub">There are currently no active public study spaces. Why not create one and start a public session?</div>
            </div>
          ) : (
            <div className="rooms-grid">
              {publicRooms.map((room) => (
                <div key={room._id} className="room-card">
                  <div className="room-card-accent-cyan" />
                  <div className="room-card-body">
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '0.25rem' }}>
                      <span className="room-subject" style={{ fontSize: '0.7rem', fontWeight: 700, color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{room.subject || 'General Study'}</span>
                    </div>
                    <h3 className="room-card-title">{room.name}</h3>
                    <p className="room-card-desc">{room.description || 'No description provided.'}</p>
                    
                    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginTop: '1rem' }}>
                      <div className="room-card-stat">
                        <Users size={14} /> {room.members?.length || 0} active
                      </div>
                      <button
                        onClick={(e) => { e.stopPropagation(); handleJoinRoom(room._id); }}
                        className="badge badge-emerald"
                        style={{ cursor: 'pointer', border: 'none', padding: '0.35rem 0.75rem', borderRadius: '4px', fontSize: '0.75rem' }}
                      >
                        Enter Room <ChevronRight size={12} />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>

        {/* ── Right Sidebar ── */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* Onboarding tips */}
          <div className="sidebar-card" style={{ background: 'rgba(99,102,241,0.02)', border: '1px solid rgba(129,140,248,0.1)' }}>
            <h3 className="section-title-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#a5b4fc' }}>
              <Lightbulb size={16} /> Quick Start Tips
            </h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.85rem', marginTop: '0.75rem' }}>
              {ONBOARDING_TIPS.map((tip, i) => (
                <div key={i} style={{ display: 'flex', gap: '0.5rem', alignItems: 'flex-start' }}>
                  <div style={{ background: 'rgba(129,140,248,0.1)', color: '#818cf8', fontSize: '0.7rem', fontWeight: 900, borderRadius: '4px', padding: '0.1rem 0.35rem', marginTop: '2px' }}>
                    {i+1}
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', fontWeight: 700, color: 'var(--text-primary)' }}>{tip.title}</div>
                    <div style={{ fontSize: '0.725rem', color: 'var(--text-muted)' }}>{tip.desc}</div>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Online Users */}
          <div className="sidebar-card">
            <h3 className="section-title-sm">Active Online ({onlineUsers.length})</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.4rem', marginTop: '0.75rem' }}>
              {onlineUsers.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>All collaborators offline</div>
              ) : (
                onlineUsers.slice(0, 8).map((u, idx) => (
                  <div key={idx} className="online-user-item" style={{ padding: '0.4rem 0.6rem', borderRadius: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div className="online-user-avatar" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8', fontWeight: 'bold' }}>
                      {(u.username?.[0] || 'U').toUpperCase()}
                      <span className="online-dot" style={{ background: '#10b981' }} />
                    </div>
                    <div className="online-user-name" style={{ fontSize: '0.8rem' }}>{u.username || 'Student'}</div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Recent Sessions */}
          <div className="sidebar-card">
            <h3 className="section-title-sm">Recent Activity</h3>
            <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '0.75rem', maxHeight: '300px', overflowY: 'auto' }}>
              {history.length === 0 ? (
                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', textAlign: 'center', padding: '1rem 0' }}>No recent study history</div>
              ) : (
                history.map((session, idx) => (
                  <div key={idx} className="session-item" style={{ padding: '0.6rem 0.85rem', borderRadius: '6px', background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)' }}>
                    <div>
                      <div className="session-room" style={{ fontSize: '0.8rem', fontWeight: 600 }}>{session.roomId?.name || 'Study Room'}</div>
                      <div className="session-date" style={{ fontSize: '0.675rem' }}>{new Date(session.sessionDate).toLocaleDateString()}</div>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <div className="session-mins" style={{ fontSize: '0.8rem', fontWeight: 700, color: '#818cf8' }}>{session.focusMinutes}m</div>
                      <div className="session-date" style={{ fontSize: '0.675rem' }}>{session.pomodoroCount} 🍅</div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>

      </div>
    </div>
  );
};
