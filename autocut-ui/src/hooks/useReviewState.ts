import { useCallback, useRef, useEffect, useMemo } from 'react';
import { useProjectDataState } from './useProjectDataState';
import { useVideoPlayerState } from './useVideoPlayerState';
import { useSelectionState } from './useSelectionState';
import { useEditState } from './useEditState';
import { useCutActions } from './useCutActions';
import { useAudioEffects } from './useAudioEffects';

interface HistoryEntry {
  selected: Set<number>;
  autoSelected: Set<number>;
}

export function useReviewState() {
  const videoRef = useRef<HTMLVideoElement>(null);
  const wordRefs = useRef<(HTMLDivElement | null)[]>([]);
  
  const historyRef = useRef<HistoryEntry[]>([]);
  const historyIndexRef = useRef<number>(-1);
  const isUndoRedoRef = useRef(false);

  const projectState = useProjectDataState();
  
  const videoState = useVideoPlayerState({
    videoRef,
    wordRefs,
    projectIds: projectState.projects.map((project) => project.id),
    currentProjectId: projectState.currentProjectId,
    currentState: projectState.currentState,
    stateByProject: projectState.stateByProject,
    previewSpeed: projectState.exportOptions.speed,
  });

  const selectionState = useSelectionState({
    videoRef,
    currentProjectId: projectState.currentProjectId,
    currentState: projectState.currentState,
    setProjectState: projectState.setProjectState,
    onSeekToTime: videoState.seekToTime,
  });

  const editState = useEditState({
    currentProjectId: projectState.currentProjectId,
    currentState: projectState.currentState,
    setProjectState: projectState.setProjectState,
  });

  const cutState = useCutActions({
    currentProjectId: projectState.currentProjectId,
    currentState: projectState.currentState,
    stateByProject: projectState.stateByProject,
    orderedProjectIds: projectState.orderedProjectIds,
    includedProjectIds: projectState.includedProjectIds,
    duration: videoState.duration,
    burnSubtitle: projectState.burnSubtitle,
    subtitleStyle: projectState.subtitleStyle,
    exportOptions: projectState.exportOptions,
    projectWords: projectState.words,
    projectSelected: projectState.selected,
    projectInitialAutoSelected: projectState.currentState?.initialAutoSelected || new Set<number>(),
    pendingTextChanges: projectState.currentState?.pendingTextChanges || [],
    clearPendingTextChanges: editState.clearPendingTextChanges,
    videoRef,
  });

  const audioEffectsOptions = useMemo(() => ({
    volume: projectState.exportOptions.volume,
    denoise: projectState.exportOptions.denoise,
    enhanceVoice: projectState.exportOptions.enhanceVoice,
    fadeIn: projectState.exportOptions.fadeIn,
    fadeOut: projectState.exportOptions.fadeOut,
    currentTime: videoState.currentTime,
    duration: videoState.duration,
    backgroundMusic: projectState.exportOptions.backgroundMusic,
    backgroundMusicVolume: projectState.exportOptions.backgroundMusicVolume,
  }), [
    projectState.exportOptions.volume,
    projectState.exportOptions.denoise,
    projectState.exportOptions.enhanceVoice,
    projectState.exportOptions.fadeIn,
    projectState.exportOptions.fadeOut,
    projectState.exportOptions.backgroundMusic,
    projectState.exportOptions.backgroundMusicVolume,
    videoState.currentTime,
    videoState.duration,
  ]);

  useAudioEffects(videoRef, audioEffectsOptions);

  useEffect(() => {
    if (projectState.currentState && !isUndoRedoRef.current) {
      const entry: HistoryEntry = {
        selected: new Set(projectState.selected),
        autoSelected: new Set(projectState.autoSelected),
      };
      
      const history = historyRef.current.slice(0, historyIndexRef.current + 1);
      history.push(entry);
      
      if (history.length > 50) {
        history.shift();
      } else {
        historyIndexRef.current += 1;
      }
      
      historyRef.current = history;
    }
    isUndoRedoRef.current = false;
  }, [projectState.selected, projectState.autoSelected]);

  useEffect(() => {
    if (projectState.currentProjectId) {
      historyRef.current = [];
      historyIndexRef.current = -1;
    }
  }, [projectState.currentProjectId]);

  const canUndo = historyIndexRef.current > 0;
  const canRedo = historyIndexRef.current < historyRef.current.length - 1;

  const handleUndo = useCallback(() => {
    if (historyIndexRef.current <= 0 || !projectState.currentProjectId) return;
    
    historyIndexRef.current -= 1;
    const entry = historyRef.current[historyIndexRef.current];
    
    if (entry) {
      isUndoRedoRef.current = true;
      projectState.setProjectState(projectState.currentProjectId, (state) => ({
        ...state,
        selected: new Set(entry.selected),
        autoSelected: new Set(entry.autoSelected),
      }));
    }
  }, [projectState]);

  const handleRedo = useCallback(() => {
    if (historyIndexRef.current >= historyRef.current.length - 1 || !projectState.currentProjectId) return;
    
    historyIndexRef.current += 1;
    const entry = historyRef.current[historyIndexRef.current];
    
    if (entry) {
      isUndoRedoRef.current = true;
      projectState.setProjectState(projectState.currentProjectId, (state) => ({
        ...state,
        selected: new Set(entry.selected),
        autoSelected: new Set(entry.autoSelected),
      }));
    }
  }, [projectState]);

  return {
    videoRef,
    wordRefs,
    projects: projectState.projects,
    currentProjectId: projectState.currentProjectId,
    setCurrentProjectId: projectState.setCurrentProjectId,
    orderedProjectIds: projectState.orderedProjectIds,
    includedProjectIds: projectState.includedProjectIds,
    toggleIncludeProject: projectState.toggleIncludeProject,
    moveProject: projectState.moveProject,
    reorderProject: projectState.reorderProject,
    stateByProject: projectState.stateByProject,
    words: projectState.words,
    selected: projectState.selected,
    autoSelected: projectState.autoSelected,
    editingIndex: editState.editingIndex,
    currentTime: videoState.currentTime,
    duration: videoState.duration,
    currentWordIndex: videoState.currentWordIndex,
    isPlaying: videoState.isPlaying,
    videoReady: videoState.videoReady,
    registerVideoElement: videoState.registerVideoElement,
    loading: cutState.loading,
    exportDialog: cutState.exportDialog,
    progressPercentLabel: cutState.progressPercentLabel,
    burnSubtitle: projectState.burnSubtitle,
    subtitleStyle: projectState.subtitleStyle,
    subtitleStyleJson: projectState.subtitleStyleJson,
    subtitleStyleError: projectState.subtitleStyleError,
    exportOptions: projectState.exportOptions,
    setExportOptions: projectState.setExportOptions,
    errorText: projectState.errorText,
    selectedDuration: projectState.selectedDuration,
    progressPercent: cutState.progressPercent,
    progressText: cutState.progressText,
    handleDialogConfirm: cutState.handleDialogConfirm,
    handleDialogCancel: cutState.handleDialogCancel,
    handleVideoTimeUpdate: videoState.handleVideoTimeUpdate,
    handlePlayPause: videoState.handlePlayPause,
    handleCopyDeleteList: cutState.handleCopyDeleteList,
    handleExecuteCut: cutState.handleExecuteCut,
    handleExecuteMergeCut: cutState.handleExecuteMergeCut,
    setBurnSubtitle: projectState.setBurnSubtitle,
    applySubtitleStyle: projectState.applySubtitleStyle,
    setSubtitleStyleJson: projectState.setSubtitleStyleJson,
    handleWordClick: selectionState.handleWordClick,
    toggleWord: selectionState.toggleWord,
    handleWordMouseDown: selectionState.handleWordMouseDown,
    handleWordMouseEnter: selectionState.handleWordMouseEnter,
    startEdit: editState.startEdit,
    commitEdit: editState.commitEdit,
    cancelEdit: editState.cancelEdit,
    handleSaveReview: cutState.handleSaveReview,
    handleUndo,
    handleRedo,
    canUndo,
    canRedo,
    transitionPoints: projectState.transitionPoints,
    toggleTransitionPoint: projectState.toggleTransitionPoint,
  };
}
