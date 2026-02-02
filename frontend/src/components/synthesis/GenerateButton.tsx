import { useSynthesisStore } from '../../stores/synthesisStore';
import { useCharacterStore } from '../../stores/characterStore';
import { SparklesIcon } from '@heroicons/react/24/solid';

export default function GenerateButton() {
  const { text, isGenerating, generate } = useSynthesisStore();
  const { selectedCharacterId, getSelectedCharacter } = useCharacterStore();

  const selectedCharacter = getSelectedCharacter();
  const canGenerate = !isGenerating && text.trim() && selectedCharacterId;

  const handleGenerate = () => {
    if (selectedCharacter) {
      generate(selectedCharacter);
    }
  };

  return (
    <div className="flex items-center gap-4">
      <button
        onClick={handleGenerate}
        disabled={!canGenerate}
        className="btn-primary flex items-center gap-2 text-lg px-8 py-4"
      >
        {isGenerating ? (
          <>
            <svg
              className="animate-spin h-5 w-5"
              xmlns="http://www.w3.org/2000/svg"
              fill="none"
              viewBox="0 0 24 24"
            >
              <circle
                className="opacity-25"
                cx="12"
                cy="12"
                r="10"
                stroke="currentColor"
                strokeWidth="4"
              />
              <path
                className="opacity-75"
                fill="currentColor"
                d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
              />
            </svg>
            生成中... (Generating...)
          </>
        ) : (
          <>
            <SparklesIcon className="w-5 h-5" />
            合成 (Synthesize)
          </>
        )}
      </button>

      {!selectedCharacterId && (
        <span className="text-text-muted text-sm">
          請選擇角色以生成 (Select a character to generate)
        </span>
      )}

      {selectedCharacter && (
        <span className="text-text-secondary">
          使用 (as) <span className="text-primary font-medium">{selectedCharacter.name}</span>
        </span>
      )}
    </div>
  );
}
