import axios from 'axios';
import type { Character } from '../types';

// Use environment variable or fallback to localhost for development
const API_BASE = import.meta.env.VITE_API_URL || 'http://localhost:8000/api';

const api = axios.create({
  baseURL: API_BASE,
  headers: {
    'Content-Type': 'application/json',
  },
});

// Character API
export const characterApi = {
  getAll: async (): Promise<Character[]> => {
    const response = await api.get('/characters');
    return response.data.map(mapCharacterFromApi);
  },

  getById: async (id: string): Promise<Character> => {
    const response = await api.get(`/characters/${id}`);
    return mapCharacterFromApi(response.data);
  },

  create: async (data: {
    name: string;
    language: string;
    model_paths: {
      sovits_model: string;
      gpt_model: string;
      reference_audio?: string;
      reference_text?: string;
    };
  }): Promise<Character> => {
    const response = await api.post('/characters', data);
    return mapCharacterFromApi(response.data);
  },

  update: async (id: string, data: Partial<Character>): Promise<Character> => {
    const response = await api.patch(`/characters/${id}`, mapCharacterToApi(data));
    return mapCharacterFromApi(response.data);
  },

  delete: async (id: string): Promise<void> => {
    await api.delete(`/characters/${id}`);
  },

  // Trash/restore operations
  getTrash: async (): Promise<Character[]> => {
    const response = await api.get('/characters/trash/list');
    return response.data.map(mapCharacterFromApi);
  },

  restore: async (id: string): Promise<Character> => {
    const response = await api.post(`/characters/trash/${id}/restore`);
    return mapCharacterFromApi(response.data);
  },

  permanentDelete: async (id: string): Promise<void> => {
    await api.delete(`/characters/trash/${id}/permanent`);
  },
};

// Emotion Audio API
export interface EmotionSample {
  filename: string;
  name: string;
  emotion?: string;  // Emotion subfolder name (calm, dramatic, etc.)
  text?: string;     // Reference text from .txt file (if exists)
}

export interface EmotionCategory {
  name: string;  // Language code (zh, en) or legacy emotion name
  samples: EmotionSample[];
}

export interface GenderCategory {
  name: string;
  emotions: EmotionCategory[];  // Actually language categories now
}

export const emotionAudioApi = {
  list: async (): Promise<{ genders: GenderCategory[] }> => {
    const response = await api.get('/characters/emotion-audio/list');
    return response.data;
  },

  // New 4-part URL: gender/language/emotion/filename
  getAudioUrl: (gender: string, language: string, emotion: string, filename: string): string => {
    return `${API_BASE}/characters/emotion-audio/${encodeURIComponent(gender)}/${encodeURIComponent(language)}/${encodeURIComponent(emotion)}/${encodeURIComponent(filename)}`;
  },

  // Legacy 3-part URL for backwards compatibility
  getAudioUrlLegacy: (gender: string, emotion: string, filename: string): string => {
    return `${API_BASE}/characters/emotion-audio/${encodeURIComponent(gender)}/${encodeURIComponent(emotion)}/${encodeURIComponent(filename)}`;
  },
};

// Character-specific Audio API
export const characterAudioApi = {
  list: async (characterName: string): Promise<{ samples: EmotionSample[] }> => {
    const response = await api.get(`/characters/character-audio/list/${encodeURIComponent(characterName)}`);
    return response.data;
  },

  getAudioUrl: (characterName: string, filename: string): string => {
    return `${API_BASE}/characters/character-audio/${encodeURIComponent(characterName)}/${encodeURIComponent(filename)}`;
  },
};

// Synthesis API
export interface SynthesisRequest {
  text: string;
  text_lang: string;
  character_id: string;
  top_k?: number;
  top_p?: number;
  temperature?: number;
  speed_factor?: number;
  // Reference audio (uploaded file or use character's default)
  ref_audio_file?: File;
  ref_audio_text?: string;
  ref_audio_lang?: string;
}

export interface SynthesisResponse {
  success: boolean;
  message?: string;
  audio_url?: string;
  duration?: number;
}

