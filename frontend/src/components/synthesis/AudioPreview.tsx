import { useRef, useState, useEffect } from 'react';
import { useSynthesisStore } from '../../stores/synthesisStore';
import { useCharacterStore } from '../../stores/characterStore';
import { libraryApi } from '../../services/api';
import {
  PlayIcon,
  PauseIcon,
  ArrowDownTrayIcon,
  ArrowPathIcon,
  FolderPlusIcon,
  CheckIcon,
} from '@heroicons/react/24/solid';

export default function AudioPreview() {
  const {
    generatedAudioUrl,
    error,
    clearOutput,
    text,
    textLanguage,
    topK,
    topP,
    temperature,
    speed,
    referenceAudioSource,
  } = useSynthesisStore();
  const { selectedCharacterId, characters } = useCharacterStore();
  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

  const audioRef = useRef<HTMLAudioElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [isExporting, setIsExporting] = useState(false);
  const [isSavingToLibrary, setIsSavingToLibrary] = useState(false);
  const [savedToLibrary, setSavedToLibrary] = useState(false);

  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateDuration = () => {
      if (audio.duration && isFinite(audio.duration) && audio.duration > 0) {
        setDuration(audio.duration);
      }
    };

    const handleTimeUpdate = () => setCurrentTime(audio.currentTime);
    const handleEnded = () => setIsPlaying(false);

    audio.addEventListener('timeupdate', handleTimeUpdate);
    audio.addEventListener('ended', handleEnded);
    audio.addEventListener('loadedmetadata', updateDuration);
    audio.addEventListener('durationchange', updateDuration);
    audio.addEventListener('canplaythrough', updateDuration);
    audio.addEventListener('loadeddata', updateDuration);

    // Reset state when URL changes
    setCurrentTime(0);
    setDuration(0);
    setIsPlaying(false);
    setSavedToLibrary(false);

    // Force load the audio to get duration
    audio.load();

    return () => {
      audio.removeEventListener('timeupdate', handleTimeUpdate);
      audio.removeEventListener('ended', handleEnded);
      audio.removeEventListener('loadedmetadata', updateDuration);
      audio.removeEventListener('durationchange', updateDuration);
      audio.removeEventListener('canplaythrough', updateDuration);
      audio.removeEventListener('loadeddata', updateDuration);
    };
  }, [generatedAudioUrl]);

  const togglePlay = async () => {
    const audio = audioRef.current;
    if (!audio) return;

    if (isPlaying) {
      audio.pause();
      setIsPlaying(false);
    } else {
      try {
        await audio.play();
        setIsPlaying(true);
      } catch (err) {
        // Audio source not available yet (mock data)
        console.warn('Audio playback not available:', err);
      }
    }
  };

  const formatTime = (seconds: number) => {
    const mins = Math.floor(seconds / 60);
    const secs = Math.floor(seconds % 60);
    return `${mins}:${secs.toString().padStart(2, '0')}`;
  };

  const handleExport = async () => {
    if (!generatedAudioUrl) return;

    setIsExporting(true);
    try {
      // Fetch the audio file
      const response = await fetch(generatedAudioUrl);
      const blob = await response.blob();

      // Generate filename with character name, text preview, and timestamp
      const characterName = selectedCharacter?.name || 'audio';
      const textPreview = text.slice(0, 30).replace(/[^a-zA-Z0-9]/g, '_') || 'generated';
      const timestamp = new Date().toISOString().slice(0, 19).replace(/[:-]/g, '');
      const filename = `${characterName}_${textPreview}_${timestamp}.wav`;

      // Create download link
      const url = URL.createObjectURL(blob);
      const link = document.createElement('a');
      link.href = url;
      link.download = filename;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      URL.revokeObjectURL(url);
    } catch (err) {
      console.error('Export failed:', err);
    } finally {
      setIsExporting(false);
    }
  };

  const handleSaveToLibrary = async () => {
    if (!generatedAudioUrl || savedToLibrary) return;

    console.log('[AudioPreview] handleSaveToLibrary - referenceAudioSource:', referenceAudioSource);

    setIsSavingToLibrary(true);
    try {
      // Generate filename: CharacterName_TextContent.wav
      const characterName = selectedCharacter?.name || 'Unknown';
      // Keep Chinese/Japanese/Korean characters, remove only problematic filesystem characters
      const textContent = text.slice(0, 50).replace(/[<>:"/\\|?*]/g, '').trim() || 'generated';
      const filename = `${characterName}_${textContent}.wav`;

      console.log('[AudioPreview] Saving to library with ref_audio_source:', referenceAudioSource);

      await libraryApi.save({
        audio_url: generatedAudioUrl,
        filename,
        top_k: topK,
        top_p: topP,
        temperature,
        speed,
        duration: duration || undefined,
        character_id: selectedCharacterId || undefined,
        character_name: characterName,
        text,
        text_language: textLanguage,
        ref_audio_source: referenceAudioSource || undefined,
      });

      setSavedToLibrary(true);
    } catch (err) {
      console.error('Save to library failed:', err);
      // Could show error toast here
    } finally {
      setIsSavingToLibrary(false);
    }
  };

  const progress = duration ? (currentTime / duration) * 100 : 0;

  if (error) {
    return (
      <div className="card border-accent">
        <div className="flex items-center gap-4">
          <div className="flex-1">
            <p className="text-accent font-medium">生成失敗 (Generation Failed)</p>
            <p className="text-text-muted text-sm mt-1">{error}</p>
          </div>
          <button onClick={clearOutput} className="btn-ghost">
            <ArrowPathIcon className="w-5 h-5" />
          </button>
        </div>
      </div>
    );
  }

  if (!generatedAudioUrl) {
    return (
      <div className="card border-dashed border-2">
        <div className="text-center py-8">
          <div className="w-16 h-16 mx-auto mb-4 rounded-full bg-surface flex items-center justify-center">
            <PlayIcon className="w-8 h-8 text-text-muted" />
          </div>
          <p className="text-text-muted">生成的音頻將顯示在此 (Generated audio will appear here)</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card">
      <div className="flex items-center gap-4">
        {/* Play/Pause Button */}
        <button
          onClick={togglePlay}
          className="w-14 h-14 rounded-full bg-primary flex items-center justify-center
                     shadow-glow-primary hover:bg-primary-hover transition-all"
        >
          {isPlaying ? (
            <PauseIcon className="w-6 h-6 text-white" />
          ) : (
            <PlayIcon className="w-6 h-6 text-white ml-1" />
          )}
        </button>

        {/* Waveform / Progress */}
        <div className="flex-1">
          {/* Simulated waveform bars */}
          <div className="flex items-end gap-1 h-12 mb-2">
            {Array.from({ length: 40 }).map((_, i) => {
              const barProgress = (i / 40) * 100;
              const isActive = barProgress <= progress;
              const height = 20 + Math.sin(i * 0.5) * 15 + Math.random() * 10;
              return (
                <div
                  key={i}
                  className={`flex-1 rounded-full transition-colors duration-150 ${
                    isActive ? 'bg-secondary' : 'bg-border'
                  }`}
                  style={{ height: `${height}%` }}
                />
              );
            })}
          </div>

          {/* Time display */}
          <div className="flex justify-between text-sm text-text-muted">
            <span>{formatTime(currentTime)}</span>
            <span>{formatTime(duration || 0)}</span>
          </div>
        </div>

        {/* Action Buttons */}
        <div className="flex items-center gap-2">
          {/* Save to Library Button */}
          <button
            onClick={handleSaveToLibrary}
            disabled={isSavingToLibrary || savedToLibrary}
            className={`py-3 px-4 flex items-center gap-2 rounded-lg transition-colors ${
              savedToLibrary
                ? 'bg-green-500/20 text-green-400 cursor-default'
                : 'btn-secondary disabled:opacity-50'
            }`}
            title={savedToLibrary ? '已加入音頻庫' : '加入音頻庫'}
          >
            {savedToLibrary ? (
              <CheckIcon className="w-5 h-5" />
            ) : isSavingToLibrary ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <FolderPlusIcon className="w-5 h-5" />
            )}
            {savedToLibrary ? '已加入 (Saved)' : isSavingToLibrary ? '加入中...' : '加入音頻庫 (Save)'}
          </button>

          {/* Download Button */}
          <button
            onClick={handleExport}
            disabled={isExporting}
            className="btn-secondary py-3 px-4 flex items-center gap-2 disabled:opacity-50"
          >
            {isExporting ? (
              <ArrowPathIcon className="w-5 h-5 animate-spin" />
            ) : (
              <ArrowDownTrayIcon className="w-5 h-5" />
            )}
            {isExporting ? '儲存中...' : '匯出 (Export)'}
          </button>
        </div>
      </div>

      {/* Hidden audio element */}
      <audio ref={audioRef} src={generatedAudioUrl} />
    </div>
  );
}
