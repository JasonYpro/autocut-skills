import { useMemo, useRef } from 'react';
import { useEditorStore } from '../store/editorStore';
import { useLocale } from '../i18n';

export function CenterPane() {
  const { t } = useLocale();
  const containerRef = useRef<HTMLDivElement>(null);
  
  const {
    words,
    selected,
    autoSelected,
    currentWordIndex,
    toggleSelected,
    seekTo,
  } = useEditorStore();

  const sentences = useMemo(() => {
    const result: Array<{ words: typeof words; startIndex: number; isPause: boolean }> = [];
    let currentSentence: typeof words = [];
    let sentenceStartIndex = 0;

    for (let i = 0; i < words.length; i++) {
      const word = words[i];
      const isPause = !word.text.trim();
      
      if (isPause && currentSentence.length > 0) {
        result.push({ words: currentSentence, startIndex: sentenceStartIndex, isPause: false });
        currentSentence = [];
        sentenceStartIndex = i + 1;
      }
      
      if (isPause) {
        if (word.end - word.start > 0.3) {
          result.push({ words: [word], startIndex: i, isPause: true });
        }
        sentenceStartIndex = i + 1;
      } else {
        if (currentSentence.length === 0) {
          sentenceStartIndex = i;
        }
        currentSentence.push(word);
        
        if (word.text.match(/[。！？.!?]/)) {
          result.push({ words: currentSentence, startIndex: sentenceStartIndex, isPause: false });
          currentSentence = [];
          sentenceStartIndex = i + 1;
        }
      }
    }
    
    if (currentSentence.length > 0) {
      result.push({ words: currentSentence, startIndex: sentenceStartIndex, isPause: false });
    }

    return result;
  }, [words]);

  const handleWordClick = (word: typeof words[0]) => {
    seekTo(word.start);
  };

  const handleWordDoubleClick = (index: number) => {
    toggleSelected(index);
  };

  const handleDeleteAllPauses = () => {
    const newSelected = new Set(selected);
    sentences.forEach(sentence => {
      if (sentence.isPause && sentence.words[0]) {
        const idx = words.indexOf(sentence.words[0]);
        if (idx >= 0) newSelected.add(idx);
      }
    });
    useEditorStore.getState().setSelected(newSelected);
  };

  return (
    <div className="center-pane">
      <div className="center-header">
        <h2>{t.review}</h2>
        <div className="quick-actions">
          <button className="action-btn" onClick={handleDeleteAllPauses}>
            {t.silenceDetected}
          </button>
        </div>
      </div>
      
      <div className="script-container" ref={containerRef}>
        {sentences.map((sentence, sIdx) => {
          if (sentence.isPause) {
            const word = sentence.words[0];
            const idx = words.indexOf(word);
            const isSelected = selected.has(idx);
            const duration = word.end - word.start;
            
            return (
              <div
                key={`pause-${sIdx}`}
                className={`pause-block ${isSelected ? 'selected' : ''}`}
                onClick={() => handleWordClick(word)}
                onDoubleClick={() => toggleSelected(idx)}
              >
                <span className="pause-indicator">⏸</span>
                <span className="pause-duration">{duration.toFixed(1)}s</span>
                {isSelected && <span className="delete-badge">{t.confirmedDelete}</span>}
              </div>
            );
          }
          
          return (
            <div key={`sentence-${sIdx}`} className="sentence-block">
              {sentence.words.map((word, wIdx) => {
                const globalIdx = sentence.startIndex + wIdx;
                const isSelected = selected.has(globalIdx);
                const isAuto = autoSelected.has(globalIdx);
                const isCurrent = globalIdx === currentWordIndex;
                
                return (
                  <span
                    key={globalIdx}
                    className={`word ${isSelected ? 'selected' : ''} ${isAuto ? 'auto' : ''} ${isCurrent ? 'current' : ''}`}
                    onClick={() => handleWordClick(word)}
                    onDoubleClick={() => handleWordDoubleClick(globalIdx)}
                  >
                    {word.text}
                  </span>
                );
              })}
            </div>
          );
        })}
      </div>
      
      <div className="selection-stats">
        <span>{t.selected} {selected.size} {t.segments}</span>
      </div>
    </div>
  );
}
