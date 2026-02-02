// Character types
export interface Character {
  id: string;
  name: string;
  status: 'ready' | 'training' | 'failed';
  language: string;
  audioMinutes?: number;
  createdAt: string;
  avatarUrl?: string;
  // Model paths for GPT-SoVITS
  modelPaths?: {
    sovitsModel: string;  // SoVITS .pth file
    gptModel: string;     // GPT .ckpt file
    referenceAudio?: string;  // Reference audio for inference
    referenceText?: string;   // Transcript of reference audio
  };
  version?: string;  // Model version (v1, v2, v3, v4)
  deletedAt?: string;  // ISO timestamp when soft-deleted, undefined if active
}

// Emotion types
export type EmotionPreset = 'calm' | 'happy' | 'excited' | 'dramatic' | 'mysterious';

export interface EmotionConfig {
  preset: EmotionPreset;
  intensity: number; // 0.0 - 1.0
}

// Synthesis types
export interface SynthesisParams {
  characterId: string;
  text: string;
  textLanguage: 'en' | 'zh' | 'ja' | 'ko' | 'yue';
  emotion: EmotionConfig;
  speed: number;
  topK: number;
  topP: number;
  temperature: number;
  freeze: boolean;
  pauseDuration: number;
}

export interface SynthesisResult {
  audioUrl: string;
  duration: number;
  metadata: {
    character: string;
    emotion: string;
    textLength: number;
  };
}

// Training types
export interface TrainingJob {
  id: string;
  characterId: string;
  status: 'pending' | 'running' | 'completed' | 'failed' | 'cancelled';
  progress: number;
  currentStep: string;
  mode: 'simple' | 'advanced';
  createdAt: string;
  completedAt?: string;
  errorMessage?: string;
}

export interface TrainingOptions {
  removeBgm: boolean;
  denoise: boolean;
  autoSlice: boolean;
  autoTranscribe: boolean;
}

// API response types
export interface ApiResponse<T> {
  success: boolean;
  data?: T;
  error?: {
    code: string;
    message: string;
  };
}
