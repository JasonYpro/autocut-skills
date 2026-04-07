import { useEffect, useMemo, useState } from 'react';
import { fetchProjectData, fetchProjects } from '../api';
import { loadStoredSubtitleStyle, parseSubtitleStyleJson, serializeSubtitleStyle, storeSubtitleStyle } from '../subtitleStyle';
import type { Project, ProjectState, SubtitleStylePreset, ExportOptionsState } from '../types';

const DEFAULT_EXPORT_OPTIONS: ExportOptionsState = {
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
};

function loadStoredExportOptions(): ExportOptionsState {
  if (typeof window === 'undefined') return DEFAULT_EXPORT_OPTIONS;
  try {
    const stored = localStorage.getItem('videocut-export-options');
    if (stored) {
      const parsed = JSON.parse(stored);
      return {
        speed: typeof parsed.speed === 'number' ? parsed.speed : 1,
        denoise: Boolean(parsed.denoise),
        enhanceVoice: Boolean(parsed.enhanceVoice),
        volume: typeof parsed.volume === 'number' ? parsed.volume : 1,
        fadeIn: typeof parsed.fadeIn === 'number' ? parsed.fadeIn : 0,
        fadeOut: typeof parsed.fadeOut === 'number' ? parsed.fadeOut : 0,
        backgroundMusic: typeof parsed.backgroundMusic === 'string' ? parsed.backgroundMusic : '',
        backgroundMusicName: typeof parsed.backgroundMusicName === 'string' ? parsed.backgroundMusicName : '',
        backgroundMusicVolume: typeof parsed.backgroundMusicVolume === 'number' ? parsed.backgroundMusicVolume : 0.3,
        transition: ['none', 'fade', 'dissolve', 'wipeleft', 'wiperight'].includes(parsed.transition) ? parsed.transition : 'none',
        transitionDuration: typeof parsed.transitionDuration === 'number' ? parsed.transitionDuration : 0.5,
        maxWidthPercent: typeof parsed.maxWidthPercent === 'number' ? parsed.maxWidthPercent : 86,
      };
    }
  } catch {}
  return DEFAULT_EXPORT_OPTIONS;
}

function storeExportOptions(options: ExportOptionsState) {
  if (typeof window === 'undefined') return;
  localStorage.setItem('videocut-export-options', JSON.stringify(options));
}

