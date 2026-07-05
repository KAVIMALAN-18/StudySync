import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, UserPlus, UserMinus, Check, X, Search, 
  MessageSquare, UserCheck, Inbox, Flame, Sparkles, Clock, AlertCircle
} from 'lucide-react';
import { friends as friendsApi, users as usersApi, rooms as roomsApi } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';

export const Friends = () => {
  const [activeTab, setActiveTab] = useState('online'); // 'online' | 'all' | 'pending' | 'add'
  const [friendsList, setFriendsList] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [selectedFriendForInvite, setSelectedFriendForInvite] = useState(null);
  const [selectedRoomToInvite, setSelectedRoomToInvite] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [error, setError] = useState(null);
  const [successMessage, setSuccessMessage] = useState(null);

  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFriendsAndRequests();
    fetchMyRooms();
  }, []);

  const fetchFriendsAndRequests = async () => {
    setLoading(true);
    setError(null);
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        usersApi.getFriends(),
        friendsApi.getRequests()
      ]);
      setFriendsList(friendsRes.data || []);
      setPendingRequests(requestsRes.data || []);
    } catch (err) {
      console.error('Error fetching friends data:', err);
      setError('Failed to load friends list or requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRooms = async () => {
    try {
      const roomsRes = await roomsApi.getMyRooms();
      setMyRooms(roomsRes.data || []);
    } catch (err) {
      console.error('Error fetching my rooms:', err);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    setError(null);
    try {
      const res = await usersApi.search(searchQuery.trim());
      setSearchResults(res.data || []);
    } catch (err) {
      console.error('Error searching users:', err);
      setError('Search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (recipientId) => {
    try {
      setError(null);
      setSuccessMessage(null);
      const res = await friendsApi.sendRequest(recipientId);
      setSuccessMessage('Friend request sent successfully!');
      
      // Update local search results state if matching
      setSearchResults(prev => 
        prev.map(u => u._id === recipientId ? { ...u, requestSent: true } : u)
      );

      // Emit socket notification
      socket?.emit('friend:request-sent', { senderId: user._id, recipientId });

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to send friend request');
      setTimeout(() => setError(null), 4000);
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      setError(null);
      await friendsApi.accept(requestId);
      setSuccessMessage('Friend request accepted!');
      
      // Refresh list
      await fetchFriendsAndRequests();
      
      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to accept friend request');
    }
  };

  const declineFriendRequest = async (requestId) => {
    try {
      setError(null);
      await friendsApi.decline(requestId);
      setSuccessMessage('Friend request declined.');
      
      // Refresh list
      await fetchFriendsAndRequests();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to decline friend request');
    }
  };

  const removeFriend = async (friendId) => {
    if (!window.confirm('Are you sure you want to remove this friend?')) return;
    try {
      setError(null);
      await friendsApi.remove(friendId);
      setSuccessMessage('Friend removed.');
      
      // Refresh list
      await fetchFriendsAndRequests();

      setTimeout(() => setSuccessMessage(null), 3000);
    } catch (err) {
      setError(err.message || 'Failed to remove friend');
    }
  };

  const handleInviteFriend = (friend) => {
    setSelectedFriendForInvite(friend);
    if (myRooms.length > 0) {
      setSelectedRoomToInvite(myRooms[0]._id);
    }
  };

  const sendRoomInvitation = () => {
    if (!selectedRoomToInvite || !selectedFriendForInvite) return;
    
    const room = myRooms.find(r => r._id === selectedRoomToInvite);
    if (!room) return;

    // Send invitation via socket
    socket?.emit('room:invite', {
      roomId: room._id,
      roomName: room.name,
      senderName: user.username,
      recipientId: selectedFriendForInvite._id
    });

    setSuccessMessage(`Invitation to join "${room.name}" sent to ${selectedFriendForInvite.username}!`);
    setSelectedFriendForInvite(null);

    setTimeout(() => setSuccessMessage(null), 4000);
  };

  const onlineFriends = friendsList.filter(f => f.isOnline);

  return (
    <div className="friends-shell animate-fade-in" style={{ padding: '2rem', maxWidth: '1200px', margin: '0 auto' }}>
      {/* ── Header with Glow ── */}
      <div className="dashboard-header" style={{ marginBottom: '2rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <h1 className="dashboard-greeting" style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
            <Users size={32} color="#818cf8" style={{ filter: 'drop-shadow(0 0 8px rgba(129,140,248,0.5))' }} />
            Collaborators & Friends
          </h1>
          <p className="dashboard-sub">Find study buddies, invite them to rooms, and boost productivity together</p>
        </div>

        {/* Action Tabs in Discord/Notion Style */}
        <div className="tab-pills" style={{ background: 'rgba(15,23,42,0.4)', padding: '0.25rem', borderRadius: '8px' }}>
          <button className={`tab-pill ${activeTab === 'online' ? 'active' : ''}`} onClick={() => { setActiveTab('online'); setError(null); }}>
            Online {onlineFriends.length > 0 && <span className="pill-badge-green">{onlineFriends.length}</span>}
          </button>
          <button className={`tab-pill ${activeTab === 'all' ? 'active' : ''}`} onClick={() => { setActiveTab('all'); setError(null); }}>
            All Friends {friendsList.length > 0 && <span className="pill-badge-blue">{friendsList.length}</span>}
          </button>
          <button className={`tab-pill ${activeTab === 'pending' ? 'active' : ''}`} onClick={() => { setActiveTab('pending'); setError(null); }}>
            Pending {pendingRequests.length > 0 && <span className="pill-badge-red">{pendingRequests.length}</span>}
          </button>
          <button className={`tab-pill ${activeTab === 'add' ? 'active' : ''}`} onClick={() => { setActiveTab('add'); setError(null); setSearchResults([]); }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
              <UserPlus size={14} /> Add Friend
            </div>
          </button>
        </div>
      </div>

      {/* Messages */}
      {successMessage && (
        <div className="inline-toast inline-toast-success animate-slide-up" style={{ marginBottom: '1.5rem', background: 'rgba(16,185,129,0.15)', borderColor: 'rgba(16,185,129,0.3)', color: '#10b981', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '8px', border: '1px solid' }}>
          <UserCheck size={16} />
          {successMessage}
        </div>
      )}

      {error && (
        <div className="inline-toast inline-toast-error animate-slide-up" style={{ marginBottom: '1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.75rem 1rem', borderRadius: '8px' }}>
          <AlertCircle size={16} />
          {error}
        </div>
      )}

      {/* Main Glass Panel */}
      <div className="glass-card" style={{ padding: '2rem', minHeight: '400px' }}>
        {loading ? (
          <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', minHeight: '300px' }}>
            <div className="spinner" style={{ marginBottom: '1rem' }} />
            <span style={{ color: 'var(--text-muted)' }}>Loading connections...</span>
          </div>
        ) : (
          <>
            {/* Tab: ONLINE */}
            {activeTab === 'online' && (
              <div>
                <h3 className="section-title-sm" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', color: '#6ee7b7' }}>
                  <span className="chat-status-dot chat-status-live" style={{ width: '8px', height: '8px' }} />
                  Online Friends ({onlineFriends.length})
                </h3>

                {onlineFriends.length === 0 ? (
                  <div className="empty-state" style={{ padding: '4rem 0' }}>
                    <Inbox size={48} className="empty-state-icon" style={{ opacity: 0.2 }} />
                    <div className="empty-state-title">No friends online right now</div>
                    <div className="empty-state-sub">When your study buddies get online, they will appear here. Go ahead and invite someone to join!</div>
                    <button className="btn btn-primary" onClick={() => setActiveTab('add')} style={{ marginTop: '1.5rem' }}>
                      <UserPlus size={16} /> Add a New Friend
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    {onlineFriends.map(friend => (
                      <div key={friend._id} className="member-item" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.85rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <Link to={`/profile/${friend._id}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
                            <div className="member-avatar" style={{ background: 'rgba(129,140,248,0.2)', color: '#818cf8', fontWeight: 'bold', width: '40px', height: '40px', fontSize: '1rem', position: 'relative' }}>
                              {(friend.username?.[0] || 'U').toUpperCase()}
                              <span className="member-online-dot" style={{ bottom: '2px', right: '2px', width: '10px', height: '10px', background: '#10b981', border: '2px solid #0b0e14' }} />
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }} className="hover-underline">
                                {friend.fullName ? `${friend.fullName} (@${friend.username})` : friend.username}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{friend.bio || 'Studying hard! 🚀'}</div>
                              {(friend.city || friend.country) && (
                                <div style={{ fontSize: '0.68rem', color: '#a5b4fc', marginTop: '0.15rem' }}>
                                  📍 {[friend.city, friend.country].filter(Boolean).join(', ')}
                                </div>
                              )}
                            </div>
                          </Link>
                        </div>
                        
                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          {myRooms.length > 0 && (
                            <button className="btn btn-primary" onClick={() => handleInviteFriend(friend)} style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem' }}>
                              Invite to Study Room
                            </button>
                          )}
                          <button className="btn btn-ghost" onClick={() => navigate('/dashboard')} style={{ padding: '0.4rem', borderRadius: '6px' }} title="Visit Dashboard">
                            <MessageSquare size={16} />
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: ALL FRIENDS */}
            {activeTab === 'all' && (
              <div>
                <h3 className="section-title-sm" style={{ color: 'var(--text-secondary)' }}>
                  All Friends ({friendsList.length})
                </h3>

                {friendsList.length === 0 ? (
                  <div className="empty-state" style={{ padding: '4rem 0' }}>
                    <Users size={48} className="empty-state-icon" style={{ opacity: 0.2 }} />
                    <div className="empty-state-title">Your friend list is empty</div>
                    <div className="empty-state-sub">Add friends to easily collaborate, invite them to private sessions, and track each other's progress.</div>
                    <button className="btn btn-primary" onClick={() => setActiveTab('add')} style={{ marginTop: '1.5rem' }}>
                      <UserPlus size={16} /> Find Friends
                    </button>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    {friendsList.map(friend => (
                      <div key={friend._id} className="member-item" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.85rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <Link to={`/profile/${friend._id}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
                            <div className="member-avatar" style={{ background: 'rgba(148,163,184,0.15)', color: 'var(--text-secondary)', fontWeight: 'bold', width: '40px', height: '40px', fontSize: '1rem', position: 'relative' }}>
                              {(friend.username?.[0] || 'U').toUpperCase()}
                              {friend.isOnline && (
                                <span className="member-online-dot" style={{ bottom: '2px', right: '2px', width: '10px', height: '10px', background: '#10b981', border: '2px solid #0b0e14' }} />
                              )}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }} className="hover-underline">
                                {friend.fullName ? `${friend.fullName} (@${friend.username})` : friend.username}
                              </div>
                              <div style={{ fontSize: '0.75rem', color: friend.isOnline ? '#6ee7b7' : 'var(--text-muted)' }}>
                                {friend.isOnline ? 'Online now' : 'Offline'}
                              </div>
                              {(friend.city || friend.country) && (
                                <div style={{ fontSize: '0.68rem', color: '#a5b4fc', marginTop: '0.15rem' }}>
                                  📍 {[friend.city, friend.country].filter(Boolean).join(', ')}
                                </div>
                              )}
                            </div>
                          </Link>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-ghost" onClick={() => removeFriend(friend._id)} style={{ padding: '0.4rem 0.75rem', fontSize: '0.75rem', color: '#fca5a5' }}>
                            <UserMinus size={14} style={{ marginRight: '4px' }} /> Unfriend
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: PENDING REQUESTS */}
            {activeTab === 'pending' && (
              <div>
                <h3 className="section-title-sm" style={{ color: '#fca5a5' }}>
                  Pending Friend Requests ({pendingRequests.length})
                </h3>

                {pendingRequests.length === 0 ? (
                  <div className="empty-state" style={{ padding: '4rem 0' }}>
                    <Inbox size={48} className="empty-state-icon" style={{ opacity: 0.2 }} />
                    <div className="empty-state-title">No pending requests</div>
                    <div className="empty-state-sub">You have no incoming friend requests at the moment.</div>
                  </div>
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem', marginTop: '1rem' }}>
                    {pendingRequests.map(req => (
                      <div key={req._id} className="member-item" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.85rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                          <Link to={`/profile/${req.sender?._id}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
                            <div className="member-avatar" style={{ background: 'rgba(129,140,248,0.2)', color: '#818cf8', fontWeight: 'bold', width: '40px', height: '40px' }}>
                              {(req.sender?.username?.[0] || 'U').toUpperCase()}
                            </div>
                            <div>
                              <div style={{ fontWeight: 600, color: 'var(--text-primary)' }} className="hover-underline">{req.sender?.username}</div>
                              <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>wants to add you as a friend</div>
                            </div>
                          </Link>
                        </div>

                        <div style={{ display: 'flex', gap: '0.5rem' }}>
                          <button className="btn btn-primary" onClick={() => acceptFriendRequest(req._id)} style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', background: '#10b981', borderColor: '#10b981', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <Check size={14} /> Accept
                          </button>
                          <button className="btn btn-ghost" onClick={() => declineFriendRequest(req._id)} style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', color: '#fca5a5', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                            <X size={14} /> Decline
                          </button>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
              </div>
            )}

            {/* Tab: ADD FRIEND */}
            {activeTab === 'add' && (
              <div>
                <h3 className="section-title-sm" style={{ color: 'var(--text-secondary)' }}>Add Friends</h3>
                <p className="dashboard-sub" style={{ fontSize: '0.8rem', marginTop: '-0.5rem', marginBottom: '1.5rem' }}>Search by username to add other StudySync users to your study network.</p>

                <form onSubmit={handleSearch} style={{ display: 'flex', gap: '0.75rem', marginBottom: '2rem' }}>
                  <div style={{ position: 'relative', flex: 1 }}>
                    <Search size={18} style={{ position: 'absolute', left: '1rem', top: '50%', transform: 'translateY(-50%)', color: 'var(--text-muted)' }} />
                    <input
                      type="text"
                      className="input-dark"
                      placeholder="Enter username..."
                      value={searchQuery}
                      onChange={(e) => setSearchQuery(e.target.value)}
                      style={{ paddingLeft: '2.75rem' }}
                    />
                  </div>
                  <button type="submit" disabled={searchLoading} className="btn btn-primary" style={{ padding: '0 1.5rem', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
                    {searchLoading ? 'Searching...' : <><Search size={16} /> Search</>}
                  </button>
                </form>

                {searchResults.length === 0 ? (
                  searchQuery.trim() && !searchLoading ? (
                    <div style={{ textAlign: 'center', padding: '2rem 0', color: 'var(--text-muted)' }}>
                      No users found matching "{searchQuery}"
                    </div>
                  ) : null
                ) : (
                  <div style={{ display: 'flex', flexDirection: 'column', gap: '0.75rem' }}>
                    {searchResults.map(result => {
                      const isAlreadyFriend = friendsList.some(f => f._id === result._id);
                      return (
                        <div key={result._id} className="member-item" style={{ background: 'rgba(255,255,255,0.02)', border: '1px solid rgba(255,255,255,0.05)', padding: '0.85rem 1.25rem', borderRadius: '8px', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                          <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
                            <Link to={`/profile/${result._id}`} style={{ display: 'flex', alignItems: 'center', gap: '1rem', textDecoration: 'none', color: 'inherit' }}>
                              <div className="member-avatar" style={{ background: 'rgba(129,140,248,0.15)', color: '#818cf8', fontWeight: 'bold', width: '40px', height: '40px' }}>
                                {(result.username?.[0] || 'U').toUpperCase()}
                              </div>
                              <div>
                                <div style={{ fontWeight: 600, color: 'var(--text-primary)' }} className="hover-underline">
                                  {result.fullName ? `${result.fullName} (@${result.username})` : result.username}
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{result.bio || 'Ready to study together! ✍️'}</div>
                                {(result.city || result.country) && (
                                  <div style={{ fontSize: '0.68rem', color: '#a5b4fc', marginTop: '0.15rem' }}>
                                    📍 {[result.city, result.country].filter(Boolean).join(', ')}
                                  </div>
                                )}
                              </div>
                            </Link>
                          </div>

                          <div>
                            {isAlreadyFriend ? (
                              <span style={{ fontSize: '0.75rem', color: '#10b981', fontWeight: 600, padding: '0.4rem 0.75rem', background: 'rgba(16,185,129,0.1)', borderRadius: '6px' }}>
                                Already Friends
                              </span>
                            ) : result.requestSent ? (
                              <span style={{ fontSize: '0.75rem', color: 'var(--text-muted)', fontWeight: 600, padding: '0.4rem 0.75rem', background: 'rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <Clock size={12} /> Pending Request
                              </span>
                            ) : (
                              <button className="btn btn-primary" onClick={() => sendFriendRequest(result._id)} style={{ padding: '0.4rem 0.85rem', fontSize: '0.75rem', display: 'flex', alignItems: 'center', gap: '0.25rem' }}>
                                <UserPlus size={14} /> Send Request
                              </button>
                            )}
                          </div>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            )}
          </>
        )}
      </div>

      {/* Invite Modal Pop-up */}
      {selectedFriendForInvite && (
        <div style={{ position: 'fixed', top: 0, left: 0, right: 0, bottom: 0, background: 'rgba(0,0,0,0.7)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 100, backdropFilter: 'blur(4px)' }}>
          <div className="glass-card animate-scale-up" style={{ padding: '2rem', maxWidth: '400px', width: '90%', border: '1px solid rgba(255,255,255,0.1)' }}>
            <h3 className="section-title-sm" style={{ color: 'var(--text-primary)', marginBottom: '1rem' }}>
              Invite {selectedFriendForInvite.username} to Study
            </h3>
            
            <p style={{ fontSize: '0.85rem', color: 'var(--text-muted)', marginBottom: '1.5rem' }}>
              Select one of your rooms to send an invitation request to your friend.
            </p>

            <div style={{ marginBottom: '1.5rem' }}>
              <label className="auth-label" style={{ marginBottom: '0.5rem' }}>Choose Study Room</label>
              <select 
                className="input-dark" 
                value={selectedRoomToInvite} 
                onChange={(e) => setSelectedRoomToInvite(e.target.value)}
                style={{ width: '100%', background: 'rgba(15,23,42,0.8)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-primary)', padding: '0.75rem', borderRadius: '6px' }}
              >
                {myRooms.map(room => (
                  <option key={room._id} value={room._id}>
                    {room.name} ({room.members?.length || 0} active)
                  </option>
                ))}
              </select>
            </div>

            <div style={{ display: 'flex', gap: '0.75rem' }}>
              <button className="btn btn-primary" onClick={sendRoomInvitation} style={{ flex: 1 }}>
                Send Invitation
              </button>
              <button className="btn btn-ghost" onClick={() => setSelectedFriendForInvite(null)} style={{ flex: 1 }}>
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
