import { useState, useEffect, useRef, useCallback } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { rooms as roomsApi } from '../../services/api';
import { ChatPanel } from './ChatPanel';
import { AIAssistant } from './AIAssistant';
import { FileSharingPanel } from './FileSharingPanel';
import { StudyTimer } from './StudyTimer';
import { RoomMembers } from './RoomMembers';
import { 
  MessageSquare, Sparkles, FolderUp, Users, Info, Settings, LogOut, 
  ArrowLeft, ShieldAlert, Copy, Check, ChevronLeft, ChevronRight, X, Maximize2, Minimize2
} from 'lucide-react';
import { Switch } from '../ui/switch';
import { ScrollArea } from '../ui/scroll-area';
import { Tooltip, TooltipTrigger, TooltipContent } from '../ui/tooltip';
import { Tabs, TabsList, TabsTrigger, TabsContent } from '../ui/tabs';
import { Accordion, AccordionItem, AccordionTrigger, AccordionContent } from '../ui/accordion';
import { Dialog, DialogContent, DialogHeader, DialogTitle, DialogDescription, DialogFooter, DialogClose } from '../ui/dialog';
import { Input } from '../ui/input';
import { Textarea } from '../ui/textarea';
import { Select } from '../ui/select';
import { toast } from 'sonner';
import { cn } from '../../lib/utils';

// ─── Component: RoomInfoPanel ───
const RoomInfoPanel = ({ room, copiedCode, copiedLink, copyRoomCode, copyInviteLink }) => {
  if (!room) return null;

  return (
    <div className="flex flex-col h-full overflow-hidden p-5">
      <h3 className="text-sm font-bold font-display text-white border-b border-border pb-3 mb-4 flex items-center gap-2">
        <Info size={16} className="text-indigo-400" /> Room Details
      </h3>
      
      <ScrollArea className="flex-1 pr-2">
        <div className="space-y-4">
          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Room Name</div>
            <div className="text-sm font-semibold text-white">{room.name}</div>
          </div>

          <div>
            <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Description</div>
            <p className="text-xs text-slate-400 leading-relaxed">{room.description || 'No description provided.'}</p>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Subject</div>
              <div className="text-xs font-semibold text-slate-300">{room.subject || 'General Study'}</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Study Goal</div>
              <div className="text-xs font-semibold text-slate-300">{room.studyGoal || 'No goal set'}</div>
            </div>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Focus Duration</div>
              <div className="text-xs font-semibold text-indigo-400">{room.studyDuration} mins</div>
            </div>
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Privacy</div>
              <div className="text-xs font-semibold text-slate-300">{room.isPrivate ? '🔒 Private' : '🌐 Public'}</div>
            </div>
          </div>

          <div className="border-t border-border/40 pt-4 space-y-3">
            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Room Code</div>
              <div className="flex items-center gap-2 mt-1">
                <code className="text-xs font-mono font-bold px-2 py-1 bg-slate-900 border border-border text-indigo-400 rounded">
                  {room.code}
                </code>
                <button
                  onClick={copyRoomCode}
                  className="inline-flex items-center justify-center rounded text-xs font-semibold px-2 py-1 bg-white/5 hover:bg-white/10 text-white cursor-pointer"
                >
                  {copiedCode ? <Check size={12} className="text-emerald-400 mr-1" /> : <Copy size={12} className="mr-1" />}
                  Copy
                </button>
              </div>
            </div>

            <div>
              <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mb-1">Invite Link</div>
              <div className="flex items-center gap-2 mt-1">
                <input
                  type="text"
                  value={`https://studysync.app/join/${room.code}`}
                  readOnly
                  className="flex-1 h-7 bg-slate-900 border border-border rounded px-2 text-[10px] text-slate-400 focus:outline-none"
                />
                <button
                  onClick={copyInviteLink}
                  className="inline-flex items-center justify-center rounded text-xs font-semibold h-7 px-2.5 bg-white/5 hover:bg-white/10 text-white cursor-pointer shrink-0"
                >
                  {copiedLink ? <Check size={12} className="text-emerald-400 mr-1" /> : <Copy size={12} className="mr-1" />}
                  Copy Link
                </button>
              </div>
            </div>
          </div>
        </div>
      </ScrollArea>
    </div>
  );
};

