import { useState, useEffect, useRef } from 'react';
import { PlayIcon, PauseIcon, TrashIcon, ArrowDownTrayIcon, MusicalNoteIcon } from '@heroicons/react/24/solid';
import type { LibraryAudioFile, LibraryAudioMetadata } from '../services/api';

const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

// Parse filename like "Xixi_人民幣萬歲.wav" into { character: "Xixi", text: "人民幣萬歲" }
const parseFilename = (filename: string): { character: string; text: string } => {
  // Remove extension
  const nameWithoutExt = filename.replace(/\.[^.]+$/, '');
  // Split by underscore
  const underscoreIndex = nameWithoutExt.indexOf('_');
  if (underscoreIndex > 0) {
    return {
      character: nameWithoutExt.substring(0, underscoreIndex),
      text: nameWithoutExt.substring(underscoreIndex + 1),
    };
  }
  // Fallback: use whole name as text
  return { character: '', text: nameWithoutExt };
};

// Format duration in seconds to mm:ss
const formatDuration = (seconds: number): string => {
  const mins = Math.floor(seconds / 60);
  const secs = Math.floor(seconds % 60);
  return `${mins}:${secs.toString().padStart(2, '0')}`;
};

// Format reference audio source for display
const formatRefSource = (source: string | undefined): string => {
  if (!source) return '';
  if (source.startsWith('emotion:')) {
    // e.g., "emotion:Male/Happy/happy_01.wav" -> "Male/Happy"
    const parts = source.replace('emotion:', '').split('/');
    if (parts.length >= 2) return `${parts[0]}/${parts[1]}`;
    return source.replace('emotion:', '');
  }
  if (source.startsWith('character:')) {
    // e.g., "character:Xixi/greeting.wav" -> "Xixi"
    const parts = source.replace('character:', '').split('/');
    return parts[0] || source.replace('character:', '');
  }
  if (source.startsWith('upload:')) {
    return 'Upload';
  }
  return source;
};

// Get the display name for a character - for default/zero-shot, use ref_audio_source name
const getDisplayName = (metadata: LibraryAudioMetadata | undefined, fallback: string): string => {
  if (!metadata) return fallback;

  // If it's a default/zero-shot character, show the reference audio name instead
  if (metadata.character_id === 'default' && metadata.ref_audio_source) {
    // Extract just the filename without extension from ref_audio_source
    // e.g., "emotion:Female/calm/孫小美.wav" -> "孫小美"
    // e.g., "upload:test.wav" -> "test"
    // e.g., "孫小美.wav" -> "孫小美"
    let source = metadata.ref_audio_source;

    // Remove prefix if present
    if (source.startsWith('emotion:')) {
      source = source.replace('emotion:', '');
    } else if (source.startsWith('character:')) {
      source = source.replace('character:', '');
    } else if (source.startsWith('upload:')) {
      source = source.replace('upload:', '');
    }

    // Get the last part (filename) and remove extension
    const parts = source.split('/');
    const filename = parts[parts.length - 1];
    return filename.replace(/\.[^.]+$/, '');
  }

  return metadata.character_name || fallback;
};

