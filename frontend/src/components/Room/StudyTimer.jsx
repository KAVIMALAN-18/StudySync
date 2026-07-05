import { useState, useEffect, useRef, useCallback } from 'react';
import { Play, Pause, RotateCcw, Timer, Coffee } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';
import { useAuth } from '../../hooks/useAuth';

/**
 * StudyTimer — display-only client.
 *
 * The server (socketEvents.js) is the single source of truth for the countdown.
 * It broadcasts `timer:update` every second and `timer:sync` on mode-switch /
 * room-join.  This component only renders what the server tells it and sends
 * control commands (start / pause / reset) back to the server.
 *
 * There is NO client-side setInterval here.  That was causing a race condition
 * where two independent countdowns drifted apart and triggered double session
 * recordings.
 */
export const StudyTimer = ({ roomId, duration = 25, isOwner = false }) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [mode, setMode] = useState('focus'); // 'focus' | 'break'
  const [initialTime, setInitialTime] = useState(duration * 60);
  const [justCompleted, setJustCompleted] = useState(false);

  const { socket, connected } = useSocket();
  const { user } = useAuth();

  // ─── Socket listeners ─────────────────────────────────────────────────────

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
      // Play bell
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

    // Ask server for current state immediately on mount
    socket.emit('timer:request-state', { roomId });

    return () => {
      socket.off('timer:update', handleTimerUpdate);
      socket.off('timer:sync', handleTimerSync);
      socket.off('timer:start', handleTimerStart);
      socket.off('timer:pause', handleTimerPause);
      socket.off('timer:reset', handleTimerReset);
    };
  }, [socket, roomId, handleTimerUpdate, handleTimerSync, handleTimerStart, handleTimerPause, handleTimerReset]);

  // ─── Owner control emitters ───────────────────────────────────────────────

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

  // ─── Display helpers ──────────────────────────────────────────────────────

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
    <div className="timer-card animate-fade-in">

      {/* Completed flash banner */}
      {justCompleted && (
        <div style={{
          background: isFocus ? 'rgba(16,185,129,0.15)' : 'rgba(99,102,241,0.15)',
          border: `1px solid ${isFocus ? 'rgba(16,185,129,0.3)' : 'rgba(99,102,241,0.3)'}`,
          borderRadius: '8px',
          padding: '0.5rem 1rem',
          fontSize: '0.8rem',
          fontWeight: 600,
          color: isFocus ? '#6ee7b7' : '#a5b4fc',
          textAlign: 'center',
          marginBottom: '0.75rem',
          animation: 'fadeInSlideUp 0.3s ease'
        }}>
          {isFocus ? '☕ Break time! Great focus session!' : '🎯 Back to work! Stay sharp!'}
        </div>
      )}

      {/* Mode pills */}
      <div className="timer-mode-pills">
        <button
          className={`timer-mode-pill focus ${isFocus ? 'active' : ''}`}
          onClick={() => isOwner && !isRunning && resetTimer('focus')}
          title={!isOwner ? 'Only the room owner can control the timer' : ''}
        >
          <Timer size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          FOCUS
        </button>
        <button
          className={`timer-mode-pill break ${!isFocus ? 'active' : ''}`}
          onClick={() => isOwner && !isRunning && resetTimer('break')}
          title={!isOwner ? 'Only the room owner can control the timer' : ''}
        >
          <Coffee size={12} style={{ marginRight: '4px', verticalAlign: 'middle' }} />
          BREAK
        </button>
      </div>

      {/* SVG Ring */}
      <div className="timer-ring-wrap">
        <svg className="timer-svg" viewBox="0 0 100 100">
          <circle className="timer-track" cx="50" cy="50" r="45" />
          <circle
            className={`timer-progress ${mode} ${isRunning ? 'running' : ''}`}
            cx="50" cy="50" r="45"
            strokeDasharray={strokeDasharray}
            strokeDashoffset={strokeDashoffset}
          />
        </svg>
        <div className="timer-inner">
          <div className="timer-time">{formatTime(timeLeft)}</div>
          <div className="timer-mode-label">{isFocus ? 'Deep Work' : 'Rest'}</div>
          {!connected && (
            <div style={{ fontSize: '0.65rem', color: '#fca5a5', marginTop: '4px' }}>Reconnecting…</div>
          )}
        </div>
      </div>

      {/* Controls — only visible/enabled for room owner */}
      <div className="timer-controls">
        {isOwner ? (
          <>
            <button
              onClick={toggleTimer}
              className="btn btn-primary timer-btn-main"
              disabled={!connected}
            >
              {isRunning ? <><Pause size={16} /> Pause</> : <><Play size={16} /> {timeLeft === initialTime ? 'Start' : 'Resume'}</>}
            </button>
            <button
              onClick={() => resetTimer()}
              className="btn btn-ghost timer-btn-reset"
              disabled={!connected}
              title="Reset Timer"
            >
              <RotateCcw size={16} />
            </button>
          </>
        ) : (
          <div style={{
            fontSize: '0.78rem',
            color: 'var(--text-muted)',
            textAlign: 'center',
            padding: '0.5rem',
            background: 'rgba(255,255,255,0.02)',
            borderRadius: '8px',
            border: '1px solid rgba(255,255,255,0.06)',
          }}>
            🔒 Timer controlled by room owner
          </div>
        )}
      </div>
    </div>
  );
};
