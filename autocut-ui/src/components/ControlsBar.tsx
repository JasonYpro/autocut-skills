import React, { useEffect, useState } from 'react';
import { useLocale } from '../i18n';

function formatTime(seconds: number): string {
  const m = Math.floor(seconds / 60);
  const s = Math.floor(seconds % 60);
  return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
}

function PlayIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <path d="M8 6.5v11l9-5.5-9-5.5Z" fill="currentColor" />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg viewBox="0 0 24 24" width="20" height="20" aria-hidden="true">
      <rect x="7" y="6.5" width="3.5" height="11" rx="1" fill="currentColor" />
      <rect x="13.5" y="6.5" width="3.5" height="11" rx="1" fill="currentColor" />
    </svg>
  );
}

function VolumeIcon({ level }: { level: number }) {
  if (level === 0) {
    return (
      <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
        <path d="M5.5 9.5v5h3.5l4.5 4.5V5L9 9.5H5.5z" fill="currentColor" />
        <line x1="17" y1="9" x2="21" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        <line x1="21" y1="9" x2="17" y2="15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
      </svg>
    );
  }
  return (
    <svg viewBox="0 0 24 24" width="18" height="18" aria-hidden="true">
      <path d="M5.5 9.5v5h3.5l4.5 4.5V5L9 9.5H5.5z" fill="currentColor" />
      {level > 0.3 && <path d="M15.5 10a2.5 2.5 0 010 4" stroke="currentColor" strokeWidth="1.5" fill="none" />}
      {level > 0.6 && <path d="M17.5 8a5 5 0 010 8" stroke="currentColor" strokeWidth="1.5" fill="none" />}
    </svg>
  );
}

interface ControlsBarProps {
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  onPlayPause: () => void;
  volume: number;
  speed: number;
  onVolumeChange: (volume: number) => void;
  onSpeedChange: (speed: number) => void;
}

export function ControlsBar({
  currentTime,
  duration,
  isPlaying,
  onPlayPause,
  volume,
  speed,
  onVolumeChange,
  onSpeedChange,
}: ControlsBarProps) {
  const { t } = useLocale();
  const [localVolume, setLocalVolume] = useState(volume);

  useEffect(() => {
    setLocalVolume(volume);
  }, [volume]);

  const handleVolumeChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const vol = parseFloat(e.target.value);
    setLocalVolume(vol);
    onVolumeChange(vol);
  };

  const handleSpeedChange = (e: React.ChangeEvent<HTMLSelectElement>) => {
    const newSpeed = parseFloat(e.target.value);
    onSpeedChange(newSpeed);
  };

  return (
    <div className="controls-bar">
      <button className="play-btn" onClick={onPlayPause} title={t.playPause}>
        {isPlaying ? <PauseIcon /> : <PlayIcon />}
      </button>
      
      <div className="time-display">
        <span className="current-time">{formatTime(currentTime)}</span>
        <span className="separator">/</span>
        <span>{formatTime(duration)}</span>
      </div>
      
      <select
        className="form-select"
        style={{ width: '80px', height: '32px', fontSize: '12px' }}
        value={speed}
        onChange={handleSpeedChange}
      >
        <option value="0.5">0.5x</option>
        <option value="0.75">0.75x</option>
        <option value="1">1x</option>
        <option value="1.25">1.25x</option>
        <option value="1.5">1.5x</option>
        <option value="2">2x</option>
      </select>

      <div style={{ display: 'flex', alignItems: 'center', gap: '4px', marginLeft: 'auto' }}>
        <VolumeIcon level={localVolume} />
        <input
          type="range"
          className="form-slider"
          min="0"
          max="2"
          step="0.1"
          value={localVolume}
          onChange={handleVolumeChange}
          style={{ width: '60px' }}
        />
        <span style={{ fontSize: '11px', color: 'var(--text-muted)', minWidth: '35px' }}>
          {Math.round(localVolume * 100)}%
        </span>
      </div>
    </div>
  );
}
