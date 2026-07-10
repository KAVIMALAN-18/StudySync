import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Plus, Users, AlertCircle, Clock, BookOpen, Target, Flame, 
  ChevronRight, Code, Shield, Key, ArrowRight, Lightbulb, BookOpenCheck
} from 'lucide-react';
import { rooms as roomsApi, sessions as sessionsApi } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { HoverCard, HoverCardTrigger, HoverCardContent } from '../ui/hover-card';
import { toast } from 'sonner';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogFooter,
  DialogClose,
} from "../ui/dialog";
import { cn } from '../../lib/utils';

export const Dashboard = () => {
  const [publicRooms, setPublicRooms] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [onlineUsers, setOnlineUsers] = useState([]);
  const [stats, setStats] = useState({ totalFocusMinutes: 0, totalBreakMinutes: 0, totalPomodoros: 0, streak: 0 });
  const [history, setHistory] = useState([]);
  const [loading, setLoading] = useState(true);
  
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
  const [codePreview, setCodePreview] = useState(null);
  const [codeError, setCodeError] = useState(null);
  const [searchingCode, setSearchingCode] = useState(false);
  
  const navigate = useNavigate();
  const { socket } = useSocket();
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

  const quoteIndex = (user?.username?.length || 0) % MOTIVATIONAL_QUOTES.length;
  const todayQuote = MOTIVATIONAL_QUOTES[quoteIndex];

  const loadData = async (showLoadingSkeleton = true) => {
    try {
      if (showLoadingSkeleton) setLoading(true);
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
      toast.error(err.message || 'Failed to load dashboard data');
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
        loadData(false);
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
      toast.success('Room spawned successfully!');

      if (socket) {
        socket.emit('room:join', { roomId, userId: user._id });
      }
      navigate(`/room/${roomId}`);
    } catch (err) {
      toast.error(err.message || 'Failed to create room');
    } finally {
      setCreating(false);
    }
  };

  const handleJoinRoom = async (roomId) => {
    try {
      await roomsApi.join(roomId);
      socket?.emit('room:join', { roomId, userId: user._id });
      toast.success('Entered Study Room');
      navigate(`/room/${roomId}`);
    } catch (err) {
      toast.error(err.message || 'Failed to join room');
    }
  };

  const handlePreviewCode = async (e) => {
    e.preventDefault();
    const code = roomCodeToJoin.trim().toUpperCase();
    if (!code) return;
    setSearchingCode(true);
    setCodePreview(null);
    setCodeError(null);
    try {
      const res = await roomsApi.getByCode(code);
      setCodePreview(res.data);
    } catch (err) {
      const msg = err.message || 'Invalid room code';
      if (msg.toLowerCase().includes('lock')) {
        setCodeError({ type: 'locked', message: 'This room is locked by the owner.' });
      } else if (msg.toLowerCase().includes('full')) {
        setCodeError({ type: 'full', message: 'This room is full.' });
      } else {
        setCodeError({ type: 'invalid', message: 'No room found with that code.' });
      }
      toast.error(msg);
    } finally {
      setSearchingCode(false);
    }
  };

  const handleJoinByCode = async (roomId) => {
    try {
      setJoiningByCode(true);
      await roomsApi.join(roomId);
      if (socket) socket.emit('room:join', { roomId, userId: user._id });
      toast.success('Entered study room successfully!');
      navigate(`/room/${roomId}`);
    } catch (err) {
      setCodeError({ type: 'error', message: err.message || 'Failed to join room' });
      toast.error(err.message || 'Failed to join room');
    } finally {
      setJoiningByCode(false);
    }
  };

  const getWeeklyProgressData = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
    const monthNames = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    const result = [];
    
    const today = new Date();
    const currentDay = today.getDay();
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
  const lastSessionRoom = history.length > 0 ? history[0].roomId : null;

  if (loading) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-fade-in">
        <div className="space-y-3">
          <Skeleton className="h-10 w-64" />
          <Skeleton className="h-5 w-96" />
        </div>
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <div className="lg:col-span-2 space-y-6">
            <Skeleton className="h-52 rounded-xl" />
            <Skeleton className="h-44 rounded-xl" />
          </div>
          <div className="space-y-6">
            <Skeleton className="h-40 rounded-xl" />
            <Skeleton className="h-64 rounded-xl" />
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-fade-in">
      
      {/* Welcome Area */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-white tracking-tight">
            Welcome back, <span className="text-indigo-400">{user.fullName || user.username}</span>!
          </h1>
          {user.city && (
            <div className="text-xs text-indigo-300 mt-1 flex items-center gap-1">
              📍 Studying from {user.city}, {user.country}
            </div>
          )}
          <p className="text-sm text-slate-400 mt-2 max-w-2xl">
            "{todayQuote.quote}" — <span className="italic text-slate-500">{todayQuote.author}</span>
          </p>
        </div>
        
        {lastSessionRoom && (
          <div className="bg-indigo-600/5 border border-indigo-500/20 rounded-xl p-4 flex items-center gap-4 animate-pulse-glow shrink-0">
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Continue Studying</div>
              <div className="text-sm font-bold text-white">{lastSessionRoom.name}</div>
            </div>
            <button 
              onClick={() => navigate(`/room/${lastSessionRoom._id}`)} 
              className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
            >
              Resume <ArrowRight size={13} className="ml-1" />
            </button>
          </div>
        )}
      </div>

      {/* Grid Statistics */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-slate-900/40 border border-border p-5 rounded-xl flex items-center gap-4 hover:border-indigo-500/35 transition-all">
          <div className="p-3 bg-indigo-600/10 text-indigo-400 rounded-lg">
            <Clock size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-white">{stats.totalFocusMinutes}m</div>
            <div className="text-xs text-slate-400">Total Focus Time</div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-border p-5 rounded-xl flex items-center gap-4 hover:border-emerald-500/35 transition-all">
          <div className="p-3 bg-emerald-600/10 text-emerald-400 rounded-lg">
            <Target size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-white">{stats.totalPomodoros}</div>
            <div className="text-xs text-slate-400">Pomodoros Completed</div>
          </div>
        </div>

        <div className="bg-slate-900/40 border border-border p-5 rounded-xl flex items-center gap-4 hover:border-amber-500/35 transition-all">
          <div className="p-3 bg-amber-600/10 text-amber-400 rounded-lg">
            <Flame size={22} />
          </div>
          <div>
            <div className="text-2xl font-bold font-display text-white">{stats.streak}</div>
            <div className="text-xs text-slate-400">Daily Streak</div>
          </div>
        </div>
      </div>

      {/* Main Sections */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
        
        {/* Left main content columns */}
        <div className="lg:col-span-2 space-y-8">
          
          {/* Weekly chart progress */}
          <div className="bg-slate-900/40 border border-border p-6 rounded-xl space-y-4">
            <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
              <BookOpenCheck size={18} className="text-indigo-400" /> Focus Progress & Metrics
            </h2>
            <div className="h-44 w-full relative">
              <svg width="100%" height="100%" viewBox="0 0 700 180" preserveAspectRatio="none">
                <line x1="0" y1="140" x2="700" y2="140" className="stroke-slate-800" strokeWidth="1" />
                <line x1="0" y1="70" x2="700" y2="70" className="stroke-slate-800/50" strokeWidth="1" strokeDasharray="4 4" />
                {weeklyData.map((d, i) => {
                  const barWidth = 40;
                  const gap = (700 - (7 * barWidth)) / 8;
                  const barHeight = Math.max((d.minutes / maxMinutes) * 120, 4);
                  const x = gap + i * (barWidth + gap);
                  const y = 140 - barHeight;
                  return (
                    <g key={i}>
                      <rect x={x} y="20" width={barWidth} height="120" rx="4" className="fill-slate-900/70" />
                      <rect x={x} y={y} width={barWidth} height={barHeight} rx="4" className="fill-indigo-600/80 hover:fill-indigo-500 transition-colors" />
                      {d.minutes > 0 && (
                        <text x={x + barWidth/2} y={y - 8} textAnchor="middle" className="text-[10px] font-bold fill-indigo-400">
                          {d.minutes}m
                        </text>
                      )}
                      <text x={x + barWidth/2} y="160" textAnchor="middle" className="text-[9px] fill-slate-500 font-medium">
                        {d.label}
                      </text>
                    </g>
                  );
                })}
              </svg>
            </div>
          </div>

          {/* Rooms Area */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold font-display text-white flex items-center gap-2">
                <BookOpen size={18} className="text-indigo-400" /> My Study Rooms
              </h2>
              <button 
                onClick={() => setShowCreateRoom(true)}
                className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
              >
                <Plus size={14} className="mr-1" /> Create Room
              </button>
            </div>

            {/* Create Room Dialog */}
            <Dialog open={showCreateRoom} onOpenChange={setShowCreateRoom}>
              <DialogContent className="max-w-md bg-slate-950 border border-border">
                <DialogHeader>
                  <DialogTitle>Spawn Study Space</DialogTitle>
                </DialogHeader>
                <form onSubmit={handleCreateRoom} className="space-y-4 pt-2">
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Room Name</label>
                    <Input 
                      value={roomName}
                      onChange={(e) => setRoomName(e.target.value)}
                      placeholder="e.g., Late Night DSA Grind"
                      required
                    />
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Description</label>
                    <Textarea 
                      value={roomDescription}
                      onChange={(e) => setRoomDescription(e.target.value)}
                      placeholder="What are the goals of this session?"
                      rows={2}
                      className="resize-none"
                    />
                  </div>
                  <div className="grid grid-cols-2 gap-4">
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Subject</label>
                      <Select value={roomSubject} onChange={(e) => setRoomSubject(e.target.value)}>
                        {SUBJECTS.map(sub => <option key={sub} value={sub}>{sub}</option>)}
                      </Select>
                    </div>
                    <div className="space-y-1">
                      <label className="text-xs text-slate-400 font-medium">Focus Duration</label>
                      <Select value={roomDuration} onChange={(e) => setRoomDuration(e.target.value)}>
                        <option value="25">25 mins (Standard)</option>
                        <option value="30">30 mins</option>
                        <option value="45">45 mins</option>
                        <option value="60">60 mins</option>
                      </Select>
                    </div>
                  </div>
                  <div className="space-y-1">
                    <label className="text-xs text-slate-400 font-medium">Privacy Setting</label>
                    <Select value={roomIsPrivate ? 'private' : 'public'} onChange={(e) => setRoomIsPrivate(e.target.value === 'private')}>
                      <option value="public">Public (Visible to everyone)</option>
                      <option value="private">Private (Invite only)</option>
                    </Select>
                  </div>
                  <DialogFooter className="pt-2">
                    <DialogClose asChild>
                      <button type="button" className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
                        Cancel
                      </button>
                    </DialogClose>
                    <button type="submit" disabled={creating} className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer ml-2">
                      {creating ? 'Spawning...' : 'Spawn Room'}
                    </button>
                  </DialogFooter>
                </form>
              </DialogContent>
            </Dialog>

            {myRooms.length === 0 ? (
              <div className="border border-border border-dashed p-8 rounded-xl text-center space-y-4 bg-slate-900/10">
                <BookOpenCheck size={36} className="mx-auto text-slate-600" />
                <div className="text-sm font-bold text-white">No custom rooms created yet</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">
                  Create your personal study rooms to customize study duration, select privacy settings, and study together.
                </p>
                <button 
                  onClick={() => setShowCreateRoom(true)} 
                  className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                >
                  Create Your First Room
                </button>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {myRooms.map((room) => (
                  <div 
                    key={room._id} 
                    onClick={() => navigate(`/room/${room._id}`)} 
                    className="group bg-slate-900/40 hover:bg-slate-900/70 border border-border hover:border-indigo-500/40 rounded-xl p-5 cursor-pointer relative overflow-hidden transition-all"
                  >
                    <div className={cn(
                      "absolute left-0 top-0 bottom-0 w-1",
                      room.isPrivate ? "bg-purple-500" : "bg-indigo-500"
                    )} />
                    <div className="flex justify-between items-start mb-2">
                      <span className="text-[10px] font-bold text-slate-500 uppercase tracking-wider">{room.subject || 'General'}</span>
                      {room.isPrivate && (
                        <span className="text-[9px] px-1.5 py-0.5 rounded bg-purple-500/10 text-purple-400 border border-purple-500/20">Private</span>
                      )}
                    </div>
                    <h3 className="font-bold font-display text-white text-base truncate group-hover:text-indigo-400 transition-colors">{room.name}</h3>
                    <p className="text-xs text-slate-400 line-clamp-2 mt-1 h-8">{room.description || 'No description provided.'}</p>
                    <div className="flex gap-4 text-[10px] text-slate-500 pt-4 mt-2 border-t border-border/20">
                      <span className="flex items-center gap-1"><Users size={12} /> {room.members?.length || 0} studying</span>
                      <span className="flex items-center gap-1"><Clock size={12} /> {room.studyDuration} mins</span>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* Public Study Spaces */}
            <h2 className="text-lg font-bold font-display text-white flex items-center gap-2 pt-4">
              <Users size={18} className="text-emerald-400" /> Active Public Rooms
            </h2>
            {publicRooms.length === 0 ? (
              <div className="border border-border p-8 rounded-xl text-center space-y-2 bg-slate-900/10">
                <Users size={32} className="mx-auto text-slate-700" />
                <div className="text-xs font-semibold text-slate-500">No public study rooms are currently online.</div>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {publicRooms.map((room) => (
                  <div key={room._id} className="bg-slate-900/40 border border-border rounded-xl p-5 flex flex-col justify-between hover:border-emerald-500/20 transition-all">
                    <div>
                      <div className="text-[10px] font-bold text-slate-500 uppercase tracking-wider mb-2">{room.subject || 'General'}</div>
                      <h3 className="font-bold font-display text-white text-base truncate">{room.name}</h3>
                      <p className="text-xs text-slate-400 line-clamp-2 mt-1 h-8">{room.description || 'No description provided.'}</p>
                    </div>
                    
                    <div className="flex items-center justify-between pt-4 mt-4 border-t border-border/20">
                      <span className="text-[10px] text-slate-500 flex items-center gap-1"><Users size={12} /> {room.members?.length || 0} active</span>
                      <button
                        onClick={() => handleJoinRoom(room._id)}
                        className="inline-flex items-center justify-center rounded text-xs font-bold h-7 px-3 bg-emerald-600/10 hover:bg-emerald-600 text-emerald-400 hover:text-white transition-all cursor-pointer"
                      >
                        Enter Room <ChevronRight size={11} className="ml-0.5" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Right Sidebar Columns */}
        <div className="space-y-6">
          
          {/* Join by Code Column */}
          <div className="bg-slate-900/40 border border-indigo-500/20 p-5 rounded-xl space-y-4">
            <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
              <Key size={15} className="text-indigo-400" /> Join by Room Code
            </h3>
            <form onSubmit={handlePreviewCode} className="flex gap-2">
              <Input
                value={roomCodeToJoin}
                onChange={(e) => { setRoomCodeToJoin(e.target.value.toUpperCase()); setCodePreview(null); setCodeError(null); }}
                placeholder="e.g. JVA7K9"
                className="font-bold tracking-widest text-center text-white placeholder:tracking-normal uppercase"
                maxLength={8}
                required
              />
              <button 
                type="submit" 
                disabled={searchingCode} 
                className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shrink-0"
              >
                {searchingCode ? '...' : 'Search'}
              </button>
            </form>

            {codeError && (
              <div className="p-3 rounded-lg bg-red-500/10 border border-red-500/20 flex items-center gap-2">
                <AlertCircle size={14} className="text-red-400" />
                <span className="text-[11px] text-red-300">{codeError.message}</span>
              </div>
            )}

            {codePreview && (
              <div className="p-4 rounded-lg bg-indigo-600/5 border border-indigo-500/25 space-y-3 animate-scale-up">
                <div className="flex justify-between items-start">
                  <div>
                    <h4 className="font-bold text-white text-sm">{codePreview.name}</h4>
                    <span className="text-[10px] text-indigo-400 font-semibold">{codePreview.subject || 'General'}</span>
                  </div>
                  <span className={cn(
                    "text-[9px] font-bold px-1.5 py-0.5 rounded border",
                    codePreview.isPrivate 
                      ? "bg-purple-500/10 text-purple-400 border-purple-500/20" 
                      : "bg-emerald-500/10 text-emerald-400 border-emerald-500/20"
                  )}>
                    {codePreview.isPrivate ? '🔒 Private' : '🌐 Public'}
                  </span>
                </div>
                {codePreview.description && (
                  <p className="text-[11px] text-slate-400 leading-relaxed">{codePreview.description}</p>
                )}
                <div className="flex gap-4 text-[10px] text-slate-500">
                  <span>👥 {codePreview.members?.length || 0} members</span>
                  <span>🛡 Owner: {codePreview.createdBy?.username || 'Unknown'}</span>
                </div>
                <button
                  disabled={joiningByCode || codePreview.isLocked}
                  onClick={() => handleJoinByCode(codePreview._id)}
                  className="w-full inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                >
                  {codePreview.isLocked ? '🔒 Locked' : joiningByCode ? 'Joining...' : 'Join Room'}
                </button>
              </div>
            )}
          </div>

          {/* Tips Column */}
          <div className="bg-slate-900/20 border border-border p-5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-indigo-300 uppercase tracking-wider flex items-center gap-1.5">
              <Lightbulb size={14} /> Quick Tips
            </h3>
            <div className="space-y-3.5">
              {ONBOARDING_TIPS.map((tip, i) => (
                <div key={i} className="flex gap-2.5 items-start">
                  <div className="bg-indigo-600/10 text-indigo-400 text-[10px] font-extrabold rounded w-5 h-5 flex items-center justify-center shrink-0">
                    {i+1}
                  </div>
                  <div>
                    <h4 className="text-xs font-bold text-white leading-tight">{tip.title}</h4>
                    <p className="text-[11px] text-slate-400 leading-normal mt-0.5">{tip.desc}</p>
                  </div>
                </div>
              ))}
            </div>
          </div>

          {/* Online collaborators */}
          <div className="bg-slate-900/40 border border-border p-5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Active Collaborators ({onlineUsers.length})</h3>
            <div className="space-y-2 max-h-48 overflow-y-auto viewport-scroll pr-1">
              {onlineUsers.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-4">All collaborators offline</div>
              ) : (
                onlineUsers.map((u, idx) => (
                  <HoverCard key={idx}>
                    <HoverCardTrigger asChild>
                      <div className="flex items-center gap-2.5 p-1.5 rounded-lg hover:bg-white/[0.03] transition-all cursor-pointer">
                        <div className="relative w-7 h-7 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-xs border border-indigo-500/10">
                          {(u.username?.[0] || 'U').toUpperCase()}
                          <span className="absolute bottom-0 right-0 w-2 h-2 bg-emerald-500 border border-slate-950 rounded-full" />
                        </div>
                        <span className="text-xs font-medium text-slate-300 truncate">{u.username}</span>
                      </div>
                    </HoverCardTrigger>
                    <HoverCardContent className="w-64 border-border bg-slate-950 space-y-3">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-full bg-indigo-600/30 text-indigo-400 flex items-center justify-center font-bold text-sm">
                          {(u.username?.[0] || 'U').toUpperCase()}
                        </div>
                        <div>
                          <div className="font-bold text-white text-sm">{u.username}</div>
                          <span className="text-[10px] text-emerald-400 flex items-center gap-1 font-semibold">
                            <span className="w-1.5 h-1.5 bg-emerald-500 rounded-full" /> Online
                          </span>
                        </div>
                      </div>
                    </HoverCardContent>
                  </HoverCard>
                ))
              )}
            </div>
          </div>

          {/* Recent sessions column */}
          <div className="bg-slate-900/40 border border-border p-5 rounded-xl space-y-3">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider">Recent Activity</h3>
            <div className="space-y-2.5 max-h-56 overflow-y-auto viewport-scroll pr-1">
              {history.length === 0 ? (
                <div className="text-xs text-slate-500 text-center py-6">No recent study history</div>
              ) : (
                history.map((session, idx) => (
                  <div key={idx} className="flex justify-between items-center p-2 rounded bg-white/[0.02] border border-white/[0.04]">
                    <div className="min-w-0">
                      <h4 className="text-xs font-semibold text-white truncate">{session.roomId?.name || 'Study Session'}</h4>
                      <span className="text-[10px] text-slate-500">{new Date(session.sessionDate).toLocaleDateString()}</span>
                    </div>
                    <div className="text-right shrink-0">
                      <span className="text-xs font-bold text-indigo-400 block">{session.focusMinutes}m</span>
                      <span className="text-[10px] text-slate-500">{session.pomodoroCount || 0} 🍅</span>
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
