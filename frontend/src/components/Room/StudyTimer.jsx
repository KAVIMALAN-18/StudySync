import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Timer, Coffee } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';
import { cn } from '../../lib/utils';

export const StudyTimer = ({ roomId, duration = 25, isOwner = false }) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('focus'); // 'focus' | 'break'
  const [initialTime, setInitialTime] = useState(duration * 60);
  const [justCompleted, setJustCompleted] = useState(false);

  const { socket, connected } = useSocket();
  const { user } = useAuth();

  const handleTimerUpdate = useCallback((data) => {
    if (data.roomId && data.roomId !== roomId) return;
    setTimeLeft(data.timeLeft ?? data.state?.timeLeft ?? 0);
    setIsRunning(data.status === 'running' || data.isRunning === true);
    if (data.mode) setMode(data.mode);
    if (data.initialTimeLeft) setInitialTime(data.initialTimeLeft);
  }, [roomId]);

  const handleTimerSync = useCallback((data) => {
    if (data.roomId && data.roomId !== roomId) return;
    setTimeLeft(data.timeLeft ?? 0);
    setIsRunning(data.status === 'running');
    if (data.mode) setMode(data.mode);
    if (data.initialTimeLeft) setInitialTime(data.initialTimeLeft);

    if (data.action === 'mode-switched') {
      setJustCompleted(true);
      setTimeout(() => setJustCompleted(false), 4000);
      try {
        const audio = new Audio('/bell.mp3');
        audio.play().catch(() => {});
      } catch (err) {
        console.warn('Could not play focus switch audio bell:', err);
      }
    }
  }, [roomId]);

  const handleTimerStart = useCallback(() => {
    setIsRunning(true);
  }, []);

  const handleTimerPause = useCallback(() => {
    setIsRunning(false);
  }, []);

  const handleTimerReset = useCallback((data) => {
    const newMode = data?.mode ?? 'focus';
    setIsRunning(false);
    setMode(newMode);
  }, []);

  useEffect(() => {
    if (!socket || !roomId) return;

    socket.on('timer:update', handleTimerUpdate);
    socket.on('timer:sync', handleTimerSync);
    socket.on('timer:start', handleTimerStart);
    socket.on('timer:pause', handleTimerPause);
    socket.on('timer:reset', handleTimerReset);

    socket.emit('timer:request-state', { roomId });

    return () => {
      socket.off('timer:update', handleTimerUpdate);
      socket.off('timer:sync', handleTimerSync);
      socket.off('timer:start', handleTimerStart);
      socket.off('timer:pause', handleTimerPause);
      socket.off('timer:reset', handleTimerReset);
    };
  }, [socket, roomId, handleTimerUpdate, handleTimerSync, handleTimerStart, handleTimerPause, handleTimerReset]);

  const toggleTimer = () => {
    if (!socket || !connected || !isOwner) return;
    if (isRunning) {
      socket.emit('timer:pause', { roomId, userId: user?._id });
    } else {
      socket.emit('timer:start', { roomId, userId: user?._id });
    }
  };

  const resetTimer = (newMode = mode) => {
    if (!socket || !connected || !isOwner) return;
    socket.emit('timer:reset', { roomId, mode: newMode, userId: user?._id });
  };

  const formatTime = (seconds) => {
    const m = Math.floor(seconds / 60).toString().padStart(2, '0');
    const s = (seconds % 60).toString().padStart(2, '0');
    return `${m}:${s}`;
  };

  const progress = initialTime > 0 ? ((initialTime - timeLeft) / initialTime) * 100 : 0;
  const strokeDasharray = 283;
  const strokeDashoffset = strokeDasharray - (strokeDasharray * progress) / 100;

  const isFocus = mode === 'focus';

  return (
    <div className="flex flex-col items-center justify-center space-y-6 text-center select-none max-w-sm mx-auto">
      
      {/* Completed Alert */}
      {justCompleted && (
        <div className={cn(
          "w-full px-4 py-2.5 rounded-lg text-xs font-semibold border text-center transition-all animate-scale-up",
          isFocus 
            ? "bg-emerald-500/10 border-emerald-500/25 text-emerald-400" 
            : "bg-indigo-500/10 border-indigo-500/25 text-indigo-400"
        )}>
          {isFocus ? '☕ Break time! Great focus session!' : '🎯 Back to work! Stay sharp!'}
        </div>
      )}

      {/* Mode selectors */}
      <div className="flex items-center gap-2 p-1 bg-slate-950 rounded-lg border border-border max-w-[220px]">
        <button
          disabled={!isOwner || isRunning}
          onClick={() => isOwner && !isRunning && resetTimer('focus')}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-wider select-none transition-all focus:outline-none disabled:opacity-50",
            isFocus 
              ? "bg-indigo-600 text-white shadow-sm" 
              : "text-slate-400 hover:text-white"
          )}
        >
          <Timer size={11} /> FOCUS
        </button>
        <button
          disabled={!isOwner || isRunning}
          onClick={() => isOwner && !isRunning && resetTimer('break')}
          className={cn(
            "flex items-center justify-center gap-1.5 px-3 py-1.5 rounded text-[10px] font-bold tracking-wider select-none transition-all focus:outline-none disabled:opacity-50",
            !isFocus 
              ? "bg-indigo-600 text-white shadow-sm" 
              : "text-slate-400 hover:text-white"
          )}
        >
          <Coffee size={11} /> BREAK
        </button>
      </div>

      {/* Timer SVG Ring */}
      <div className="relative w-56 h-56 transition-all duration-300 timer-ring-wrap-large shrink-0 flex items-center justify-center">
        <svg className="w-full h-full -rotate-90" viewBox="0 0 100 100">
          <circle 
            className="stroke-slate-900 fill-none" 
            cx="50" 
            cy="50" 
            r="45" 
            strokeWidth="3.5" 
          />
          <circle
            className={cn(
              "fill-none transition-all duration-300",
              isFocus ? "stroke-indigo-500" : "stroke-cyan-500",
              isRunning ? "opacity-100" : "opacity-80"
            )}
            cx="50" 
            cy="50" 
            r="45"
            strokeWidth="3.5"
            strokeLinecap="round"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="absolute inset-0 flex flex-col items-center justify-center">
          <div className="text-4xl font-display font-extrabold text-white tracking-tight leading-none timer-time-large">
            {formatTime(timeLeft)}
          </div>
          <div className="text-[10px] text-slate-500 font-bold uppercase tracking-wider mt-1">
            {isFocus ? 'Deep Work' : 'Resting'}
          </div>
          {!connected && (
            <div className="text-[9px] text-red-400 font-medium mt-1">Reconnecting…</div>
          )}
        </div>
      </div>

      {/* Controls */}
      <div className="w-full max-w-[240px]">
        {isOwner ? (
          <div className="flex items-center gap-2">
            <button
              onClick={toggleTimer}
              disabled={!connected}
              className="flex-1 inline-flex items-center justify-center gap-1.5 rounded-lg text-xs font-bold h-9 px-4 bg-indigo-600 hover:bg-indigo-700 text-white shadow-sm transition-all focus:outline-none disabled:opacity-50 cursor-pointer"
            >
              {isRunning ? <><Pause size={14} /> Pause</> : <><Play size={14} /> {timeLeft === initialTime ? 'Start' : 'Resume'}</>}
            </button>
            <button
              onClick={() => resetTimer()}
              disabled={!connected}
              className="inline-flex items-center justify-center rounded-lg text-xs font-bold h-9 w-9 border border-border bg-transparent text-slate-400 hover:text-white hover:bg-white/5 transition-all focus:outline-none disabled:opacity-50 cursor-pointer"
              title="Reset timer"
            >
              <RotateCcw size={14} />
            </button>
          </div>
        ) : (
          <div className="text-[11px] text-slate-500 text-center py-2 px-3 bg-white/[0.01] rounded-lg border border-border">
            🔒 Timer controlled by host & admins
          </div>
        )}
      </div>

    </div>
  );
};
