import { create } from 'zustand';
import type { Character } from '../types';
import { characterApi } from '../services/api';

interface CharacterState {
  characters: Character[];
  selectedCharacterId: string | null;
  isLoading: boolean;
  error: string | null;

  // Actions
  fetchCharacters: () => Promise<void>;
  selectCharacter: (id: string | null) => void;
  addCharacter: (character: Character) => void;
  removeCharacter: (id: string) => Promise<void>;
  getSelectedCharacter: () => Character | undefined;
}

export const useCharacterStore = create<CharacterState>((set, get) => ({
  characters: [],
  selectedCharacterId: null,
  isLoading: false,
  error: null,

  fetchCharacters: async () => {
    set({ isLoading: true, error: null });
    try {
      const characters = await characterApi.getAll();
      set({ characters, isLoading: false });
    } catch (error) {
      console.error('Failed to fetch characters:', error);
      set({ error: 'Failed to fetch characters. Is the backend running?', isLoading: false });
    }
  },

  selectCharacter: (id) => {
    set({ selectedCharacterId: id });
  },

  addCharacter: (character) => {
    set((state) => ({
      characters: [...state.characters, character],
    }));
  },

  removeCharacter: async (id) => {
    try {
      // Call backend API to delete the character
      await characterApi.delete(id);
      // Update local state after successful deletion
      set((state) => ({
        characters: state.characters.filter((c) => c.id !== id),
        selectedCharacterId: state.selectedCharacterId === id ? null : state.selectedCharacterId,
      }));
    } catch (error) {
      console.error('Failed to delete character:', error);
      throw error;
    }
  },

  getSelectedCharacter: () => {
    const state = get();
    return state.characters.find((c) => c.id === state.selectedCharacterId);
  },
}));
