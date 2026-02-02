import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useCharacterStore } from '../stores/characterStore';
import { trainingApi, characterApi } from '../services/api';
import {
  PlusIcon,
  TrashIcon,
  PlayIcon,
  EllipsisVerticalIcon,
  ArrowPathIcon,
  ChevronDownIcon,
  ChevronUpIcon,
} from '@heroicons/react/24/outline';
import type { Character } from '../types';

function CharacterCard({ character }: { character: Character }) {
  const navigate = useNavigate();
  const { selectCharacter, removeCharacter } = useCharacterStore();
  const [showMenu, setShowMenu] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  const handleUseCharacter = () => {
    selectCharacter(character.id);
    navigate('/');
  };

  const handleDelete = async () => {
    if (isDeleting) return;
    setIsDeleting(true);
    try {
      await removeCharacter(character.id);
      setShowMenu(false);
    } catch (error) {
      console.error('Failed to delete character:', error);
      alert('Failed to delete character. Please try again.');
    } finally {
      setIsDeleting(false);
    }
  };

  const getStatusColor = () => {
    switch (character.status) {
      case 'ready':
        return 'bg-green-500';
      case 'training':
        return 'bg-yellow-500 animate-pulse';
      case 'failed':
        return 'bg-red-500';
      default:
        return 'bg-gray-500';
    }
  };

  const getStatusText = () => {
    switch (character.status) {
      case 'ready':
        return '就緒 (Ready)';
      case 'training':
        return '訓練中... (Training...)';
      case 'failed':
        return '失敗 (Failed)';
      default:
        return '未知 (Unknown)';
    }
  };

  return (
    <div className="character-card relative group">
      {/* Menu Button */}
      <div className="absolute top-4 right-4">
        <button
          onClick={() => setShowMenu(!showMenu)}
          className="p-2 rounded-lg opacity-0 group-hover:opacity-100 transition-opacity
                     hover:bg-canvas"
        >
          <EllipsisVerticalIcon className="w-5 h-5 text-text-muted" />
        </button>

        {showMenu && (
          <div className="absolute right-0 mt-2 w-40 bg-surface border border-border rounded-lg shadow-lg z-10">
            <button
              onClick={handleDelete}
              disabled={isDeleting}
              className="w-full flex items-center gap-2 px-4 py-2 text-left text-accent hover:bg-canvas rounded-lg disabled:opacity-50"
            >
              <TrashIcon className="w-4 h-4" />
              {isDeleting ? '刪除中... (Deleting...)' : '刪除 (Delete)'}
            </button>
          </div>
        )}
      </div>

      {/* Avatar */}
      <div className="w-20 h-20 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center mb-4">
        <span className="text-white font-bold text-3xl">
          {character.name.charAt(0).toUpperCase()}
        </span>
      </div>

      {/* Name & Status */}
      <h3 className="text-lg font-semibold text-text-primary mb-2">
        {character.name}
      </h3>

      <div className="flex items-center gap-2 mb-4">
        <div className={`w-2 h-2 rounded-full ${getStatusColor()}`} />
        <span className="text-text-muted text-sm">{getStatusText()}</span>
      </div>

      {/* Metadata */}
      <div className="space-y-1 mb-4 text-sm text-text-muted">
        <p>語言 (Language): {character.language}</p>
        {character.audioMinutes && (
          <p>訓練音頻 (Training audio): {character.audioMinutes} 分鐘 (min)</p>
        )}
        <p>
          創建於 (Created):{' '}
          {new Date(character.createdAt).toLocaleDateString()}
        </p>
      </div>

      {/* Action Button */}
      {character.status === 'ready' && (
        <button
          onClick={handleUseCharacter}
          className="btn-secondary w-full flex items-center justify-center gap-2"
        >
          <PlayIcon className="w-4 h-4" />
          使用角色 (Use Character)
        </button>
      )}

      {character.status === 'training' && (
        <div className="space-y-2">
          <div className="progress-bar">
            <div className="progress-bar-fill" style={{ width: '45%' }} />
          </div>
          <p className="text-text-muted text-xs text-center">
            處理音頻切片中... (Processing audio slices...)
          </p>
        </div>
      )}

      {character.status === 'failed' && (
        <button className="btn-ghost w-full text-accent">
          查看錯誤詳情 (View Error Details)
        </button>
      )}
    </div>
  );
}

