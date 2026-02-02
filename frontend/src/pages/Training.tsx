import { useState, useRef, useEffect } from 'react';
import { useNavigate, useSearchParams } from 'react-router-dom';
import {
  CloudArrowUpIcon,
  MusicalNoteIcon,
  CheckCircleIcon,
  XMarkIcon,
  Cog6ToothIcon,
  ArrowLeftIcon,
} from '@heroicons/react/24/outline';
import { trainingApi } from '../services/api';
import type { TrainingProject, AudioSegment, TrainingConfig } from '../services/api';
import LabelingEditor from '../components/training/LabelingEditor';

type TrainingMode = 'simple' | 'advanced';
type TrainingStep = 'upload' | 'processing' | 'labeling' | 'training' | 'complete';

interface UploadedFile {
  id: string;
  file: File;
  name: string;
  size: string;
}

export default function Training() {
  const navigate = useNavigate();
  const [searchParams] = useSearchParams();
  const fileInputRef = useRef<HTMLInputElement>(null);

  // UI State
  const [mode, setMode] = useState<TrainingMode>('simple');
  const [step, setStep] = useState<TrainingStep>('upload');

  // Form State
  const [characterName, setCharacterName] = useState('');
  const [language, setLanguage] = useState('en');
  const [uploadedFiles, setUploadedFiles] = useState<UploadedFile[]>([]);

  // Processing Options
  const [removeBgm, setRemoveBgm] = useState(true);
  const [denoise, setDenoise] = useState(true);
  const [autoSlice, setAutoSlice] = useState(true);
  const [autoTranscribe, setAutoTranscribe] = useState(true);

  // Training Parameters - GPT-SoVITS recommended defaults
  // GPT params
  const [gptEpochs, setGptEpochs] = useState(10);
  const [gptBatchSize, setGptBatchSize] = useState(2);
  const [gptSaveEvery, setGptSaveEvery] = useState(5);
  const [gptDpoTraining, setGptDpoTraining] = useState(false);
  // SoVITS params
  const [sovitsEpochs, setSovitsEpochs] = useState(8);
  const [sovitsBatchSize, setSovitsBatchSize] = useState(2);
  const [sovitsSaveEvery, setSovitsSaveEvery] = useState(4);
  const [sovitsTextLrWeight, setSovitsTextLrWeight] = useState(0.4);

  // Project State
  const [project, setProject] = useState<TrainingProject | null>(null);
  const [segments, setSegments] = useState<AudioSegment[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [existingProjects, setExistingProjects] = useState<TrainingProject[]>([]);
  const [showResumeDialog, setShowResumeDialog] = useState(false);

  // Check for existing in-progress projects on mount
  useEffect(() => {
    const checkExistingProjects = async () => {
      try {
        const projects = await trainingApi.listProjects();
        // Filter for projects that are not completed or failed
        const activeProjects = projects.filter(p =>
          !['completed', 'failed'].includes(p.status)
        );
        if (activeProjects.length > 0) {
          setExistingProjects(activeProjects);
          setShowResumeDialog(true);
        }
      } catch (err) {
        console.error('Failed to check existing projects:', err);
      }
    };
    checkExistingProjects();
  }, []);

  // Auto-resume project if projectId is in URL
  useEffect(() => {
    const projectId = searchParams.get('projectId');
    if (!projectId) return;

    const autoResumeProject = async () => {
      try {
        const projectToResume = await trainingApi.getProject(projectId);
        if (projectToResume && !['completed', 'failed'].includes(projectToResume.status)) {
          // Directly resume this project
          setProject(projectToResume);
          setSegments(projectToResume.segments || []);
          setCharacterName(projectToResume.name);
          setLanguage(projectToResume.language);
          setGptEpochs(projectToResume.gpt_epochs);
          setGptBatchSize(projectToResume.gpt_batch_size);
          setGptSaveEvery(projectToResume.gpt_save_every);
          setGptDpoTraining(projectToResume.gpt_dpo_training);
          setSovitsEpochs(projectToResume.sovits_epochs);
          setSovitsBatchSize(projectToResume.sovits_batch_size);
          setSovitsSaveEvery(projectToResume.sovits_save_every);
          setSovitsTextLrWeight(projectToResume.sovits_text_lr_weight);
          setShowResumeDialog(false);

          // Set step based on project status
          if (projectToResume.status === 'labeling') {
            setStep('labeling');
          } else if (['training_gpt', 'training_sovits', 'preparing'].includes(projectToResume.status)) {
            setStep('training');
          } else {
            setStep('processing');
          }
        }
      } catch (err) {
        console.error('Failed to auto-resume project:', err);
      }
    };
    autoResumeProject();
  }, [searchParams]);

  // Resume an existing project
  const handleResumeProject = (projectToResume: TrainingProject) => {
    setProject(projectToResume);
    setSegments(projectToResume.segments || []);
    setCharacterName(projectToResume.name);
    setLanguage(projectToResume.language);
    setGptEpochs(projectToResume.gpt_epochs);
    setGptBatchSize(projectToResume.gpt_batch_size);
    setGptSaveEvery(projectToResume.gpt_save_every);
    setGptDpoTraining(projectToResume.gpt_dpo_training);
    setSovitsEpochs(projectToResume.sovits_epochs);
    setSovitsBatchSize(projectToResume.sovits_batch_size);
    setSovitsSaveEvery(projectToResume.sovits_save_every);
    setSovitsTextLrWeight(projectToResume.sovits_text_lr_weight);
    setShowResumeDialog(false);

    // Set step based on project status
    if (projectToResume.status === 'labeling') {
      setStep('labeling');
    } else if (['training_gpt', 'training_sovits', 'preparing'].includes(projectToResume.status)) {
      setStep('training');
    } else {
      setStep('processing');
    }
  };

  // Poll for project status updates
  useEffect(() => {
    if (!project) return;

    // Check current status and update step accordingly
    if (project.status === 'completed') {
      setStep('complete');
      return; // Stop polling
    } else if (project.status === 'failed') {
      setError(project.error || 'Training failed');
      return; // Stop polling
    } else if (project.status === 'labeling') {
      setStep('labeling');
    } else if (project.status === 'training_gpt' || project.status === 'training_sovits' || project.status === 'preparing') {
      setStep('training');
    }

    const pollStatus = async () => {
      try {
        const updated = await trainingApi.getProject(project.id);
        setProject(updated);
        setSegments(updated.segments || []);
      } catch (err) {
        console.error('Failed to poll status:', err);
      }
    };

    // Poll every 2 seconds while processing or training
    const activeStatuses = ['pending', 'uploading', 'preprocessing', 'separating_vocals', 'slicing', 'transcribing', 'labeling', 'preparing', 'training_gpt', 'training_sovits'];
    if (activeStatuses.includes(project.status)) {
      const interval = setInterval(pollStatus, 2000);
      return () => clearInterval(interval);
    }
  }, [project?.id, project?.status, project?.error]);

  const formatFileSize = (bytes: number) => {
    if (bytes < 1024) return bytes + ' B';
    if (bytes < 1024 * 1024) return (bytes / 1024).toFixed(1) + ' KB';
    return (bytes / (1024 * 1024)).toFixed(1) + ' MB';
  };

  const isValidFile = (file: File) => {
    const validTypes = ['audio/', 'video/mp4'];
    return validTypes.some(type => file.type.startsWith(type)) ||
           file.name.toLowerCase().endsWith('.mp4');
  };

  const addFiles = (files: FileList | File[]) => {
    const newFiles: UploadedFile[] = [];
    for (const file of Array.from(files)) {
      if (isValidFile(file)) {
        newFiles.push({
          id: crypto.randomUUID(),
          file,
          name: file.name,
          size: formatFileSize(file.size),
        });
      }
    }
    if (newFiles.length > 0) {
      setUploadedFiles(prev => [...prev, ...newFiles]);
    }
  };

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
    e.target.value = '';
  };

  const handleDrop = (e: React.DragEvent) => {
    e.preventDefault();
    const files = e.dataTransfer.files;
    if (files && files.length > 0) {
      addFiles(files);
    }
  };

  const removeFile = (id: string) => {
    setUploadedFiles(prev => prev.filter(f => f.id !== id));
  };

  const clearAllFiles = () => {
    setUploadedFiles([]);
  };

  const totalSize = uploadedFiles.reduce((acc, f) => acc + f.file.size, 0);

  const handleStartProcessing = async () => {
    if (uploadedFiles.length === 0 || !characterName.trim()) return;

    setError(null);
    setStep('processing');

    try {
      // Create project
      const config: TrainingConfig = {
        name: characterName.replace(/\s+/g, '_'),
        language,
        remove_bgm: removeBgm,
        denoise,
        auto_slice: autoSlice,
        auto_transcribe: autoTranscribe,
        // GPT params
        gpt_epochs: gptEpochs,
        gpt_batch_size: gptBatchSize,
        gpt_save_every: gptSaveEvery,
        gpt_dpo_training: gptDpoTraining,
        // SoVITS params
        sovits_epochs: sovitsEpochs,
        sovits_batch_size: sovitsBatchSize,
        sovits_save_every: sovitsSaveEvery,
        sovits_text_lr_weight: sovitsTextLrWeight,
      };

      const newProject = await trainingApi.createProject(config);
      setProject(newProject);

      // Upload files
      const files = uploadedFiles.map(f => f.file);
      await trainingApi.uploadAudio(newProject.id, files);

      // Start preprocessing with retry
      let retries = 3;
      while (retries > 0) {
        try {
          await trainingApi.startPreprocessing(newProject.id, config);
          break;
        } catch (retryErr) {
          retries--;
          if (retries === 0) throw retryErr;
          await new Promise(r => setTimeout(r, 1000)); // Wait 1s before retry
        }
      }

    } catch (err) {
      console.error('Processing error:', err);
      setError(err instanceof Error ? err.message : 'Failed to start processing');
      setStep('upload');
      setProject(null);
    }
  };

  const handleSaveLabels = async () => {
    if (!project) return;

    try {
      const updates = segments.map(s => ({
        id: s.id,
        text: s.text,
        language: s.language,
      }));
      await trainingApi.updateSegmentsBatch(project.id, updates);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to save labels');
    }
  };

  const handleStartTraining = async () => {
    if (!project) return;

    setError(null);

    try {
      // Save labels first
      await handleSaveLabels();

      // Start training
      await trainingApi.startTraining(project.id, {
        gpt_epochs: gptEpochs,
        gpt_batch_size: gptBatchSize,
        gpt_save_every: gptSaveEvery,
        gpt_dpo_training: gptDpoTraining,
        sovits_epochs: sovitsEpochs,
        sovits_batch_size: sovitsBatchSize,
        sovits_save_every: sovitsSaveEvery,
        sovits_text_lr_weight: sovitsTextLrWeight,
      });

      setStep('training');
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Failed to start training');
    }
  };

  const canStartProcessing = uploadedFiles.length > 0 && characterName.trim();

  // Render Processing/Training Progress
  if (step === 'processing' || step === 'training') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-12">
          {/* Progress Circle */}
          <div className="relative w-32 h-32 mx-auto mb-6">
            <svg className="w-full h-full transform -rotate-90">
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                className="text-border"
              />
              <circle
                cx="64"
                cy="64"
                r="56"
                stroke="currentColor"
                strokeWidth="8"
                fill="none"
                strokeDasharray={2 * Math.PI * 56}
                strokeDashoffset={2 * Math.PI * 56 * (1 - (project?.progress || 0) / 100)}
                className="text-primary transition-all duration-500"
                strokeLinecap="round"
              />
            </svg>
            <div className="absolute inset-0 flex items-center justify-center">
              <span className="text-2xl font-bold text-primary">
                {Math.round(project?.progress || 0)}%
              </span>
            </div>
          </div>

          <h3 className="text-xl font-semibold text-text-primary mb-2">
            {step === 'processing' ? '處理中 (Processing)' : '訓練中 (Training)'} "{characterName}"
          </h3>
          <p className="text-secondary mb-4">{project?.current_step || '開始中... (Starting...)'}</p>

          <div className="progress-bar max-w-md mx-auto">
            <div
              className="progress-bar-fill"
              style={{ width: `${project?.progress || 0}%` }}
            />
          </div>

          {error && (
            <p className="text-accent mt-4">{error}</p>
          )}

          <p className="text-text-muted text-sm mt-4">
            {step === 'training'
              ? "訓練可能需要 20-60 分鐘。您可以關閉此頁面稍後返回 - 進度將被保存。(Training may take 20-60 minutes. You can close this page and return later - your progress will be saved.)"
              : '正在處理您的音頻文件。如有需要可以關閉後再繼續。(Processing your audio files. You can close and resume later if needed.)'}
          </p>
        </div>
      </div>
    );
  }

  // Render Labeling UI
  if (step === 'labeling' && project) {
    return (
      <div className="max-w-4xl mx-auto space-y-6">
        <div className="flex items-center gap-4">
          <button
            onClick={() => {
              setStep('upload');
              setProject(null);
            }}
            className="btn-ghost p-2"
          >
            <ArrowLeftIcon className="w-5 h-5" />
          </button>
          <div>
            <h2 className="text-xl font-semibold text-text-primary">{characterName}</h2>
            <p className="text-text-muted text-sm">訓練前編輯轉錄標籤 (Edit transcription labels before training)</p>
          </div>
        </div>

        {error && (
          <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-accent">
            {error}
          </div>
        )}

        {/* List File Path Info */}
        {project.list_file_path && (
          <div className="card bg-surface">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-text-muted text-sm">轉錄文件 (Transcription File) (.list)</p>
                <p className="text-text-primary font-mono text-xs break-all">{project.list_file_path}</p>
              </div>
            </div>
          </div>
        )}

        <LabelingEditor
          projectId={project.id}
          segments={segments}
          onSegmentsChange={setSegments}
          onSaveAll={handleSaveLabels}
          onStartTraining={handleStartTraining}
        />

        {/* Training Parameters */}
        <div className="card">
          <h3 className="text-lg font-semibold text-text-primary mb-4">訓練參數 (Training Parameters)</h3>

          {/* SoVITS Parameters */}
          <div className="mb-4">
            <h4 className="text-sm font-medium text-secondary mb-2">SoVITS (先訓練 trains first)</h4>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="label text-xs">Batch Size</label>
                <input
                  type="number"
                  value={sovitsBatchSize}
                  onChange={(e) => setSovitsBatchSize(parseInt(e.target.value) || 2)}
                  min={1}
                  max={16}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="label text-xs">Epochs</label>
                <input
                  type="number"
                  value={sovitsEpochs}
                  onChange={(e) => setSovitsEpochs(parseInt(e.target.value) || 8)}
                  min={1}
                  max={100}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="label text-xs">Text LR Weight</label>
                <input
                  type="number"
                  value={sovitsTextLrWeight}
                  onChange={(e) => setSovitsTextLrWeight(parseFloat(e.target.value) || 0.4)}
                  min={0}
                  max={1}
                  step={0.1}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="label text-xs">Save Every</label>
                <input
                  type="number"
                  value={sovitsSaveEvery}
                  onChange={(e) => setSovitsSaveEvery(parseInt(e.target.value) || 4)}
                  min={1}
                  max={50}
                  className="input text-sm"
                />
              </div>
            </div>
          </div>

          {/* GPT Parameters */}
          <div>
            <h4 className="text-sm font-medium text-primary mb-2">GPT (後訓練 trains second)</h4>
            <div className="grid grid-cols-4 gap-3">
              <div>
                <label className="label text-xs">Batch Size</label>
                <input
                  type="number"
                  value={gptBatchSize}
                  onChange={(e) => setGptBatchSize(parseInt(e.target.value) || 2)}
                  min={1}
                  max={16}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="label text-xs">Epochs</label>
                <input
                  type="number"
                  value={gptEpochs}
                  onChange={(e) => setGptEpochs(parseInt(e.target.value) || 10)}
                  min={1}
                  max={100}
                  className="input text-sm"
                />
              </div>
              <div>
                <label className="label text-xs">Save Every</label>
                <input
                  type="number"
                  value={gptSaveEvery}
                  onChange={(e) => setGptSaveEvery(parseInt(e.target.value) || 5)}
                  min={1}
                  max={50}
                  className="input text-sm"
                />
              </div>
              <div className="flex items-end">
                <label className="flex items-center gap-2 cursor-pointer pb-2">
                  <input
                    type="checkbox"
                    checked={gptDpoTraining}
                    onChange={(e) => setGptDpoTraining(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-xs text-text-secondary">DPO Training</span>
                </label>
              </div>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // Render Complete
  if (step === 'complete') {
    return (
      <div className="max-w-2xl mx-auto">
        <div className="card text-center py-12">
          <CheckCircleIcon className="w-20 h-20 text-green-500 mx-auto mb-4" />
          <h3 className="text-2xl font-semibold text-text-primary mb-2">
            訓練完成! (Training Complete!)
          </h3>
          <p className="text-text-muted mb-6">
            "{characterName}" 語音模型已準備就緒。(voice model is ready to use.)
          </p>

          {/* Model Output Paths */}
          <div className="bg-surface rounded-lg p-4 mb-6 text-left text-sm">
            <h4 className="font-semibold text-text-primary mb-2">模型輸出 (Model Output):</h4>
            <div className="space-y-1 text-text-muted font-mono text-xs">
              <p><span className="text-primary">GPT:</span> data/models/GPT_weights/{characterName.replace(/\s+/g, '_')}_*.ckpt</p>
              <p><span className="text-secondary">SoVITS:</span> data/models/SoVITS_weights/{characterName.replace(/\s+/g, '_')}_*.pth</p>
            </div>
            <p className="text-text-muted text-xs mt-3">
              項目數據保存於 (Project data saved in): data/training_projects/{project?.id}/
            </p>
          </div>

          <div className="flex gap-4 justify-center">
            <button
              onClick={() => {
                setStep('upload');
                setProject(null);
                setCharacterName('');
                setUploadedFiles([]);
              }}
              className="btn-secondary"
            >
              訓練另一個 (Train Another)
            </button>
            <button
              onClick={() => navigate('/characters')}
              className="btn-primary"
            >
              前往角色 (Go to Characters)
            </button>
          </div>
        </div>
      </div>
    );
  }

  // Render Upload UI (default)
  return (
    <div className="max-w-2xl mx-auto space-y-6">
      {/* Resume Dialog */}
      {showResumeDialog && existingProjects.length > 0 && (
        <div className="card bg-primary/10 border-primary/30">
          <div className="flex items-start gap-4">
            <div className="flex-1">
              <h3 className="font-semibold text-text-primary mb-1">
                繼續訓練? (Resume Training?)
              </h3>
              <p className="text-text-muted text-sm mb-3">
                您有 {existingProjects.length} 個訓練項目正在進行中。(You have {existingProjects.length} training project{existingProjects.length > 1 ? 's' : ''} in progress.)
              </p>
              <div className="space-y-2">
                {existingProjects.map(p => (
                  <div
                    key={p.id}
                    className="flex items-center justify-between bg-surface rounded-lg p-3"
                  >
                    <div>
                      <span className="font-medium text-text-primary">{p.name}</span>
                      <span className="text-text-muted text-sm ml-2">
                        ({p.status.replace(/_/g, ' ')}) - {Math.round(p.progress)}%
                      </span>
                    </div>
                    <button
                      onClick={() => handleResumeProject(p)}
                      className="btn-primary text-sm py-1 px-3"
                    >
                      繼續 (Resume)
                    </button>
                  </div>
                ))}
              </div>
            </div>
            <button
              onClick={() => setShowResumeDialog(false)}
              className="text-text-muted hover:text-text-primary"
            >
              <XMarkIcon className="w-5 h-5" />
            </button>
          </div>
        </div>
      )}

      {/* Mode Toggle */}
      <div className="flex gap-4 justify-center flex-wrap">
        <button
          onClick={() => setMode('simple')}
          className={`px-6 py-3 rounded-lg font-medium transition-all ${
            mode === 'simple'
              ? 'bg-primary text-white shadow-glow-primary'
              : 'bg-surface text-text-muted hover:text-text-primary'
          }`}
        >
          簡單模式 (Simple Mode)
        </button>
        <button
          onClick={() => setMode('advanced')}
          className={`px-6 py-3 rounded-lg font-medium transition-all flex items-center gap-2 ${
            mode === 'advanced'
              ? 'bg-primary text-white shadow-glow-primary'
              : 'bg-surface text-text-muted hover:text-text-primary'
          }`}
        >
          <Cog6ToothIcon className="w-5 h-5" />
          進階模式 (Advanced Mode)
        </button>
      </div>

      {error && (
        <div className="bg-accent/10 border border-accent/30 rounded-lg p-3 text-accent">
          {error}
        </div>
      )}

      {mode === 'simple' ? (
        <>
          {/* Character Name */}
          <div className="card">
            <label className="label">角色名稱 (Character Name)</label>
            <input
              type="text"
              value={characterName}
              onChange={(e) => setCharacterName(e.target.value)}
              placeholder="例如 (e.g.) Alice_Cheerful"
              className="input"
            />
            <p className="text-text-muted text-xs mt-2">
              請使用下劃線代替空格。這將是模型標識符。(Use underscores instead of spaces. This will be the model identifier.)
            </p>
          </div>

          {/* Language Selection */}
          <div className="card">
            <label className="label">訓練語言 (Training Language)</label>
            <select
              value={language}
              onChange={(e) => setLanguage(e.target.value)}
              className="input"
            >
              <option value="en">英語 (English)</option>
              <option value="zh">中文 (Chinese)</option>
              <option value="ja">日語 (Japanese)</option>
              <option value="ko">韓語 (Korean)</option>
              <option value="yue">粵語 (Cantonese)</option>
            </select>
          </div>

          {/* File Upload */}
          <div className="card">
            <div className="flex items-center justify-between mb-2">
              <label className="label mb-0">上傳訓練音頻 (Upload Training Audio)</label>
              {uploadedFiles.length > 0 && (
                <button
                  onClick={clearAllFiles}
                  className="text-sm text-text-muted hover:text-accent transition-colors"
                >
                  清除全部 (Clear all)
                </button>
              )}
            </div>
            <div
              onDrop={handleDrop}
              onDragOver={(e) => e.preventDefault()}
              onClick={() => fileInputRef.current?.click()}
              className={`border-2 border-dashed rounded-lg p-8 text-center cursor-pointer
                         transition-all hover:border-primary ${
                           uploadedFiles.length > 0 ? 'border-green-500 bg-green-500/5' : 'border-border'
                         }`}
            >
              <CloudArrowUpIcon className="w-12 h-12 text-text-muted mx-auto mb-4" />
              <p className="text-text-primary font-medium">
                拖放音頻/視頻文件到此處或點擊瀏覽 (Drop audio/video files here or click to browse)
              </p>
              <p className="text-text-muted text-sm mt-2">
                支持 WAV, MP3, FLAC, MP4 (可多選) (Supports WAV, MP3, FLAC, MP4 - multiple files allowed)
              </p>
            </div>
            <input
              ref={fileInputRef}
              type="file"
              accept="audio/*,video/mp4,.mp4"
              multiple
              onChange={handleFileSelect}
              className="hidden"
            />

            {/* File List */}
            {uploadedFiles.length > 0 && (
              <div className="mt-4 space-y-2">
                <p className="text-text-muted text-sm">
                  {uploadedFiles.length} file{uploadedFiles.length !== 1 ? 's' : ''} selected ({formatFileSize(totalSize)})
                </p>
                <div className="max-h-48 overflow-y-auto space-y-2">
                  {uploadedFiles.map((file) => (
                    <div
                      key={file.id}
                      className="flex items-center gap-3 p-2 bg-surface rounded-lg"
                    >
                      <MusicalNoteIcon className="w-5 h-5 text-green-500 flex-shrink-0" />
                      <div className="flex-1 min-w-0">
                        <p className="text-sm text-text-primary truncate">{file.name}</p>
                        <p className="text-xs text-text-muted">{file.size}</p>
                      </div>
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          removeFile(file.id);
                        }}
                        className="p-1 hover:bg-canvas rounded transition-colors"
                      >
                        <XMarkIcon className="w-4 h-4 text-text-muted hover:text-accent" />
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>

          {/* Processing Options */}
          <div className="card">
            <label className="label">自動處理選項 (Auto-Processing Options)</label>
            <div className="space-y-3">
              {[
                {
                  id: 'removeBgm',
                  label: '移除背景音樂 (Remove background music - UVR5)',
                  checked: removeBgm,
                  onChange: setRemoveBgm,
                },
                {
                  id: 'denoise',
                  label: '降噪音頻 (Denoise audio)',
                  checked: denoise,
                  onChange: setDenoise,
                },
                {
                  id: 'autoSlice',
                  label: '自動切分片段 (Auto-slice into segments)',
                  checked: autoSlice,
                  onChange: setAutoSlice,
                },
                {
                  id: 'autoTranscribe',
                  label: '自動轉錄語音 (Auto-transcribe speech - Whisper)',
                  checked: autoTranscribe,
                  onChange: setAutoTranscribe,
                },
              ].map((option) => (
                <label
                  key={option.id}
                  className="flex items-center gap-3 cursor-pointer"
                >
                  <input
                    type="checkbox"
                    checked={option.checked}
                    onChange={(e) => option.onChange(e.target.checked)}
                    className="w-4 h-4 rounded border-border text-primary focus:ring-primary"
                  />
                  <span className="text-text-secondary">{option.label}</span>
                  {option.checked && (
                    <CheckCircleIcon className="w-4 h-4 text-green-500 ml-auto" />
                  )}
                </label>
              ))}
            </div>
          </div>

          {/* Start Button */}
          <div className="flex justify-center pt-4">
            <button
              onClick={handleStartProcessing}
              disabled={!canStartProcessing}
              className="btn-primary text-lg px-10 py-4"
            >
              開始處理 (Start Processing)
            </button>
          </div>

          <p className="text-text-muted text-sm text-center">
            處理完成後，您將在訓練開始前審核轉錄內容。(After processing, you'll review transcriptions before training starts.)
          </p>
        </>
      ) : (
        /* Advanced Mode */
        <div className="card text-center py-12">
          <Cog6ToothIcon className="w-16 h-16 text-text-muted mx-auto mb-4" />
          <h3 className="text-xl font-semibold text-text-primary mb-2">
            進階訓練模式 (Advanced Training Mode)
          </h3>
          <p className="text-text-muted mb-6 max-w-md mx-auto">
            進階模式提供對訓練流程每個步驟的完全控制：人聲分離、切片、轉錄和模型訓練。
            (Advanced mode provides full control over each step of the training pipeline: vocal separation, slicing, transcription, and model training.)
          </p>
          <button
            onClick={() => navigate('/training/advanced')}
            className="btn-primary"
          >
            打開進階嚮導 (Open Advanced Wizard)
          </button>
        </div>
      )}
    </div>
  );
}
