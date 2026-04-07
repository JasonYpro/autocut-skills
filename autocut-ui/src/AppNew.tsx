import { useRef, useEffect, useState } from 'react';
import { useEditorStore } from './store/editorStore';
import { useLocale } from './i18n';
import { LeftPane } from './components/LeftPane';
import { CenterPane } from './components/CenterPane';
import { RightSidebar } from './components/RightSidebar';
import { fetchProjectData, getVideoUrl, executeCut } from './api';
import { LoadingOverlay } from './components/LoadingOverlay';
import { ExportDialog } from './components/ExportDialog';
import { ThemeToggle } from './components/ThemeToggle';
import { LocaleToggle } from './components/LocaleToggle';
import './style-new.css';

interface AppProps {
  projectId: string;
}

export function App({ projectId }: AppProps) {
  const { t } = useLocale();
  const videoRef = useRef<HTMLVideoElement>(null);
  const [loading, setLoading] = useState(false);
  const [exportDialog, setExportDialog] = useState<{ show: boolean; title: string; message: string; tone: 'success' | 'error' }>({
    show: false,
    title: '',
    message: '',
    tone: 'success',
  });

  const {
    words,
    setWords,
    selected,
    setAutoSelected,
    burnSubtitle,
    subtitleStyle,
    exportOptions,
  } = useEditorStore();

  useEffect(() => {
    const loadData = async () => {
      try {
        const data = await fetchProjectData(projectId);
        setWords(data.words);
        const autoSet = new Set(data.autoSelected || []);
        setAutoSelected(autoSet);
        useEditorStore.getState().setSelected(new Set(autoSet));
      } catch (error) {
        console.error('Failed to load project data:', error);
      }
    };
    
    if (projectId) {
      loadData();
    }
  }, [projectId, setWords, setAutoSelected]);

  const handleExport = async () => {
    const deleteSegments = Array.from(selected).map(i => ({
      start: words[i].start,
      end: words[i].end,
    }));

    if (deleteSegments.length === 0) {
      setExportDialog({
        show: true,
        title: t.selectFirst,
        message: '',
        tone: 'error',
      });
      return;
    }

    setLoading(true);
    try {
      const result = await executeCut(
        projectId,
        deleteSegments,
        burnSubtitle,
        subtitleStyle,
        undefined,
        exportOptions
      );
      
      if (result.success) {
        setExportDialog({
          show: true,
          title: t.cutDone,
          message: `${t.output}: ${result.output}\n${t.newDuration}: ${result.newDuration}s`,
          tone: 'success',
        });
      } else {
        setExportDialog({
          show: true,
          title: t.cutFailed,
          message: result.error || 'Unknown error',
          tone: 'error',
        });
      }
    } catch (error: any) {
      setExportDialog({
        show: true,
        title: t.cutFailed,
        message: error.message,
        tone: 'error',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="app-container">
      <header className="app-header">
        <div className="header-left">
          <h1 className="app-title">VideoCut</h1>
        </div>
        <div className="header-right">
          <ThemeToggle />
          <LocaleToggle />
        </div>
      </header>
      
      <main className="app-main">
        <LeftPane
          videoRef={videoRef}
          videoUrl={getVideoUrl(projectId)}
        />
        
        <CenterPane />
        
        <RightSidebar onExport={handleExport} />
      </main>
      
      {loading && <LoadingOverlay loading={true} progressPercent={0} progressPercentLabel="0%" progressText={t.processing} />}
      
      {exportDialog.show && (
        <ExportDialog
          dialog={{
            open: true,
            tone: exportDialog.tone,
            title: exportDialog.title,
            message: exportDialog.message,
          }}
          onConfirm={() => setExportDialog(prev => ({ ...prev, show: false }))}
          onCancel={() => setExportDialog(prev => ({ ...prev, show: false }))}
        />
      )}
    </div>
  );
}