export const synthesisApi = {
  checkHealth: async (): Promise<{ gptsovits_running: boolean; gptsovits_url: string }> => {
    const response = await api.get('/synthesis/health');
    return response.data;
  },

  synthesize: async (request: SynthesisRequest): Promise<SynthesisResponse> => {
    // If there's a reference audio file, use FormData
    if (request.ref_audio_file) {
      console.log('[API] Sending synthesis with reference audio');
      console.log('[API] File:', request.ref_audio_file.name, request.ref_audio_file.size, 'bytes');

      const formData = new FormData();
      formData.append('text', request.text);
      formData.append('text_lang', request.text_lang);
      formData.append('character_id', request.character_id);
      if (request.top_k !== undefined) formData.append('top_k', String(request.top_k));
      if (request.top_p !== undefined) formData.append('top_p', String(request.top_p));
      if (request.temperature !== undefined) formData.append('temperature', String(request.temperature));
      if (request.speed_factor !== undefined) formData.append('speed_factor', String(request.speed_factor));
      formData.append('ref_audio_file', request.ref_audio_file);
      if (request.ref_audio_text) formData.append('ref_audio_text', request.ref_audio_text);
      if (request.ref_audio_lang) formData.append('ref_audio_lang', request.ref_audio_lang);

      console.log('[API] FormData entries:');
      for (const [key, value] of formData.entries()) {
        if (value instanceof File) {
          console.log(`  ${key}: File(${value.name}, ${value.size} bytes)`);
        } else {
          console.log(`  ${key}: ${value}`);
        }
      }

      // Don't set Content-Type header - axios will set it automatically with the correct boundary
      const response = await axios.post(`${API_BASE}/synthesis`, formData);
      return response.data;
    }

    // Otherwise use JSON endpoint (no reference audio)
    console.log('[API] Sending synthesis without reference audio (JSON)');
    const response = await api.post('/synthesis/json', {
      text: request.text,
      text_lang: request.text_lang,
      character_id: request.character_id,
      top_k: request.top_k,
      top_p: request.top_p,
      temperature: request.temperature,
      speed_factor: request.speed_factor,
    });
    return response.data;
  },

  getAudioUrl: (filename: string): string => {
    return `${API_BASE}/audio/${filename}`;
  },
};

// Map API response to frontend Character type
function mapCharacterFromApi(data: Record<string, unknown>): Character {
  return {
    id: data.id as string,
    name: data.name as string,
    status: data.status as 'ready' | 'training' | 'failed',
    language: data.language as string,
    audioMinutes: data.audio_minutes as number | undefined,
    createdAt: data.created_at as string,
    avatarUrl: data.avatar_url as string | undefined,
    modelPaths: data.model_paths
      ? {
          sovitsModel: (data.model_paths as Record<string, string>).sovits_model,
          gptModel: (data.model_paths as Record<string, string>).gpt_model,
          referenceAudio: (data.model_paths as Record<string, string>).reference_audio,
          referenceText: (data.model_paths as Record<string, string>).reference_text,
        }
      : undefined,
    version: data.version as string | undefined,
    deletedAt: data.deleted_at as string | undefined,
  };
}

// Map frontend Character to API format
function mapCharacterToApi(data: Partial<Character>): Record<string, unknown> {
  const result: Record<string, unknown> = {};

  if (data.name !== undefined) result.name = data.name;
  if (data.status !== undefined) result.status = data.status;
  if (data.language !== undefined) result.language = data.language;
  if (data.audioMinutes !== undefined) result.audio_minutes = data.audioMinutes;
  if (data.avatarUrl !== undefined) result.avatar_url = data.avatarUrl;
  if (data.modelPaths !== undefined) {
    result.model_paths = {
      sovits_model: data.modelPaths.sovitsModel,
      gpt_model: data.modelPaths.gptModel,
      reference_audio: data.modelPaths.referenceAudio,
      reference_text: data.modelPaths.referenceText,
    };
  }

  return result;
}

// Library API
export interface LibraryAudioMetadata {
  top_k: number;
  top_p: number;
  temperature: number;
  speed: number;
  duration?: number;
  character_id?: string;
  character_name?: string;
  text?: string;
  text_language?: string;
  ref_audio_source?: string;  // e.g., "emotion:Male/Happy/happy_01.wav" or "character:Xixi/greeting.wav" or "upload:custom.wav"
  created_at?: string;
}

export interface LibraryAudioFile {
  filename: string;
  name: string;
  size?: number;
  createdAt?: number;
  metadata?: LibraryAudioMetadata;
}

export interface SaveToLibraryRequest {
  audio_url: string;
  filename: string;
  top_k: number;
  top_p: number;
  temperature: number;
  speed: number;
  duration?: number;
  character_id?: string;
  character_name?: string;
  text?: string;
  text_language?: string;
  ref_audio_source?: string;  // e.g., "emotion:Male/Happy/happy_01.wav" or "character:Xixi/greeting.wav" or "upload:custom.wav"
}

