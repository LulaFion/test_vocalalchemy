import { NavLink } from 'react-router-dom';
import {
  SpeakerWaveIcon,
  UserGroupIcon,
  FolderIcon,
  Cog6ToothIcon,
} from '@heroicons/react/24/outline';

const navigation = [
  { name: '語音合成 (Voice Synthesis)', href: '/', icon: SpeakerWaveIcon },
  { name: '角色管理 (Characters)', href: '/characters', icon: UserGroupIcon },
  { name: '音頻庫 (Library)', href: '/library', icon: FolderIcon },
  { name: '設定 (Settings)', href: '/settings', icon: Cog6ToothIcon },
];

export default function Sidebar() {
  return (
    <aside className="fixed left-0 top-0 h-screen w-64 bg-surface border-r border-border flex flex-col">
      {/* Logo */}
      <div className="p-6 border-b border-border">
        <h1 className="font-display text-2xl font-bold gradient-text">
          VocalAlchemy
        </h1>
        <p className="text-text-muted text-sm mt-1">AI 角色語音系統 (AI Character Voice System)</p>
      </div>

      {/* Navigation */}
      <nav className="flex-1 p-4 space-y-2">
        {navigation.map((item) => (
          <NavLink
            key={item.name}
            to={item.href}
            className={({ isActive }) =>
              `nav-link ${isActive ? 'active' : ''}`
            }
          >
            <item.icon className="w-5 h-5" />
            <span>{item.name}</span>
          </NavLink>
        ))}
      </nav>

      {/* Footer */}
      <div className="p-4 border-t border-border">
        <div className="flex items-center gap-3">
          <div className="w-2 h-2 rounded-full bg-green-500 animate-pulse" />
          <span className="text-text-muted text-sm">GPT-SoVITS 就緒 (Ready)</span>
        </div>
      </div>
    </aside>
  );
}
