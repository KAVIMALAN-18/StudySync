import { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { 
  User, Mail, Check, Edit3, Save, BookOpen, Clock, 
  Flame, Calendar, ShieldAlert, ArrowLeft, Plus, MapPin, BarChart3, Settings, ShieldAlert as DangerIcon, LogOut, Key,
  Sparkles, Award, Shield, Bell, Palette, Lock, Eye, Compass, UserCheck, AlertTriangle, ChevronRight, Laptop
} from 'lucide-react';
import { users as usersApi, sessions as sessionsApi, rooms as roomsApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';
import { Switch } from '../ui/switch';
import { Progress } from '../ui/progress';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { ScrollArea } from '../ui/scroll-area';
import { Skeleton } from '../ui/skeleton';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

import { Card, CardHeader, CardTitle, CardDescription, CardContent, CardFooter } from '../ui/card';
import { Avatar, AvatarImage, AvatarFallback } from '../ui/avatar';
import { Badge } from '../ui/badge';
import { Separator } from '../ui/separator';

export const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser, logout, updateUser } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  
  const isOwnProfile = !userId || userId === currentUser?._id;
  const targetUserId = isOwnProfile ? currentUser?._id : userId;

  const [profileUser, setProfileUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [roomsCreatedCount, setRoomsCreatedCount] = useState(0);
  const [roomsJoinedCount, setRoomsJoinedCount] = useState(0);
  
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState('overview');

  // Edit Profile Dialog States
  const [showEditDialog, setShowEditDialog] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editState, setEditState] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editSubjects, setEditSubjects] = useState([]);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  
  const [editEmail, setEditEmail] = useState('');
  const [savingProfile, setSavingProfile] = useState(false);

  // Settings Sub-tabs / Sections state
  const [settingsSection, setSettingsSection] = useState('account');

  // Password Reset
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [changingPassword, setChangingPassword] = useState(false);

  // Preference Settings (inside Settings Tab)
  const [theme, setTheme] = useState('dark');
  const [pushNotifications, setPushNotifications] = useState(true);
  const [emailNotifications, setEmailNotifications] = useState(true);
  const [defaultFocusDuration, setDefaultFocusDuration] = useState(30);
  const [defaultBreakDuration, setDefaultBreakDuration] = useState(5);
  const [studyGoal, setStudyGoal] = useState(120);
  const [preferredStudyTime, setPreferredStudyTime] = useState('Evening');
  const [showOnlineStatus, setShowOnlineStatus] = useState(true);
  const [publicProfile, setPublicProfile] = useState(true);
  const [compactMode, setCompactMode] = useState(false);
  const [soundNotifications, setSoundNotifications] = useState(true);
  const [friendRequestsEnabled, setFriendRequestsEnabled] = useState(true);
  const [roomInvitesEnabled, setRoomInvitesEnabled] = useState(true);
  const [allowAI, setAllowAI] = useState(true);
  const [savingSettings, setSavingSettings] = useState(false);

  // Danger Dialogs
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [deleteConfirmText, setDeleteConfirmText] = useState('');

  const AVAILABLE_SUBJECTS = [
    'General Study',
    'Java Interview Prep',
    'DSA Practice',
    'DBMS Revision',
    'Operating Systems',
    'Aptitude Practice',
    'Web Development',
    'Machine Learning'
  ];

  const AVATAR_PRESETS = ['🦊', '🐨', '🐼', '🦁', '🐯', '🐸', '🐙', '🦉', '🎓', '🚀', '💻', '🎨'];

  const loadProfileData = async (showLoadingSkeleton = true) => {
    try {
      if (showLoadingSkeleton) setLoading(true);
      const userRes = await usersApi.getProfile(targetUserId);
      const userObj = userRes.data;
      setProfileUser(userObj);
      
      // Feed personal profile edit state
      setEditUsername(userObj.username || '');
      setEditFullName(userObj.fullName || '');
      setEditBio(userObj.bio || '');
      setEditCountry(userObj.country || '');
      setEditState(userObj.state || '');
      setEditCity(userObj.city || '');
      setEditAvatar(userObj.avatar || '🦊');
      setEditSubjects(userObj.subjects || []);
      setEditEmail(userObj.email || '');

      // Feed preferences / settings states
      setTheme(userObj.themePreference || 'dark');
      setPushNotifications(userObj.notificationPreferences?.pushNotifications !== false);
      setEmailNotifications(userObj.notificationPreferences?.emailNotifications !== false);
      setDefaultFocusDuration(userObj.studyPreferences?.defaultFocusDuration || 30);
      setDefaultBreakDuration(userObj.studyPreferences?.defaultBreakDuration || 5);
      setStudyGoal(userObj.studyPreferences?.studyGoal || 120);
      setPreferredStudyTime(userObj.studyPreferences?.preferredStudyTime || 'Evening');
      setShowOnlineStatus(userObj.privacyPreference?.showOnlineStatus !== false);
      setPublicProfile(userObj.privacyPreference?.publicProfile !== false);
      setFriendRequestsEnabled(userObj.friendRequestsEnabled !== false);
      setRoomInvitesEnabled(userObj.roomInvitesEnabled !== false);
      setAllowAI(userObj.allowAI !== false);
      setSoundNotifications(userObj.soundNotifications !== false);

      const [statsRes, historyRes, roomsRes] = await Promise.all([
        sessionsApi.getStats(targetUserId),
        sessionsApi.getHistory(targetUserId),
        roomsApi.getAll()
      ]);

      setStats(statsRes.data || { totalFocusMinutes: 0, totalBreakMinutes: 0, totalPomodoros: 0, streak: 0 });
      setHistory(historyRes.data || []);
      
      const allRooms = roomsRes.data || [];
      const userCreated = allRooms.filter(r => r.createdBy?._id === targetUserId || r.createdBy === targetUserId);
      const userJoined = allRooms.filter(r => (r.members || []).some(m => (m._id || m) === targetUserId));
      setRoomsCreatedCount(userCreated.length);
      setRoomsJoinedCount(userJoined.length);
    } catch (err) {
      toast.error('Failed to load profile data');
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadProfileData();
    const params = new URLSearchParams(window.location.search);
    const tabParam = params.get('tab');
    if (tabParam) {
      setActiveTab(tabParam);
    }
  }, [userId, window.location.search]);

  useEffect(() => {
    if (!socket || !isOwnProfile) return;

    const handleStatsUpdated = () => loadProfileData(false);
    const handleSessionCompleted = () => loadProfileData(false);

    socket.on('stats:updated', handleStatsUpdated);
    socket.on('session:completed', handleSessionCompleted);

    return () => {
      socket.off('stats:updated', handleStatsUpdated);
      socket.off('session:completed', handleSessionCompleted);
    };
  }, [socket, isOwnProfile]);

  const handleUpdateProfile = async (e) => {
    if (e) e.preventDefault();
    if (!editUsername.trim()) return;

    try {
      setSavingProfile(true);
      const res = await usersApi.updateProfile({
        username: editUsername.trim(),
        fullName: editFullName.trim(),
        bio: editBio.trim(),
        country: editCountry.trim(),
        state: editState.trim(),
        city: editCity.trim(),
        avatar: editAvatar,
        subjects: editSubjects
      });

      setProfileUser(res.data);
      toast.success('Profile saved successfully!');
      setShowEditDialog(false);
      
      if (isOwnProfile) {
        updateUser(res.data);
        socket?.emit('user:online', { userId: currentUser._id, username: editUsername.trim(), avatar: editAvatar });
      }
    } catch (err) {
      toast.error(err.message || 'Failed to update profile');
    } finally {
      setSavingProfile(false);
    }
  };

  const handleSaveSettings = async (updates = {}) => {
    try {
      setSavingSettings(true);
      
      const updatedTheme = updates.theme !== undefined ? updates.theme : theme;
      const updatedFocus = updates.defaultFocusDuration !== undefined ? updates.defaultFocusDuration : defaultFocusDuration;
      const updatedBreak = updates.defaultBreakDuration !== undefined ? updates.defaultBreakDuration : defaultBreakDuration;
      const updatedGoal = updates.studyGoal !== undefined ? updates.studyGoal : studyGoal;
      const updatedInterval = updates.preferredStudyTime !== undefined ? updates.preferredStudyTime : preferredStudyTime;
      const updatedPush = updates.pushNotifications !== undefined ? updates.pushNotifications : pushNotifications;
      const updatedEmail = updates.emailNotifications !== undefined ? updates.emailNotifications : emailNotifications;
      const updatedOnline = updates.showOnlineStatus !== undefined ? updates.showOnlineStatus : showOnlineStatus;
      const updatedPublic = updates.publicProfile !== undefined ? updates.publicProfile : publicProfile;
      const updatedFriends = updates.friendRequestsEnabled !== undefined ? updates.friendRequestsEnabled : friendRequestsEnabled;
      const updatedInvites = updates.roomInvitesEnabled !== undefined ? updates.roomInvitesEnabled : roomInvitesEnabled;
      const updatedAllowAI = updates.allowAI !== undefined ? updates.allowAI : allowAI;
      const updatedSound = updates.soundNotifications !== undefined ? updates.soundNotifications : soundNotifications;

      const res = await usersApi.updateSettings({
        themePreference: updatedTheme,
        studyPreferences: {
          defaultFocusDuration: Number(updatedFocus),
          defaultBreakDuration: Number(updatedBreak),
          studyGoal: Number(updatedGoal),
          preferredStudyTime: updatedInterval
        },
        notificationPreferences: {
          pushNotifications: updatedPush,
          emailNotifications: updatedEmail
        },
        privacyPreference: {
          showOnlineStatus: updatedOnline,
          publicProfile: updatedPublic
        },
        friendRequestsEnabled: updatedFriends,
        roomInvitesEnabled: updatedInvites,
        allowAI: updatedAllowAI,
        soundNotifications: updatedSound
      });
      
      setProfileUser(res.data);
      
      // Update local states
      if (updates.theme !== undefined) setTheme(updates.theme);
      if (updates.defaultFocusDuration !== undefined) setDefaultFocusDuration(updates.defaultFocusDuration);
      if (updates.defaultBreakDuration !== undefined) setDefaultBreakDuration(updates.defaultBreakDuration);
      if (updates.studyGoal !== undefined) setStudyGoal(updates.studyGoal);
      if (updates.preferredStudyTime !== undefined) setPreferredStudyTime(updates.preferredStudyTime);
      if (updates.pushNotifications !== undefined) setPushNotifications(updates.pushNotifications);
      if (updates.emailNotifications !== undefined) setEmailNotifications(updates.emailNotifications);
      if (updates.showOnlineStatus !== undefined) setShowOnlineStatus(updates.showOnlineStatus);
      if (updates.publicProfile !== undefined) setPublicProfile(updates.publicProfile);
      if (updates.friendRequestsEnabled !== undefined) setFriendRequestsEnabled(updates.friendRequestsEnabled);
      if (updates.roomInvitesEnabled !== undefined) setRoomInvitesEnabled(updates.roomInvitesEnabled);
      if (updates.allowAI !== undefined) setAllowAI(updates.allowAI);
      if (updates.soundNotifications !== undefined) setSoundNotifications(updates.soundNotifications);

      toast.success('Preferences updated successfully!');
      if (isOwnProfile) {
        updateUser(res.data);
      }
    } catch (err) {
      toast.error(err.message || 'Failed to save application settings');
    } finally {
      setSavingSettings(false);
    }
  };

  const handleChangePassword = async (e) => {
    e.preventDefault();
    if (newPassword !== confirmPassword) {
      toast.error('Passwords do not match');
      return;
    }

    try {
      setChangingPassword(true);
      await usersApi.updateSettings({
        currentPassword,
        newPassword
      });
      toast.success('Password changed successfully!');
      setCurrentPassword('');
      setNewPassword('');
      setConfirmPassword('');
    } catch (err) {
      toast.error(err.message || 'Failed to change password');
    } finally {
      setChangingPassword(false);
    }
  };

  const handleDeleteAccount = async () => {
    if (deleteConfirmText !== 'DELETE') {
      toast.error('Confirmation text mismatch');
      return;
    }

    try {
      await usersApi.deleteAccount();
      toast.success('Your account has been deleted.');
      setShowDeleteConfirm(false);
      await logout();
      navigate('/auth/login');
    } catch (err) {
      toast.error(err.message || 'Failed to delete account');
    }
  };

  const handleLogout = async () => {
    await logout();
    toast.success('Logged out successfully');
    navigate('/auth/login');
  };

  const toggleSubject = (sub) => {
    if (editSubjects.includes(sub)) {
      setEditSubjects(prev => prev.filter(s => s !== sub));
    } else {
      setEditSubjects(prev => [...prev, sub]);
    }
  };

  const handleAddCustomSubject = (e) => {
    e.preventDefault();
    const clean = newSubjectInput.trim();
    if (!clean) return;
    if (!editSubjects.includes(clean)) {
      setEditSubjects(prev => [...prev, clean]);
    }
    setNewSubjectInput('');
  };

  // Chart computations
  const getWeeklyProgressData = () => {
    const dayNames = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
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
      const label = `${dayNames[d.getDay()]} ${d.getDate()}`;
      result.push({ label, minutes });
    }
    return result;
  };

  const weeklyData = getWeeklyProgressData();
  const maxWeeklyMinutes = Math.max(...weeklyData.map((d) => d.minutes), 60);

  if (loading) {
    return (
      <div className="p-8 max-w-[1100px] mx-auto space-y-6 animate-fade-in bg-[#060913]">
        <div className="flex gap-4 items-center">
          <Skeleton className="h-10 w-24 bg-slate-900 border border-border/40" />
          <Skeleton className="h-10 w-32 bg-slate-900 border border-border/40" />
        </div>
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          <Skeleton className="h-[450px] lg:col-span-1 rounded-xl bg-slate-900 border border-border/40" />
          <Skeleton className="h-[450px] lg:col-span-2 rounded-xl bg-slate-900 border border-border/40" />
        </div>
      </div>
    );
  }

  const totalFocusHrs = stats ? (stats.totalFocusMinutes / 60).toFixed(1) : '0.0';
  const studyGoalProgress = Math.min(Math.round((Number(stats?.totalFocusMinutes || 0) / studyGoal) * 100), 100);
  const productivityScore = Math.min(100, Math.round(Number(stats?.totalFocusMinutes || 0) / 10));

  // Determine achievement badges
  const achievementsList = [
    { id: 'streak_3', title: 'Consistent Starter', description: 'Maintain a 3-day focus streak', unlocked: (stats?.streak >= 3), icon: Flame, color: 'text-amber-500 bg-amber-500/10 border-amber-500/20' },
    { id: 'streak_7', title: 'Unstoppable Mind', description: 'Maintain a 7-day focus streak', unlocked: (stats?.streak >= 7), icon: Award, color: 'text-orange-500 bg-orange-500/10 border-orange-500/20' },
    { id: 'focus_10', title: 'Deep Worker', description: 'Focus for over 10 hours', unlocked: (stats?.totalFocusMinutes >= 600), icon: Clock, color: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20' },
    { id: 'focus_50', title: 'Zen Scholar', description: 'Focus for over 50 hours', unlocked: (stats?.totalFocusMinutes >= 3000), icon: Sparkles, color: 'text-purple-400 bg-purple-500/10 border-purple-500/20' },
    { id: 'rooms_5', title: 'Collaborator', description: 'Participated in study rooms', unlocked: (roomsJoinedCount >= 1), icon: BookOpen, color: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20' }
  ];

  return (
    <div className="p-8 max-w-[1100px] mx-auto space-y-8 animate-fade-in text-slate-100 min-h-screen bg-[#060913]">
      
      {/* Top Header Navigation */}
      <div className="flex items-center justify-between">
        <button 
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 border border-border bg-slate-900/40 text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer transition-all"
        >
          <ArrowLeft size={14} className="mr-1.5" /> Back to Dashboard
        </button>

        {isOwnProfile && (
          <button
            onClick={() => setShowEditDialog(true)}
            className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-md text-xs font-semibold bg-indigo-600 hover:bg-indigo-700 text-white transition-all cursor-pointer shadow-md select-none"
          >
            <Edit3 size={13} /> Edit Profile
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 items-start">
        
        {/* Left Column: Profile Card */}
        <Card className="lg:col-span-1 flex flex-col items-center p-6 text-center space-y-6">
          
          {/* Avatar and name info */}
          <div className="space-y-3 flex flex-col items-center">
            <div className="relative group">
              <Avatar className="w-20 h-20 text-3xl border-2 border-indigo-500/30 ring-4 ring-indigo-500/10 select-none shadow-lg">
                <AvatarFallback className="bg-gradient-to-tr from-indigo-600 to-purple-600 text-white font-extrabold font-display">
                  {profileUser.avatar || (profileUser.username?.[0] || 'U').toUpperCase()}
                </AvatarFallback>
              </Avatar>
              <div className="absolute -bottom-1 -right-1 w-4 h-4 rounded-full border-2 border-[#090e1a] bg-emerald-500" title="Online" />
            </div>
            
            <div>
              <h2 className="text-lg font-bold font-display text-white tracking-tight leading-snug">
                {profileUser.fullName || 'Focused Student'}
              </h2>
              <span className="text-xs text-indigo-400 font-mono font-bold tracking-tight">@{profileUser.username}</span>
            </div>

            {profileUser.bio ? (
              <p className="text-xs text-slate-400 leading-relaxed max-w-[240px] px-1">{profileUser.bio}</p>
            ) : (
              <p className="text-xs text-slate-500 italic">No status description</p>
            )}
          </div>

          <Separator />

          {/* Details metadata */}
          <div className="w-full text-left space-y-3.5 text-xs">
            {profileUser.city || profileUser.country ? (
              <div className="flex items-center gap-2.5 text-slate-300">
                <MapPin size={14} className="text-slate-500" />
                <span>{[profileUser.city, profileUser.state, profileUser.country].filter(Boolean).join(', ')}</span>
              </div>
            ) : null}

            <div className="flex items-center gap-2.5 text-slate-300">
              <Calendar size={14} className="text-slate-500" />
              <span>Joined {new Date(profileUser.createdAt).toLocaleDateString([], { month: 'long', year: 'numeric' })}</span>
            </div>

            <div className="flex items-center gap-2.5 text-slate-300">
              <Compass size={14} className="text-slate-500" />
              <span>Goal: {studyGoal} mins / week</span>
            </div>

            {profileUser.studyPreferences?.preferredStudyTime ? (
              <div className="flex items-center gap-2.5 text-slate-300">
                <Clock size={14} className="text-slate-500" />
                <span>Active during {profileUser.studyPreferences.preferredStudyTime}</span>
              </div>
            ) : null}
          </div>

          <Separator />

          {/* Subject targets */}
          <div className="w-full text-left space-y-2">
            <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Subjects of Interest</span>
            <div className="flex flex-wrap gap-1.5">
              {(profileUser.subjects || []).length === 0 ? (
                <span className="text-xs text-slate-500 italic leading-normal">No interest subjects selected.</span>
              ) : (
                profileUser.subjects.map((sub, i) => (
                  <Badge key={i} variant="default" className="text-[9px] px-2 py-0.5 rounded font-bold">
                    {sub}
                  </Badge>
                ))
              )}
            </div>
          </div>

        </Card>

        {/* Right Column: Content panel tabs */}
        <div className="lg:col-span-2 space-y-6">
          
          <Tabs value={activeTab} onValueChange={setActiveTab} className="w-full">
            <TabsList className="w-full justify-start gap-1 mb-6 border-b border-border/40 pb-px bg-transparent h-auto p-0 rounded-none">
              <TabsTrigger 
                value="overview" 
                className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent rounded-none text-xs font-semibold hover:text-white"
              >
                Overview
              </TabsTrigger>
              <TabsTrigger 
                value="analytics" 
                className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent rounded-none text-xs font-semibold hover:text-white"
              >
                Analytics
              </TabsTrigger>
              <TabsTrigger 
                value="sessions" 
                className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent rounded-none text-xs font-semibold hover:text-white"
              >
                Recent Sessions
              </TabsTrigger>
              {isOwnProfile && (
                <TabsTrigger 
                  value="settings" 
                  className="px-4 py-2 border-b-2 border-transparent data-[state=active]:border-indigo-500 data-[state=active]:bg-transparent rounded-none text-xs font-semibold hover:text-white flex items-center gap-1.5"
                >
                  <Settings size={13} /> Settings
                </TabsTrigger>
              )}
            </TabsList>

            {/* TAB: OVERVIEW */}
            <TabsContent value="overview" className="focus:outline-none space-y-6">
              
              {/* Quick stats grid */}
              <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
                <Card className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Total Focus</span>
                  <div className="mt-2.5 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold font-display text-white">{totalFocusHrs}</span>
                    <span className="text-[10px] text-slate-400 font-medium">hrs</span>
                  </div>
                </Card>
                <Card className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Streak</span>
                  <div className="mt-2.5 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold font-display text-white">{stats?.streak || 0}</span>
                    <span className="text-[10px] text-slate-400 font-medium">days</span>
                  </div>
                </Card>
                <Card className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Rooms Joined</span>
                  <div className="mt-2.5 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold font-display text-white">{roomsJoinedCount}</span>
                    <span className="text-[10px] text-slate-400 font-medium">spaces</span>
                  </div>
                </Card>
                <Card className="p-4 flex flex-col justify-between">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Productivity Score</span>
                  <div className="mt-2.5 flex items-baseline gap-1">
                    <span className="text-2xl font-extrabold font-display text-indigo-400">{productivityScore}</span>
                    <span className="text-[10px] text-slate-400 font-medium">/ 100</span>
                  </div>
                </Card>
              </div>

              {/* Weekly Goal Progress Tracker */}
              <Card className="p-5 space-y-4">
                <div className="flex justify-between items-center text-xs">
                  <div>
                    <span className="font-bold text-white uppercase tracking-wider">Weekly Focus Target</span>
                    <span className="text-[10px] text-slate-400 leading-normal block mt-0.5">Custom weekly focus goal duration</span>
                  </div>
                  <span className="text-indigo-400 font-extrabold text-sm">{studyGoalProgress}% ({stats?.totalFocusMinutes || 0} / {studyGoal} mins)</span>
                </div>
                <Progress value={studyGoalProgress} className="h-2 bg-slate-950" />
              </Card>

              {/* Achievements Grid */}
              <Card className="p-5 space-y-4">
                <div>
                  <h4 className="text-xs font-bold text-white uppercase tracking-wider">Streaks & Achievements</h4>
                  <p className="text-[10px] text-slate-400 mt-0.5">Milestone badges earned from focused study routines</p>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3.5 pt-1">
                  {achievementsList.map(ach => {
                    const Icon = ach.icon;
                    return (
                      <div 
                        key={ach.id} 
                        className={cn(
                          "flex items-center gap-3 p-3 rounded-lg border transition-all select-none",
                          ach.unlocked 
                            ? "bg-slate-900 border-border" 
                            : "opacity-40 border-dashed border-border bg-slate-950/20"
                        )}
                      >
                        <div className={cn("w-8 h-8 rounded flex items-center justify-center shrink-0", ach.unlocked ? ach.color : "bg-slate-900 text-slate-600 border border-slate-800")}>
                          <Icon size={16} />
                        </div>
                        <div>
                          <h5 className={cn("text-xs font-bold", ach.unlocked ? "text-white" : "text-slate-500")}>{ach.title}</h5>
                          <p className="text-[9px] text-slate-400 leading-relaxed mt-0.5">{ach.description}</p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </Card>

            </TabsContent>

            {/* TAB: ANALYTICS */}
            <TabsContent value="analytics" className="focus:outline-none space-y-6">
              
              {/* Detailed metrics card list */}
              <div className="grid grid-cols-3 gap-4">
                <Card className="p-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Sessions Focused</span>
                  <span className="text-xl font-bold font-display text-white block mt-1.5">{stats?.totalPomodoros || 0} cycles</span>
                </Card>
                <Card className="p-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Minutes Spent</span>
                  <span className="text-xl font-bold font-display text-white block mt-1.5">{stats?.totalFocusMinutes || 0}m</span>
                </Card>
                <Card className="p-4">
                  <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Break Minutes</span>
                  <span className="text-xl font-bold font-display text-white block mt-1.5">{stats?.totalBreakMinutes || 0}m</span>
                </Card>
              </div>

              {/* Weekly bar chart */}
              <Card className="p-5 space-y-4">
                <div className="flex justify-between items-center">
                  <div>
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider">Weekly Pomodoro Metrics</h4>
                    <p className="text-[10px] text-slate-400 mt-0.5">Focused study minutes calculated day-by-day</p>
                  </div>
                  <Badge variant="secondary" className="text-[9px] font-bold py-0.5 px-2">Current Week</Badge>
                </div>

                <div className="h-48 w-full pt-4 relative select-none">
                  <svg width="100%" height="100%" viewBox="0 0 700 180" preserveAspectRatio="none">
                    <line x1="0" y1="140" x2="700" y2="140" className="stroke-slate-800" strokeWidth="1" />
                    <line x1="0" y1="70" x2="700" y2="70" className="stroke-slate-800/40" strokeWidth="1" strokeDasharray="4 4" />
                    {weeklyData.map((d, i) => {
                      const barWidth = 44;
                      const gap = (700 - (7 * barWidth)) / 8;
                      const barHeight = Math.max((d.minutes / maxWeeklyMinutes) * 110, 4);
                      const x = gap + i * (barWidth + gap);
                      const y = 140 - barHeight;
                      return (
                        <g key={i}>
                          <rect x={x} y="20" width={barWidth} height="120" rx="4" className="fill-slate-950/60" />
                          <rect x={x} y={y} width={barWidth} height={barHeight} rx="4" className="fill-indigo-600/70 hover:fill-indigo-500 transition-colors" />
                          {d.minutes > 0 && (
                            <text x={x + barWidth/2} y={y - 8} textAnchor="middle" className="text-[9px] font-bold fill-indigo-400">
                              {d.minutes}m
                            </text>
                          )}
                          <text x={x + barWidth/2} y="160" textAnchor="middle" className="text-[9px] fill-slate-500 font-semibold uppercase">
                            {d.label.split(' ')[0]}
                          </text>
                        </g>
                      );
                    })}
                  </svg>
                </div>
              </Card>

              {/* Productivity Insights */}
              <Card className="p-5 space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider">Focus Efficiency Analytics</h4>
                <p className="text-xs text-slate-400 leading-relaxed">
                  {stats?.totalFocusMinutes > 0 
                    ? `Great focus! You averaged ${((stats.totalFocusMinutes / (stats.totalPomodoros || 1))).toFixed(1)} minutes per Pomodoro session. Keep organizing break cycles to prevent mental fatigue.`
                    : 'Get started by joining study rooms or spawning custom Pomodoro slots to observe productivity metrics and insights.'
                  }
                </p>
              </Card>
            </TabsContent>

            {/* TAB: SESSIONS */}
            <TabsContent value="sessions" className="focus:outline-none space-y-4">
              <div className="flex justify-between items-center">
                <h3 className="text-xs font-bold uppercase tracking-wider text-slate-400">Pomodoro Study Logs</h3>
                <span className="text-[10px] text-slate-500 font-semibold">showing last 10 entries</span>
              </div>
              <div className="space-y-3.5">
                {history.length === 0 ? (
                  <div className="text-center py-12 text-xs text-slate-500 border border-dashed border-border rounded-xl">No session logs found</div>
                ) : (
                  history.slice(0, 10).map((session, i) => {
                    const endT = new Date(session.createdAt || session.completedAt || session.sessionDate);
                    const startT = new Date(endT.getTime() - (session.focusMinutes || 25) * 60 * 1000);
                    return (
                      <Card key={i} className="p-4 flex justify-between items-center gap-4 hover:border-slate-800 transition-colors">
                        <div>
                          <h4 className="font-bold text-white text-sm leading-tight flex items-center gap-1.5">
                            📚 {session.roomId?.name || 'Self-study Slot'}
                          </h4>
                          {session.roomId?.subject && (
                            <span className="text-[10px] text-indigo-400 font-bold block mt-0.5">{session.roomId.subject}</span>
                          )}
                          <span className="text-[10px] text-slate-500 mt-1 block">
                            {new Date(session.sessionDate).toLocaleDateString([], { month: 'short', day: 'numeric' })} · {startT.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})} - {endT.toLocaleTimeString([], {hour: '2-digit', minute:'2-digit'})}
                          </span>
                        </div>
                        <div className="text-right shrink-0">
                          <span className="text-sm font-extrabold text-indigo-400 block">{session.focusMinutes}m</span>
                          <span className="text-[10px] text-slate-500 block mt-0.5">{session.pomodoroCount || 1} Pomodoros</span>
                        </div>
                      </Card>
                    );
                  })
                )}
              </div>
            </TabsContent>

            {/* TAB: SETTINGS */}
            {isOwnProfile && (
              <TabsContent value="settings" className="focus:outline-none">
                
                <div className="grid grid-cols-1 md:grid-cols-4 gap-6 items-start">
                  
                  {/* Left sub-tabs navigation */}
                  <div className="md:col-span-1 flex md:flex-col gap-1 border-b md:border-b-0 md:border-r border-border/40 pb-2 md:pb-0 pr-0 md:pr-4 overflow-x-auto whitespace-nowrap select-none">
                    {[
                      { id: 'account', label: 'Account', icon: User },
                      { id: 'preferences', label: 'Preferences', icon: Settings },
                      { id: 'security', label: 'Security', icon: Lock },
                      { id: 'appearance', label: 'Appearance', icon: Palette },
                      { id: 'notifications', label: 'Alerts', icon: Bell },
                      { id: 'privacy', label: 'Privacy', icon: Eye }
                    ].map(tab => {
                      const Icon = tab.icon;
                      const active = settingsSection === tab.id;
                      return (
                        <button
                          key={tab.id}
                          onClick={() => setSettingsSection(tab.id)}
                          className={cn(
                            "flex items-center gap-2 px-3 py-1.5 rounded-md text-xs font-semibold tracking-tight transition-all text-left cursor-pointer",
                            active 
                              ? "bg-indigo-600/10 text-indigo-400" 
                              : "text-slate-400 hover:text-white hover:bg-white/[0.02]"
                          )}
                        >
                          <Icon size={14} />
                          <span>{tab.label}</span>
                        </button>
                      );
                    })}
                  </div>

                  {/* Right side settings panel form */}
                  <Card className="md:col-span-3 p-5">
                    
                    {/* Category 1: Account settings */}
                    {settingsSection === 'account' && (
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Account Information</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Manage authentication parameters and credentials</p>
                        </div>

                        <div className="space-y-1">
                          <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Email Address</label>
                          <Input value={editEmail} disabled className="opacity-60 font-mono text-slate-300" />
                        </div>
                        
                        <Separator />

                        <div className="space-y-2 pt-1.5">
                          <h4 className="text-xs font-bold text-red-400 uppercase tracking-wider flex items-center gap-1.5">
                            <DangerIcon size={14} /> Account Deletion
                          </h4>
                          <p className="text-[10px] text-slate-400 leading-normal">
                            Permanently delete your profile, study logs, and rooms. This action is irreversible.
                          </p>
                          <button 
                            type="button"
                            onClick={() => { setShowDeleteConfirm(true); setDeleteConfirmText(''); }}
                            className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-4 bg-red-600/10 hover:bg-red-600 text-red-400 hover:text-white cursor-pointer mt-1"
                          >
                            Delete Account Permanently
                          </button>
                        </div>
                      </div>
                    )}

                    {/* Category 2: Study Preferences settings */}
                    {settingsSection === 'preferences' && (
                      <div className="space-y-6">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Study & Pomodoro Preferences</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Configure default timers, goals, and focus parameters</p>
                        </div>

                        <div className="space-y-4">
                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-300">Default Focus Time</span>
                              <span className="font-bold text-indigo-400">{defaultFocusDuration} mins</span>
                            </div>
                            <input 
                              type="range" 
                              min="5" 
                              max="120" 
                              step="5"
                              value={defaultFocusDuration} 
                              onChange={(e) => setDefaultFocusDuration(Number(e.target.value))}
                              onMouseUp={(e) => handleSaveSettings({ defaultFocusDuration: Number(e.target.value) })}
                              onTouchEnd={(e) => handleSaveSettings({ defaultFocusDuration: Number(e.target.value) })}
                              className="w-full accent-indigo-600 bg-slate-950 rounded-lg appearance-none h-1 cursor-pointer"
                            />
                          </div>

                          <div className="space-y-2">
                            <div className="flex justify-between items-center text-xs">
                              <span className="font-semibold text-slate-300">Default Break Time</span>
                              <span className="font-bold text-indigo-400">{defaultBreakDuration} mins</span>
                            </div>
                            <input 
                              type="range" 
                              min="1" 
                              max="30" 
                              step="1"
                              value={defaultBreakDuration} 
                              onChange={(e) => setDefaultBreakDuration(Number(e.target.value))}
                              onMouseUp={(e) => handleSaveSettings({ defaultBreakDuration: Number(e.target.value) })}
                              onTouchEnd={(e) => handleSaveSettings({ defaultBreakDuration: Number(e.target.value) })}
                              className="w-full accent-indigo-600 bg-slate-950 rounded-lg appearance-none h-1 cursor-pointer"
                            />
                          </div>
                        </div>

                        <div className="grid grid-cols-2 gap-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Weekly Focus Target (mins)</label>
                            <Input 
                              type="number" 
                              min={30} 
                              max={1000} 
                              value={studyGoal} 
                              onChange={(e) => setStudyGoal(Number(e.target.value))} 
                              onBlur={() => handleSaveSettings({ studyGoal })}
                            />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Preferred Focus Interval</label>
                            <Select 
                              value={preferredStudyTime} 
                              onChange={(e) => handleSaveSettings({ preferredStudyTime: e.target.value })}
                            >
                              <option value="Morning">Morning (6 AM - 12 PM)</option>
                              <option value="Afternoon">Afternoon (12 PM - 5 PM)</option>
                              <option value="Evening">Evening (5 PM - 10 PM)</option>
                              <option value="Night">Night (10 PM - 6 AM)</option>
                            </Select>
                          </div>
                        </div>

                        <div className="space-y-3.5 border-t border-border/40 pt-4">
                          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-slate-950/20">
                            <span className="text-xs text-slate-300">Play Audio Sound Alerts</span>
                            <Switch checked={soundNotifications} onCheckedChange={(checked) => handleSaveSettings({ soundNotifications: checked })} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Category 3: Security & password settings */}
                    {settingsSection === 'security' && (
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Security Controls</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Manage authentication passwords and devices</p>
                        </div>

                        <form onSubmit={handleChangePassword} className="space-y-4">
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Current Password</label>
                            <Input type="password" value={currentPassword} onChange={(e) => setCurrentPassword(e.target.value)} required />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">New Password</label>
                            <Input type="password" value={newPassword} onChange={(e) => setNewPassword(e.target.value)} required />
                          </div>
                          <div className="space-y-1">
                            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Confirm New Password</label>
                            <Input type="password" value={confirmPassword} onChange={(e) => setConfirmPassword(e.target.value)} required />
                          </div>
                          
                          <button 
                            type="submit" 
                            disabled={changingPassword}
                            className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-4 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                          >
                            <Key size={13} className="mr-1.5" /> Update Password
                          </button>
                        </form>

                        <Separator />

                        <div className="space-y-3 pt-1">
                          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-slate-950/20">
                            <div>
                              <span className="text-xs text-slate-300 block font-semibold">Two-Factor Authentication (2FA)</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">Require verification code alongside passwords</span>
                            </div>
                            <Switch checked={false} disabled title="Not implemented" />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Category 4: Appearance settings */}
                    {settingsSection === 'appearance' && (
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Visual Interface Customization</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Customize workspace styling, accenting, and themes</p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-slate-950/20">
                            <div>
                              <span className="text-xs text-slate-300 block font-semibold">Dark Workspace Mode</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">Conserve battery and protect focus eye strain</span>
                            </div>
                            <Switch checked={theme === 'dark'} onCheckedChange={(checked) => {
                              handleSaveSettings({ theme: checked ? 'dark' : 'light' });
                            }} />
                          </div>

                          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-slate-950/20">
                            <div>
                              <span className="text-xs text-slate-300 block font-semibold">Compact Sidebar Layout</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">Compact room listings and user interface margins</span>
                            </div>
                            <Switch checked={compactMode} onCheckedChange={setCompactMode} />
                          </div>
                        </div>

                        <div className="space-y-2 border-t border-border/40 pt-4">
                          <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Accent Brand Theme</span>
                          <div className="flex gap-2">
                            {['#6366f1', '#10b981', '#06b6d4', '#8b5cf6', '#f59e0b', '#ef4444'].map(color => (
                              <button 
                                key={color}
                                className="w-6 h-6 rounded-full border-2 border-slate-950 cursor-pointer shadow-md hover:scale-105 transition-all"
                                style={{ backgroundColor: color }}
                                onClick={() => {
                                  toast.success(`Theme accent set to ${color}`);
                                }}
                              />
                            ))}
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Category 5: Notifications settings */}
                    {settingsSection === 'notifications' && (
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Alerts & System Notifications</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Configure when to receive audio and push alerts</p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-slate-950/20">
                            <div>
                              <span className="text-xs text-slate-300 block font-semibold">Push Notifications</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">Receive browser push toasts immediately</span>
                            </div>
                            <Switch checked={pushNotifications} onCheckedChange={(checked) => handleSaveSettings({ pushNotifications: checked })} />
                          </div>
                          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-slate-950/20">
                            <div>
                              <span className="text-xs text-slate-300 block font-semibold">Email Alerts</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">Receive email containing weekly summaries</span>
                            </div>
                            <Switch checked={emailNotifications} onCheckedChange={(checked) => handleSaveSettings({ emailNotifications: checked })} />
                          </div>
                        </div>
                      </div>
                    )}

                    {/* Category 6: Privacy settings */}
                    {settingsSection === 'privacy' && (
                      <div className="space-y-5">
                        <div>
                          <h4 className="text-xs font-bold text-white uppercase tracking-wider">Privacy & Profiles</h4>
                          <p className="text-[10px] text-slate-500 mt-0.5">Control details visible to peers and community</p>
                        </div>

                        <div className="space-y-3">
                          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-slate-950/20">
                            <div>
                              <span className="text-xs text-slate-300 block font-semibold">Public Student Profile</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">Allow other students to view milestones and bio</span>
                            </div>
                            <Switch checked={publicProfile} onCheckedChange={(checked) => handleSaveSettings({ publicProfile: checked })} />
                          </div>
                          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-slate-950/20">
                            <div>
                              <span className="text-xs text-slate-300 block font-semibold">Show Active Online Status</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">Display active status indicator when studying</span>
                            </div>
                            <Switch checked={showOnlineStatus} onCheckedChange={(checked) => handleSaveSettings({ showOnlineStatus: checked })} />
                          </div>
                          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-slate-950/20">
                            <div>
                              <span className="text-xs text-slate-300 block font-semibold">Friend Requests</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">Enable incoming friend invitations from users</span>
                            </div>
                            <Switch checked={friendRequestsEnabled} onCheckedChange={(checked) => handleSaveSettings({ friendRequestsEnabled: checked })} />
                          </div>
                          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-slate-950/20">
                            <div>
                              <span className="text-xs text-slate-300 block font-semibold">Room Invites</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">Enable incoming room join requests from peers</span>
                            </div>
                            <Switch checked={roomInvitesEnabled} onCheckedChange={(checked) => handleSaveSettings({ roomInvitesEnabled: checked })} />
                          </div>
                          <div className="flex items-center justify-between p-2.5 rounded-lg border border-border/40 bg-slate-950/20">
                            <div>
                              <span className="text-xs text-slate-300 block font-semibold">Allow AI assistant</span>
                              <span className="text-[9px] text-slate-500 mt-0.5">Grant AI capabilities during focus study timers</span>
                            </div>
                            <Switch checked={allowAI} onCheckedChange={(checked) => handleSaveSettings({ allowAI: checked })} />
                          </div>
                        </div>
                      </div>
                    )}

                  </Card>
                </div>

              </TabsContent>
            )}
          </Tabs>
        </div>

      </div>

      {/* Edit Profile Dialog Overlay */}
      <Dialog open={showEditDialog} onOpenChange={setShowEditDialog}>
        <DialogContent className="max-w-md bg-slate-950 border border-border text-slate-100 max-h-[85vh] overflow-y-auto">
          <DialogHeader>
            <DialogTitle className="text-white text-base">Edit Profile Information</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Update personal descriptors and subjects of interest
            </DialogDescription>
          </DialogHeader>

          <form onSubmit={handleUpdateProfile} className="space-y-4 py-2 text-xs">
            {/* Avatar Preset Selector */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Profile Icon Preset</label>
              <div className="flex gap-1.5 flex-wrap">
                {AVATAR_PRESETS.map((av) => (
                  <button
                    key={av}
                    type="button"
                    onClick={() => setEditAvatar(av)}
                    className={cn(
                      "w-8 h-8 rounded border flex items-center justify-center text-lg transition-all cursor-pointer",
                      editAvatar === av ? "bg-indigo-600/20 border-indigo-500 scale-105" : "bg-slate-900 border-border hover:bg-slate-800"
                    )}
                  >
                    {av}
                  </button>
                ))}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Full Name</label>
                <Input value={editFullName} onChange={(e) => setEditFullName(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Username</label>
                <Input value={editUsername} onChange={(e) => setEditUsername(e.target.value)} required />
              </div>
            </div>

            <div className="grid grid-cols-3 gap-3">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">City</label>
                <Input value={editCity} onChange={(e) => setEditCity(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">State</label>
                <Input value={editState} onChange={(e) => setEditState(e.target.value)} />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Country</label>
                <Input value={editCountry} onChange={(e) => setEditCountry(e.target.value)} />
              </div>
            </div>

            <div className="space-y-1">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Status Bio</label>
              <Textarea value={editBio} onChange={(e) => setEditBio(e.target.value)} rows={2} className="resize-none" />
            </div>

            {/* Subjects selection inside Edit dialog */}
            <div className="space-y-2">
              <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Subjects of Interest</label>
              <div className="grid grid-cols-2 gap-2">
                {AVAILABLE_SUBJECTS.map((sub) => {
                  const active = editSubjects.includes(sub);
                  return (
                    <button
                      key={sub}
                      type="button"
                      onClick={() => toggleSubject(sub)}
                      className={cn(
                        "text-left px-2.5 py-1.5 rounded text-xs transition-all border cursor-pointer select-none",
                        active 
                          ? "bg-indigo-600/10 border-indigo-500 text-indigo-400 font-semibold" 
                          : "bg-white/[0.01] border-border text-slate-400 hover:text-white"
                      )}
                    >
                      {sub}
                    </button>
                  );
                })}
              </div>

              <div className="flex gap-2 pt-1.5">
                <Input 
                  placeholder="Custom subject..." 
                  value={newSubjectInput} 
                  onChange={(e) => setNewSubjectInput(e.target.value)} 
                  className="h-8 text-xs"
                />
                <button 
                  type="button" 
                  onClick={handleAddCustomSubject}
                  className="inline-flex items-center justify-center rounded text-xs font-semibold h-8 px-3 border border-border text-slate-200 hover:bg-white/5 cursor-pointer shrink-0"
                >
                  Add Topic
                </button>
              </div>
            </div>

            <DialogFooter className="pt-4 border-t border-border/40 gap-2">
              <DialogClose asChild>
                <button type="button" className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
                  Cancel
                </button>
              </DialogClose>
              <button 
                type="submit" 
                disabled={savingProfile}
                className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer ml-2"
              >
                {savingProfile ? 'Saving...' : 'Save Profile'}
              </button>
            </DialogFooter>
          </form>
        </DialogContent>
      </Dialog>

      {/* Delete Account confirmation Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm bg-slate-950 border border-border text-slate-100">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete your Account?</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              This action is permanent. Type <span className="font-bold text-white">DELETE</span> to confirm.
            </DialogDescription>
          </DialogHeader>
          <div className="py-2">
            <Input 
              value={deleteConfirmText} 
              onChange={(e) => setDeleteConfirmText(e.target.value)} 
              placeholder="Type DELETE" 
              className="text-center font-bold font-mono tracking-widest placeholder:tracking-normal placeholder:font-sans placeholder:font-normal text-white"
            />
          </div>
          <DialogFooter className="pt-2 border-t border-border/40">
            <DialogClose asChild>
              <button className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
                Cancel
              </button>
            </DialogClose>
            <button 
              disabled={deleteConfirmText !== 'DELETE'}
              onClick={handleDeleteAccount}
              className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 bg-red-600 hover:bg-red-700 text-white cursor-pointer disabled:opacity-50 ml-2"
            >
              Delete Account
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

    </div>
  );
};
