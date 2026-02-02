import { useLocation } from 'react-router-dom';

const pageTitles: Record<string, { title: string; subtitle: string }> = {
  '/': {
    title: 'Voice Synthesis',
    subtitle: 'Generate character voices with AI',
  },
  '/characters': {
    title: 'Character Repository',
    subtitle: 'Manage your trained character voices',
  },
  '/training': {
    title: 'New Character',
    subtitle: 'Train a new character voice model',
  },
  '/settings': {
    title: 'Settings',
    subtitle: 'Configure application preferences',
  },
};

export default function Header() {
  const location = useLocation();
  const pageInfo = pageTitles[location.pathname] || {
    title: 'VocalAlchemy',
    subtitle: '',
  };

  return (
    <header className="h-20 border-b border-border flex items-center px-8">
      <div>
        <h2 className="text-2xl font-semibold text-text-primary">
          {pageInfo.title}
        </h2>
        {pageInfo.subtitle && (
          <p className="text-text-muted text-sm mt-1">{pageInfo.subtitle}</p>
        )}
      </div>
    </header>
  );
}