export default function Library() {
  const [audioFiles, setAudioFiles] = useState<LibraryAudioFile[]>([]);
  const [loading, setLoading] = useState(true);
  const [playingAudio, setPlayingAudio] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const audioRef = useRef<HTMLAudioElement>(null);

  const fetchAudioFiles = async () => {
    try {
      setLoading(true);
      const response = await fetch(`${API_BASE}/library/list`);
      if (!response.ok) throw new Error('Failed to fetch library');
      const data = await response.json();
      setAudioFiles(data.files);
      setError(null);
    } catch (err) {
      console.error('Failed to fetch library:', err);
      setError('Failed to load audio library');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAudioFiles();
  }, []);

  const handlePlay = (filename: string) => {
    if (playingAudio === filename) {
      audioRef.current?.pause();
      setPlayingAudio(null);
    } else {
      const url = `${API_BASE}/library/audio/${encodeURIComponent(filename)}`;
      if (audioRef.current) {
        audioRef.current.src = url;
        audioRef.current.play();
        setPlayingAudio(filename);
      }
    }
  };

  const handleAudioEnded = () => {
    setPlayingAudio(null);
  };

  const handleDelete = async (filename: string) => {
    if (!confirm(`Delete "${filename}"?`)) return;

    try {
      const response = await fetch(`${API_BASE}/library/audio/${encodeURIComponent(filename)}`, {
        method: 'DELETE',
      });
      if (!response.ok) throw new Error('Failed to delete');
      await fetchAudioFiles();
    } catch (err) {
      console.error('Failed to delete:', err);
      setError('Failed to delete audio file');
    }
  };

  const handleDownload = (filename: string) => {
    const url = `${API_BASE}/library/audio/${encodeURIComponent(filename)}`;
    const a = document.createElement('a');
    a.href = url;
    a.download = filename;
    a.click();
  };

  return (
    <div className="max-w-6xl mx-auto">
      {/* Header */}
      <div className="mb-6">
        <h1 className="text-2xl font-bold text-text-primary">
          音頻庫 (Audio Library)
        </h1>
        <p className="text-text-muted mt-1">
          儲存和播放生成的優質音頻 (Store and play well-generated audio)
        </p>
      </div>

      {/* Error Message */}
      {error && (
        <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm mb-6">
          {error}
        </div>
      )}

      {/* Loading */}
      {loading && (
        <div className="flex items-center justify-center py-12">
          <div className="w-8 h-8 border-2 border-primary border-t-transparent rounded-full animate-spin" />
        </div>
      )}

      {/* Empty State */}
      {!loading && audioFiles.length === 0 && (
        <div className="card text-center py-12">
          <div className="w-16 h-16 bg-surface rounded-full flex items-center justify-center mx-auto mb-4">
            <MusicalNoteIcon className="w-8 h-8 text-text-muted" />
          </div>
          <h3 className="text-lg font-medium text-text-primary mb-2">
            音頻庫是空的 (Library is empty)
          </h3>
          <p className="text-text-muted text-sm">
            將音頻檔案放入 library 資料夾以開始使用
            <br />
            (Add audio files to the library folder to get started)
          </p>
        </div>
      )}

      {/* Audio Grid - 5 items per row */}
      {!loading && audioFiles.length > 0 && (
        <div className="grid grid-cols-5 gap-3">
          {audioFiles.map((audio) => {
            const isPlaying = playingAudio === audio.filename;
            const parsed = parseFilename(audio.filename);

            return (
              <div
                key={audio.filename}
                className="card p-3 hover:border-primary/30 transition-colors flex flex-col"
              >
                {/* Play Button - Centered */}
                <div className="flex justify-center mb-2">
                  <button
                    onClick={() => handlePlay(audio.filename)}
                    className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${
                      isPlaying
                        ? 'bg-primary text-white'
                        : 'bg-surface hover:bg-primary/20 text-text-muted'
                    }`}
                  >
                    {isPlaying ? (
                      <PauseIcon className="w-4 h-4" />
                    ) : (
                      <PlayIcon className="w-4 h-4 ml-0.5" />
                    )}
                  </button>
                </div>

                {/* Info - Character name and text content from filename */}
                <div className="flex-1 min-w-0 text-center mb-2">
                  <p className="text-text-primary text-sm font-medium truncate" title={getDisplayName(audio.metadata, parsed.character || audio.filename)}>
                    {getDisplayName(audio.metadata, parsed.character || audio.filename)}
                  </p>
                  <p className="text-text-muted text-xs truncate" title={parsed.text}>
                    {parsed.text}
                  </p>
                  {/* Metadata: duration, params, and ref source */}
                  {audio.metadata && (
                    <p
                      className="text-text-muted text-xs mt-1 truncate"
                      title={`K:${audio.metadata.top_k} P:${audio.metadata.top_p} T:${audio.metadata.temperature} S:${audio.metadata.speed}${audio.metadata.ref_audio_source ? `\nRef: ${audio.metadata.ref_audio_source}` : ''}`}
                    >
                      {audio.metadata.duration ? formatDuration(audio.metadata.duration) : ''}
                      {audio.metadata.duration ? ' · ' : ''}
                      {audio.metadata.ref_audio_source ? formatRefSource(audio.metadata.ref_audio_source) : `K:${audio.metadata.top_k}`}
                    </p>
                  )}
                </div>

                {/* Actions */}
                <div className="flex items-center justify-center gap-1">
                  <button
                    onClick={() => handleDownload(audio.filename)}
                    className="p-1.5 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-primary"
                    title="下載 (Download)"
                  >
                    <ArrowDownTrayIcon className="w-4 h-4" />
                  </button>
                  <button
                    onClick={() => handleDelete(audio.filename)}
                    className="p-1.5 rounded-lg hover:bg-surface transition-colors text-text-muted hover:text-red-400"
                    title="刪除 (Delete)"
                  >
                    <TrashIcon className="w-4 h-4" />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Hidden audio element */}
      <audio
        ref={audioRef}
        onEnded={handleAudioEnded}
        className="hidden"
      />
    </div>
  );
}
