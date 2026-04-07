import { useState, useMemo, useCallback, useRef, useEffect } from 'react';
import { useReviewState } from './hooks/useReviewState';
import { useTheme } from './hooks/useTheme';
import { useLocale } from './i18n';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ExportDialog } from './components/ExportDialog';
import { BatchExportPanel } from './components/BatchExportPanel';
import { ControlsBar } from './components/ControlsBar';
import { SubtitleOverlay } from './components/SubtitleOverlay';
import { SubtitleStylePanel } from './components/SubtitleStylePanel';
import { ExportOptionsPanel } from './components/ExportOptionsPanel';
import { TransitionPreview } from './components/TransitionPreview';
import './style.css';

type TabId = 'subtitles' | 'export';

type TokenStatus = 'normal' | 'ai-delete' | 'user-deleted';

interface Token {
  id: number;
  text: string;
  startTime: number;
  endTime: number;
  status: TokenStatus;
}

function App() {
  const [activeTab, setActiveTab] = useState<TabId>('subtitles');
  const [showHelp, setShowHelp] = useState(false);
  const state = useReviewState();
  useTheme();
  const { t } = useLocale();
  const scrollRef = useRef<HTMLDivElement>(null);
  const selectingRef = useRef({ active: false, start: -1, mode: 'add' as 'add' | 'remove' });

  const tokens: Token[] = useMemo(() => {
    if (!state.words || state.words.length === 0) return [];
    
    return state.words.map((word, index) => {
      let status: TokenStatus = 'normal';
      if (state.selected.has(index)) {
        status = 'user-deleted';
      } else if (state.autoSelected.has(index)) {
        status = 'ai-delete';
      }
      return {
        id: index,
        text: word.text || '',
        startTime: word.start,
        endTime: word.end,
        status,
      };
    });
  }, [state.words, state.selected, state.autoSelected]);

  useEffect(() => {
    const onMouseUp = () => {
      selectingRef.current.active = false;
    };
    document.addEventListener('mouseup', onMouseUp);
    return () => document.removeEventListener('mouseup', onMouseUp);
  }, []);

  const handleTokenClick = useCallback((token: Token) => {
    if (state.videoRef.current && !selectingRef.current.active) {
      state.videoRef.current.currentTime = token.startTime;
    }
  }, [state.videoRef]);

  const handleTokenDoubleClick = useCallback((token: Token) => {
    state.toggleWord(token.id);
  }, [state]);

  const handleTokenContextMenu = useCallback((e: React.MouseEvent, token: Token) => {
    e.preventDefault();
    state.startEdit(token.id);
  }, [state]);

  const handleTokenMouseDown = useCallback((e: React.MouseEvent, token: Token) => {
    if (e.button !== 0) return;
    selectingRef.current.active = true;
    selectingRef.current.start = token.id;
    selectingRef.current.mode = state.selected.has(token.id) ? 'remove' : 'add';
    e.preventDefault();
  }, [state.selected]);

  const handleTokenMouseEnter = useCallback((token: Token) => {
    const s = selectingRef.current;
    if (!s.active) return;
    
    const min = Math.min(s.start, token.id);
    const max = Math.max(s.start, token.id);
    
    for (let j = min; j <= max; j += 1) {
      if (s.mode === 'add') {
        if (!state.selected.has(j)) {
          state.toggleWord(j);
        }
      } else {
        if (state.selected.has(j)) {
          state.toggleWord(j);
        }
      }
    }
  }, [state]);

  useEffect(() => {
    if (state.currentWordIndex >= 0 && scrollRef.current) {
      const activeToken = scrollRef.current.querySelector(`[data-token-id="${state.currentWordIndex}"]`);
      if (activeToken) {
        activeToken.scrollIntoView({ behavior: 'smooth', block: 'center' });
      }
    }
  }, [state.currentWordIndex]);

  const renderToken = (token: Token) => {
    const isActive = state.currentWordIndex === token.id;
    const isEditing = state.editingIndex === token.id;
    const hasTransition = state.transitionPoints.includes(token.id);
    
    const className = [
      'token',
      token.status,
      isActive ? 'active' : '',
      isEditing ? 'editing' : '',
      hasTransition ? 'has-transition' : '',
    ].filter(Boolean).join(' ');

    const bubbleText = token.status === 'ai-delete' ? '✔ 保留' : '✂ 删除';
    
    const prevToken = tokens[token.id - 1];
    const shouldBreak = token.id === 0 || 
      (prevToken && (token.startTime - prevToken.endTime > 1));
    
    const isPunctuation = /[。！？，、；：]/.test(token.text);
    
    const handleTransitionClick = (e: React.MouseEvent) => {
      e.stopPropagation();
      state.toggleTransitionPoint(token.id);
    };
    
    return (
      <span key={token.id}>
        {shouldBreak && <br />}
        <span
          data-token-id={token.id}
          className={className}
          onClick={() => handleTokenClick(token)}
          onDoubleClick={() => handleTokenDoubleClick(token)}
          onContextMenu={(e) => handleTokenContextMenu(e, token)}
          onMouseDown={(e) => handleTokenMouseDown(e, token)}
          onMouseEnter={() => handleTokenMouseEnter(token)}
        >
          {isEditing ? (
            <input
              className="token-edit-input"
              type="text"
              defaultValue={token.text}
              autoFocus
              onKeyDown={(e) => {
                if (e.key === 'Enter') {
                  state.commitEdit(token.id, (e.target as HTMLInputElement).value);
                } else if (e.key === 'Escape') {
                  state.cancelEdit();
                }
              }}
              onBlur={() => state.cancelEdit()}
            />
          ) : (
            <>
              <span className="token-text">{token.text}</span>
              <span className="token-bubble">{bubbleText}</span>
              {state.exportOptions.transition !== 'none' && (
                <span 
                  className="transition-marker"
                  onClick={handleTransitionClick}
                  title={hasTransition ? '移除转场' : '插入转场'}
                >
                  {hasTransition ? '⚡' : '◯'}
                </span>
              )}
            </>
          )}
        </span>
        {isPunctuation && <span> </span>}
      </span>
    );
  };

  return (
    <div className="app-container">
      <LoadingOverlay
        loading={state.loading}
        progressPercent={state.progressPercent}
        progressPercentLabel={state.progressPercentLabel}
        progressText={state.progressText}
      />
      {state.currentProjectId && state.videoReady[state.currentProjectId] === false && (
        <div className="video-proxy-overlay">
          <div className="video-proxy-spinner" />
          <div className="video-proxy-text">{t.videoProxyGenerating}</div>
        </div>
      )}
      <ExportDialog dialog={state.exportDialog} onConfirm={state.handleDialogConfirm} onCancel={state.handleDialogCancel} />

      <div className="left-pane">
        <div className="video-player-pane">
          <div className="video-container">
            {state.projects.map((project) => (
              <video
                key={project.id}
                ref={(element) => state.registerVideoElement(project.id, element)}
                style={{ display: project.id === state.currentProjectId ? 'block' : 'none' }}
                preload="auto"
                playsInline
                onTimeUpdate={() => state.handleVideoTimeUpdate(project.id)}
              />
            ))}
            {state.burnSubtitle && (
              <SubtitleOverlay
                currentTime={state.currentTime}
                words={state.words}
                selected={state.selected}
                stylePreset={state.subtitleStyle}
              />
            )}
            <TransitionPreview
              currentTime={state.currentTime}
              words={state.words}
              transitionPoints={state.transitionPoints}
              transition={state.exportOptions.transition}
              transitionDuration={state.exportOptions.transitionDuration}
            />
          </div>
        </div>

        <ControlsBar
          currentTime={state.currentTime}
          duration={state.duration}
          isPlaying={state.isPlaying}
          onPlayPause={state.handlePlayPause}
          volume={state.exportOptions.volume}
          speed={state.exportOptions.speed}
          onVolumeChange={(vol) => state.setExportOptions({ volume: vol })}
          onSpeedChange={(spd) => state.setExportOptions({ speed: spd })}
        />

        {state.projects.length > 1 && (
          <BatchExportPanel
            projects={state.projects}
            currentProjectId={state.currentProjectId}
            orderedProjectIds={state.orderedProjectIds}
            includedProjectIds={state.includedProjectIds}
            stateByProject={state.stateByProject}
            onSelectProject={state.setCurrentProjectId}
            onToggleInclude={state.toggleIncludeProject}
            onReorderProject={state.reorderProject}
            onExecuteMergeCut={state.handleExecuteMergeCut}
          />
        )}
      </div>

      <div className="center-pane">
        <div className="transcript-editor">
          <div className="transcript-toolbar">
            <div className="transcript-toolbar-left">
              <div className="stats-badge">
                <span className="dot"></span>
                <strong>{state.selected.size}</strong> {t.segments} ({state.selectedDuration.toFixed(1)}s)
              </div>
              <button 
                className="btn-ghost" 
                onClick={state.handleUndo}
                disabled={!state.canUndo}
                title={t.undo}
              >
                ↶ {t.undo}
              </button>
              <button 
                className="btn-ghost" 
                onClick={state.handleRedo}
                disabled={!state.canRedo}
                title={t.redo}
              >
                ↷ {t.redo}
              </button>
            </div>
            <div style={{ position: 'relative' }}>
              <button 
                className="btn-ghost" 
                type="button"
                onMouseEnter={() => setShowHelp(true)}
                onMouseLeave={() => setShowHelp(false)}
              >
                {t.instructions}
              </button>
              {showHelp && (
                <div className="help-popover" style={{ opacity: 1, visibility: 'visible', transform: 'translateY(0)' }}>
                  <div className="help-content">
                    <span><b>{t.helpClick}</b> {t.helpJumpPlay}</span>
                    <span className="help-sep">·</span>
                    <span><b>{t.helpDblClick}</b> {t.helpSelectToggle}</span>
                    <span className="help-sep">·</span>
                    <span><b>{t.helpRightClick}</b> {t.helpEditWord}</span>
                    <span className="help-sep">·</span>
                    <span><b>{t.helpEnterEsc}</b> {t.helpSaveCancel}</span>
                    <span className="help-sep">·</span>
                    <span><b>{t.helpDrag}</b> {t.helpBatch}</span>
                    <span className="help-sep">·</span>
                    <span><b>{t.helpSpace}</b> {t.playPause}</span>
                    <span className="help-sep">·</span>
                    <span><b>{t.helpArrows}</b> {t.helpJump}</span>
                    <span className="help-sep">·</span>
                    <span className="color-warning">●</span> {t.aiPreselect}
                    <span className="help-sep">·</span>
                    <span className="color-danger">●</span> {t.confirmedDelete}
                  </div>
                </div>
              )}
            </div>
          </div>
          
          <div className="transcript-scroll" ref={scrollRef}>
            <div className="token-list">
              {tokens.map(renderToken)}
            </div>
          </div>
        </div>
      </div>

      <div className="right-pane">
        <div className="settings-sidebar">
          <div className="sidebar-tabs">
            <button 
              className={`tab-btn ${activeTab === 'subtitles' ? 'active' : ''}`}
              onClick={() => setActiveTab('subtitles')}
            >
              {t.subtitleStyleTitle}
            </button>
            <button 
              className={`tab-btn ${activeTab === 'export' ? 'active' : ''}`}
              onClick={() => setActiveTab('export')}
            >
              {t.exportOptions}
            </button>
          </div>
          
          <div className="sidebar-content">
            {activeTab === 'subtitles' && (
              <SubtitleStylePanel
                burnSubtitle={state.burnSubtitle}
                stylePreset={state.subtitleStyle}
                styleJson={state.subtitleStyleJson}
                styleError={state.subtitleStyleError}
                onBurnSubtitleChange={state.setBurnSubtitle}
                onApplyPreset={state.applySubtitleStyle}
                onStyleJsonChange={state.setSubtitleStyleJson}
              />
            )}

            {activeTab === 'export' && (
              <ExportOptionsPanel
                options={state.exportOptions}
                onChange={state.setExportOptions}
              />
            )}
          </div>
          
          <div className="sidebar-footer">
            <button className="export-btn" onClick={state.handleExecuteCut}>
              🚀 {t.executeCut}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

export default App;
