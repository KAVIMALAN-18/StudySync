import { useState, useEffect } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import { 
  User, Mail, FileText, Check, Edit3, Save, X, BookOpen, Clock, 
  Flame, Award, Lock, Users, ArrowLeft, Plus, Trash2, Calendar
} from 'lucide-react';
import { users as usersApi, sessions as sessionsApi, rooms as roomsApi } from '../../services/api';
import { useAuth } from '../../hooks/useAuth';
import { useSocket } from '../../hooks/useSocket';
import { Globe, MapPin } from 'lucide-react';

export const Profile = () => {
  const { userId } = useParams();
  const { user: currentUser, logout } = useAuth();
  const { socket } = useSocket();
  const navigate = useNavigate();
  
  const isOwnProfile = !userId || userId === currentUser?._id;
  const targetUserId = isOwnProfile ? currentUser?._id : userId;

  const [profileUser, setProfileUser] = useState(null);
  const [stats, setStats] = useState(null);
  const [history, setHistory] = useState([]);
  const [createdRooms, setCreatedRooms] = useState([]);
  
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  
  // Edit mode states
  const [isEditing, setIsEditing] = useState(false);
  const [editUsername, setEditUsername] = useState('');
  const [editFullName, setEditFullName] = useState('');
  const [editBio, setEditBio] = useState('');
  const [editAvatar, setEditAvatar] = useState('');
  const [editCountry, setEditCountry] = useState('');
  const [editState, setEditState] = useState('');
  const [editCity, setEditCity] = useState('');
  const [editSubjects, setEditSubjects] = useState([]);
  const [newSubjectInput, setNewSubjectInput] = useState('');
  
  const [updateLoading, setUpdateLoading] = useState(false);
  const [updateSuccess, setUpdateSuccess] = useState(false);

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

  useEffect(() => {
    loadProfileData();
  }, [userId]);

  const loadProfileData = async () => {
    setLoading(true);
    setError(null);
    try {
      // 1. Fetch user profile
      const userRes = await usersApi.getProfile(targetUserId);
      const userObj = userRes.data;
      setProfileUser(userObj);
      
      // Seed edit fields
      setEditUsername(userObj.username || '');
      setEditFullName(userObj.fullName || '');
      setEditBio(userObj.bio || '');
      setEditAvatar(userObj.avatar || '');
      setEditCountry(userObj.country || '');
      setEditState(userObj.state || '');
      setEditCity(userObj.city || '');
      setEditSubjects(userObj.subjects || []);

      // 2. Fetch user stats and history
      const [statsRes, historyRes, roomsRes] = await Promise.all([
        sessionsApi.getStats(targetUserId),
        sessionsApi.getHistory(targetUserId),
        roomsApi.getAll() // to filter public rooms they created or joined
      ]);

      setStats(statsRes.data || { totalFocusMinutes: 0, totalBreakMinutes: 0, totalPomodoros: 0, streak: 0 });
      setHistory(historyRes.data || []);
      
      const allRooms = roomsRes.data || [];
      const userCreated = allRooms.filter(r => r.createdBy?._id === targetUserId || r.createdBy === targetUserId);
      setCreatedRooms(userCreated);

    } catch (err) {
      console.error('Error loading profile:', err);
      setError('Could not load user profile details.');
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateProfile = async (e) => {
    e.preventDefault();
    if (!editUsername.trim()) return;

    setUpdateLoading(true);
    setError(null);
    setUpdateSuccess(false);

    try {
      const res = await usersApi.updateProfile({
        username: editUsername.trim(),
        fullName: editFullName.trim(),
        bio: editBio.trim(),
        avatar: editAvatar.trim(),
        country: editCountry.trim(),
        state: editState.trim(),
        city: editCity.trim(),
        subjects: editSubjects
      });

      setProfileUser(res.data);
      setUpdateSuccess(true);
      setIsEditing(false);
      
      // Update local storage for own user
      if (isOwnProfile) {
        const localUser = JSON.parse(localStorage.getItem('user') || '{}');
        const updated = { 
          ...localUser, 
          username: editUsername.trim(), 
          fullName: editFullName.trim(),
          bio: editBio.trim(), 
          avatar: editAvatar.trim(), 
          country: editCountry.trim(),
          state: editState.trim(),
          city: editCity.trim(),
          subjects: editSubjects 
        };
        localStorage.setItem('user', JSON.stringify(updated));
        
        // Notify socket connection of name update
        socket?.emit('user:online', { userId: currentUser._id, username: editUsername.trim(), avatar: editAvatar.trim() });
      }

      setTimeout(() => setUpdateSuccess(false), 3000);
    } catch (err) {
      setError(err.message || 'Failed to update profile.');
    } finally {
      setUpdateLoading(false);
    }
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

  if (loading) {
    return (
      <div className="dashboard-shell" style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', minHeight: '60vh' }}>
        <div style={{ textAlign: 'center' }}>
          <div className="spinner" style={{ margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-muted)' }}>Loading study profile...</p>
        </div>
      </div>
    );
  }

  if (error && !profileUser) {
    return (
      <div className="dashboard-shell" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="glass-card" style={{ padding: '3rem' }}>
          <X size={48} color="#ef4444" style={{ marginBottom: '1rem' }} />
          <h2 className="section-title" style={{ color: 'var(--text-primary)' }}>Profile Error</h2>
          <p style={{ color: 'var(--text-muted)', marginBottom: '2rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard')}>
            <ArrowLeft size={16} /> Return to Dashboard
          </button>
        </div>
      </div>
    );
  }

  const hoursStudied = stats ? (stats.totalFocusMinutes / 60).toFixed(1) : '0.0';

  return (
    <div className="dashboard-shell animate-fade-in" style={{ padding: '2rem', maxWidth: '1000px', margin: '0 auto' }}>
      
      {/* ── Back & Action Header ── */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem' }}>
        <button className="btn btn-ghost" onClick={() => navigate(-1)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderColor: 'rgba(255,255,255,0.05)' }}>
          <ArrowLeft size={16} /> Back
        </button>
        {isOwnProfile && !isEditing && (
          <button className="btn btn-primary" onClick={() => setIsEditing(true)} style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
            <Edit3 size={15} /> Edit Profile
          </button>
        )}
      </div>

      {updateSuccess && (
        <div className="inline-toast inline-toast-success animate-slide-up" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid rgba(16,185,129,0.3)', background: 'rgba(16,185,129,0.15)', color: '#10b981' }}>
          <Check size={16} /> Profile updated successfully!
        </div>
      )}

      {/* ── Profile Layout ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 2fr', gap: '2rem', alignItems: 'start' }} className="profile-grid">
        
        {/* Left Column: Avatar & Basic Info Card */}
        <div className="glass-card" style={{ padding: '2rem', textAlign: 'center', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1.25rem' }}>
          
          <div className="member-avatar" style={{ 
            width: '100px', 
            height: '100px', 
            borderRadius: '50%', 
            fontSize: '2.5rem', 
            background: 'linear-gradient(135deg, #818cf8, #c084fc)', 
            color: 'white', 
            fontWeight: 700, 
            display: 'flex', 
            alignItems: 'center', 
            justifyContent: 'center', 
            boxShadow: '0 0 20px rgba(129,140,248,0.3)',
            border: '2px solid rgba(255,255,255,0.1)'
          }}>
            {(profileUser.username?.[0] || 'U').toUpperCase()}
          </div>

          <div>
            {profileUser.fullName && (
              <h2 style={{ fontSize: '1.4rem', fontWeight: 700, color: 'white', marginBottom: '0.1rem' }}>
                {profileUser.fullName}
              </h2>
            )}
            <h3 style={{ fontSize: '1.0rem', fontWeight: 600, color: 'var(--text-secondary)', marginBottom: '0.25rem' }}>
              @{profileUser.username}
            </h3>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.35rem', color: 'var(--text-muted)', fontSize: '0.85rem' }}>
              <Mail size={13} /> {profileUser.email}
            </div>

            {(profileUser.city || profileUser.state || profileUser.country) && (
              <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.25rem', color: 'var(--text-secondary)', fontSize: '0.8rem', marginTop: '0.5rem' }}>
                <MapPin size={12} />
                <span>
                  {[profileUser.city, profileUser.state, profileUser.country].filter(Boolean).join(', ')}
                </span>
              </div>
            )}

            {profileUser.isOnline && (
              <span className="pill-badge-green" style={{ fontSize: '0.65rem', display: 'inline-block', marginTop: '0.75rem' }}>
                Online Now
              </span>
            )}
          </div>

          <div className="divider" style={{ width: '100%', margin: '0.5rem 0' }} />

          <div style={{ width: '100%', textAlign: 'left' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.5rem' }}>Bio</h4>
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', lineHeight: '1.5' }}>
              {profileUser.bio || 'This user hasn\'t set a bio yet.'}
            </p>
          </div>

          <div className="divider" style={{ width: '100%', margin: '0.5rem 0' }} />

          {/* Subjects of Interest */}
          <div style={{ width: '100%', textAlign: 'left' }}>
            <h4 style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: '0.75rem' }}>Subjects of Interest</h4>
            <div style={{ display: 'flex', flexWrap: 'wrap', gap: '0.5rem' }}>
              {(profileUser.subjects || []).length === 0 ? (
                <span style={{ fontSize: '0.8rem', color: 'var(--text-muted)', fontStyle: 'italic' }}>No subjects selected yet</span>
              ) : (
                profileUser.subjects.map((sub, i) => (
                  <span key={i} style={{ 
                    fontSize: '0.75rem', 
                    color: '#c084fc', 
                    background: 'rgba(192,132,252,0.1)', 
                    border: '1px solid rgba(192,132,252,0.2)', 
                    padding: '0.2rem 0.6rem', 
                    borderRadius: '9999px' 
                  }}>
                    {sub}
                  </span>
                ))
              )}
            </div>
          </div>
        </div>

        {/* Right Column: Editing or Stats panels */}
        <div style={{ display: 'flex', flexDirection: 'column', gap: '2rem' }}>
          
          {/* EDIT PROFILE PANEL */}
          {isEditing && isOwnProfile && (
            <div className="glass-card animate-slide-up" style={{ padding: '2rem' }}>
              <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                <Edit3 size={18} color="#a5b4fc" /> Edit Profile Details
              </h2>
              
              <form onSubmit={handleUpdateProfile} style={{ display: 'flex', flexDirection: 'column', gap: '1.25rem', marginTop: '1.5rem' }}>
                
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                  <div>
                    <label className="auth-label">Full Name</label>
                    <input 
                      type="text" 
                      className="input-dark" 
                      value={editFullName} 
                      onChange={(e) => setEditFullName(e.target.value)} 
                      placeholder="Your real name"
                    />
                  </div>
                  <div>
                    <label className="auth-label">Username</label>
                    <input 
                      type="text" 
                      className="input-dark" 
                      value={editUsername} 
                      onChange={(e) => setEditUsername(e.target.value)} 
                      required 
                    />
                  </div>
                </div>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '0.75rem' }}>
                  <div>
                    <label className="auth-label">City</label>
                    <input 
                      type="text" 
                      className="input-dark" 
                      value={editCity} 
                      onChange={(e) => setEditCity(e.target.value)} 
                      placeholder="Coimbatore"
                    />
                  </div>
                  <div>
                    <label className="auth-label">State/Province</label>
                    <input 
                      type="text" 
                      className="input-dark" 
                      value={editState} 
                      onChange={(e) => setEditState(e.target.value)} 
                      placeholder="Tamil Nadu"
                    />
                  </div>
                  <div>
                    <label className="auth-label">Country</label>
                    <input 
                      type="text" 
                      className="input-dark" 
                      value={editCountry} 
                      onChange={(e) => setEditCountry(e.target.value)} 
                      placeholder="India"
                    />
                  </div>
                </div>

                <div>
                  <label className="auth-label">Bio</label>
                  <textarea 
                    className="input-dark" 
                    value={editBio} 
                    onChange={(e) => setEditBio(e.target.value)} 
                    rows="3"
                    placeholder="Tell us about yourself, your learning goals, etc."
                    style={{ resize: 'vertical' }}
                  />
                </div>

                <div>
                  <label className="auth-label">Select Subjects of Interest</label>
                  <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '0.5rem', margin: '0.5rem 0' }}>
                    {AVAILABLE_SUBJECTS.map((sub) => {
                      const active = editSubjects.includes(sub);
                      return (
                        <button
                          key={sub}
                          type="button"
                          onClick={() => toggleSubject(sub)}
                          style={{
                            textAlign: 'left',
                            padding: '0.5rem 0.75rem',
                            fontSize: '0.75rem',
                            borderRadius: '6px',
                            cursor: 'pointer',
                            background: active ? 'rgba(129, 140, 248, 0.2)' : 'rgba(255, 255, 255, 0.02)',
                            border: '1px solid',
                            borderColor: active ? '#818cf8' : 'rgba(255, 255, 255, 0.08)',
                            color: active ? '#c084fc' : 'var(--text-muted)'
                          }}
                        >
                          {sub}
                        </button>
                      );
                    })}
                  </div>
                  
                  {/* Custom subject field */}
                  <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }}>
                    <input 
                      type="text" 
                      placeholder="Add other subject..." 
                      className="input-dark"
                      value={newSubjectInput}
                      onChange={(e) => setNewSubjectInput(e.target.value)}
                      style={{ padding: '0.4rem 0.75rem', fontSize: '0.8rem' }}
                    />
                    <button type="button" onClick={handleAddCustomSubject} className="btn btn-ghost" style={{ padding: '0.4rem 0.75rem' }}>
                      <Plus size={14} /> Add
                    </button>
                  </div>
                </div>

                <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
                  <button type="submit" disabled={updateLoading} className="btn btn-primary" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', flex: 1 }}>
                    <Save size={16} /> {updateLoading ? 'Saving...' : 'Save Changes'}
                  </button>
                  <button type="button" className="btn btn-ghost" onClick={() => setIsEditing(false)} style={{ flex: 1, borderColor: 'rgba(255,255,255,0.05)' }}>
                    Cancel
                  </button>
                </div>
              </form>
            </div>
          )}

          {/* METRICS & STATISTICS PANEL */}
          {!isEditing && (
            <>
              {/* Stat Cards Row */}
              <div className="stat-cards-grid" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '1rem' }}>
                
                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(99,102,241,0.1)', color: '#818cf8' }}>
                    <Clock size={18} />
                  </div>
                  <div className="stat-value">{hoursStudied}h</div>
                  <div className="stat-label">Hours Focused</div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(239,68,68,0.1)', color: '#fca5a5' }}>
                    <Award size={18} />
                  </div>
                  <div className="stat-value">{stats?.totalPomodoros || 0}</div>
                  <div className="stat-label">Pomodoros</div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(16,185,129,0.1)', color: '#6ee7b7' }}>
                    <Flame size={18} />
                  </div>
                  <div className="stat-value">{stats?.streak || 0}d</div>
                  <div className="stat-label">Daily Streak</div>
                </div>

                <div className="stat-card">
                  <div className="stat-icon" style={{ background: 'rgba(245,158,11,0.1)', color: '#fcd34d' }}>
                    <Users size={18} />
                  </div>
                  <div className="stat-value">{profileUser.friends?.length || 0}</div>
                  <div className="stat-label">Friends</div>
                </div>
              </div>

              {/* Study Rooms Summary */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#c084fc' }}>
                  <BookOpen size={18} /> Created Rooms ({createdRooms.length})
                </h2>
                
                <div style={{ marginTop: '1.25rem' }}>
                  {createdRooms.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      No public rooms created by this user.
                    </p>
                  ) : (
                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(2, 1fr)', gap: '1rem' }}>
                      {createdRooms.map((room) => (
                        <div key={room._id} className="room-card" style={{ padding: '1rem', border: '1px solid rgba(255,255,255,0.05)', background: 'rgba(255,255,255,0.01)', borderRadius: '8px' }}>
                          <h4 style={{ fontWeight: 600, color: 'var(--text-primary)', fontSize: '0.9rem' }}>{room.name}</h4>
                          <span style={{ fontSize: '0.7rem', color: '#a5b4fc', background: 'rgba(165,180,252,0.1)', padding: '0.1rem 0.4rem', borderRadius: '4px', display: 'inline-block', marginTop: '0.25rem' }}>
                            {room.subject}
                          </span>
                          <p style={{ fontSize: '0.75rem', color: 'var(--text-muted)', marginTop: '0.5rem', lineClamp: 2 }}>{room.description || 'No description provided.'}</p>
                          <Link to={`/room/${room._id}`} className="btn btn-ghost" style={{ display: 'inline-block', width: '100%', textAlign: 'center', fontSize: '0.75rem', marginTop: '0.75rem', padding: '0.3rem 0' }}>
                            Enter Space
                          </Link>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>

              {/* Recent History / Sessions */}
              <div className="glass-card" style={{ padding: '2rem' }}>
                <h2 className="section-title" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                  <Calendar size={18} color="#a5b4fc" /> Recent Sessions
                </h2>
                
                <div style={{ display: 'flex', flexDirection: 'column', gap: '0.5rem', marginTop: '1.25rem' }}>
                  {history.length === 0 ? (
                    <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', fontStyle: 'italic' }}>
                      No recorded sessions yet.
                    </p>
                  ) : (
                    history.slice(0, 5).map((session, i) => (
                      <div key={i} style={{ 
                        display: 'flex', 
                        alignItems: 'center', 
                        justifyContent: 'space-between', 
                        padding: '0.75rem 1rem', 
                        borderRadius: '6px', 
                        background: 'rgba(255,255,255,0.01)', 
                        border: '1px solid rgba(255,255,255,0.04)' 
                      }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
                          <div style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#818cf8' }} />
                          <div>
                            <span style={{ fontSize: '0.85rem', fontWeight: 500, color: 'var(--text-primary)' }}>
                              Study Room Session
                            </span>
                            <div style={{ fontSize: '0.7rem', color: 'var(--text-muted)' }}>
                              {new Date(session.sessionDate).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}
                            </div>
                          </div>
                        </div>
                        <div style={{ display: 'flex', gap: '1rem', fontSize: '0.8rem', fontWeight: 600 }}>
                          <span style={{ color: '#6ee7b7' }}>Focus: {session.focusMinutes}m</span>
                          {session.pomodoroCount > 0 && <span style={{ color: '#fca5a5' }}>🍅 {session.pomodoroCount}</span>}
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
};
