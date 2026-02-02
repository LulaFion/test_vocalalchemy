import { create } from 'zustand';
import type { EmotionPreset, Character } from '../types';
import { synthesisApi } from '../services/api';

interface SynthesisState {
  // Input state
  text: string;
  textLanguage: 'en' | 'zh' | 'ja' | 'ko' | 'yue';
  emotionPreset: EmotionPreset;
  emotionIntensity: number;
  speed: number;
  topK: number;
  topP: number;
  temperature: number;
  freeze: boolean;
  pauseDuration: number;

  // Reference audio state
  referenceAudio: File | null;
  referenceText: string;
  referenceLanguage: 'en' | 'zh' | 'ja' | 'ko' | 'yue';
  referenceAudioSource: string | null;  // e.g., "emotion:Male/Happy/happy_01.wav" or "character:Xixi/greeting.wav" or "upload:custom.wav"

  // Output state
  isGenerating: boolean;
  generatedAudioUrl: string | null;
  audioDuration: number | null;
  error: string | null;

  // Actions
  setText: (text: string) => void;
  setTextLanguage: (lang: 'en' | 'zh' | 'ja' | 'ko' | 'yue') => void;
  setEmotionPreset: (preset: EmotionPreset) => void;
  setEmotionIntensity: (intensity: number) => void;
  setSpeed: (speed: number) => void;
  setTopK: (topK: number) => void;
  setTopP: (topP: number) => void;
  setTemperature: (temperature: number) => void;
  setFreeze: (freeze: boolean) => void;
  setPauseDuration: (duration: number) => void;
  setReferenceAudio: (file: File | null, source?: string | null) => void;
  setReferenceText: (text: string) => void;
  setReferenceLanguage: (lang: 'en' | 'zh' | 'ja' | 'ko' | 'yue') => void;
  setReferenceAudioSource: (source: string | null) => void;
  generate: (character: Character) => Promise<void>;
  clearOutput: () => void;
  resetParams: () => void;
}

const defaultParams = {
  textLanguage: 'en' as const,
  emotionPreset: 'calm' as EmotionPreset,
  emotionIntensity: 0.5,
  speed: 1.0,
  topK: 40,
  topP: 0.45,
  temperature: 0.8,
  freeze: false,
  pauseDuration: 0.3,
};

export const useSynthesisStore = create<SynthesisState>((set, get) => ({
  // Input state with defaults
  text: '',
  ...defaultParams,

  // Reference audio state
  referenceAudio: null,
  referenceText: '',
  referenceLanguage: 'en',
  referenceAudioSource: null,

  // Output state
  isGenerating: false,
  generatedAudioUrl: null,
  audioDuration: null,
  error: null,

  // Setters
  setText: (text) => set({ text }),
  setTextLanguage: (textLanguage) => set({ textLanguage }),
  setEmotionPreset: (emotionPreset) => set({ emotionPreset }),
  setEmotionIntensity: (emotionIntensity) => set({ emotionIntensity }),
  setSpeed: (speed) => set({ speed }),
  setTopK: (topK) => set({ topK }),
  setTopP: (topP) => set({ topP }),
  setTemperature: (temperature) => set({ temperature }),
  setFreeze: (freeze) => set({ freeze }),
  setPauseDuration: (pauseDuration) => set({ pauseDuration }),
  setReferenceAudio: (referenceAudio, source) => {
    console.log('[synthesisStore] setReferenceAudio called:', { file: referenceAudio?.name, source });
    set({ referenceAudio, referenceAudioSource: source ?? null });
  },
  setReferenceText: (referenceText) => set({ referenceText }),
  setReferenceLanguage: (referenceLanguage) => set({ referenceLanguage }),
  setReferenceAudioSource: (referenceAudioSource) => set({ referenceAudioSource }),

  generate: async (character: Character) => {
    const state = get();

    if (!state.text.trim()) {
      set({ error: 'Please enter text to synthesize' });
      return;
    }

    set({ isGenerating: true, error: null, generatedAudioUrl: null });

    console.log('=== Synthesis Request ===');
    console.log('Character:', character.name);
    console.log('Character ID:', character.id);
    console.log('Text:', state.text);
    console.log('Language:', state.textLanguage);
    console.log('Params:', { temperature: state.temperature, topP: state.topP, topK: state.topK, speed: state.speed });
    console.log('========================');

    try {
      // Verify model paths exist
      if (!character.modelPaths) {
        set({
          error: `Character "${character.name}" has no model paths configured.`,
          isGenerating: false,
        });
        return;
      }

      // Call backend API with slider parameters directly
      const response = await synthesisApi.synthesize({
        text: state.text,
        text_lang: state.textLanguage,
        character_id: character.id,
        top_k: state.topK,
        top_p: state.topP,
        temperature: state.temperature,
        speed_factor: state.speed,
        // Include reference audio if provided
        ref_audio_file: state.referenceAudio || undefined,
        ref_audio_text: state.referenceText || undefined,
        ref_audio_lang: state.referenceLanguage || undefined,
      });

      if (response.success && response.audio_url) {
        // Construct full URL for audio
        const audioUrl = `http://localhost:8000${response.audio_url}`;
        set({
          generatedAudioUrl: audioUrl,
          audioDuration: response.duration || null,
          error: null,
          isGenerating: false,
        });
      } else {
        set({
          error: response.message || 'Synthesis failed',
          isGenerating: false,
        });
      }
    } catch (error) {
      console.error('Synthesis error:', error);
      let errorMessage = 'Failed to generate audio.';

      if (error instanceof Error) {
        if (error.message.includes('Network Error')) {
          errorMessage = 'Cannot connect to backend. Make sure the VocalAlchemy backend is running on port 8000.';
        } else {
          errorMessage = error.message;
        }
      }

      set({
        error: errorMessage,
        isGenerating: false,
      });
    }
  },

  clearOutput: () => {
    set({
      generatedAudioUrl: null,
      audioDuration: null,
      error: null,
    });
  },

  resetParams: () => {
    set(defaultParams);
  },
}));