// Trash item component
function TrashItem({
  character,
  onRestore,
  onPermanentDelete,
}: {
  character: Character;
  onRestore: (id: string) => Promise<void>;
  onPermanentDelete: (id: string) => Promise<void>;
}) {
  const [isRestoring, setIsRestoring] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  // Calculate days remaining before permanent deletion
  const deletedDate = character.deletedAt ? new Date(character.deletedAt) : new Date();
  const expiryDate = new Date(deletedDate.getTime() + 7 * 24 * 60 * 60 * 1000);
  const daysRemaining = Math.max(0, Math.ceil((expiryDate.getTime() - Date.now()) / (24 * 60 * 60 * 1000)));

  const handleRestore = async () => {
    if (isRestoring) return;
    setIsRestoring(true);
    try {
      await onRestore(character.id);
    } finally {
      setIsRestoring(false);
    }
  };

  const handlePermanentDelete = async () => {
    if (isDeleting) return;
    if (!confirm(`Are you sure you want to permanently delete "${character.name}"? This cannot be undone.`)) {
      return;
    }
    setIsDeleting(true);
    try {
      await onPermanentDelete(character.id);
    } finally {
      setIsDeleting(false);
    }
  };

  return (
    <div className="flex items-center justify-between p-3 bg-canvas rounded-lg">
      <div className="flex items-center gap-3">
        <div className="w-10 h-10 rounded-full bg-gradient-to-br from-gray-400 to-gray-600 flex items-center justify-center opacity-50">
          <span className="text-white font-bold text-lg">
            {character.name.charAt(0).toUpperCase()}
          </span>
        </div>
        <div>
          <p className="text-text-primary font-medium">{character.name}</p>
          <p className="text-text-muted text-xs">
            {daysRemaining > 0
              ? `${daysRemaining} 天後刪除 (${daysRemaining} days left)`
              : '即將刪除 (Expiring soon)'}
          </p>
        </div>
      </div>
      <div className="flex items-center gap-2">
        <button
          onClick={handleRestore}
          disabled={isRestoring}
          className="p-2 text-green-500 hover:bg-green-500/10 rounded-lg transition-colors disabled:opacity-50"
          title="Restore"
        >
          <ArrowPathIcon className="w-5 h-5" />
        </button>
        <button
          onClick={handlePermanentDelete}
          disabled={isDeleting}
          className="p-2 text-accent hover:bg-accent/10 rounded-lg transition-colors disabled:opacity-50"
          title="Delete Permanently"
        >
          <TrashIcon className="w-5 h-5" />
        </button>
      </div>
    </div>
  );
}

