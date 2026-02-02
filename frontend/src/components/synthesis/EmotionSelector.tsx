import { useRef, useState, useEffect } from 'react';
import { useSynthesisStore } from '../../stores/synthesisStore';
import { useCharacterStore } from '../../stores/characterStore';
import { MusicalNoteIcon, ArrowUpTrayIcon, XMarkIcon, PlayIcon, PauseIcon, DocumentTextIcon } from '@heroicons/react/24/solid';
import { emotionAudioApi, characterAudioApi, type GenderCategory, type EmotionSample } from '../../services/api';

// Language labels for reference audio categories
const languageLabels: Record<string, { label: string; icon: string }> = {
  zh: { label: '中文 (Chinese)', icon: '🇨🇳' },
  en: { label: '英語 (English)', icon: '🇺🇸' },
  ja: { label: '日語 (Japanese)', icon: '🇯🇵' },
  ko: { label: '韓語 (Korean)', icon: '🇰🇷' },
  yue: { label: '粵語 (Cantonese)', icon: '🇭🇰' },
};

// Emotion labels for categorizing samples within each language
const emotionLabels: Record<string, { label: string; icon: string }> = {
  calm: { label: '平靜 (Calm)', icon: '😌' },
  happy: { label: '開心 (Happy)', icon: '😊' },
  excited: { label: '興奮 (Excited)', icon: '🎉' },
  dramatic: { label: '戲劇 (Dramatic)', icon: '🎭' },
  mysterious: { label: '神秘 (Mysterious)', icon: '🌙' },
  sad: { label: '悲傷 (Sad)', icon: '😢' },
  angry: { label: '憤怒 (Angry)', icon: '😠' },
  neutral: { label: '中性 (Neutral)', icon: '😐' },
};

// Helper function to group samples by emotion
const groupSamplesByEmotion = (samples: EmotionSample[]): Record<string, EmotionSample[]> => {
  return samples.reduce((acc, sample) => {
    const emotion = sample.emotion || 'other';
    if (!acc[emotion]) {
      acc[emotion] = [];
    }
    acc[emotion].push(sample);
    return acc;
  }, {} as Record<string, EmotionSample[]>);
};

const genderLabels: Record<string, string> = {
  Male: '男聲 (Male)',
  Female: '女聲 (Female)',
};