// ─── Component: RoomSettingsPanel ───
const RoomSettingsPanel = ({ roomId, room, onRefresh, user }) => {
  const isOwner = room?.createdBy?._id === user?._id || room?.createdBy === user?._id;
  const navigate = useNavigate();
  const { socket } = useSocket();

  // Form states
  const [name, setName] = useState(room?.name || '');
  const [description, setDescription] = useState(room?.description || '');
  const [subject, setSubject] = useState(room?.subject || '');
  const [studyGoal, setStudyGoal] = useState(room?.studyGoal || '');
  const [coverColor, setCoverColor] = useState(room?.coverColor || '#6366f1');
  const [coverIcon, setCoverIcon] = useState(room?.coverIcon || '📚');
  
  const [isPrivate, setIsPrivate] = useState(room?.isPrivate || false);
  const [isLocked, setIsLocked] = useState(room?.isLocked || false);
  const [inviteOnly, setInviteOnly] = useState(room?.inviteOnly || false);

  const [allowChat, setAllowChat] = useState(room?.allowChat !== false);
  const [allowFileSharing, setAllowFileSharing] = useState(room?.allowFileSharing !== false);
  const [allowAIAssistant, setAllowAIAssistant] = useState(room?.allowAIAssistant !== false);

  const [studyDuration, setStudyDuration] = useState(room?.studyDuration || 30);
  const [breakDuration, setBreakDuration] = useState(room?.breakDuration || 5);
  const [autoStartBreak, setAutoStartBreak] = useState(room?.autoStartBreak || false);
  const [autoStartFocus, setAutoStartFocus] = useState(room?.autoStartFocus || false);

  const [saving, setSaving] = useState(false);
  const [showDeleteConfirm, setShowDeleteConfirm] = useState(false);
  const [showLeaveConfirm, setShowLeaveConfirm] = useState(false);
  
  const [transferTargetId, setTransferTargetId] = useState('');
  const [promoteTargetId, setPromoteTargetId] = useState('');

  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  useEffect(() => {
    if (room) {
      setName(room.name || '');
      setDescription(room.description || '');
      setSubject(room.subject || '');
      setStudyGoal(room.studyGoal || '');
      setCoverColor(room.coverColor || '#6366f1');
      setCoverIcon(room.coverIcon || '📚');
      setIsPrivate(room.isPrivate || false);
      setIsLocked(room.isLocked || false);
      setInviteOnly(room.inviteOnly || false);
      setAllowChat(room.allowChat !== false);
      setAllowFileSharing(room.allowFileSharing !== false);
      setAllowAIAssistant(room.allowAIAssistant !== false);
      setStudyDuration(room.studyDuration || 30);
      setBreakDuration(room.breakDuration || 5);
      setAutoStartBreak(room.autoStartBreak || false);
      setAutoStartFocus(room.autoStartFocus || false);
    }
  }, [room]);

  const handleUpdateRoomSetting = async (updatedFields) => {
    if (!isOwner) return;
    try {
      setSaving(true);
      const payload = {
        name: updatedFields.name !== undefined ? updatedFields.name : name,
        description: updatedFields.description !== undefined ? updatedFields.description : description,
        subject: updatedFields.subject !== undefined ? updatedFields.subject : subject,
        studyGoal: updatedFields.studyGoal !== undefined ? updatedFields.studyGoal : studyGoal,
        coverColor: updatedFields.coverColor !== undefined ? updatedFields.coverColor : coverColor,
        coverIcon: updatedFields.coverIcon !== undefined ? updatedFields.coverIcon : coverIcon,
        isPrivate: updatedFields.isPrivate !== undefined ? updatedFields.isPrivate : isPrivate,
        isLocked: updatedFields.isLocked !== undefined ? updatedFields.isLocked : isLocked,
        inviteOnly: updatedFields.inviteOnly !== undefined ? updatedFields.inviteOnly : inviteOnly,
        allowChat: updatedFields.allowChat !== undefined ? updatedFields.allowChat : allowChat,
        allowFileSharing: updatedFields.allowFileSharing !== undefined ? updatedFields.allowFileSharing : allowFileSharing,
        allowAIAssistant: updatedFields.allowAIAssistant !== undefined ? updatedFields.allowAIAssistant : allowAIAssistant,
        studyDuration: Number(updatedFields.studyDuration !== undefined ? updatedFields.studyDuration : studyDuration),
        breakDuration: Number(updatedFields.breakDuration !== undefined ? updatedFields.breakDuration : breakDuration),
        autoStartBreak: updatedFields.autoStartBreak !== undefined ? updatedFields.autoStartBreak : autoStartBreak,
        autoStartFocus: updatedFields.autoStartFocus !== undefined ? updatedFields.autoStartFocus : autoStartFocus
      };

      await roomsApi.update(roomId, payload);
      
      // Update local states
      if (updatedFields.name !== undefined) setName(updatedFields.name);
      if (updatedFields.description !== undefined) setDescription(updatedFields.description);
      if (updatedFields.subject !== undefined) setSubject(updatedFields.subject);
      if (updatedFields.studyGoal !== undefined) setStudyGoal(updatedFields.studyGoal);
      if (updatedFields.coverColor !== undefined) setCoverColor(updatedFields.coverColor);
      if (updatedFields.coverIcon !== undefined) setCoverIcon(updatedFields.coverIcon);
      if (updatedFields.isPrivate !== undefined) setIsPrivate(updatedFields.isPrivate);
      if (updatedFields.isLocked !== undefined) setIsLocked(updatedFields.isLocked);
      if (updatedFields.inviteOnly !== undefined) setInviteOnly(updatedFields.inviteOnly);
      if (updatedFields.allowChat !== undefined) setAllowChat(updatedFields.allowChat);
      if (updatedFields.allowFileSharing !== undefined) setAllowFileSharing(updatedFields.allowFileSharing);
      if (updatedFields.allowAIAssistant !== undefined) setAllowAIAssistant(updatedFields.allowAIAssistant);
      if (updatedFields.studyDuration !== undefined) setStudyDuration(updatedFields.studyDuration);
      if (updatedFields.breakDuration !== undefined) setBreakDuration(updatedFields.breakDuration);
      if (updatedFields.autoStartBreak !== undefined) setAutoStartBreak(updatedFields.autoStartBreak);
      if (updatedFields.autoStartFocus !== undefined) setAutoStartFocus(updatedFields.autoStartFocus);

      // Trigger socket event for immediate settings update to all other room members
      if (socket) {
        socket.emit('room:update_settings', { roomId, settings: payload });
      }

      onRefresh?.();
    } catch (err) {
      toast.error('Failed to save settings: ' + err.message);
    } finally {
      setSaving(false);
    }
  };

  const handleDeleteRoom = async () => {
    if (!isOwner) return;
    try {
      await roomsApi.delete(roomId);
      toast.success('Room deleted permanently');
      navigate('/dashboard');
    } catch (err) {
      toast.error(err.message || 'Failed to delete room');
    }
  };

  const handleLeaveRoom = async () => {
    try {
      if (socket) socket.emit('room:leave', { roomId, userId: user._id });
      await roomsApi.leave(roomId);
      toast.success('Left the study room');
      navigate('/dashboard');
    } catch (err) {
      navigate('/dashboard');
    }
  };

  const handleTransferOwnership = async () => {
    if (!isOwner || !transferTargetId) return;
    try {
      setSaving(true);
      await roomsApi.transferOwnership(roomId, transferTargetId);
      toast.success('Ownership transferred successfully!');
      setTransferTargetId('');
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Failed to transfer ownership');
    } finally {
      setSaving(false);
    }
  };

  const handlePromoteAdmin = async () => {
    if (!isOwner || !promoteTargetId) return;
    try {
      setSaving(true);
      await roomsApi.promote(roomId, promoteTargetId);
      toast.success('Member promoted to admin!');
      setPromoteTargetId('');
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Failed to promote member');
    } finally {
      setSaving(false);
    }
  };

  const handleDemoteAdmin = async (targetId) => {
    if (!isOwner) return;
    try {
      setSaving(true);
      await roomsApi.demote(roomId, targetId);
      toast.success('Admin demoted');
      onRefresh?.();
    } catch (err) {
      toast.error(err.message || 'Failed to demote admin');
    } finally {
      setSaving(false);
    }
  };

  const copyCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    if (!room?.code) return;
    const inviteLink = `${window.location.origin}/room/${room._id}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const COVER_ICONS = ['📚', '💻', '🔬', '🎨', '✍️', '🧬', '🧠', '⚙️'];

  return (
    <div className="flex flex-col h-full overflow-hidden">
      {/* Header */}
      <div className="p-5 border-b border-border flex justify-between items-center shrink-0">
        <h3 className="text-sm font-bold font-display text-white flex items-center gap-2">
          <Settings size={16} className="text-indigo-400" /> Room Settings
        </h3>
        <span className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
          {saving ? 'Saving changes...' : 'Synced to Cloud'}
        </span>
      </div>

      <ScrollArea className="flex-1 p-5 pr-6">
        <Accordion type="single" collapsible defaultValue="general" className="w-full space-y-3">
          
          {/* 1. General Section */}
          <AccordionItem value="general" className="border border-border rounded-lg bg-slate-900/10 px-4">
            <AccordionTrigger className="text-xs hover:no-underline font-bold uppercase tracking-wider py-4">General Settings</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1 pb-5">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Room Name</label>
                <Input 
                  value={name} 
                  onChange={(e) => setName(e.target.value)} 
                  onBlur={() => handleUpdateRoomSetting({ name })}
                  disabled={!isOwner} 
                />
              </div>
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Description</label>
                <Textarea 
                  value={description} 
                  onChange={(e) => setDescription(e.target.value)} 
                  onBlur={() => handleUpdateRoomSetting({ description })}
                  disabled={!isOwner} 
                  rows={2} 
                />
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Subject</label>
                  <Input 
                    value={subject} 
                    onChange={(e) => setSubject(e.target.value)} 
                    onBlur={() => handleUpdateRoomSetting({ subject })}
                    disabled={!isOwner} 
                  />
                </div>
                <div className="space-y-1">
                  <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Study Goal</label>
                  <Input 
                    value={studyGoal} 
                    onChange={(e) => setStudyGoal(e.target.value)} 
                    onBlur={() => handleUpdateRoomSetting({ studyGoal })}
                    disabled={!isOwner} 
                    placeholder="e.g. Complete math sheet" 
                  />
                </div>
              </div>
              <div className="space-y-2">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Cover Icon</label>
                <div className="flex gap-1.5 flex-wrap">
                  {COVER_ICONS.map(icon => (
                    <button 
                      key={icon}
                      type="button"
                      onClick={() => isOwner && handleUpdateRoomSetting({ coverIcon: icon })}
                      className={cn(
                        "text-sm p-1.5 rounded transition-all cursor-pointer border border-transparent",
                        coverIcon === icon ? "bg-indigo-600/20 border-indigo-500" : "bg-white/[0.02] hover:bg-white/5"
                      )}
                    >
                      {icon}
                    </button>
                  ))}
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 2. Permissions Section */}
          <AccordionItem value="permissions" className="border border-border rounded-lg bg-slate-900/10 px-4">
            <AccordionTrigger className="text-xs hover:no-underline font-bold uppercase tracking-wider py-4">Permissions</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1 pb-5">
              <div className="space-y-1">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Owner</label>
                <div className="text-xs p-2.5 bg-slate-900 border border-border rounded text-slate-300 font-semibold flex items-center gap-1.5 select-none">
                  👑 {room.createdBy?.username || 'Owner'}
                </div>
              </div>

              <div className="space-y-3">
                <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider block">Member Permissions</label>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-slate-950/20">
                  <span className="text-xs text-slate-300">Allow Chat Messaging</span>
                  <Switch checked={allowChat} onCheckedChange={(checked) => handleUpdateRoomSetting({ allowChat: checked })} disabled={!isOwner} />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-slate-950/20">
                  <span className="text-xs text-slate-300">Allow File Sharing</span>
                  <Switch checked={allowFileSharing} onCheckedChange={(checked) => handleUpdateRoomSetting({ allowFileSharing: checked })} disabled={!isOwner} />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-slate-950/20">
                  <span className="text-xs text-slate-300">Allow AI Assistant</span>
                  <Switch checked={allowAIAssistant} onCheckedChange={(checked) => handleUpdateRoomSetting({ allowAIAssistant: checked })} disabled={!isOwner} />
                </div>
              </div>

              {isOwner && (
                <div className="border-t border-border/40 pt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Promote to Admin</label>
                    <div className="flex gap-2">
                      <Select 
                        value={promoteTargetId}
                        onChange={(e) => setPromoteTargetId(e.target.value)}
                      >
                        <option value="">Select member...</option>
                        {(room.members || [])
                          .filter(m => (m._id || m) !== user?._id && !(room.admins || []).some(admin => (admin._id || admin) === (m._id || m)))
                          .map(m => (
                            <option key={m._id || m} value={m._id || m}>{m.username || 'Student'}</option>
                          ))
                        }
                      </Select>
                      <button 
                        onClick={handlePromoteAdmin} 
                        disabled={!promoteTargetId || saving}
                        className="inline-flex items-center justify-center rounded text-xs font-semibold h-8 px-3 bg-white/5 hover:bg-white/10 border border-border text-white cursor-pointer shrink-0"
                      >
                        Promote
                      </button>
                    </div>
                  </div>

                  {(room.admins || []).length > 0 && (
                    <div className="space-y-2">
                      <div className="text-[9px] font-bold text-slate-500 uppercase tracking-wider">Room Admins</div>
                      <div className="space-y-1.5">
                        {(room.admins || []).map(admin => {
                          const adminObj = (room.members || []).find(m => (m._id || m) === (admin._id || admin)) || admin;
                          return (
                            <div key={admin._id || admin} className="flex justify-between items-center p-2 rounded bg-slate-900 border border-border">
                              <span className="text-xs text-slate-300 font-medium flex items-center gap-1">🛡️ {adminObj.username || 'Admin'}</span>
                              <button 
                                onClick={() => handleDemoteAdmin(admin._id || admin)}
                                className="text-[10px] text-red-400 hover:text-red-300 px-2 py-0.5 rounded bg-red-500/5 hover:bg-red-500/10 cursor-pointer"
                              >
                                Demote
                              </button>
                            </div>
                          );
                        })}
                      </div>
                    </div>
                  )}
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 3. Members List Section */}
          <AccordionItem value="members" className="border border-border rounded-lg bg-slate-900/10 px-4">
            <AccordionTrigger className="text-xs hover:no-underline font-bold uppercase tracking-wider py-4">Members ({room.members?.length || 0})</AccordionTrigger>
            <AccordionContent className="space-y-3 pt-1 pb-5">
              {(room.members || []).map(m => {
                const isMOwner = room.createdBy?._id === m._id || room.createdBy === m._id;
                const isMAdmin = isMOwner || (room.admins || []).some(adminId => (adminId._id || adminId) === m._id);
                const isCurrent = m._id === user._id;

                return (
                  <div key={m._id} className="flex items-center justify-between p-2.5 rounded bg-slate-900 border border-border">
                    <div className="flex items-center gap-2">
                      <div className="w-6 h-6 rounded-full bg-slate-800 text-[10px] font-bold text-slate-300 flex items-center justify-center border border-border">
                        {(m.username?.[0] || 'U').toUpperCase()}
                      </div>
                      <span className="text-xs font-semibold text-slate-200">
                        {m.username} {isCurrent && <span className="text-[9px] text-slate-500">(you)</span>}
                      </span>
                    </div>

                    <div className="flex gap-2 items-center">
                      {isMOwner ? (
                        <span className="text-[10px] font-semibold text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded">Owner</span>
                      ) : isMAdmin ? (
                        <span className="text-[10px] font-semibold text-purple-400 bg-purple-500/10 border border-purple-500/20 px-2 py-0.5 rounded">Admin</span>
                      ) : null}

                      {isOwner && !isMOwner && (
                        <div className="flex gap-1">
                          {isMAdmin ? (
                            <button 
                              onClick={() => handleDemoteAdmin(m._id)}
                              className="text-[9px] font-bold px-2 py-0.5 border border-border text-slate-400 hover:text-white rounded cursor-pointer"
                            >
                              Demote
                            </button>
                          ) : (
                            <button 
                              onClick={async () => {
                                setPromoteTargetId(m._id);
                                await handlePromoteAdmin();
                              }}
                              className="text-[9px] font-bold px-2 py-0.5 border border-indigo-500/30 text-indigo-400 hover:bg-indigo-600 hover:text-white rounded cursor-pointer"
                            >
                              Promote
                            </button>
                          )}
                          <button 
                            onClick={async () => {
                              if (!window.confirm(`Kick ${m.username} from room?`)) return;
                              try {
                                await roomsApi.kick(roomId, m._id);
                                onRefresh?.();
                                toast.success(`${m.username} kicked successfully`);
                              } catch (err) {
                                toast.error('Failed to kick member');
                              }
                            }}
                            className="text-[9px] font-bold px-2 py-0.5 border border-red-500/30 text-red-400 hover:bg-red-600 hover:text-white rounded cursor-pointer"
                          >
                            Kick
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                );
              })}
            </AccordionContent>
          </AccordionItem>

          {/* 4. Timer Settings Section */}
          <AccordionItem value="study" className="border border-border rounded-lg bg-slate-900/10 px-4">
            <AccordionTrigger className="text-xs hover:no-underline font-bold uppercase tracking-wider py-4">Study Timer Settings</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1 pb-5">
              <div className="space-y-4">
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300">Focus Duration</span>
                    <span className="font-bold text-indigo-400">{studyDuration} mins</span>
                  </div>
                  <input 
                    type="range" 
                    min="5" 
                    max="120" 
                    step="5"
                    value={studyDuration} 
                    onChange={(e) => setStudyDuration(Number(e.target.value))}
                    onMouseUp={(e) => handleUpdateRoomSetting({ studyDuration: Number(e.target.value) })}
                    onTouchEnd={(e) => handleUpdateRoomSetting({ studyDuration: Number(e.target.value) })}
                    disabled={!isOwner}
                    className="w-full accent-indigo-600 bg-slate-950 rounded-lg appearance-none h-1 cursor-pointer"
                  />
                </div>
                <div className="space-y-2">
                  <div className="flex justify-between items-center text-xs">
                    <span className="font-semibold text-slate-300">Break Duration</span>
                    <span className="font-bold text-indigo-400">{breakDuration} mins</span>
                  </div>
                  <input 
                    type="range" 
                    min="1" 
                    max="30" 
                    step="1"
                    value={breakDuration} 
                    onChange={(e) => setBreakDuration(Number(e.target.value))}
                    onMouseUp={(e) => handleUpdateRoomSetting({ breakDuration: Number(e.target.value) })}
                    onTouchEnd={(e) => handleUpdateRoomSetting({ breakDuration: Number(e.target.value) })}
                    disabled={!isOwner}
                    className="w-full accent-indigo-600 bg-slate-950 rounded-lg appearance-none h-1 cursor-pointer"
                  />
                </div>
              </div>

              <div className="space-y-3 pt-3">
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-slate-950/20">
                  <span className="text-xs text-slate-300">Auto-start Break Period</span>
                  <Switch checked={autoStartBreak} onCheckedChange={(checked) => handleUpdateRoomSetting({ autoStartBreak: checked })} disabled={!isOwner} />
                </div>
                <div className="flex items-center justify-between p-2.5 rounded-lg border border-border bg-slate-950/20">
                  <span className="text-xs text-slate-300">Auto-start Focus Period</span>
                  <Switch checked={autoStartFocus} onCheckedChange={(checked) => handleUpdateRoomSetting({ autoStartFocus: checked })} disabled={!isOwner} />
                </div>
              </div>
            </AccordionContent>
          </AccordionItem>

          {/* 5. Privacy Settings Section */}
          <AccordionItem value="privacy" className="border border-border rounded-lg bg-slate-900/10 px-4">
            <AccordionTrigger className="text-xs hover:no-underline font-bold uppercase tracking-wider py-4">Privacy & Access</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1 pb-5">
              <div className="space-y-3">
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-slate-950/20">
                  <div>
                    <div className="text-xs font-semibold text-white">Private Study Space</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Accessible only via room code and invite link share</div>
                  </div>
                  <Switch checked={isPrivate} onCheckedChange={(checked) => handleUpdateRoomSetting({ isPrivate: checked })} disabled={!isOwner} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-slate-950/20">
                  <div>
                    <div className="text-xs font-semibold text-white">Lock Study Space</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Prevent new members from joining space</div>
                  </div>
                  <Switch checked={isLocked} onCheckedChange={(checked) => handleUpdateRoomSetting({ isLocked: checked })} disabled={!isOwner} />
                </div>
                <div className="flex items-center justify-between p-3 rounded-lg border border-border bg-slate-950/20">
                  <div>
                    <div className="text-xs font-semibold text-white">Invite Only Mode</div>
                    <div className="text-[9px] text-slate-500 mt-0.5">Only Owner/Admins can generate invite links</div>
                  </div>
                  <Switch checked={inviteOnly} onCheckedChange={(checked) => handleUpdateRoomSetting({ inviteOnly: checked })} disabled={!isOwner} />
                </div>
              </div>

              {room?.code && (
                <div className="border-t border-border/40 pt-4 space-y-4">
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Room Code</label>
                    <div className="flex gap-2">
                      <code className="text-xs font-mono font-bold px-3 py-1 bg-slate-900 border border-border rounded flex items-center text-indigo-400 select-all">{room.code}</code>
                      <button onClick={copyCode} className="inline-flex items-center justify-center rounded text-xs font-semibold px-2.5 py-1 bg-white/5 hover:bg-white/10 border border-border text-white cursor-pointer select-none">
                        {copiedCode ? <Check size={12} className="text-emerald-400 mr-1" /> : <Copy size={12} className="mr-1" />}
                        Copy
                      </button>
                    </div>
                  </div>
                  <div className="space-y-1.5">
                    <label className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">Invite Link</label>
                    <div className="flex gap-2">
                      <Input 
                        value={`${window.location.origin}/room/${room._id}`} 
                        readOnly 
                        className="h-8 text-slate-400 select-all font-mono"
                      />
                      <button onClick={copyInviteLink} className="inline-flex items-center justify-center rounded text-xs font-semibold h-8 px-3 bg-white/5 hover:bg-white/10 border border-border text-white cursor-pointer shrink-0 select-none">
                        {copiedLink ? <Check size={12} className="text-emerald-400 mr-1" /> : <Copy size={12} className="mr-1" />}
                        Copy Link
                      </button>
                    </div>
                  </div>
                </div>
              )}
            </AccordionContent>
          </AccordionItem>

          {/* 6. Danger Zone Section */}
          <AccordionItem value="danger" className="border border-red-500/20 rounded-lg bg-red-500/5 px-4">
            <AccordionTrigger className="text-xs hover:no-underline font-bold uppercase tracking-wider py-4 text-red-400 hover:text-red-300">Danger Zone Actions</AccordionTrigger>
            <AccordionContent className="space-y-4 pt-1 pb-5">
              <div className="space-y-4">
                {isOwner ? (
                  <div className="space-y-4">
                    <div className="space-y-2">
                      <label className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Transfer Ownership</label>
                      <div className="flex gap-2">
                        <Select
                          value={transferTargetId}
                          onChange={(e) => setTransferTargetId(e.target.value)}
                        >
                          <option value="">Select new owner...</option>
                          {(room.members || [])
                            .filter(m => m._id !== user?._id)
                            .map(m => (
                              <option key={m._id} value={m._id}>{m.username}</option>
                            ))
                          }
                        </Select>
                        <button 
                          onClick={handleTransferOwnership}
                          disabled={!transferTargetId || saving}
                          className="inline-flex items-center justify-center rounded text-xs font-semibold h-8 px-3 bg-red-600 hover:bg-red-700 text-white cursor-pointer shrink-0"
                        >
                          Transfer
                        </button>
                      </div>
                    </div>

                    <div className="space-y-2 pt-4 border-t border-red-500/10">
                      <label className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Delete Room permanently</label>
                      <p className="text-[10px] text-slate-400 leading-normal">This terminates the session and deletes the room. All active member timers will close.</p>
                      <button 
                        type="button"
                        onClick={() => setShowDeleteConfirm(true)}
                        className="w-full inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                      >
                        Delete Space
                      </button>
                    </div>
                  </div>
                ) : (
                  <div className="space-y-2">
                    <label className="text-[10px] text-red-400 font-bold uppercase tracking-wider block">Leave Study Session</label>
                    <p className="text-[10px] text-slate-400 leading-normal">You will detach from the room and return to the dashboard.</p>
                    <button 
                      type="button"
                      onClick={() => setShowLeaveConfirm(true)}
                      className="w-full inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 bg-red-600 hover:bg-red-700 text-white cursor-pointer"
                    >
                      Leave Space
                    </button>
                  </div>
                )}
              </div>
            </AccordionContent>
          </AccordionItem>

        </Accordion>
      </ScrollArea>

      {/* Delete Space Dialog */}
      <Dialog open={showDeleteConfirm} onOpenChange={setShowDeleteConfirm}>
        <DialogContent className="max-w-sm bg-slate-950 border border-border">
          <DialogHeader>
            <DialogTitle className="text-red-400">Delete Study Space?</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Are you sure you want to delete this study room? All members will be disconnected and this room will be removed permanently.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <button className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
                Cancel
              </button>
            </DialogClose>
            <button 
              onClick={handleDeleteRoom}
              className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 bg-red-600 hover:bg-red-700 text-white cursor-pointer ml-2"
            >
              Delete Room
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>

      {/* Leave Space Dialog */}
      <Dialog open={showLeaveConfirm} onOpenChange={setShowLeaveConfirm}>
        <DialogContent className="max-w-sm bg-slate-950 border border-border">
          <DialogHeader>
            <DialogTitle>Leave Study Space?</DialogTitle>
            <DialogDescription className="text-slate-400 text-xs">
              Are you sure you want to leave this study session? You will return to the dashboard.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="pt-2">
            <DialogClose asChild>
              <button className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 bg-white/5 hover:bg-white/10 text-white cursor-pointer">
                Cancel
              </button>
            </DialogClose>
            <button 
              onClick={handleLeaveRoom}
              className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 bg-red-600 hover:bg-red-700 text-white cursor-pointer ml-2"
            >
              Leave Space
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
};


// ─── Main Component: StudyRoom ───
export const StudyRoom = () => {
  const { roomId } = useParams();
  const navigate = useNavigate();
  const { socket, connected } = useSocket();
  const { user } = useAuth();
  
  const [room, setRoom] = useState(null);
  const [members, setMembers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [copiedCode, setCopiedCode] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);
  
  // Navigation & panels states
  const [activePanel, setActivePanel] = useState(null); // 'chat' | 'ai' | 'files' | 'members' | 'info' | 'settings' | null
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);
  const [isPanelExpanded, setIsPanelExpanded] = useState(false);

  const effectiveSidebarCollapsed = isSidebarCollapsed || isPanelExpanded;

  // Draggable resize state
  const [panelWidth, setPanelWidth] = useState(360);
  const [isResizing, setIsResizing] = useState(false);
  const savedWidthRef = useRef(360);

  const handleResizeMouseDown = useCallback((e) => {
    e.preventDefault();
    setIsResizing(true);
    const startX = e.clientX;
    const startWidth = panelWidth;

    const onMouseMove = (moveEvt) => {
      const newWidth = Math.max(320, Math.min(window.innerWidth * 0.75, startWidth + (moveEvt.clientX - startX)));
      setPanelWidth(newWidth);
      setIsPanelExpanded(newWidth > 550);
    };

    const onMouseUp = () => {
      setIsResizing(false);
      document.removeEventListener('mousemove', onMouseMove);
      document.removeEventListener('mouseup', onMouseUp);
    };

    document.addEventListener('mousemove', onMouseMove);
    document.addEventListener('mouseup', onMouseUp);
  }, [panelWidth]);

  const handleResizeDoubleClick = useCallback(() => {
    const maxW = Math.round(window.innerWidth * 0.70);
    if (panelWidth >= maxW - 50) {
      const restoreW = savedWidthRef.current < 500 ? savedWidthRef.current : 360;
      setPanelWidth(restoreW);
      setIsPanelExpanded(false);
    } else {
      savedWidthRef.current = panelWidth;
      setPanelWidth(maxW);
      setIsPanelExpanded(true);
    }
  }, [panelWidth]);

  const copyRoomCode = () => {
    if (!room?.code) return;
    navigator.clipboard.writeText(room.code);
    setCopiedCode(true);
    setTimeout(() => setCopiedCode(false), 2000);
  };

  const copyInviteLink = () => {
    const inviteLink = `${window.location.origin}/room/${roomId}`;
    navigator.clipboard.writeText(inviteLink);
    setCopiedLink(true);
    setTimeout(() => setCopiedLink(false), 2000);
  };

  const fetchRoomData = async (showLoading = true) => {
    try {
      if (showLoading) setLoading(true);
      const res = await roomsApi.getById(roomId);
      setRoom(res.data);
      setMembers(res.data.members || []);
      setError(null);
    } catch (err) {
      setError(err.message || 'Failed to load room');
    } finally {
      if (showLoading) setLoading(false);
    }
  };

  useEffect(() => {
    if (!roomId) return;
    fetchRoomData();
  }, [roomId]);

  useEffect(() => {
    if (!socket || !roomId || !user) return;

    if (connected) {
      socket.emit('room:join', { roomId, userId: user._id });
    }

    const handleMembersUpdated = (data) => {
      if (data.roomId === roomId) {
        setMembers(data.members || []);
      }
    };

    const handleRoomError = (err) => {
      setError(err.message || 'Room error occurred');
    };
    
    const handleForceLeave = () => {
      toast.error('You have been removed from this room.');
      navigate('/dashboard');
    };

    const handleSettingsChanged = (data) => {
      setRoom(prev => prev ? { ...prev, ...data } : prev);
      toast.info('Room settings updated by owner');
    };

    socket.on('room:members-updated', handleMembersUpdated);
    socket.on('room:error', handleRoomError);
    socket.on('room:force-leave', handleForceLeave);
    socket.on('room:settings-changed', handleSettingsChanged);

    return () => {
      socket.emit('room:leave', { roomId, userId: user._id });
      socket.off('room:members-updated', handleMembersUpdated);
      socket.off('room:error', handleRoomError);
      socket.off('room:force-leave', handleForceLeave);
      socket.off('room:settings-changed', handleSettingsChanged);
    };
  }, [socket, roomId, user, connected, navigate]);

  const handleLeaveRoom = async () => {
    if (!window.confirm('Are you sure you want to leave this room?')) return;
    try {
      if (socket) {
        socket.emit('room:leave', { roomId, userId: user._id });
      }
      await roomsApi.leave(roomId);
      navigate('/dashboard');
    } catch (err) {
      console.error('Failed to leave room:', err);
      navigate('/dashboard');
    }
  };

  const handleTogglePanel = (panelName) => {
    if (activePanel === panelName) {
      setActivePanel(null);
      setIsPanelExpanded(false);
      setPanelWidth(360);
    } else {
      setActivePanel(panelName);
      setPanelWidth(360);
      setIsPanelExpanded(false);
    }
  };

  if (loading) {
    return (
      <div className="flex items-center justify-center min-h-[60vh] select-none text-center">
        <div>
          <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-indigo-600 mx-auto mb-4" />
          <p className="text-xs text-slate-500">Entering study room...</p>
        </div>
      </div>
    );
  }

  if (error || !room) {
    return (
      <div className="p-8 max-w-sm mx-auto mt-16 text-center bg-slate-900 border border-border rounded-xl space-y-4">
        <ShieldAlert size={40} className="mx-auto text-red-500" />
        <h3 className="text-red-400 font-bold text-base">Access Denied</h3>
        <p className="text-xs text-slate-400">{error || 'Room not found'}</p>
        <button 
          onClick={() => navigate('/dashboard')}
          className="inline-flex items-center justify-center rounded-md text-xs font-semibold h-9 px-4 border border-border text-white hover:bg-white/5 cursor-pointer"
        >
          <ArrowLeft size={14} className="mr-1" /> Back to Dashboard
        </button>
      </div>
    );
  }

  const isOwner = room?.createdBy?._id === user?._id || room?.createdBy === user?._id;
  const isAdmin = isOwner || (room?.admins || []).some(adminId => (adminId._id || adminId || adminId) === user?._id);

  return (
    <div className={cn("flex h-full min-h-0 bg-[#060913]", isPanelExpanded ? 'panel-expanded' : '')}>
      
      {/* Collapsible Left Sidebar */}
      <div className={cn(
        "bg-slate-950 border-r border-border/70 flex flex-col justify-between py-4 select-none shrink-0 transition-all duration-300 h-screen sticky top-0",
        effectiveSidebarCollapsed ? "w-16" : "w-48"
      )}>
        <div className="flex flex-col gap-6">
          <div className="px-4 flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-indigo-600 flex items-center justify-center font-display font-bold text-white shrink-0">
              R
            </div>
            {!effectiveSidebarCollapsed && (
              <span className="font-display font-bold tracking-tight text-white text-sm truncate animate-fade-in">
                {room.name}
              </span>
            )}
          </div>
          
          <div className="flex flex-col gap-1 px-2">
            {[
              { id: 'chat', label: 'Chat', icon: MessageSquare },
              { id: 'ai', label: 'AI Assistant', icon: Sparkles },
              { id: 'files', label: 'Shared Files', icon: FolderUp },
              { id: 'members', label: 'Members', icon: Users },
              { id: 'info', label: 'Room Info', icon: Info },
              { id: 'settings', label: 'Settings', icon: Settings },
            ].map(item => {
              const Icon = item.icon;
              const active = activePanel === item.id;
              const buttonContent = (
                <button
                  key={item.id}
                  onClick={() => handleTogglePanel(item.id)}
                  className={cn(
                    "w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold transition-all duration-150 cursor-pointer select-none",
                    active 
                      ? "bg-indigo-600/10 text-indigo-400 border-l-2 border-indigo-500 rounded-l-none" 
                      : "text-slate-400 hover:text-white hover:bg-white/[0.03]"
                  )}
                >
                  <Icon size={16} />
                  {!effectiveSidebarCollapsed && <span>{item.label}</span>}
                </button>
              );

              if (effectiveSidebarCollapsed) {
                return (
                  <Tooltip key={item.id} delayDuration={100}>
                    <TooltipTrigger asChild>
                      {buttonContent}
                    </TooltipTrigger>
                    <TooltipContent side="right">{item.label}</TooltipContent>
                  </Tooltip>
                );
              }
              return buttonContent;
            })}
          </div>
        </div>

        <div className="px-2 space-y-1">
          <div className="h-[1px] bg-border/40 my-2" />
          <button 
            onClick={handleLeaveRoom}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-md text-xs font-semibold text-red-400 hover:text-red-300 hover:bg-red-500/5 transition-all cursor-pointer select-none"
          >
            <LogOut size={16} />
            {!effectiveSidebarCollapsed && <span>Leave Room</span>}
          </button>
        </div>
      </div>

      {/* Side Active Panel */}
      {activePanel && (
        <div 
          className="relative border-r border-border bg-slate-950 flex flex-col min-h-0 shadow-xl select-none"
          style={{ 
            width: `${panelWidth}px`, 
            minWidth: '320px',
            maxWidth: '75vw',
            transition: isResizing ? 'none' : 'width 0.3s cubic-bezier(0.4, 0, 0.2, 1)'
          }}
        >
          <div className="absolute top-4 right-4 flex items-center gap-2 z-10">
            <button 
              onClick={() => {
                if (isPanelExpanded) {
                  const restoreW = savedWidthRef.current < 500 ? savedWidthRef.current : 360;
                  setPanelWidth(restoreW);
                  setIsPanelExpanded(false);
                } else {
                  savedWidthRef.current = panelWidth;
                  setPanelWidth(Math.round(window.innerWidth * 0.70));
                  setIsPanelExpanded(true);
                }
              }} 
              className="p-1 hover:bg-white/5 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title={isPanelExpanded ? 'Collapse' : 'Expand'}
            >
              {isPanelExpanded ? <Minimize2 size={13} /> : <Maximize2 size={13} />}
            </button>
            <button 
              onClick={() => { setActivePanel(null); setIsPanelExpanded(false); setPanelWidth(360); }} 
              className="p-1 hover:bg-white/5 text-slate-400 hover:text-white rounded transition-colors cursor-pointer"
              title="Close Panel"
            >
              <X size={14} />
            </button>
          </div>

          <div className="flex-1 min-h-0">
            {activePanel === 'chat' && <ChatPanel roomId={roomId} />}
            {activePanel === 'ai' && <AIAssistant roomId={roomId} />}
            {activePanel === 'files' && <FileSharingPanel roomId={roomId} />}
            {activePanel === 'members' && (
              <RoomMembers 
                roomId={roomId} 
                initialMembers={members} 
                room={room} 
                onRefresh={() => fetchRoomData(false)}
              />
            )}
            {activePanel === 'info' && (
              <RoomInfoPanel 
                room={room}
                copiedCode={copiedCode}
                copiedLink={copiedLink}
                copyRoomCode={copyRoomCode}
                copyInviteLink={copyInviteLink}
              />
            )}
            {activePanel === 'settings' && (
              <RoomSettingsPanel 
                roomId={roomId} 
                room={room} 
                onRefresh={() => fetchRoomData(false)} 
                user={user}
              />
            )}
          </div>
          
          {/* Resize handle */}
          <div 
            onMouseDown={handleResizeMouseDown}
            onDoubleClick={handleResizeDoubleClick}
            className="absolute top-0 right-0 bottom-0 w-1 bg-border/20 hover:bg-indigo-500/50 cursor-col-resize transition-colors"
          />
        </div>
      )}

      {/* Central Study Focus Area */}
      <div className="flex-1 flex flex-col min-h-0 min-w-0 bg-[#060913]">
        <div className="flex items-center justify-between p-4 border-b border-border/40 shrink-0 bg-slate-950/20">
          <div className="flex items-center gap-1.5">
            <span className={cn(
              "w-2 h-2 rounded-full",
              connected ? "bg-emerald-500 animate-pulse" : "bg-red-500"
            )} />
            <span className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">
              {connected ? 'SYNCED' : 'OFFLINE'}
            </span>
          </div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider">
            👥 {members.length} online
          </div>
        </div>

        <ScrollArea className="flex-1">
          <div className="flex flex-col items-center justify-center p-8 min-h-[calc(100vh-80px)] space-y-12">
            <div className="text-center space-y-2 max-w-md">
              <span className="text-lg">{room.coverIcon}</span>
              <h1 className="text-3xl font-display font-extrabold text-white tracking-tight leading-tight">
                {room.name}
              </h1>
              <p className="text-xs text-slate-400 leading-normal max-w-sm mx-auto">
                {room.description || 'Welcome to your focused study session.'}
              </p>
            </div>
            
            <StudyTimer 
              roomId={roomId} 
              duration={room.studyDuration} 
              isOwner={isAdmin} 
            />
          </div>
        </ScrollArea>
      </div>

    </div>
  );
};
