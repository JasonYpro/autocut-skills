import { useRef } from 'react';
import { useLocale } from '../i18n';
import { getSampleMusic } from '../hooks/useAudioEffects';
import type { ExportOptionsState } from '../types';

interface ExportOptionsPanelProps {
  options: ExportOptionsState;
  onChange: (options: Partial<ExportOptionsState>) => void;
}

const SPEED_OPTIONS = [0.5, 0.75, 1, 1.25, 1.5, 1.75, 2];
const TRANSITION_OPTIONS = [
  { value: 'none', labelKey: 'transitionNone' },
  { value: 'fade', labelKey: 'transitionFade' },
  { value: 'dissolve', labelKey: 'transitionDissolve' },
  { value: 'wipeleft', labelKey: 'transitionWipeLeft' },
  { value: 'wiperight', labelKey: 'transitionWipeRight' },
] as const;

export function ExportOptionsPanel({ options, onChange }: ExportOptionsPanelProps) {
  const { t } = useLocale();
  const bgmInputRef = useRef<HTMLInputElement>(null);
  const sampleMusic = getSampleMusic();

  const handleBgmSelect = () => {
    bgmInputRef.current?.click();
  };

  const handleBgmChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file) {
      const blobUrl = URL.createObjectURL(file);
      console.log('[BGM] 选择本地文件:', file.name, '-> Blob URL:', blobUrl);
      onChange({ backgroundMusic: blobUrl, backgroundMusicName: file.name });
    }
  };

  const handleSampleMusicSelect = (url: string, name: string) => {
    onChange({ backgroundMusic: url, backgroundMusicName: name });
  };

  const clearBackgroundMusic = () => {
    onChange({ backgroundMusic: '', backgroundMusicName: '' });
  };

  return (
    <div>
      <div className="panel-section">
        <div className="section-title">{t.basicSettings}</div>
        
        <div className="form-group">
          <label className="form-label">{t.speed}</label>
          <select
            className="form-select"
            style={{ width: '100%' }}
            value={options.speed}
            onChange={(e) => onChange({ speed: parseFloat(e.target.value) })}
          >
            {SPEED_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s}x
              </option>
            ))}
          </select>
        </div>

        <div className="form-group">
          <label className="form-label">{t.volume}</label>
          <div className="form-row">
            <input
              type="range"
              className="form-slider"
              min="0"
              max="2"
              step="0.1"
              value={options.volume}
              onChange={(e) => onChange({ volume: parseFloat(e.target.value) })}
            />
            <span className="slider-value">{Math.round(options.volume * 100)}%</span>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">{t.audioEffects}</div>
        
        <div className="form-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={options.denoise}
              onChange={(e) => onChange({ denoise: e.target.checked })}
            />
            <span>{t.denoise}</span>
          </label>
          <p className="json-hint" style={{ marginTop: '4px' }}>{t.denoiseHint}</p>
        </div>

        <div className="form-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={options.enhanceVoice}
              onChange={(e) => onChange({ enhanceVoice: e.target.checked })}
            />
            <span>{t.enhanceVoice}</span>
          </label>
          <p className="json-hint" style={{ marginTop: '4px' }}>{t.enhanceVoiceHint}</p>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">{t.fadeSettings}</div>
        
        <div className="form-group">
          <label className="form-label">{t.fadeIn}</label>
          <div className="form-row">
            <input
              type="range"
              className="form-slider"
              min="0"
              max="3"
              step="0.1"
              value={options.fadeIn}
              onChange={(e) => onChange({ fadeIn: parseFloat(e.target.value) })}
            />
            <span className="slider-value">{options.fadeIn.toFixed(1)}s</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t.fadeOut}</label>
          <div className="form-row">
            <input
              type="range"
              className="form-slider"
              min="0"
              max="3"
              step="0.1"
              value={options.fadeOut}
              onChange={(e) => onChange({ fadeOut: parseFloat(e.target.value) })}
            />
            <span className="slider-value">{options.fadeOut.toFixed(1)}s</span>
          </div>
        </div>
      </div>

      <div className="panel-section">
        <div className="section-title">{t.transitionSettings}</div>
        <p className="json-hint" style={{ marginBottom: '12px' }}>{t.transitionHint}</p>
        
        <div className="form-group">
          <label className="form-label">{t.transition}</label>
          <select
            className="form-select"
            style={{ width: '100%' }}
            value={options.transition}
            onChange={(e) => onChange({ transition: e.target.value as ExportOptionsState['transition'] })}
          >
            {TRANSITION_OPTIONS.map((opt) => (
              <option key={opt.value} value={opt.value}>
                {t[opt.labelKey]}
              </option>
            ))}
          </select>
        </div>

        {options.transition !== 'none' && (
          <div className="form-group">
            <label className="form-label">{t.transitionDuration}</label>
            <div className="form-row">
              <input
                type="range"
                className="form-slider"
                min="0.1"
                max="2"
                step="0.1"
                value={options.transitionDuration}
                onChange={(e) => onChange({ transitionDuration: parseFloat(e.target.value) })}
              />
              <span className="slider-value">{options.transitionDuration.toFixed(1)}s</span>
            </div>
          </div>
        )}
      </div>

      <div className="panel-section">
        <div className="section-title">{t.backgroundMusic}</div>
        
        <div className="form-group">
          <label className="form-label" style={{ marginBottom: '8px' }}>{t.sampleMusic}</label>
          <div className="sample-music-list">
            {sampleMusic.map((music) => (
              <button
                key={music.id}
                type="button"
                className={`sample-music-btn ${options.backgroundMusic === music.url ? 'active' : ''}`}
                onClick={() => handleSampleMusicSelect(music.url, music.name)}
              >
                🎵 {music.name}
              </button>
            ))}
          </div>
        </div>

        <div className="form-group">
          <label className="form-label" style={{ marginBottom: '8px' }}>{t.customMusic}</label>
          <div className="form-row" style={{ gap: '8px' }}>
            <button type="button" className="btn-ghost" style={{ flex: 1 }} onClick={handleBgmSelect}>
              {t.selectFile}
            </button>
            {options.backgroundMusic && (
              <button 
                type="button" 
                className="btn-ghost" 
                onClick={clearBackgroundMusic}
                style={{ color: 'var(--color-danger)' }}
              >
                ✕
              </button>
            )}
          </div>
          <input
            ref={bgmInputRef}
            type="file"
            accept="audio/*"
            style={{ display: 'none' }}
            onChange={handleBgmChange}
          />
          {options.backgroundMusic && (
            <div className="json-hint" style={{ marginTop: '8px' }}>
              🎵 {options.backgroundMusicName || options.backgroundMusic.split('/').pop()}
            </div>
          )}
        </div>

        {options.backgroundMusic && (
          <div className="form-group">
            <label className="form-label">{t.musicVolume}</label>
            <div className="form-row">
              <input
                type="range"
                className="form-slider"
                min="0"
                max="1"
                step="0.05"
                value={options.backgroundMusicVolume}
                onChange={(e) => onChange({ backgroundMusicVolume: parseFloat(e.target.value) })}
              />
              <span className="slider-value">{Math.round(options.backgroundMusicVolume * 100)}%</span>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
