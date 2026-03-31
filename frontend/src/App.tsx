import { useGameStore } from './store/gameStore';
import { HomePage } from './pages/HomePage';
import { LobbyPage } from './pages/LobbyPage';
import { GamePage } from './pages/GamePage';
import { ResultPage } from './pages/ResultPage';

export default function App() {
  const phase = useGameStore((s) => s.phase);
  const connected = useGameStore((s) => s.connected);

  return (
    <div className="w-full flex flex-col items-center relative">
      {/* Connection indicator */}
      {phase !== 'home' && (
        <div className="fixed top-3 right-3 z-50">
          <div
            className={`w-2.5 h-2.5 rounded-full ${
              connected ? 'bg-neon-green' : 'bg-neon-pink animate-pulse'
            }`}
            title={connected ? 'Connected' : 'Disconnected'}
          />
        </div>
      )}

      {/* Phase-based routing */}
      {phase === 'home' && <HomePage />}
      {(phase === 'lobby' || phase === 'waiting') && <LobbyPage />}
      {phase === 'playing' && <GamePage />}
      {phase === 'result' && <ResultPage />}
    </div>
  );
}
