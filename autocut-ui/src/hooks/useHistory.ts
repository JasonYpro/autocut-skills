import { useState, useCallback, useRef } from 'react';

interface HistoryState {
  selected: Set<number>;
  autoSelected: Set<number>;
}

interface UseHistoryOptions {
  maxHistory?: number;
}

interface UseHistoryReturn {
  historyState: HistoryState;
  pushState: (state: HistoryState) => void;
  undo: () => HistoryState | null;
  redo: () => HistoryState | null;
  canUndo: boolean;
  canRedo: boolean;
  clearHistory: () => void;
}

export function useHistory(options: UseHistoryOptions = {}): UseHistoryReturn {
  const { maxHistory = 50 } = options;
  
  const [historyState, setHistoryState] = useState<HistoryState>({
    selected: new Set(),
    autoSelected: new Set(),
  });
  
  const historyRef = useRef<HistoryState[]>([]);
  const historyIndexRef = useRef<number>(-1);

  const pushState = useCallback((state: HistoryState) => {
    const newHistory = historyRef.current.slice(0, historyIndexRef.current + 1);
    newHistory.push({
      selected: new Set(state.selected),
      autoSelected: new Set(state.autoSelected),
    });
    
    if (newHistory.length > maxHistory) {
      newHistory.shift();
    } else {
      historyIndexRef.current += 1;
    }
    
    historyRef.current = newHistory;
    setHistoryState({
      selected: new Set(state.selected),
      autoSelected: new Set(state.autoSelected),
    });
  }, [maxHistory]);

  const undo = useCallback((): HistoryState | null => {
    if (historyIndexRef.current <= 0) {
      return null;
    }
    
    historyIndexRef.current -= 1;
    const state = historyRef.current[historyIndexRef.current];
    if (state) {
      setHistoryState({
        selected: new Set(state.selected),
        autoSelected: new Set(state.autoSelected),
      });
      return state;
    }
    return null;
  }, []);

  const redo = useCallback((): HistoryState | null => {
    if (historyIndexRef.current >= historyRef.current.length - 1) {
      return null;
    }
    
    historyIndexRef.current += 1;
    const state = historyRef.current[historyIndexRef.current];
    if (state) {
      setHistoryState({
        selected: new Set(state.selected),
        autoSelected: new Set(state.autoSelected),
      });
      return state;
    }
    return null;
  }, []);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const clearHistory = useCallback(() => {
    historyRef.current = [];
    historyIndexRef.current = -1;
  }, []);

  return {
    historyState,
    pushState,
    undo,
    redo,
    canUndo,
    canRedo,
    clearHistory,
  };
}
