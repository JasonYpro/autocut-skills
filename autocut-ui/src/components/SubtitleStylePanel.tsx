import { useMemo, useState } from 'react';
import { useLocale } from '../i18n';
import { SUBTITLE_STYLE_PRESETS, SUBTITLE_STYLE_PROMPT_TEMPLATE } from '../subtitleStyle';
import type { SubtitleStylePreset } from '../types';

interface SubtitleStylePanelProps {
  burnSubtitle: boolean;
  stylePreset: SubtitleStylePreset;
  styleJson: string;
  styleError: string;
  onBurnSubtitleChange: (value: boolean) => void;
  onApplyPreset: (style: SubtitleStylePreset) => void;
  onStyleJsonChange: (raw: string) => void;
}

export function SubtitleStylePanel({
  burnSubtitle,
  stylePreset,
  styleJson,
  styleError,
  onBurnSubtitleChange,
  onApplyPreset,
  onStyleJsonChange,
}: SubtitleStylePanelProps) {
  const { t } = useLocale();
  const [copyFeedback, setCopyFeedback] = useState('');
  const [jsonAccordionOpen, setJsonAccordionOpen] = useState(false);

  const statusText = useMemo(() => {
    if (styleError) return `${t.subtitleJsonInvalid}: ${styleError}`;
    return t.subtitleJsonValid;
  }, [styleError, t]);

  const activePresetId = useMemo(() => {
    const current = JSON.stringify(stylePreset);
    return SUBTITLE_STYLE_PRESETS.find((preset) => JSON.stringify(preset.style) === current)?.id || null;
  }, [stylePreset]);

  const handleCopyPrompt = async () => {
    await navigator.clipboard.writeText(SUBTITLE_STYLE_PROMPT_TEMPLATE);
    setCopyFeedback(t.subtitlePromptCopied);
    window.setTimeout(() => setCopyFeedback(''), 1500);
  };

  return (
    <div>
      <div className="panel-section">
        <div className="panel-title">{t.subtitleStyleTitle}</div>
        
        <div className="form-group">
          <label className="form-checkbox">
            <input
              type="checkbox"
              checked={burnSubtitle}
              onChange={(e) => onBurnSubtitleChange(e.target.checked)}
            />
            <span>{t.burnSubtitle}</span>
          </label>
        </div>
      </div>

      <div className="panel-section">
        <div className="panel-title">{t.subtitlePresetLabel}</div>
        <div className="preset-cards">
          {SUBTITLE_STYLE_PRESETS.map((preset) => (
            <button
              key={preset.id}
              type="button"
              className={`preset-card ${activePresetId === preset.id ? 'active' : ''}`}
              onClick={() => onApplyPreset({ ...preset.style })}
            >
              <span className="preset-name">{preset.label}</span>
            </button>
          ))}
        </div>
      </div>

      <div className="panel-section">
        <div className="form-group">
          <label className="form-label">{t.fontSize}</label>
          <div className="form-row">
            <input
              type="range"
              className="form-slider"
              min="24"
              max="80"
              value={stylePreset.fontSize || 48}
              onChange={(e) => onApplyPreset({ ...stylePreset, fontSize: parseInt(e.target.value) })}
            />
            <span className="slider-value">{stylePreset.fontSize || 48}</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t.fontColor}</label>
          <div className="form-row">
            <input
              type="color"
              className="color-picker"
              value={stylePreset.textColor || '#FFFFFF'}
              onChange={(e) => onApplyPreset({ ...stylePreset, textColor: e.target.value })}
            />
            <input
              type="text"
              className="form-input"
              value={stylePreset.textColor || '#FFFFFF'}
              onChange={(e) => onApplyPreset({ ...stylePreset, textColor: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t.borderColor}</label>
          <div className="form-row">
            <input
              type="color"
              className="color-picker"
              value={stylePreset.outlineColor || '#000000'}
              onChange={(e) => onApplyPreset({ ...stylePreset, outlineColor: e.target.value })}
            />
            <input
              type="text"
              className="form-input"
              value={stylePreset.outlineColor || '#000000'}
              onChange={(e) => onApplyPreset({ ...stylePreset, outlineColor: e.target.value })}
            />
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t.outlineWidth}</label>
          <div className="form-row">
            <input
              type="range"
              className="form-slider"
              min="0"
              max="6"
              value={stylePreset.outlineWidth || 2}
              onChange={(e) => onApplyPreset({ ...stylePreset, outlineWidth: parseInt(e.target.value) })}
            />
            <span className="slider-value">{stylePreset.outlineWidth || 2}</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t.bottomOffset}</label>
          <div className="form-row">
            <input
              type="range"
              className="form-slider"
              min="20"
              max="200"
              value={stylePreset.bottomOffset || 60}
              onChange={(e) => onApplyPreset({ ...stylePreset, bottomOffset: parseInt(e.target.value) })}
            />
            <span className="slider-value">{stylePreset.bottomOffset || 60}</span>
          </div>
        </div>

        <div className="form-group">
          <label className="form-label">{t.maxWidthPercent || '字幕宽度'}</label>
          <div className="form-row">
            <input
              type="range"
              className="form-slider"
              min="50"
              max="95"
              step="5"
              value={stylePreset.maxWidthPercent || 86}
              onChange={(e) => onApplyPreset({ ...stylePreset, maxWidthPercent: parseInt(e.target.value) })}
            />
            <span className="slider-value">{stylePreset.maxWidthPercent || 86}%</span>
          </div>
          <p className="json-hint" style={{ marginTop: '4px' }}>{t.maxWidthPercentHint || '控制字幕最大宽度，超出时自动换行'}</p>
        </div>
      </div>

      <div className={`accordion ${jsonAccordionOpen ? 'open' : ''}`}>
        <div 
          className="accordion-header"
          onClick={() => setJsonAccordionOpen(!jsonAccordionOpen)}
        >
          <span className="accordion-title">⚙️ {t.subtitleJsonLabel}</span>
          <span className="accordion-icon">
            {jsonAccordionOpen ? '▲' : '▼'}
          </span>
        </div>
        <div className="accordion-content">
          <p className="json-hint">{t.subtitleJsonHint}</p>
          <textarea
            className={`json-textarea ${styleError ? 'json-invalid' : 'json-valid'}`}
            value={styleJson}
            spellCheck={false}
            onChange={(e) => onStyleJsonChange(e.target.value)}
          />
          <div className={`json-hint ${styleError ? 'json-invalid' : 'json-valid'}`}>
            {statusText}
          </div>
        </div>
      </div>

      <div className="panel-section" style={{ marginTop: '16px' }}>
        <div className="form-group">
          <div className="form-row" style={{ justifyContent: 'space-between' }}>
            <div>
              <div className="form-label" style={{ marginBottom: '4px' }}>{t.subtitlePromptLabel}</div>
              <p className="json-hint">{t.subtitlePromptHint}</p>
            </div>
            <button type="button" className="btn-ghost" onClick={handleCopyPrompt}>
              {copyFeedback || t.subtitleCopyPrompt}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