export default function EmotionSelector() {
  const {
    referenceAudio,
    referenceText,
    setReferenceAudio,
    setReferenceText,
    referenceLanguage,
    setReferenceLanguage,
  } = useSynthesisStore();

  const { selectedCharacterId, characters } = useCharacterStore();
  const selectedCharacter = characters.find(c => c.id === selectedCharacterId);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const audioRef = useRef<HTMLAudioElement>(null);
  const emotionAudioRef = useRef<HTMLAudioElement>(null);
  const referenceAudioSectionRef = useRef<HTMLDivElement>(null);
  const [isPlaying, setIsPlaying] = useState(false);
  const [audioPreviewUrl, setAudioPreviewUrl] = useState<string | null>(null);
  const [audioDuration, setAudioDuration] = useState<number | null>(null);
  const [isValidating, setIsValidating] = useState(false);
  const [validationError, setValidationError] = useState<string | null>(null);

  // Emotion audio templates state (for Default/Zero-shot)
  const [emotionAudioData, setEmotionAudioData] = useState<GenderCategory[]>([]);
  const [selectedGender, setSelectedGender] = useState<string>('Female');
  const [playingEmotionAudio, setPlayingEmotionAudio] = useState<string | null>(null);

  // Character-specific audio state (for fine-tuned characters)
  const [characterAudioSamples, setCharacterAudioSamples] = useState<EmotionSample[]>([]);
  const [playingCharacterAudio, setPlayingCharacterAudio] = useState<string | null>(null);
  const characterAudioRef = useRef<HTMLAudioElement>(null);

  // Fetch emotion audio templates (for Default/Zero-shot)
  useEffect(() => {
    const fetchEmotionAudio = async () => {
      try {
        const data = await emotionAudioApi.list();
        setEmotionAudioData(data.genders);
        if (data.genders.length > 0) {
          setSelectedGender(data.genders[0].name);
        }
      } catch (err) {
        console.error('Failed to fetch emotion audio:', err);
      }
    };
    fetchEmotionAudio();
  }, []);

  // Fetch character-specific audio (for fine-tuned characters)
  useEffect(() => {
    if (!isDefaultCharacter && selectedCharacter?.name) {
      const fetchCharacterAudio = async () => {
        try {
          const data = await characterAudioApi.list(selectedCharacter.name);
          setCharacterAudioSamples(data.samples);
        } catch (err) {
          console.error('Failed to fetch character audio:', err);
          setCharacterAudioSamples([]);
        }
      };
      fetchCharacterAudio();
    } else {
      setCharacterAudioSamples([]);
    }
  }, [selectedCharacterId, selectedCharacter?.name]);

  const handlePlayEmotionAudio = (gender: string, language: string, emotion: string, filename: string) => {
    const audioKey = `${gender}/${language}/${emotion}/${filename}`;

    if (playingEmotionAudio === audioKey) {
      // Stop playing
      emotionAudioRef.current?.pause();
      setPlayingEmotionAudio(null);
    } else {
      // Play new audio
      const url = emotionAudioApi.getAudioUrl(gender, language, emotion, filename);
      if (emotionAudioRef.current) {
        emotionAudioRef.current.src = url;
        emotionAudioRef.current.play();
        setPlayingEmotionAudio(audioKey);
      }
    }
  };

  const handleEmotionAudioEnded = () => {
    setPlayingEmotionAudio(null);
  };

  // Character-specific audio handlers
  const handlePlayCharacterAudio = (filename: string) => {
    if (playingCharacterAudio === filename) {
      characterAudioRef.current?.pause();
      setPlayingCharacterAudio(null);
    } else {
      const url = characterAudioApi.getAudioUrl(selectedCharacter!.name, filename);
      if (characterAudioRef.current) {
        characterAudioRef.current.src = url;
        characterAudioRef.current.play();
        setPlayingCharacterAudio(filename);
      }
    }
  };

  const handleCharacterAudioEnded = () => {
    setPlayingCharacterAudio(null);
  };

  const handleUseCharacterAudio = async (filename: string) => {
    if (!selectedCharacter) return;
    try {
      const url = characterAudioApi.getAudioUrl(selectedCharacter.name, filename);
      console.log('[EmotionSelector] Fetching character audio:', url);
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('[EmotionSelector] Got blob:', blob.type, blob.size);

      // Determine proper MIME type
      let mimeType = blob.type;
      if (!mimeType || mimeType === 'application/octet-stream') {
        if (filename.endsWith('.wav')) mimeType = 'audio/wav';
        else if (filename.endsWith('.mp3')) mimeType = 'audio/mpeg';
        else if (filename.endsWith('.flac')) mimeType = 'audio/flac';
      }

      const file = new File([blob], filename, { type: mimeType });
      // Set source as character audio
      const source = `character:${selectedCharacter.name}/${filename}`;
      setReferenceAudio(file, source);

      const previewUrl = URL.createObjectURL(file);
      setAudioPreviewUrl(previewUrl);

      // Get duration
      const duration = await validateAudioDuration(file);
      setAudioDuration(duration);

      console.log('[EmotionSelector] Set reference audio:', filename, 'duration:', duration, 'source:', source);

      // Scroll to reference audio section
      referenceAudioSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('Failed to use character audio:', err);
      setValidationError(`Failed to load audio: ${err}`);
    }
  };

  const handleUseEmotionAudio = async (gender: string, language: string, emotion: string, filename: string, text?: string) => {
    try {
      const url = emotionAudioApi.getAudioUrl(gender, language, emotion, filename);
      console.log('[EmotionSelector] Fetching emotion audio:', url);
      const response = await fetch(url, {
        method: 'GET',
        mode: 'cors',
      });

      if (!response.ok) {
        throw new Error(`HTTP ${response.status}: ${response.statusText}`);
      }

      const blob = await response.blob();
      console.log('[EmotionSelector] Got blob:', blob.type, blob.size);

      // Determine proper MIME type
      let mimeType = blob.type;
      if (!mimeType || mimeType === 'application/octet-stream') {
        if (filename.endsWith('.wav')) mimeType = 'audio/wav';
        else if (filename.endsWith('.mp3')) mimeType = 'audio/mpeg';
        else if (filename.endsWith('.flac')) mimeType = 'audio/flac';
      }

      const file = new File([blob], filename, { type: mimeType });
      // Set source as emotion template (include full path)
      const source = `emotion:${gender}/${language}/${emotion}/${filename}`;
      setReferenceAudio(file, source);

      const previewUrl = URL.createObjectURL(file);
      setAudioPreviewUrl(previewUrl);

      // Get duration
      const duration = await validateAudioDuration(file);
      setAudioDuration(duration);

      // Auto-fill reference text if available from .txt file
      if (text) {
        setReferenceText(text);
        // Also set reference language based on the language folder
        if (language === 'zh') setReferenceLanguage('zh');
        else if (language === 'en') setReferenceLanguage('en');
        else if (language === 'ja') setReferenceLanguage('ja');
        else if (language === 'ko') setReferenceLanguage('ko');
        else if (language === 'yue') setReferenceLanguage('yue');
      }

      console.log('[EmotionSelector] Set reference audio:', filename, 'duration:', duration, 'source:', source, 'text:', text);

      // Scroll to reference audio section
      referenceAudioSectionRef.current?.scrollIntoView({ behavior: 'smooth', block: 'start' });
    } catch (err) {
      console.error('Failed to use emotion audio:', err);
      setValidationError(`Failed to load audio: ${err}`);
    }
  };

  const validateAudioDuration = (file: File): Promise<number> => {
    return new Promise((resolve, reject) => {
      const audio = new Audio();
      const url = URL.createObjectURL(file);

      audio.onloadedmetadata = () => {
        URL.revokeObjectURL(url);
        resolve(audio.duration);
      };

      audio.onerror = () => {
        URL.revokeObjectURL(url);
        reject(new Error('Could not load audio file'));
      };

      audio.src = url;
    });
  };

  const handleFileSelect = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Reset validation state
    setValidationError(null);
    setIsValidating(true);

    // Validate file type
    if (!file.type.startsWith('audio/')) {
      setValidationError('Please select an audio file');
      setIsValidating(false);
      return;
    }

    // Validate file size (max 10MB)
    if (file.size > 10 * 1024 * 1024) {
      setValidationError('Audio file must be less than 10MB');
      setIsValidating(false);
      return;
    }

    // Validate audio duration (GPT-SoVITS requires 3-10 seconds)
    try {
      const duration = await validateAudioDuration(file);
      setAudioDuration(duration);

      if (duration < 3) {
        setValidationError(`Audio is too short (${duration.toFixed(1)}s). GPT-SoVITS requires 3-10 seconds.`);
        setIsValidating(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      if (duration > 10) {
        setValidationError(`Audio is too long (${duration.toFixed(1)}s). GPT-SoVITS requires 3-10 seconds.`);
        setIsValidating(false);
        if (fileInputRef.current) {
          fileInputRef.current.value = '';
        }
        return;
      }

      // All validations passed - set source as user upload
      const source = `upload:${file.name}`;
      setReferenceAudio(file, source);
      const url = URL.createObjectURL(file);
      setAudioPreviewUrl(url);
    } catch (err) {
      setValidationError('Could not read audio file. Please try a different format.');
    } finally {
      setIsValidating(false);
    }
  };

  const handleRemoveAudio = () => {
    setReferenceAudio(null);
    if (audioPreviewUrl) {
      URL.revokeObjectURL(audioPreviewUrl);
      setAudioPreviewUrl(null);
    }
    if (fileInputRef.current) {
      fileInputRef.current.value = '';
    }
    setIsPlaying(false);
    setAudioDuration(null);
    setValidationError(null);
  };

  const togglePlayback = () => {
    if (audioRef.current) {
      if (isPlaying) {
        audioRef.current.pause();
      } else {
        audioRef.current.play();
      }
      setIsPlaying(!isPlaying);
    }
  };

  const handleAudioEnded = () => {
    setIsPlaying(false);
  };

  // Check if this is the Default (Zero-shot) character
  const isDefaultCharacter = selectedCharacterId === 'default';

  // Check if character has a default reference audio configured
  const hasCharacterReference = selectedCharacter?.modelPaths?.referenceAudio;

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        情感與風格 (Emotion & Style)
      </h3>

      {/* Reference Audio Section */}
      <h4 ref={referenceAudioSectionRef} className="text-md font-semibold text-text-primary mb-4">
        參考音頻 (Reference Audio)
        <span className="text-text-muted font-normal text-sm ml-2">
          {hasCharacterReference ? '(可選 - 覆蓋風格)' : '(必需)'}
        </span>
      </h4>

      <div className="space-y-4">
        {/* Info for fine-tuned characters WITH default reference - truly optional */}
        {!isDefaultCharacter && hasCharacterReference && !referenceAudio && (
          <div className="bg-surface rounded-lg p-3 text-text-muted text-sm">
            <p>
              此角色已有預設參考音頻。僅在需要調整說話風格或情感時上傳其他音頻。
              (This character has a default reference audio. Upload a different one only if you want to adjust the speaking style or emotion.)
            </p>
          </div>
        )}

        {/* Warning for fine-tuned characters WITHOUT default reference - required */}
        {!isDefaultCharacter && !hasCharacterReference && !referenceAudio && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-400 text-sm flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium">需要參考音頻 (Reference audio required)</p>
              <p className="text-text-muted mt-1">
                GPT-SoVITS 需要參考音頻 (3-10秒) 來引導語音風格，即使是已訓練的聲音也需要。
                (GPT-SoVITS needs a reference audio (3-10s) to guide speech style, even for trained voices.)
              </p>
            </div>
          </div>
        )}

        {/* Warning when using Default character without reference audio */}
        {isDefaultCharacter && !referenceAudio && (
          <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-3 text-amber-400 text-sm flex items-start gap-2">
            <svg className="w-5 h-5 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
            </svg>
            <div>
              <p className="font-medium">零樣本需要參考音頻 (Reference audio required for zero-shot)</p>
              <p className="text-text-muted mt-1">
                上傳 3-10 秒的音頻片段來克隆您想要的聲音。
                (Upload a 3-10 second audio clip of the voice you want to clone.)
              </p>
            </div>
          </div>
        )}

        {/* Validation Error */}
        {validationError && (
          <div className="bg-red-500/10 border border-red-500/30 rounded-lg p-3 text-red-400 text-sm">
            {validationError}
          </div>
        )}

        {!referenceAudio ? (
          <div
            onClick={() => !isValidating && fileInputRef.current?.click()}
            className={`border-2 border-dashed rounded-lg p-6 text-center transition-all duration-200
                       ${isValidating
                         ? 'border-primary/50 bg-primary/5 cursor-wait'
                         : 'border-border cursor-pointer hover:border-primary/50 hover:bg-primary/5'}`}
          >
            {isValidating ? (
              <>
                <div className="w-10 h-10 border-2 border-primary border-t-transparent rounded-full animate-spin mx-auto mb-3" />
                <p className="text-text-primary font-medium">驗證音頻中... (Validating audio...)</p>
              </>
            ) : (
              <>
                <ArrowUpTrayIcon className="w-10 h-10 text-text-muted mx-auto mb-3" />
                <p className="text-text-primary font-medium">
                  {isDefaultCharacter
                    ? '上傳要克隆的聲音 (Upload Voice to Clone)'
                    : hasCharacterReference
                      ? '上傳風格參考 (可選) (Upload Style Reference)'
                      : '上傳參考音頻 (Upload Reference Audio)'}
                </p>
                <p className="text-text-muted text-sm mt-1">
                  3-10 秒清晰語音 (WAV, MP3, FLAC)
                </p>
              </>
            )}
          </div>
        ) : (
          <div className="bg-surface rounded-lg p-4">
            <div className="flex items-center gap-4">
              {/* Play/Pause Button */}
              <button
                onClick={togglePlayback}
                className="w-12 h-12 rounded-full bg-primary flex items-center justify-center
                           hover:bg-primary/80 transition-colors"
              >
                {isPlaying ? (
                  <PauseIcon className="w-6 h-6 text-white" />
                ) : (
                  <PlayIcon className="w-6 h-6 text-white ml-0.5" />
                )}
              </button>

              {/* File Info */}
              <div className="flex-1 min-w-0">
                <p className="text-text-primary font-medium truncate">
                  {referenceAudio.name}
                </p>
                <p className="text-text-muted text-sm">
                  {audioDuration ? `${audioDuration.toFixed(1)}s` : ''} • {(referenceAudio.size / 1024).toFixed(1)} KB
                </p>
              </div>

              {/* Remove Button */}
              <button
                onClick={handleRemoveAudio}
                className="p-2 rounded-lg hover:bg-canvas transition-colors"
                title="Remove audio"
              >
                <XMarkIcon className="w-5 h-5 text-text-muted" />
              </button>
            </div>

            {/* Hidden audio element for playback */}
            {audioPreviewUrl && (
              <audio
                ref={audioRef}
                src={audioPreviewUrl}
                onEnded={handleAudioEnded}
                className="hidden"
              />
            )}
          </div>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="audio/*"
          onChange={handleFileSelect}
          className="hidden"
        />

        {/* Reference Text Input */}
        <div>
          <label className="label">參考文本 (音頻中說的內容) (Reference Text)</label>
          <textarea
            value={referenceText}
            onChange={(e) => setReferenceText(e.target.value)}
            placeholder="輸入參考音頻的文字稿... (Enter the transcript of the reference audio...)"
            rows={2}
            className="input resize-none"
          />
        </div>

        {/* Reference Language */}
        <div>
          <label className="label">參考語言 (Reference Language)</label>
          <select
            value={referenceLanguage}
            onChange={(e) => setReferenceLanguage(e.target.value as 'en' | 'zh' | 'ja' | 'ko' | 'yue')}
            className="input"
          >
            <option value="en">英語 (English)</option>
            <option value="zh">中文 (Chinese Mandarin)</option>
            <option value="ja">日語 (Japanese)</option>
            <option value="ko">韓語 (Korean)</option>
            <option value="yue">粵語 (Cantonese)</option>
          </select>
        </div>

        {/* Tips */}
        <div className="text-text-muted text-sm bg-canvas rounded-lg p-3">
          <p className="font-medium text-text-secondary mb-1 flex items-center gap-2">
            <MusicalNoteIcon className="w-4 h-4" />
            最佳效果提示 (Tips for best results):
          </p>
          <ul className="list-disc list-inside space-y-1 ml-1">
            <li>使用 3-10 秒清晰的單人語音 (Use 3-10 seconds of clear, single-speaker audio)</li>
            <li>避免背景音樂或噪音 (Avoid background music or noise)</li>
            <li>參考音頻的情感和速度會影響輸出 (The emotion and speed of reference audio affects output)</li>
            <li>提供準確的文字稿以獲得更好的品質 (Provide accurate transcript for better quality)</li>
          </ul>
        </div>
      </div>

      {/* Reference Audio Templates - Only show for Default (Zero-shot) character */}
      {isDefaultCharacter && (
        <>
          {/* Divider */}
          <div className="border-t border-border my-6"></div>

          <div>
            <h4 className="text-md font-semibold text-text-primary mb-2">
              參考音頻模板 (Reference Audio Templates)
            </h4>
            <p className="text-text-muted text-sm mb-4">
              試聽不同語言的參考音頻，點擊「Use」將其作為參考。
              (Listen to reference audio samples by language. Click "Use" to set as reference.)
            </p>

            {/* Gender Toggle */}
            {emotionAudioData.length > 0 && (
              <div className="flex gap-2 mb-4">
                {emotionAudioData.map((gender) => (
                  <button
                    key={gender.name}
                    onClick={() => setSelectedGender(gender.name)}
                    className={`px-4 py-2 rounded-lg text-sm font-medium transition-colors
                      ${selectedGender === gender.name
                        ? 'bg-primary text-white'
                        : 'bg-surface text-text-muted hover:bg-surface/80'
                      }`}
                  >
                    {genderLabels[gender.name] || gender.name}
                  </button>
                ))}
              </div>
            )}

            {/* Language Categories */}
            <div className="space-y-4">
              {emotionAudioData
                .find((g) => g.name === selectedGender)
                ?.emotions.map((category) => {
                  // Group samples by emotion
                  const groupedSamples = groupSamplesByEmotion(category.samples);
                  const emotionKeys = Object.keys(groupedSamples).sort();

                  return (
                    <div key={category.name} className="bg-surface rounded-lg p-3">
                      {/* Language Header */}
                      <div className="flex items-center gap-2 mb-3">
                        <span className="text-lg">{languageLabels[category.name]?.icon || '🎵'}</span>
                        <span className="font-medium text-text-primary">
                          {languageLabels[category.name]?.label || category.name}
                        </span>
                      </div>

                      {/* Emotion Groups */}
                      <div className="space-y-3">
                        {emotionKeys.map((emotionKey) => (
                          <div key={emotionKey}>
                            {/* Emotion Sub-header */}
                            <div className="flex items-center gap-1.5 mb-1.5">
                              <span className="text-sm">{emotionLabels[emotionKey]?.icon || '🎵'}</span>
                              <span className="text-xs font-medium text-text-secondary">
                                {emotionLabels[emotionKey]?.label || emotionKey}
                              </span>
                            </div>

                            {/* Samples in this emotion */}
                            <div className="flex flex-wrap gap-2">
                              {groupedSamples[emotionKey].map((sample) => {
                                // audioKey includes: gender/language/emotion/filename
                                const audioKey = `${selectedGender}/${category.name}/${sample.emotion}/${sample.filename}`;
                                const isCurrentPlaying = playingEmotionAudio === audioKey;

                                return (
                                  <div
                                    key={`${sample.emotion}-${sample.filename}`}
                                    className="flex items-center gap-1 bg-canvas rounded-lg px-2 py-1"
                                  >
                                    <button
                                      onClick={() => handlePlayEmotionAudio(selectedGender, category.name, sample.emotion || '', sample.filename)}
                                      className={`p-1.5 rounded-full transition-colors ${
                                        isCurrentPlaying
                                          ? 'bg-primary text-white'
                                          : 'bg-surface hover:bg-primary/20 text-text-muted'
                                      }`}
                                      title={isCurrentPlaying ? '停止 (Stop)' : '試聽 (Play)'}
                                    >
                                      {isCurrentPlaying ? (
                                        <PauseIcon className="w-3 h-3" />
                                      ) : (
                                        <PlayIcon className="w-3 h-3" />
                                      )}
                                    </button>
                                    <span className="text-xs text-text-muted max-w-[80px] truncate" title={sample.name || sample.filename}>
                                      {sample.name || sample.filename}
                                    </span>
                                    {sample.text && (
                                      <DocumentTextIcon
                                        className="w-3 h-3 text-green-500"
                                        title={`文本: ${sample.text}`}
                                      />
                                    )}
                                    <button
                                      onClick={() => handleUseEmotionAudio(selectedGender, category.name, sample.emotion || '', sample.filename, sample.text)}
                                      className="text-xs text-primary hover:text-primary/80 font-medium px-1"
                                      title={sample.text ? `文本: ${sample.text}` : '無文本 (No text)'}
                                    >
                                      Use
                                    </button>
                                  </div>
                                );
                              })}
                            </div>
                          </div>
                        ))}
                      </div>
                    </div>
                  );
                })}
            </div>

            {emotionAudioData.length === 0 && (
              <div className="text-text-muted text-sm text-center py-4">
                沒有可用的參考音頻模板 (No reference audio templates available)
              </div>
            )}

            {/* Hidden audio element for emotion audio playback */}
            <audio
              ref={emotionAudioRef}
              onEnded={handleEmotionAudioEnded}
              className="hidden"
            />
          </div>
        </>
      )}

      {/* Character-specific Reference Audio - Only show for fine-tuned characters with available samples */}
      {!isDefaultCharacter && characterAudioSamples.length > 0 && (
        <>
          {/* Divider */}
          <div className="border-t border-border my-6"></div>

          <div>
            <h4 className="text-md font-semibold text-text-primary mb-2">
              {selectedCharacter?.name} 參考音頻 ({selectedCharacter?.name} Reference Audio)
            </h4>
            <p className="text-text-muted text-sm mb-4">
              試聽此角色的參考音頻，點擊「Use」將其作為參考。
              (Listen to reference audio for this character. Click "Use" to set as reference.)
            </p>

            {/* Character Audio Samples */}
            <div className="flex flex-wrap gap-2">
              {characterAudioSamples.map((sample) => {
                const isCurrentPlaying = playingCharacterAudio === sample.filename;

                return (
                  <div
                    key={sample.filename}
                    className="flex items-center gap-1 bg-surface rounded-lg px-3 py-2"
                  >
                    <button
                      onClick={() => handlePlayCharacterAudio(sample.filename)}
                      className={`p-1.5 rounded-full transition-colors ${
                        isCurrentPlaying
                          ? 'bg-primary text-white'
                          : 'bg-canvas hover:bg-primary/20 text-text-muted'
                      }`}
                      title={isCurrentPlaying ? '停止 (Stop)' : '試聽 (Play)'}
                    >
                      {isCurrentPlaying ? (
                        <PauseIcon className="w-4 h-4" />
                      ) : (
                        <PlayIcon className="w-4 h-4" />
                      )}
                    </button>
                    <span className="text-sm text-text-primary" title={sample.name || sample.filename}>
                      {sample.name || sample.filename}
                    </span>
                    <button
                      onClick={() => handleUseCharacterAudio(sample.filename)}
                      className="text-sm text-primary hover:text-primary/80 font-medium px-2"
                    >
                      Use
                    </button>
                  </div>
                );
              })}
            </div>

            {/* Hidden audio element for character audio playback */}
            <audio
              ref={characterAudioRef}
              onEnded={handleCharacterAudioEnded}
              className="hidden"
            />
          </div>
        </>
      )}
    </div>
  );
}
