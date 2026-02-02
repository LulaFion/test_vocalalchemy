import { useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import Sidebar from './Sidebar';
import Header from './Header';
import { useCharacterStore } from '../../stores/characterStore';

export default function Layout() {
  const fetchCharacters = useCharacterStore((state) => state.fetchCharacters);

  // Fetch characters on app load
  useEffect(() => {
    fetchCharacters();
  }, [fetchCharacters]);

  return (
    <div className="min-h-screen bg-canvas">
      <Sidebar />
      <div className="ml-64">
        <Header />
        <main className="p-8">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
