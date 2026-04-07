import { useEffect, useRef, useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useLocale } from '../i18n';
import WaveSurfer from 'wavesurfer.js';

interface LeftPaneProps {
  videoRef: React.RefObject<HTMLVideoElement>;
  videoUrl: string;
}

export function LeftPane({ videoRef, videoUrl }: LeftPaneProps) {
  const { t } = useLocale();
  const waveformRef = useRef<HTMLDivElement>(null);
  const wavesurferRef = useRef<WaveSurfer | null>(null);
  const [waveformReady, setWaveformReady] = useState(false);
  
  const { 
    currentTime, 
    duration, 
    isPlaying, 
    setCurrentTime, 
    setDuration, 
    setIsPlaying,
    words,
    selected,
  } = useEditorStore();

  useEffect(() => {
    if (!waveformRef.current) return;
    
    const ws = WaveSurfer.create({
      container: waveformRef.current,
      waveColor: '#4a9eff',
      progressColor: '#1e88e5',
      cursorColor: '#ff5722',
      cursorWidth: 2,
      height: 80,
      barWidth: 2,
      barGap: 1,
      barRadius: 2,
    });
    
    ws.load(videoUrl);
    wavesurferRef.current = ws;
    
    ws.on('ready', () => {
      setWaveformReady(true);
      setDuration(ws.getDuration());
    });
    
    ws.on('audioprocess', () => {
      setCurrentTime(ws.getCurrentTime());
    });
    
    ws.on('seeking', () => {
      setCurrentTime(ws.getCurrentTime());
    });
    
    ws.on('play', () => setIsPlaying(true));
    ws.on('pause', () => setIsPlaying(false));
    
    return () => {
      ws.destroy();
    };
  }, [videoUrl, setCurrentTime, setDuration, setIsPlaying]);

  useEffect(() => {
    if (wavesurferRef.current && videoRef.current) {
      const video = videoRef.current;
      const ws = wavesurferRef.current;
      
      const handleTimeUpdate = () => {
        if (Math.abs(ws.getCurrentTime() - video.currentTime) > 0.1) {
          ws.seekTo(video.currentTime / ws.getDuration());
        }
      };
      
      video.addEventListener('timeupdate', handleTimeUpdate);
      return () => video.removeEventListener('timeupdate', handleTimeUpdate);
    }
  }, [videoRef]);

  const handlePlayPause = () => {
    const video = videoRef.current;
    if (!video) return;
    
    if (video.paused) {
      video.play();
    } else {
      video.pause();
    }
  };

  const formatTime = (time: number) => {
    const mins = Math.floor(time / 60);
    const secs = Math.floor(time % 60);
    const ms = Math.floor((time % 1) * 100);
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}.${ms.toString().padStart(2, '0')}`;
  };

  const deletedRanges = Array.from(selected).map(i => words[i]).filter(Boolean);

  return (
    <div className="left-pane">
      <div className="video-container">
        <video
          ref={videoRef}
          src={videoUrl}
          className="video-player"
          onTimeUpdate={(e) => setCurrentTime(e.currentTarget.currentTime)}
          onLoadedMetadata={(e) => setDuration(e.currentTarget.duration)}
          onPlay={() => setIsPlaying(true)}
          onPause={() => setIsPlaying(false)}
        />
      </div>
      
      <div className="waveform-container">
        <div ref={waveformRef} className="waveform" />
        {!waveformReady && (
          <div className="waveform-loading">
            {t.processing}
          </div>
        )}
        {deletedRanges.length > 0 && (
          <div className="waveform-markers">
            {deletedRanges.map((word, i) => (
              <div
                key={i}
                className="delete-marker"
                style={{
                  left: `${(word.start / duration) * 100}%`,
                  width: `${((word.end - word.start) / duration) * 100}%`,
                }}
              />
            ))}
          </div>
        )}
      </div>
      
      <div className="playback-controls">
        <button className="play-btn" onClick={handlePlayPause}>
          {isPlaying ? (
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M6 4h4v16H6V4zm8 0h4v16h-4V4z" />
            </svg>
          ) : (
            <svg viewBox="0 0 24 24" width="24" height="24">
              <path fill="currentColor" d="M8 5v14l11-7z" />
            </svg>
          )}
        </button>
        
        <div className="time-display">
          <span className="current-time">{formatTime(currentTime)}</span>
          <span className="time-separator">/</span>
          <span className="total-time">{formatTime(duration)}</span>
        </div>
        
        <div className="speed-control">
          <select 
            value={useEditorStore.getState().exportOptions.speed}
            onChange={(e) => useEditorStore.getState().setExportOptions({ speed: parseFloat(e.target.value) })}
          >
            <option value="0.5">0.5x</option>
            <option value="0.75">0.75x</option>
            <option value="1">1x</option>
            <option value="1.25">1.25x</option>
            <option value="1.5">1.5x</option>
            <option value="2">2x</option>
          </select>
        </div>
      </div>
    </div>
  );
}