export const libraryApi = {
  list: async (): Promise<{ files: LibraryAudioFile[] }> => {
    const response = await api.get('/library/list');
    return response.data;
  },

  save: async (request: SaveToLibraryRequest): Promise<{ success: boolean; message: string; filename: string }> => {
    const response = await api.post('/library/save', request);
    return response.data;
  },

  getAudioUrl: (filename: string): string => {
    return `${API_BASE}/library/audio/${encodeURIComponent(filename)}`;
  },

  delete: async (filename: string): Promise<void> => {
    await api.delete(`/library/audio/${encodeURIComponent(filename)}`);
  },
};

// Training API
export interface TrainingProject {
  id: string;
  name: string;
  language: string;
  status: string;
  progress: number;
  current_step: string;
  error?: string;
  segments: AudioSegment[];
  // GPT training params
  gpt_epochs: number;
  gpt_batch_size: number;
  gpt_save_every: number;
  gpt_dpo_training: boolean;
  // SoVITS training params
  sovits_epochs: number;
  sovits_batch_size: number;
  sovits_save_every: number;
  sovits_text_lr_weight: number;
  // Paths
  list_file_path?: string;
  sliced_dir?: string;
  created_at?: string;
}

export interface AudioSegment {
  id: string;
  filename: string;
  filepath: string;
  text: string;
  language: string;
  duration?: number;
}

export interface TrainingConfig {
  name: string;
  language: string;
  remove_bgm: boolean;
  denoise: boolean;
  auto_slice: boolean;
  auto_transcribe: boolean;
  slice_threshold?: number;
  slice_min_length?: number;
  slice_min_interval?: number;
  // GPT training params
  gpt_epochs?: number;
  gpt_batch_size?: number;
  gpt_save_every?: number;
  gpt_dpo_training?: boolean;
  // SoVITS training params
  sovits_epochs?: number;
  sovits_batch_size?: number;
  sovits_save_every?: number;
  sovits_text_lr_weight?: number;
}

export const trainingApi = {
  listProjects: async (): Promise<TrainingProject[]> => {
    const response = await api.get('/training/projects');
    return response.data;
  },

  getProject: async (projectId: string): Promise<TrainingProject> => {
    const response = await api.get(`/training/projects/${projectId}`);
    return response.data;
  },

  createProject: async (config: TrainingConfig): Promise<TrainingProject> => {
    const response = await api.post('/training/projects', config);
    return response.data;
  },

  deleteProject: async (projectId: string): Promise<void> => {
    await api.delete(`/training/projects/${projectId}`);
  },

  uploadAudio: async (projectId: string, files: File[]): Promise<{ uploaded: string[]; count: number }> => {
    const formData = new FormData();
    files.forEach(file => {
      formData.append('files', file);
    });
    const response = await api.post(`/training/projects/${projectId}/upload`, formData, {
      headers: { 'Content-Type': 'multipart/form-data' },
    });
    return response.data;
  },

  startPreprocessing: async (projectId: string, config: TrainingConfig): Promise<void> => {
    await api.post(`/training/projects/${projectId}/preprocess`, config);
  },

  getSegments: async (projectId: string): Promise<{ segments: AudioSegment[] }> => {
    const response = await api.get(`/training/projects/${projectId}/segments`);
    return response.data;
  },

  updateSegment: async (projectId: string, segmentId: string, text: string, language?: string): Promise<void> => {
    await api.patch(`/training/projects/${projectId}/segments/${segmentId}`, {
      id: segmentId,
      text,
      language,
    });
  },

  updateSegmentsBatch: async (projectId: string, updates: { id: string; text: string; language?: string }[]): Promise<void> => {
    await api.post(`/training/projects/${projectId}/segments/batch`, updates);
  },

  deleteSegment: async (projectId: string, segmentId: string): Promise<void> => {
    await api.delete(`/training/projects/${projectId}/segments/${segmentId}`);
  },

  getSegmentAudioUrl: (projectId: string, filepath: string): string => {
    // Encode the filepath to handle special characters and absolute paths
    return `${API_BASE}/training/projects/${projectId}/audio/${encodeURIComponent(filepath)}`;
  },

  importListFile: async (projectId: string, listPath: string): Promise<{ count: number }> => {
    const response = await api.post(`/training/projects/${projectId}/import-list`, null, {
      params: { list_path: listPath },
    });
    return response.data;
  },

  startTraining: async (projectId: string, config?: {
    gpt_epochs?: number;
    gpt_batch_size?: number;
    gpt_save_every?: number;
    gpt_dpo_training?: boolean;
    sovits_epochs?: number;
    sovits_batch_size?: number;
    sovits_save_every?: number;
    sovits_text_lr_weight?: number;
  }): Promise<void> => {
    await api.post(`/training/projects/${projectId}/train`, {
      project_id: projectId,
      ...config,
    });
  },
};

export default api;
