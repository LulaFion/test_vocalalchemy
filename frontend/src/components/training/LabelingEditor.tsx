import { useState, useRef } from 'react';
import {
  PlayIcon,
  PauseIcon,
  TrashIcon,
  CheckIcon,
} from '@heroicons/react/24/solid';
import type { AudioSegment } from '../../services/api';
import { trainingApi } from '../../services/api';

interface LabelingEditorProps {
  projectId: string;
  segments: AudioSegment[];
  onSegmentsChange: (segments: AudioSegment[]) => void;
  onSaveAll: () => void;
  onStartTraining: () => void;
}

const LANGUAGES = [
  { code: 'zh', label: 'ZH' },
  { code: 'en', label: 'EN' },
  { code: 'ja', label: 'JA' },
  { code: 'ko', label: 'KO' },
  { code: 'yue', label: 'YUE' },
];

export default function LabelingEditor({
  projectId,
  segments,
  onSegmentsChange,
  onSaveAll,
  onStartTraining,
}: LabelingEditorProps) {
  const [playingId, setPlayingId] = useState<string | null>(null);
  const [editedSegments, setEditedSegments] = useState<Map<string, { text?: string; language?: string }>>(new Map());
  const audioRef = useRef<HTMLAudioElement>(null);

  const handlePlay = (segment: AudioSegment) => {
    if (audioRef.current) {
      if (playingId === segment.id) {
        audioRef.current.pause();
        setPlayingId(null);
      } else {
        const audioUrl = trainingApi.getSegmentAudioUrl(projectId, segment.filepath || segment.filename);
        audioRef.current.src = audioUrl;
        audioRef.current.play();
        setPlayingId(segment.id);
      }
    }
  };

  const handleAudioEnded = () => {
    setPlayingId(null);
  };

  const handleTextChange = (segmentId: string, text: string) => {
    setEditedSegments(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(segmentId) || {};
      newMap.set(segmentId, { ...existing, text });
      return newMap;
    });

    const updatedSegments = segments.map(s =>
      s.id === segmentId ? { ...s, text } : s
    );
    onSegmentsChange(updatedSegments);
  };

  const handleLanguageChange = (segmentId: string, language: string) => {
    setEditedSegments(prev => {
      const newMap = new Map(prev);
      const existing = newMap.get(segmentId) || {};
      newMap.set(segmentId, { ...existing, language });
      return newMap;
    });

    const updatedSegments = segments.map(s =>
      s.id === segmentId ? { ...s, language } : s
    );
    onSegmentsChange(updatedSegments);
  };

  const handleDelete = async (segmentId: string) => {
    try {
      await trainingApi.deleteSegment(projectId, segmentId);
      const updatedSegments = segments.filter(s => s.id !== segmentId);
      onSegmentsChange(updatedSegments);
    } catch (error) {
      console.error('Failed to delete segment:', error);
    }
  };

  const getDisplayText = (segment: AudioSegment) => {
    return editedSegments.get(segment.id)?.text ?? segment.text;
  };

  const getDisplayLanguage = (segment: AudioSegment) => {
    return editedSegments.get(segment.id)?.language ?? segment.language;
  };

  const hasChanges = editedSegments.size > 0;
  const emptySegments = segments.filter(s => !getDisplayText(s).trim()).length;

  return (
    <div className="space-y-4">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div>
          <h3 className="text-lg font-semibold text-text-primary">
            音頻標注 (Audio Labeling)
          </h3>
          <p className="text-text-muted text-sm">
            {segments.length} 片段 (segments){emptySegments > 0 ? (
              <> • <span className="text-accent">{emptySegments} 空白 (empty)</span></>
            ) : (
              <> • <span className="text-green-500">全部已標注 (All labeled)</span></>
            )}
          </p>
        </div>
        <div className="flex gap-3">
          {hasChanges && (
            <button
              onClick={onSaveAll}
              className="btn-secondary flex items-center gap-2"
            >
              <CheckIcon className="w-4 h-4" />
              儲存 (Save)
            </button>
          )}
          <button
            onClick={onStartTraining}
            disabled={emptySegments > 0}
            className="btn-primary flex items-center gap-2"
          >
            {emptySegments === 0 ? '開始訓練 (Start Training)' : '請先填寫空白 (Fill Empty First)'}
          </button>
        </div>
      </div>

      {emptySegments > 0 && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-sm text-accent">
          請在開始訓練前填寫所有空白轉錄。(Please fill in all empty transcriptions before starting training.)
        </div>
      )}

      {/* Segments List - GPT-SoVITS style */}
      <div className="space-y-1 max-h-[60vh] overflow-y-auto">
        {segments.map((segment) => (
          <div
            key={segment.id}
            className={`bg-surface rounded-lg p-2 ${
              !getDisplayText(segment).trim() ? 'border border-accent/50' : 'border border-transparent'
            }`}
          >
            {/* Row 1: Audio path and controls */}
            <div className="flex items-center gap-2 mb-1">
              {/* Play Button */}
              <button
                onClick={() => handlePlay(segment)}
                className={`w-8 h-8 rounded flex items-center justify-center flex-shrink-0 transition-all ${
                  playingId === segment.id
                    ? 'bg-secondary text-canvas'
                    : 'bg-canvas hover:bg-primary/20 text-text-secondary'
                }`}
              >
                {playingId === segment.id ? (
                  <PauseIcon className="w-4 h-4" />
                ) : (
                  <PlayIcon className="w-4 h-4 ml-0.5" />
                )}
              </button>

              {/* Audio Path */}
              <div className="flex-1 min-w-0">
                <p className="text-xs text-text-muted font-mono truncate" title={segment.filepath}>
                  {segment.filepath || segment.filename}
                </p>
              </div>

              {/* Delete Button */}
              <button
                onClick={() => handleDelete(segment.id)}
                className="p-1 text-text-muted hover:text-accent transition-colors"
              >
                <TrashIcon className="w-4 h-4" />
              </button>
            </div>

            {/* Row 2: Language selector and Text input */}
            <div className="flex items-center gap-2">
              {/* Language Selector */}
              <select
                value={getDisplayLanguage(segment).toLowerCase()}
                onChange={(e) => handleLanguageChange(segment.id, e.target.value)}
                className="bg-canvas border border-border rounded px-2 py-1 text-xs text-text-primary w-16"
              >
                {LANGUAGES.map(lang => (
                  <option key={lang.code} value={lang.code}>{lang.label}</option>
                ))}
              </select>

              {/* Text Input */}
              <input
                type="text"
                value={getDisplayText(segment)}
                onChange={(e) => handleTextChange(segment.id, e.target.value)}
                placeholder="輸入轉錄... (Enter transcription...)"
                className="input flex-1 text-sm py-1"
              />
            </div>
          </div>
        ))}
      </div>

      {/* Hidden Audio Element */}
      <audio ref={audioRef} onEnded={handleAudioEnded} />
    </div>
  );
}