export default function Characters() {
  const { characters, fetchCharacters } = useCharacterStore();
  const navigate = useNavigate();
  const [activeProjects, setActiveProjects] = useState<{ id: string; name: string; status: string }[]>([]);
  const [trashedCharacters, setTrashedCharacters] = useState<Character[]>([]);
  const [showTrash, setShowTrash] = useState(false);

  // Fetch trashed characters
  const fetchTrash = async () => {
    try {
      const trashed = await characterApi.getTrash();
      setTrashedCharacters(trashed);
    } catch (err) {
      console.error('Failed to fetch trash:', err);
    }
  };

  useEffect(() => {
    const fetchTrainingProjects = async () => {
      try {
        const projects = await trainingApi.listProjects();
        // Filter projects that are actively training (not completed or failed)
        const activeStatuses = ['pending', 'uploading', 'preprocessing', 'separating_vocals', 'slicing', 'transcribing', 'labeling', 'preparing', 'training_gpt', 'training_sovits'];
        const active = projects.filter(p => activeStatuses.includes(p.status));
        setActiveProjects(active.map(p => ({ id: p.id, name: p.name, status: p.status })));
      } catch (err) {
        console.error('Failed to fetch training projects:', err);
      }
    };

    fetchTrainingProjects();
    fetchTrash();
    // Poll every 5 seconds to keep count updated
    const interval = setInterval(fetchTrainingProjects, 5000);
    return () => clearInterval(interval);
  }, []);

  // Handle restore from trash
  const handleRestore = async (id: string) => {
    try {
      await characterApi.restore(id);
      await fetchTrash();
      await fetchCharacters();
    } catch (err) {
      console.error('Failed to restore character:', err);
      alert('Failed to restore character. Please try again.');
    }
  };

  // Handle permanent delete
  const handlePermanentDelete = async (id: string) => {
    try {
      await characterApi.permanentDelete(id);
      await fetchTrash();
    } catch (err) {
      console.error('Failed to permanently delete character:', err);
      alert('Failed to delete character. Please try again.');
    }
  };

  const handleTrainingBoxClick = () => {
    if (activeProjects.length === 1) {
      // Directly resume the only active project
      navigate(`/training?projectId=${activeProjects[0].id}`);
    } else if (activeProjects.length > 1) {
      // Show resume dialog for multiple projects
      navigate('/training');
    }
  };

  const trainingCount = activeProjects.length;

  return (
    <div className="max-w-6xl mx-auto">
      {/* Stats Bar */}
      <div className="grid grid-cols-3 gap-4 mb-8">
        <div className="card text-center">
          <p className="text-3xl font-bold text-primary">
            {characters.filter((c) => c.status === 'ready').length}
          </p>
          <p className="text-text-muted text-sm">就緒 (Ready)</p>
        </div>
        <div
          className={`card text-center ${trainingCount > 0 ? 'cursor-pointer hover:border-yellow-500 transition-colors' : ''}`}
          onClick={handleTrainingBoxClick}
        >
          <p className="text-3xl font-bold text-yellow-500">
            {trainingCount}
          </p>
          <p className="text-text-muted text-sm">訓練中 (Training)</p>
          {trainingCount > 0 && (
            <p className="text-yellow-500 text-xs mt-1">點擊繼續 (Click to resume)</p>
          )}
        </div>
        <div className="card text-center">
          <p className="text-3xl font-bold text-text-secondary">
            {characters.length}
          </p>
          <p className="text-text-muted text-sm">總數 (Total)</p>
        </div>
      </div>

      {/* Character Grid */}
      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {/* Add New Character Card */}
        <button
          onClick={() => navigate('/training')}
          className="card border-dashed border-2 hover:border-primary flex flex-col items-center justify-center min-h-[300px] group"
        >
          <div className="w-16 h-16 rounded-full bg-surface group-hover:bg-primary/20 flex items-center justify-center mb-4 transition-colors">
            <PlusIcon className="w-8 h-8 text-text-muted group-hover:text-primary transition-colors" />
          </div>
          <p className="text-text-muted group-hover:text-text-primary font-medium">
            新增角色 (Add New Character)
          </p>
        </button>

        {/* Character Cards */}
        {characters.map((character) => (
          <CharacterCard key={character.id} character={character} />
        ))}
      </div>

      {/* Trash Section */}
      {trashedCharacters.length > 0 && (
        <div className="mt-12">
          <button
            onClick={() => setShowTrash(!showTrash)}
            className="flex items-center gap-2 text-text-muted hover:text-text-primary transition-colors mb-4"
          >
            <TrashIcon className="w-5 h-5" />
            <span>垃圾桶 (Trash) ({trashedCharacters.length})</span>
            {showTrash ? (
              <ChevronUpIcon className="w-4 h-4" />
            ) : (
              <ChevronDownIcon className="w-4 h-4" />
            )}
          </button>

          {showTrash && (
            <div className="card">
              <p className="text-text-muted text-sm mb-4">
                已刪除的角色將在 7 天後永久刪除 (Deleted characters will be permanently removed after 7 days)
              </p>
              <div className="space-y-2">
                {trashedCharacters.map((character) => (
                  <TrashItem
                    key={character.id}
                    character={character}
                    onRestore={handleRestore}
                    onPermanentDelete={handlePermanentDelete}
                  />
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
