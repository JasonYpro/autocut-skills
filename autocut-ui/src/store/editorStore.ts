import { create } from 'zustand';
import type { Word, SubtitleStylePreset, ExportOptionsState } from '../types';

interface EditorState {
  words: Word[];
  selected: Set<number>;
  autoSelected: Set<number>;
  currentTime: number;
  duration: number;
  isPlaying: boolean;
  currentWordIndex: number;
  editingIndex: number | null;
  
  burnSubtitle: boolean;
  subtitleStyle: SubtitleStylePreset;
  exportOptions: ExportOptionsState;
  
  setWords: (words: Word[]) => void;
  setSelected: (selected: Set<number>) => void;
  toggleSelected: (index: number) => void;
  setAutoSelected: (autoSelected: Set<number>) => void;
  setCurrentTime: (time: number) => void;
  setDuration: (duration: number) => void;
  setIsPlaying: (isPlaying: boolean) => void;
  setCurrentWordIndex: (index: number) => void;
  setEditingIndex: (index: number | null) => void;
  setBurnSubtitle: (burn: boolean) => void;
  setSubtitleStyle: (style: SubtitleStylePreset) => void;
  setExportOptions: (options: Partial<ExportOptionsState>) => void;
  seekTo: (time: number) => void;
}

export const useEditorStore = create<EditorState>((set, get) => ({
  words: [],
  selected: new Set(),
  autoSelected: new Set(),
  currentTime: 0,
  duration: 0,
  isPlaying: false,
  currentWordIndex: -1,
  editingIndex: null,
  burnSubtitle: true,
  subtitleStyle: {
    fontSize: 48,
    textColor: '#FFFFFF',
    outlineColor: '#000000',
    outlineWidth: 2,
    bottomOffset: 80,
    fontWeight: 400,
    letterSpacing: 0,
    alignment: 'bottom-center',
    maxWidthPercent: 80,
    shadow: 0,
  },
  exportOptions: {
    speed: 1,
    denoise: false,
    enhanceVoice: false,
    volume: 1,
    fadeIn: 0,
    fadeOut: 0,
    backgroundMusic: '',
    backgroundMusicName: '',
    backgroundMusicVolume: 0.3,
    transition: 'none',
    transitionDuration: 0.5,
    maxWidthPercent: 86,
  },
  
  setWords: (words) => set({ words }),
  setSelected: (selected) => set({ selected }),
  toggleSelected: (index) => {
    const { selected, autoSelected } = get();
    const newSelected = new Set(selected);
    const newAuto = new Set(autoSelected);
    if (newSelected.has(index)) {
      newSelected.delete(index);
      newAuto.delete(index);
    } else {
      newSelected.add(index);
    }
    set({ selected: newSelected, autoSelected: newAuto });
  },
  setAutoSelected: (autoSelected) => set({ autoSelected }),
  setCurrentTime: (currentTime) => set({ currentTime }),
  setDuration: (duration) => set({ duration }),
  setIsPlaying: (isPlaying) => set({ isPlaying }),
  setCurrentWordIndex: (currentWordIndex) => set({ currentWordIndex }),
  setEditingIndex: (editingIndex) => set({ editingIndex }),
  setBurnSubtitle: (burnSubtitle) => set({ burnSubtitle }),
  setSubtitleStyle: (subtitleStyle) => set({ subtitleStyle }),
  setExportOptions: (options) => set((state) => ({
    exportOptions: { ...state.exportOptions, ...options },
  })),
  seekTo: (time) => set({ currentTime: time }),
}));
