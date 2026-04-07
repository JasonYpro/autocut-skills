import { useMemo } from 'react';
import type { Word } from '../types';

interface TransitionPreviewProps {
  currentTime: number;
  words: Word[];
  transitionPoints: number[];
  transition: string;
  transitionDuration: number;
}

export function TransitionPreview({
  currentTime,
  words,
  transitionPoints,
  transition,
  transitionDuration,
}: TransitionPreviewProps) {
  const transitionInfo = useMemo(() => {
    if (transition === 'none' || transitionPoints.length === 0) return null;

    for (const wordIdx of transitionPoints) {
      const word = words[wordIdx];
      if (!word) continue;
      
      const wordEnd = word.end;
      const nextWord = words[wordIdx + 1];
      
      if (!nextWord) continue;
      
      const transitionStart = wordEnd;
      const transitionEnd = wordEnd + transitionDuration;
      
      if (currentTime >= transitionStart && currentTime <= transitionEnd) {
        const progress = (currentTime - transitionStart) / transitionDuration;
        return {
          type: transition,
          progress: Math.max(0, Math.min(1, progress)),
          duration: transitionDuration,
          wordIdx,
        };
      }
    }

    return null;
  }, [currentTime, words, transitionPoints, transition, transitionDuration]);

  if (!transitionInfo) return null;

  const { type, progress } = transitionInfo;
  
  const getTransitionStyle = (): React.CSSProperties => {
    switch (type) {
      case 'fade':
        return {
          opacity: progress < 0.5 ? 1 - progress * 2 : (progress - 0.5) * 2,
          transition: 'opacity 0.05s linear',
        };
      case 'dissolve':
        return {
          opacity: 0.5 + 0.5 * Math.cos(progress * Math.PI),
          filter: `blur(${Math.sin(progress * Math.PI) * 5}px)`,
          transition: 'all 0.05s linear',
        };
      case 'wipeleft':
        return {
          clipPath: `inset(0 ${100 - progress * 100}% 0 0)`,
          transition: 'clip-path 0.05s linear',
        };
      case 'wiperight':
        return {
          clipPath: `inset(0 0 0 ${progress * 100}%)`,
          transition: 'clip-path 0.05s linear',
        };
      default:
        return {};
    }
  };

  return (
    <div
      className="transition-overlay"
      style={{
        position: 'absolute',
        inset: 0,
        pointerEvents: 'none',
        zIndex: 10,
        background: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        ...getTransitionStyle(),
      }}
    >
      <div
        style={{
          padding: '8px 16px',
          background: 'rgba(99, 102, 241, 0.9)',
          borderRadius: '6px',
          fontSize: '13px',
          color: 'white',
          fontWeight: 600,
          boxShadow: '0 2px 8px rgba(0,0,0,0.3)',
        }}
      >
        ⚡ {type.toUpperCase()} - {Math.round(progress * 100)}%
      </div>
    </div>
  );
}
