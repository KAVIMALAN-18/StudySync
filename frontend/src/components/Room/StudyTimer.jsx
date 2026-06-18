import { useState, useEffect } from 'react';
import { Play, Pause, RotateCcw } from 'lucide-react';
import { useSocket } from '../../hooks/useSocket';

export const StudyTimer = ({ roomId, duration = 30 }) => {
  const [timeLeft, setTimeLeft] = useState(duration * 60);
  const [isRunning, setIsRunning] = useState(false);
  const [timerMode, setTimerMode] = useState('focus');
  const { socket, emit } = useSocket();

  const focusDuration = duration * 60;
  const breakDuration = 5 * 60;

  useEffect(() => {
    let interval;

    if (isRunning) {
      interval = setInterval(() => {
        setTimeLeft(prev => {
          if (prev <= 1) {
            setIsRunning(false);

            if (timerMode === 'focus') {
              setTimerMode('break');
              setTimeLeft(breakDuration);
            } else {
              setTimerMode('focus');
              setTimeLeft(focusDuration);
            }

            emit('timer:pause', { roomId });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);
    }

    return () => clearInterval(interval);
  }, [isRunning, timerMode, roomId, emit, focusDuration, breakDuration]);

  const handleToggle = () => {
    setIsRunning(!isRunning);

    if (!isRunning) {
      emit('timer:start', {
        roomId,
        duration: timerMode === 'focus' ? focusDuration : breakDuration,
        mode: timerMode
      });
    } else {
      emit('timer:pause', { roomId });
    }
  };

  const handleReset = () => {
    setIsRunning(false);
    setTimeLeft(timerMode === 'focus' ? focusDuration : breakDuration);
    emit('timer:reset', {
      roomId,
      duration: timerMode === 'focus' ? focusDuration : breakDuration
    });
  };

  const handleModeChange = (mode) => {
    setIsRunning(false);
    setTimerMode(mode);
    setTimeLeft(mode === 'focus' ? focusDuration : breakDuration);
  };

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const progress = timerMode === 'focus'
    ? ((focusDuration - timeLeft) / focusDuration) * 100
    : ((breakDuration - timeLeft) / breakDuration) * 100;

  return (
    <div className="bg-white p-6 rounded-lg border border-gray-200 shadow">
      {/* Mode Selector */}
      <div className="flex gap-2 mb-6">
        <button
          onClick={() => handleModeChange('focus')}
          className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
            timerMode === 'focus'
              ? 'bg-blue-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Focus
        </button>
        <button
          onClick={() => handleModeChange('break')}
          className={`flex-1 px-4 py-2 rounded-lg font-semibold transition ${
            timerMode === 'break'
              ? 'bg-green-600 text-white'
              : 'bg-gray-100 text-gray-700 hover:bg-gray-200'
          }`}
        >
          Break
        </button>
      </div>

      {/* Timer Display */}
      <div className="text-center mb-6">
        <div className="relative w-40 h-40 mx-auto mb-4">
          <svg className="w-full h-full transform -rotate-90">
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke="#e5e7eb"
              strokeWidth="8"
            />
            <circle
              cx="80"
              cy="80"
              r="70"
              fill="none"
              stroke={timerMode === 'focus' ? '#3b82f6' : '#10b981'}
              strokeWidth="8"
              strokeDasharray={`${2 * Math.PI * 70}`}
              strokeDashoffset={`${(2 * Math.PI * 70) * (1 - progress / 100)}`}
              className="transition-all"
            />
          </svg>
          <div className="absolute inset-0 flex flex-col items-center justify-center">
            <div className="text-4xl font-bold text-gray-900">
              {formatTime(timeLeft)}
            </div>
            <div className="text-sm text-gray-600 mt-2">
              {timerMode === 'focus' ? 'Study Time' : 'Break Time'}
            </div>
          </div>
        </div>
      </div>

      {/* Status Badge */}
      <div className="text-center mb-6">
        <span className={`inline-block px-4 py-1 rounded-full text-sm font-semibold ${
          isRunning
            ? timerMode === 'focus'
              ? 'bg-blue-100 text-blue-800'
              : 'bg-green-100 text-green-800'
            : 'bg-gray-100 text-gray-800'
        }`}>
          {isRunning ? (timerMode === 'focus' ? '🔴 Studying' : '🟢 On Break') : 'Paused'}
        </span>
      </div>

      {/* Controls */}
      <div className="flex gap-2">
        <button
          onClick={handleToggle}
          className={`flex-1 px-4 py-3 rounded-lg font-semibold flex items-center justify-center gap-2 transition text-white ${
            isRunning
              ? 'bg-red-600 hover:bg-red-700'
              : 'bg-blue-600 hover:bg-blue-700'
          }`}
        >
          {isRunning ? (
            <>
              <Pause className="w-5 h-5" />
              Pause
            </>
          ) : (
            <>
              <Play className="w-5 h-5" />
              Start
            </>
          )}
        </button>
        <button
          onClick={handleReset}
          className="px-4 py-3 rounded-lg font-semibold bg-gray-600 hover:bg-gray-700 text-white flex items-center justify-center gap-2 transition"
        >
          <RotateCcw className="w-5 h-5" />
          Reset
        </button>
      </div>
    </div>
  );
};
