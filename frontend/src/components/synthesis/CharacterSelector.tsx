import { Link } from 'react-router-dom';
import { useCharacterStore } from '../../stores/characterStore';
import { UserCircleIcon, MusicalNoteIcon, SparklesIcon, PlusIcon } from '@heroicons/react/24/solid';

const DEFAULT_CHARACTER_ID = 'default';

export default function CharacterSelector() {
  const { characters, selectedCharacterId, selectCharacter } = useCharacterStore();

  const readyCharacters = characters.filter((c) => c.status === 'ready');

  // Separate default character from trained characters
  const defaultCharacter = readyCharacters.find(c => c.id === DEFAULT_CHARACTER_ID);
  const trainedCharacters = readyCharacters.filter(c => c.id !== DEFAULT_CHARACTER_ID);

  return (
    <div className="card">
      <h3 className="text-lg font-semibold text-text-primary mb-4">
        選擇角色 (Select Character)
        <span className="text-text-muted font-normal ml-2">
          ({readyCharacters.length} 個可用)
        </span>
      </h3>

      {readyCharacters.length === 0 ? (
        <div className="text-center py-8">
          <UserCircleIcon className="w-12 h-12 text-text-muted mx-auto mb-3" />
          <p className="text-text-muted">沒有可用的角色 (No characters available)</p>
          <p className="text-text-muted text-sm">訓練一個新角色開始使用 (Train a new character to get started)</p>
        </div>
      ) : (
        <div className="space-y-4">
          {/* Default (Zero-shot) Character - Always shown first with special styling */}
          {defaultCharacter && (
            <div>
              <p className="text-xs text-text-muted uppercase tracking-wider mb-2">零樣本語音克隆 (Zero-shot Voice Cloning)</p>
              <button
                onClick={() => selectCharacter(defaultCharacter.id)}
                className={`w-full p-4 rounded-lg border transition-all duration-200 text-left
                  ${
                    selectedCharacterId === defaultCharacter.id
                      ? 'border-secondary bg-secondary/10 shadow-glow-secondary'
                      : 'border-border hover:border-secondary/50 bg-canvas'
                  }
                `}
              >
                <div className="flex items-center gap-4">
                  {/* Special Avatar for Default */}
                  <div className="w-14 h-14 rounded-full bg-gradient-to-br from-secondary to-purple-500 flex items-center justify-center">
                    <SparklesIcon className="w-7 h-7 text-white" />
                  </div>

                  <div className="flex-1">
                    {/* Name */}
                    <p className="font-medium text-text-primary">
                      {defaultCharacter.name}
                    </p>
                    <p className="text-text-muted text-sm mt-1">
                      只需參考音頻即可克隆任何聲音 (Clone any voice with just a reference audio)
                    </p>

                    {/* Tags */}
                    <div className="flex items-center gap-2 mt-2">
                      <span className="px-2 py-0.5 text-xs rounded bg-secondary/20 text-secondary">
                        預訓練 (Pretrained)
                      </span>
                      <span className="px-2 py-0.5 text-xs rounded bg-surface text-text-muted">
                        多語言 (Multi-language)
                      </span>
                    </div>
                  </div>
                </div>
              </button>
            </div>
          )}

          {/* Trained Characters */}
          <div>
            <p className="text-xs text-text-muted uppercase tracking-wider mb-2">微調語音 (Fine-tuned Voices)</p>
            <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-4">
              {trainedCharacters.map((character) => (
                <button
                  key={character.id}
                  onClick={() => selectCharacter(character.id)}
                  className={`p-4 rounded-lg border transition-all duration-200 text-left
                    ${
                      selectedCharacterId === character.id
                        ? 'border-primary bg-primary/10 shadow-glow-primary'
                        : 'border-border hover:border-primary/50 bg-canvas'
                    }
                  `}
                >
                  {/* Avatar */}
                  <div className="w-12 h-12 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-3">
                    <span className="text-white font-bold text-lg">
                      {character.name.charAt(0).toUpperCase()}
                    </span>
                  </div>

                  {/* Name */}
                  <p className="font-medium text-text-primary truncate">
                    {character.name}
                  </p>

                  {/* Language tag and reference indicator */}
                  <div className="flex items-center gap-2 mt-2 flex-wrap">
                    <span className="px-2 py-0.5 text-xs rounded bg-surface text-text-muted">
                      {character.language}
                    </span>
                    {character.modelPaths?.referenceAudio && (
                      <span className="px-2 py-0.5 text-xs rounded bg-secondary/20 text-secondary flex items-center gap-1">
                        <MusicalNoteIcon className="w-3 h-3" />
                        Ref
                      </span>
                    )}
                  </div>
                </button>
              ))}

              {/* Add New Character Button */}
              <Link
                to="/training"
                className="p-4 rounded-lg border-2 border-dashed border-border hover:border-primary/50 bg-canvas hover:bg-primary/5 transition-all duration-200 flex flex-col items-center justify-center text-center min-h-[140px]"
              >
                <div className="w-12 h-12 rounded-full bg-surface flex items-center justify-center mb-3">
                  <PlusIcon className="w-6 h-6 text-text-muted" />
                </div>
                <p className="font-medium text-text-muted">新增 (Add New)</p>
                <p className="text-text-muted text-xs mt-1">訓練語音 (Train a voice)</p>
              </Link>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
