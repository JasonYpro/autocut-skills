import { useState } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useLocale } from '../i18n';
import { ExportOptionsPanel } from './ExportOptionsPanel';

type TabId = 'subtitles' | 'export';

interface RightSidebarProps {
  onExport: () => void;
}

export function RightSidebar({ onExport }: RightSidebarProps) {
  const { t } = useLocale();
  const [activeTab, setActiveTab] = useState<TabId>('export');
  
  const {
    burnSubtitle,
    setBurnSubtitle,
    subtitleStyle,
    setSubtitleStyle,
    exportOptions,
    setExportOptions,
  } = useEditorStore();

  const tabs: Array<{ id: TabId; label: string }> = [
    { id: 'subtitles', label: t.subtitleStyleTitle },
    { id: 'export', label: t.exportOptions },
  ];

  const presetStyles = [
    { name: 'Classic', style: { fontSize: 48, fontColor: '#FFFFFF', borderColor: '#000000', borderWidth: 2 } },
    { name: 'Bold', style: { fontSize: 56, fontColor: '#FFD700', borderColor: '#000000', borderWidth: 3 } },
    { name: 'Soft', style: { fontSize: 44, fontColor: '#E0E0E0', borderColor: '#333333', borderWidth: 1 } },
    { name: 'Modern', style: { fontSize: 52, fontColor: '#00FF00', borderColor: '#000000', borderWidth: 2 } },
  ];

  const handlePresetClick = (preset: typeof presetStyles[0]) => {
    setSubtitleStyle({
      ...subtitleStyle,
      ...preset.style,
    });
  };

  return (
    <div className="right-sidebar">
      <div className="sidebar-tabs">
        {tabs.map((tab) => (
          <button
            key={tab.id}
            className={`tab-btn ${activeTab === tab.id ? 'active' : ''}`}
            onClick={() => setActiveTab(tab.id)}
          >
            {tab.label}
          </button>
        ))}
      </div>
      
      <div className="sidebar-content">
        {activeTab === 'subtitles' && (
          <div className="tab-panel">
            <div className="preset-cards">
              {presetStyles.map((preset) => (
                <button
                  key={preset.name}
                  className="preset-card"
                  onClick={() => handlePresetClick(preset)}
                >
                  <span className="preset-name">{preset.name}</span>
                </button>
              ))}
            </div>
            
            <div className="style-controls">
              <div className="control-row">
                <label>{t.fontSize}</label>
                <input
                  type="range"
                  min="24"
                  max="80"
                  value={subtitleStyle.fontSize}
                  onChange={(e) => setSubtitleStyle({ ...subtitleStyle, fontSize: parseInt(e.target.value) })}
                />
                <span>{subtitleStyle.fontSize}</span>
              </div>
              
              <div className="control-row">
                <label>{t.fontColor}</label>
                <input
                  type="color"
                  value={subtitleStyle.textColor}
                  onChange={(e) => setSubtitleStyle({ ...subtitleStyle, textColor: e.target.value })}
                />
              </div>
              
              <div className="control-row">
                <label>{t.borderColor}</label>
                <input
                  type="color"
                  value={subtitleStyle.outlineColor}
                  onChange={(e) => setSubtitleStyle({ ...subtitleStyle, outlineColor: e.target.value })}
                />
              </div>
              
              <div className="control-row">
                <label>{t.bottomOffset}</label>
                <input
                  type="range"
                  min="20"
                  max="200"
                  value={subtitleStyle.bottomOffset}
                  onChange={(e) => setSubtitleStyle({ ...subtitleStyle, bottomOffset: parseInt(e.target.value) })}
                />
                <span>{subtitleStyle.bottomOffset}</span>
              </div>
            </div>
            
            <div className="control-row">
              <label>
                <input
                  type="checkbox"
                  checked={burnSubtitle}
                  onChange={(e) => setBurnSubtitle(e.target.checked)}
                />
                {t.burnSubtitle}
              </label>
            </div>
          </div>
        )}
        
        {activeTab === 'export' && (
          <div className="tab-panel">
            <ExportOptionsPanel
              options={exportOptions}
              onChange={setExportOptions}
            />
          </div>
        )}
      </div>
      
      <div className="sidebar-footer">
        <button className="export-btn" onClick={onExport}>
          {t.executeCut}
        </button>
      </div>
    </div>
  );
}
