import { useState, useEffect } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { 
  Users, UserPlus, UserMinus, Check, X, Search, 
  MessageSquare, UserCheck, Inbox, Clock, AlertCircle
} from 'lucide-react';
import { friends as friendsApi, users as usersApi, rooms as roomsApi } from '../../services/api';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { Input } from '../ui/input';
import { Select } from '../ui/select';
import { Skeleton } from '../ui/skeleton';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import {
  Dialog,
  DialogContent,
  DialogHeader,
  DialogTitle,
  DialogDescription,
  DialogFooter,
  DialogClose,
} from '../ui/dialog';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

export const Friends = () => {
  const [activeTab, setActiveTab] = useState('online');
  const [friendsList, setFriendsList] = useState([]);
  const [pendingRequests, setPendingRequests] = useState([]);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState([]);
  const [myRooms, setMyRooms] = useState([]);
  const [selectedFriendForInvite, setSelectedFriendForInvite] = useState(null);
  const [selectedRoomToInvite, setSelectedRoomToInvite] = useState('');
  
  const [loading, setLoading] = useState(false);
  const [searchLoading, setSearchLoading] = useState(false);
  const [friendToRemove, setFriendToRemove] = useState(null);

  const { socket } = useSocket();
  const { user } = useAuth();
  const navigate = useNavigate();

  useEffect(() => {
    fetchFriendsAndRequests();
    fetchMyRooms();
  }, []);

  const fetchFriendsAndRequests = async () => {
    setLoading(true);
    try {
      const [friendsRes, requestsRes] = await Promise.all([
        usersApi.getFriends(),
        friendsApi.getRequests()
      ]);
      setFriendsList(friendsRes.data || []);
      setPendingRequests(requestsRes.data || []);
    } catch (err) {
      toast.error('Failed to load friends list or requests');
    } finally {
      setLoading(false);
    }
  };

  const fetchMyRooms = async () => {
    try {
      const roomsRes = await roomsApi.getMyRooms();
      setMyRooms(roomsRes.data || []);
    } catch (err) {
      console.error(err);
    }
  };

  const handleSearch = async (e) => {
    if (e) e.preventDefault();
    if (!searchQuery.trim()) return;

    setSearchLoading(true);
    try {
      const res = await usersApi.search(searchQuery.trim());
      setSearchResults(res.data || []);
    } catch (err) {
      toast.error('Search failed. Please try again.');
    } finally {
      setSearchLoading(false);
    }
  };

  const sendFriendRequest = async (recipientId) => {
    try {
      await friendsApi.sendRequest(recipientId);
      toast.success('Friend request sent successfully!');
      
      setSearchResults(prev => 
        prev.map(u => u._id === recipientId ? { ...u, requestSent: true } : u)
      );

      socket?.emit('friend:request-sent', { senderId: user._id, recipientId });
    } catch (err) {
      toast.error(err.message || 'Failed to send friend request');
    }
  };

  const acceptFriendRequest = async (requestId) => {
    try {
      await friendsApi.accept(requestId);
      toast.success('Friend request accepted!');
      await fetchFriendsAndRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to accept friend request');
    }
  };

  const declineFriendRequest = async (requestId) => {
    try {
      await friendsApi.decline(requestId);
      toast.success('Friend request declined');
      await fetchFriendsAndRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to decline request');
    }
  };

  const removeFriend = async () => {
    if (!friendToRemove) return;
    try {
      await friendsApi.remove(friendToRemove._id);
      toast.success('Friend removed successfully');
      setFriendToRemove(null);
      await fetchFriendsAndRequests();
    } catch (err) {
      toast.error(err.message || 'Failed to remove friend');
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

    socket?.emit('room:invite', {
      roomId: room._id,
      roomName: room.name,
      senderName: user.username,
      recipientId: selectedFriendForInvite._id
    });

    toast.success(`Invitation to join "${room.name}" sent to ${selectedFriendForInvite.username}!`);
    setSelectedFriendForInvite(null);
  };

  const onlineFriends = friendsList.filter(f => f.isOnline);

  if (loading) {
    return (
      <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-fade-in">
        <div className="space-y-3">
          <Skeleton className="h-10 w-72" />
          <Skeleton className="h-5 w-96" />
        </div>
        <Skeleton className="h-[350px] w-full rounded-xl" />
      </div>
    );
  }

  return (
    <div className="p-8 max-w-[1200px] mx-auto space-y-8 animate-fade-in">
      {/* Header */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 border-b border-border pb-6">
        <div>
          <h1 className="text-3xl font-display font-extrabold text-white tracking-tight flex items-center gap-3">
            <Users size={32} className="text-indigo-400 drop-shadow-[0_0_8px_rgba(99,102,241,0.3)]" />
            Collaborators & Friends
          </h1>
          <p className="text-sm text-slate-400 mt-2">Find study buddies, invite them to rooms, and boost productivity together</p>
        </div>
      </div>

      {/* Main content Area */}
      <div className="bg-slate-900/20 border border-border p-6 rounded-xl min-h-[400px]">
        <Tabs value={activeTab} onValueChange={(val) => { setActiveTab(val); setSearchResults([]); }} className="w-full space-y-6">
          <TabsList className="w-full md:w-auto justify-start gap-1">
            <TabsTrigger value="online">
              Online {onlineFriends.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-emerald-500/10 text-emerald-400 rounded-full">{onlineFriends.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="all">
              All Friends {friendsList.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-indigo-500/10 text-indigo-400 rounded-full">{friendsList.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="pending">
              Pending Requests {pendingRequests.length > 0 && <span className="ml-1.5 px-1.5 py-0.5 text-[10px] bg-red-500/10 text-red-400 rounded-full">{pendingRequests.length}</span>}
            </TabsTrigger>
            <TabsTrigger value="add" className="flex items-center gap-1.5">
              <UserPlus size={13} /> Add Friend
            </TabsTrigger>
          </TabsList>

          <TabsContent value="online" className="focus:outline-none space-y-4">
            <h3 className="text-sm font-bold font-display text-emerald-400 flex items-center gap-1.5">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Online Friends ({onlineFriends.length})
            </h3>

            {onlineFriends.length === 0 ? (
              <div className="text-center py-16 space-y-4 border border-dashed border-border rounded-xl bg-slate-900/10">
                <Inbox size={40} className="mx-auto text-slate-600" />
                <div className="text-sm font-bold text-white">No friends online right now</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">When your study buddies get online, they will appear here. Go ahead and invite someone to join!</p>
                <button 
                  onClick={() => setActiveTab('add')}
                  className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                >
                  <UserPlus size={14} className="mr-1.5" /> Find Friends
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {onlineFriends.map(friend => (
                  <div key={friend._id} className="bg-slate-900/40 border border-border p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 rounded-full bg-indigo-600/20 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0 border border-indigo-500/10">
                        {(friend.username?.[0] || 'U').toUpperCase()}
                        <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                      </div>
                      <div className="min-w-0">
                        <Link to={`/profile/${friend._id}`} className="font-bold text-white text-sm hover:underline truncate block">
                          {friend.fullName || friend.username}
                        </Link>
                        <p className="text-xs text-slate-400 truncate mt-0.5">{friend.bio || 'Studying hard! 🚀'}</p>
                        {friend.city && (
                          <span className="text-[10px] text-indigo-300 mt-1 block">📍 {friend.city}, {friend.country}</span>
                        )}
                      </div>
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      {myRooms.length > 0 && (
                        <button 
                          onClick={() => handleInviteFriend(friend)}
                          className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer transition-all"
                        >
                          Invite to Room
                        </button>
                      )}
                      <button 
                        onClick={() => navigate('/dashboard')}
                        className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 w-8 border border-border text-slate-400 hover:text-white hover:bg-white/5 cursor-pointer"
                        title="Chat"
                      >
                        <MessageSquare size={14} />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="all" className="focus:outline-none space-y-4">
            <h3 className="text-sm font-bold font-display text-white">All Friends ({friendsList.length})</h3>

            {friendsList.length === 0 ? (
              <div className="text-center py-16 space-y-4 border border-dashed border-border rounded-xl bg-slate-900/10">
                <Users size={40} className="mx-auto text-slate-600" />
                <div className="text-sm font-bold text-white">Your friend list is empty</div>
                <p className="text-xs text-slate-400 max-w-sm mx-auto">Add friends to easily collaborate, invite them to private sessions, and track each other's progress.</p>
                <button 
                  onClick={() => setActiveTab('add')}
                  className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-3 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                >
                  <UserPlus size={14} className="mr-1.5" /> Find Friends
                </button>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {friendsList.map(friend => (
                  <div key={friend._id} className="bg-slate-900/40 border border-border p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="relative w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0 border border-border">
                        {(friend.username?.[0] || 'U').toUpperCase()}
                        {friend.isOnline && (
                          <span className="absolute bottom-0 right-0 w-2.5 h-2.5 bg-emerald-500 border-2 border-slate-950 rounded-full" />
                        )}
                      </div>
                      <div className="min-w-0">
                        <Link to={`/profile/${friend._id}`} className="font-bold text-white text-sm hover:underline truncate block">
                          {friend.fullName || friend.username}
                        </Link>
                        <span className={cn(
                          "text-[10px] font-semibold mt-0.5 block",
                          friend.isOnline ? "text-emerald-400" : "text-slate-500"
                        )}>
                          {friend.isOnline ? 'Online now' : 'Offline'}
                        </span>
                      </div>
                    </div>
                    
                    <button 
                      onClick={() => setFriendToRemove(friend)}
                      className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-3 border border-red-500/20 text-red-400 hover:bg-red-500 hover:text-white transition-all cursor-pointer shrink-0"
                    >
                      <UserMinus size={13} className="mr-1.5" /> Unfriend
                    </button>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="pending" className="focus:outline-none space-y-4">
            <h3 className="text-sm font-bold font-display text-white">Pending Requests ({pendingRequests.length})</h3>

            {pendingRequests.length === 0 ? (
              <div className="text-center py-16 space-y-2 border border-dashed border-border rounded-xl bg-slate-900/10">
                <Inbox size={40} className="mx-auto text-slate-600" />
                <div className="text-xs font-semibold text-slate-500">No pending friend requests</div>
              </div>
            ) : (
              <div className="flex flex-col gap-3">
                {pendingRequests.map(req => (
                  <div key={req._id} className="bg-slate-900/40 border border-border p-4 rounded-xl flex items-center justify-between gap-4">
                    <div className="flex items-center gap-3 min-w-0">
                      <div className="w-10 h-10 rounded-full bg-indigo-600/10 text-indigo-400 flex items-center justify-center font-bold text-sm shrink-0">
                        {(req.sender?.username?.[0] || 'U').toUpperCase()}
                      </div>
                      <div className="min-w-0">
                        <Link to={`/profile/${req.sender?._id}`} className="font-bold text-white text-sm hover:underline truncate block">
                          {req.sender?.username}
                        </Link>
                        <p className="text-xs text-slate-400 mt-0.5">wants to add you as a friend</p>
                      </div>
                    </div>
                    
                    <div className="flex gap-2 shrink-0">
                      <button 
                        onClick={() => acceptFriendRequest(req._id)}
                        className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-3.5 bg-emerald-600 hover:bg-emerald-700 text-white cursor-pointer"
                      >
                        <Check size={14} className="mr-1" /> Accept
                      </button>
                      <button 
                        onClick={() => declineFriendRequest(req._id)}
                        className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-3 bg-white/5 hover:bg-white/10 text-slate-300 cursor-pointer"
                      >
                        <X size={14} className="mr-1" /> Decline
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </TabsContent>

          <TabsContent value="add" className="focus:outline-none space-y-6">
            <div className="space-y-1.5">
              <h3 className="text-sm font-bold font-display text-white">Find Study Buddies</h3>
              <p className="text-xs text-slate-400">Search by username to send friend requests and construct your study circles.</p>
            </div>

            <form onSubmit={handleSearch} className="flex gap-2">
              <div className="relative flex-1">
                <Search size={16} className="absolute left-3 top-1/2 -translate-y-1/2 text-slate-500" />
                <Input
                  placeholder="Enter buddy's username..."
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                  className="pl-9"
                />
              </div>
              <button 
                type="submit" 
                disabled={searchLoading}
                className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-10 px-4 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer shrink-0"
              >
                {searchLoading ? 'Searching...' : <><Search size={14} className="mr-1.5" /> Search</>}
              </button>
            </form>

            {searchResults.length === 0 ? (
              searchQuery.trim() && !searchLoading && (
                <div className="text-center py-8 text-xs text-slate-500">
                  No users found matching "{searchQuery}"
                </div>
              )
            ) : (
              <div className="flex flex-col gap-3">
                {searchResults.map(result => {
                  const isAlreadyFriend = friendsList.some(f => f._id === result._id);
                  return (
                    <div key={result._id} className="bg-slate-900/40 border border-border p-4 rounded-xl flex items-center justify-between gap-4">
                      <div className="flex items-center gap-3 min-w-0">
                        <div className="w-10 h-10 rounded-full bg-slate-800 text-slate-400 flex items-center justify-center font-bold text-sm shrink-0">
                          {(result.username?.[0] || 'U').toUpperCase()}
                        </div>
                        <div className="min-w-0">
                          <Link to={`/profile/${result._id}`} className="font-bold text-white text-sm hover:underline truncate block">
                            {result.fullName || result.username}
                          </Link>
                          <p className="text-xs text-slate-400 truncate mt-0.5">{result.bio || 'Ready to study together! ✍️'}</p>
                        </div>
                      </div>

                      <div className="shrink-0">
                        {isAlreadyFriend ? (
                          <span className="text-xs font-semibold text-emerald-400 bg-emerald-500/10 px-2.5 py-1 rounded">Already Friends</span>
                        ) : result.requestSent ? (
                          <span className="inline-flex items-center gap-1 text-xs font-semibold text-slate-500 bg-white/5 px-2.5 py-1 rounded">
                            <Clock size={12} /> Sent
                          </span>
                        ) : (
                          <button 
                            onClick={() => sendFriendRequest(result._id)}
                            className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-8 px-3.5 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer"
                          >
                            <UserPlus size={13} className="mr-1.5" /> Add
                          </button>
                        )}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </TabsContent>
        </Tabs>
      </div>

      {/* Remove Friend Confirm Dialog */}
      <Dialog open={!!friendToRemove} onOpenChange={(open) => !open && setFriendToRemove(null)}>
        <DialogContent className="max-w-sm bg-slate-950 border border-border">
          <DialogHeader>
            <DialogTitle>Remove Friend?</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Are you sure you want to remove {friendToRemove?.username} from your friends list?
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <button className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
                Cancel
              </button>
            </DialogClose>
            <button 
              onClick={removeFriend}
              className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 bg-red-600 hover:bg-red-700 text-white cursor-pointer ml-2"
            >
              Unfriend
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Invite Friend to Room Dialog */}
      <Dialog open={!!selectedFriendForInvite} onOpenChange={(open) => !open && setSelectedFriendForInvite(null)}>
        <DialogContent className="max-w-sm bg-slate-950 border border-border">
          <DialogHeader>
            <DialogTitle>Invite to Session</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Select one of your study rooms to invite {selectedFriendForInvite?.username}.
            </DialogDescription>
          </DialogHeader>
          <div className="py-4 space-y-2">
            <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Choose Study Room</label>
            <Select 
              value={selectedRoomToInvite} 
              onChange={(e) => setSelectedRoomToInvite(e.target.value)}
            >
              {myRooms.map(room => (
                <option key={room._id} value={room._id}>
                  {room.name} ({room.members?.length || 0} active)
                </option>
              ))}
            </Select>
          </div>
          <DialogFooter>
            <DialogClose asChild>
              <button className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
                Cancel
              </button>
            </DialogClose>
            <button 
              onClick={sendRoomInvitation}
              className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white cursor-pointer ml-2"
            >
              Send Invite
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};