export function useProjectDataState() {
  const [projects, setProjects] = useState<Project[]>([]);
  const [currentProjectId, setCurrentProjectId] = useState<string | null>(null);
  const [stateByProject, setStateByProject] = useState<Record<string, ProjectState>>({});
  const [orderedProjectIds, setOrderedProjectIds] = useState<string[]>([]);
  const [includedProjectIds, setIncludedProjectIds] = useState<Set<string>>(new Set());
  const [burnSubtitle, setBurnSubtitle] = useState(true);
  const [errorText, setErrorText] = useState('');
  const [subtitleStyle, setSubtitleStyle] = useState<SubtitleStylePreset>(() => loadStoredSubtitleStyle());
  const [subtitleStyleJson, setSubtitleStyleJson] = useState(() => serializeSubtitleStyle(loadStoredSubtitleStyle()));
  const [subtitleStyleError, setSubtitleStyleError] = useState('');
  const [exportOptions, setExportOptionsState] = useState<ExportOptionsState>(() => loadStoredExportOptions());

  const currentState = currentProjectId ? stateByProject[currentProjectId] : null;
  const words = currentState?.words || [];
  const selected = currentState?.selected || new Set<number>();
  const autoSelected = currentState?.autoSelected || new Set<number>();
  const transitionPoints = currentState?.transitionPoints || [];

  const selectedDuration = useMemo(() => {
    let total = 0;
    selected.forEach((i) => {
      total += (words[i]?.end || 0) - (words[i]?.start || 0);
    });
    return total;
  }, [selected, words]);

  const setProjectState = (projectId: string, updater: (state: ProjectState) => ProjectState) => {
    setStateByProject((prev) => {
      const prevState = prev[projectId];
      if (!prevState) return prev;
      const nextState = updater(prevState);
      return { ...prev, [projectId]: nextState };
    });
  };

  const loadOneProject = async (projectId: string) => {
    const data = await fetchProjectData(projectId);
    const projectWords = data.words || [];
    const projectAutoSelected = new Set<number>(Array.isArray(data.autoSelected) ? data.autoSelected : []);
    const projectSelected = new Set<number>(projectAutoSelected);
    const baseAuto = Array.isArray(data.baseAutoSelected)
      ? new Set<number>(data.baseAutoSelected)
      : projectAutoSelected;
    setStateByProject((prev) => ({
      ...prev,
      [projectId]: {
        words: projectWords,
        initialAutoSelected: new Set(baseAuto),
        autoSelected: new Set(baseAuto),
        selected: projectSelected,
        editingIndex: null,
        pendingTextChanges: [],
        transitionPoints: [],
      },
    }));
  };

  useEffect(() => {
    (async () => {
      try {
        const list = await fetchProjects();
        setProjects(list);
        if (!list.length) return;
        setOrderedProjectIds(list.map((p) => p.id));
        setIncludedProjectIds(new Set(list.map((p) => p.id)));
        setCurrentProjectId(list[0].id);
        const results = await Promise.allSettled(list.map((p) => loadOneProject(p.id)));
        const failedCount = results.filter((r) => r.status === 'rejected').length;
        if (failedCount > 0) {
          setErrorText(`部分项目加载失败（${failedCount}/${list.length}）`);
        }
      } catch (err: any) {
        setErrorText(err.message || String(err));
      }
    })();
  }, []);

  useEffect(() => {
    storeSubtitleStyle(subtitleStyle);
  }, [subtitleStyle]);

  const toggleIncludeProject = (projectId: string) => {
    setIncludedProjectIds((prev) => {
      const next = new Set(prev);
      if (next.has(projectId)) {
        next.delete(projectId);
      } else {
        next.add(projectId);
      }
      return next;
    });
  };

  const moveProject = (projectId: string, direction: 'up' | 'down') => {
    setOrderedProjectIds((prev) => {
      const index = prev.indexOf(projectId);
      if (index < 0) return prev;
      const target = direction === 'up' ? index - 1 : index + 1;
      if (target < 0 || target >= prev.length) return prev;
      const next = [...prev];
      [next[index], next[target]] = [next[target], next[index]];
      return next;
    });
  };

  const reorderProject = (sourceProjectId: string, targetProjectId: string) => {
    if (sourceProjectId === targetProjectId) return;
    setOrderedProjectIds((prev) => {
      const sourceIndex = prev.indexOf(sourceProjectId);
      const targetIndex = prev.indexOf(targetProjectId);
      if (sourceIndex < 0 || targetIndex < 0) return prev;
      const next = [...prev];
      const [source] = next.splice(sourceIndex, 1);
      next.splice(targetIndex, 0, source);
      return next;
    });
  };

  const applySubtitleStyle = (style: SubtitleStylePreset) => {
    setSubtitleStyle(style);
    setSubtitleStyleJson(serializeSubtitleStyle(style));
    setSubtitleStyleError('');
  };

  const handleSubtitleStyleJsonChange = (raw: string) => {
    setSubtitleStyleJson(raw);
    const parsed = parseSubtitleStyleJson(raw);
    if (parsed.value) {
      setSubtitleStyle(parsed.value);
      setSubtitleStyleError('');
      return;
    }
    setSubtitleStyleError(parsed.error || '');
  };

  const setExportOptions = (options: Partial<ExportOptionsState>) => {
    setExportOptionsState((prev) => {
      const next = { ...prev, ...options };
      storeExportOptions(next);
      return next;
    });
  };

  const toggleTransitionPoint = (wordIndex: number) => {
    if (!currentProjectId) return;
    setProjectState(currentProjectId, (state) => {
      const points = state.transitionPoints || [];
      const exists = points.includes(wordIndex);
      return {
        ...state,
        transitionPoints: exists
          ? points.filter((p) => p !== wordIndex)
          : [...points, wordIndex].sort((a, b) => a - b),
      };
    });
  };

  return {
    projects,
    currentProjectId,
    setCurrentProjectId,
    stateByProject,
    orderedProjectIds,
    includedProjectIds,
    toggleIncludeProject,
    moveProject,
    reorderProject,
    setProjectState,
    currentState,
    words,
    selected,
    autoSelected,
    transitionPoints,
    toggleTransitionPoint,
    burnSubtitle,
    setBurnSubtitle,
    subtitleStyle,
    subtitleStyleJson,
    subtitleStyleError,
    applySubtitleStyle,
    setSubtitleStyleJson: handleSubtitleStyleJsonChange,
    exportOptions,
    setExportOptions,
    selectedDuration,
    errorText,
  };
}
