import * as React from 'react';
import { useState, useEffect } from 'react';
import {
  Volume2,
  VolumeX,
  Trophy,
  Award,
  HelpCircle,
  Share2,
  Download,
  Sparkles,
  Play,
  User,
  Plus
} from 'lucide-react';
import GameRenderer from './components/GameRenderer';
import LeaderboardModal from './components/LeaderboardModal';
import AchievementsModal from './components/AchievementsModal';
import HowToPlayModal from './components/HowToPlayModal';
import { GameState, ThemeName, LeaderboardEntry, Achievement } from './types';
import { THEMES_DATA, INITIAL_ACHIEVEMENTS } from './utils/gameData';
import { toggleMutedState, getMutedState, playUnlockSound } from './utils/audio';

// Pre-populated cool retro frog names for initial leaderboard entries
const DEFAULT_LEADERBOARD: LeaderboardEntry[] = [
  { name: 'Slippy', score: 32, theme: 'NightForest', date: '2026-05-18T10:00:00Z' },
  { name: 'Toad', score: 22, theme: 'Pond', date: '2026-05-17T14:30:00Z' },
  { name: 'Bullfrog', score: 15, theme: 'Desert', date: '2026-05-19T08:15:00Z' },
  { name: 'Kermit', score: 8, theme: 'Pond', date: '2026-05-19T13:40:00Z' }
];

export default function App() {
  // Game states
  const [gameState, setGameState] = useState<GameState>('start');
  const [themeName, setThemeName] = useState<ThemeName>('Pond');
  const [score, setScore] = useState<number>(0);
  const [bestScore, setBestScore] = useState<number>(0);
  const [isMuted, setIsMuted] = useState<boolean>(false);

  // Leaderboard & Achievements storage
  const [leaderboard, setLeaderboard] = useState<LeaderboardEntry[]>([]);
  const [achievements, setAchievements] = useState<Achievement[]>([]);

  // Modals visibility toggles
  const [isLeaderboardOpen, setIsLeaderboardOpen] = useState(false);
  const [isAchievementsOpen, setIsAchievementsOpen] = useState(false);
  const [isHelpOpen, setIsHelpOpen] = useState(false);

  // High score name entry form
  const [playerName, setPlayerName] = useState('');
  const [hasSubmittedScore, setHasSubmittedScore] = useState(false);

  // Live Toast/Notification list
  const [toasts, setToasts] = useState<{ id: string; title: string; desc: string; icon: string }[]>([]);

  // Load configuration from LocalStorage on mount
  useEffect(() => {
    try {
      // 1. High Score
      const localBest = localStorage.getItem('ffBest');
      if (localBest) {
        setBestScore(parseInt(localBest));
      }

      // 2. Leaderboard
      const localLeader = localStorage.getItem('ffLeaderboard');
      if (localLeader) {
        setLeaderboard(JSON.parse(localLeader));
      } else {
        setLeaderboard(DEFAULT_LEADERBOARD);
        localStorage.setItem('ffLeaderboard', JSON.stringify(DEFAULT_LEADERBOARD));
      }

      // 3. Achievements
      const localAch = localStorage.getItem('ffAchievements');
      if (localAch) {
        setAchievements(JSON.parse(localAch));
      } else {
        setAchievements(INITIAL_ACHIEVEMENTS);
        localStorage.setItem('ffAchievements', JSON.stringify(INITIAL_ACHIEVEMENTS));
      }

      // 4. Mute Setting
      setIsMuted(getMutedState());
    } catch (e) {
      console.warn('LocalStorage load failure', e);
    }
  }, []);

  // Helper to trigger custom on-screen notification toast
  const triggerToast = (title: string, desc: string, icon: string) => {
    const id = Math.random().toString(36).substring(2, 9);
    setToasts((prev) => [...prev, { id, title, desc, icon }]);

    // Play retro level-up tone for achievement unlock
    playUnlockSound();

    setTimeout(() => {
      setToasts((prev) => prev.filter((t) => t.id !== id));
    }, 4500);
  };

  // Check achievements unlock status on score increments
  const handleScoreUpdate = (newScore: number) => {
    setScore(newScore);

    // Filter achievements that are locked and evaluate them
    const updatedAchievements = achievements.map((ach) => {
      if (ach.unlocked) return ach;

      let shouldUnlock = false;

      // Score types
      if (ach.type === 'score' && newScore >= ach.targetValue) {
        shouldUnlock = true;
      }

      // Theme-specific triggers (evaluated live)
      if (ach.type === 'theme' && ach.targetValue <= newScore) {
        if (ach.id === 'theme_pond_15' && themeName === 'Pond') shouldUnlock = true;
        if (ach.id === 'theme_night_15' && themeName === 'NightForest') shouldUnlock = true;
        if (ach.id === 'theme_desert_15' && themeName === 'Desert') shouldUnlock = true;
      }

      if (shouldUnlock) {
        triggerToast(ach.title, ach.description, ach.icon);
        return { ...ach, unlocked: true };
      }

      return ach;
    });

    // If change occurred, save to state and key storage
    if (JSON.stringify(updatedAchievements) !== JSON.stringify(achievements)) {
      setAchievements(updatedAchievements);
      try {
        localStorage.setItem('ffAchievements', JSON.stringify(updatedAchievements));
      } catch (e) {
        console.warn('Could not save achievements', e);
      }
    }
  };

  // Executed on critical collision / death event
  const handleGameOver = (finalScore: number) => {
    setGameState('gameover');
    setHasSubmittedScore(false);
    setPlayerName('');

    // Check high score progress
    if (finalScore > bestScore) {
      setBestScore(finalScore);
      try {
        localStorage.setItem('ffBest', String(finalScore));
      } catch (e) {
        console.warn('Could not save high score', e);
      }
    }

    // Trigger theme post-score achievement updates strictly on gameover as well
    handleScoreUpdate(finalScore);
  };

  const handleStartGame = () => {
    setScore(0);
    setGameState('playing');
  };

  const handleToggleMuted = (e: React.MouseEvent) => {
    e.stopPropagation();
    const muted = toggleMutedState();
    setIsMuted(muted);
  };

  const handleThemeChange = (name: ThemeName, e: React.MouseEvent) => {
    e.stopPropagation();
    setThemeName(name);
  };

  // Adding runs with customizable players to Leaderboard
  const submitLeaderboardRun = (e: React.FormEvent) => {
    e.preventDefault();
    if (!playerName.trim() || hasSubmittedScore) return;

    const newEntry: LeaderboardEntry = {
      name: playerName.trim().substring(0, 14),
      score: score,
      theme: themeName,
      date: new Date().toISOString()
    };

    const nextLeaderboard = [...leaderboard, newEntry]
      .sort((a, b) => b.score - a.score)
      .slice(0, 15); // Top 15 players

    setLeaderboard(nextLeaderboard);
    setHasSubmittedScore(true);
    try {
      localStorage.setItem('ffLeaderboard', JSON.stringify(nextLeaderboard));
    } catch (err) {
      console.warn('Failed to commit run', err);
    }

    // Open leaderboard modal directly to show off rank
    setTimeout(() => {
      setIsLeaderboardOpen(true);
    }, 500);
  };

  const clearLeaderboard = () => {
    try {
      localStorage.setItem('ffLeaderboard', JSON.stringify([]));
      setLeaderboard([]);
    } catch (e) {
      console.warn('Failed to clear leaderboard', e);
    }
  };

  // Native share utility fallback mock
  const handleShareGame = (e: React.MouseEvent, text: string) => {
    e.stopPropagation();
    if (navigator.share) {
      navigator.share({
        title: 'Flappy Frog 3D',
        text: text,
        url: window.location.href
      }).catch(() => {});
    } else {
      // Copy to clipboard fallback
      navigator.clipboard.writeText(`${text} - Join the pond at: ${window.location.href}`);
      alert('Invite link copied to clipboard! Share with your friends.');
    }
  };

  return (
    <div className="w-full h-dvh flex items-center justify-center select-none relative overflow-hidden bg-zinc-950 text-white font-sans">
      {/* ── VERTICAL PORTRAIT CHASSIS ── */}
      <div className="relative w-full max-w-[430px] h-full flex flex-col justify-between overflow-hidden bg-slate-950 shadow-[0_0_80px_rgba(0,0,0,0.85)] sm:border-x sm:border-white/10">
        {/* ── Background engine layer ── */}
        <GameRenderer
          gameState={gameState}
          themeName={themeName}
          onScoreUpdate={handleScoreUpdate}
          onGameOver={handleGameOver}
        />

        {/* ── Floating Achievement Toast Notifications ── */}
        <div className="absolute top-20 left-4 right-4 z-50 flex flex-col gap-2 pointer-events-none max-w-[398px] font-sans">
          {toasts.map((toast) => (
            <div
              key={toast.id}
              className="flex items-center gap-3 p-3 bg-black/80 backdrop-blur-md border border-emerald-400 rounded-2xl shadow-[0_10px_25px_rgba(16,185,129,0.25)] animate-slide-in pointer-events-auto transition-all"
            >
              <div className="text-2xl bg-emerald-500/15 p-1 rounded-xl">{toast.icon}</div>
              <div className="text-left flex-1">
                <div className="text-[8px] font-mono font-bold text-emerald-400 uppercase tracking-widest leading-none mb-0.5">
                  🏆 Achievement!
                </div>
                <div className="text-xs font-extrabold text-white leading-tight">{toast.title}</div>
                <div className="text-[10px] text-white/60 leading-tight">{toast.desc}</div>
              </div>
            </div>
          ))}
        </div>

        {/* ── TOP HUD HEADER ── */}
        <div className="relative pointer-events-none p-4 pt-5 flex justify-between items-center z-30 w-full gap-4 bg-gradient-to-b from-black/60 to-transparent">
          {/* Active Insects Tally score */}
          <div className="bg-black/50 backdrop-blur-md rounded-2xl p-3 border border-white/10 w-44 pointer-events-auto flex flex-col items-start text-left shadow-lg">
            <div className="text-[9px] uppercase tracking-widest text-white/50 mb-0.5 font-bold">Flies Muncher</div>
            <div className="text-xl font-black text-white flex items-center gap-1.5 font-mono leading-none">🪲 {score}</div>
            <div className="mt-1.5 w-full h-1 bg-white/10 rounded-full overflow-hidden flex items-center">
              <div 
                className="h-full bg-lime-400 transition-all duration-300" 
                style={{ width: `${Math.min(100, bestScore > 0 ? (score / bestScore) * 100 : 100)}%` }}
              ></div>
            </div>
            {bestScore > 0 && (
              <span className="text-[8px] font-mono text-lime-400/85 mt-1 font-bold">Best Record: {bestScore}</span>
            )}
          </div>

          <div className="flex gap-1.5 pointer-events-auto">
            {/* Theme button */}
            {gameState !== 'playing' && (
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  const names: ThemeName[] = ['Pond', 'NightForest', 'Desert'];
                  const nextIndex = (names.indexOf(themeName) + 1) % names.length;
                  setThemeName(names[nextIndex]);
                }}
                className="pointer-events-auto bg-white hover:bg-neutral-100 text-slate-900 border border-white/40 px-2.5 py-1.5 rounded-xl flex items-center justify-center shadow-lg text-[10px] font-black tracking-wider transition-all cursor-pointer whitespace-nowrap animate-fade-in"
              >
                🎨 {THEMES_DATA[themeName].label}
              </button>
            )}

            {/* Mute button */}
            <button
              onClick={handleToggleMuted}
              aria-label="Toggle sound"
              className="pointer-events-auto bg-white hover:bg-neutral-100 text-slate-900 border border-white/40 p-2.5 rounded-xl flex items-center justify-center shadow-lg transition-all cursor-pointer"
            >
              {isMuted ? <VolumeX className="w-3.5 h-3.5 text-rose-500" /> : <Volume2 className="w-3.5 h-3.5 text-emerald-600" />}
            </button>
          </div>
        </div>

        {/* ── START SCREEN OVERLAY ── */}
      {gameState === 'start' && (
        <div className="relative inset-0 flex flex-col justify-center items-center p-4 z-40 flex-1 my-auto animate-fade-in bg-black/40 backdrop-blur-[2px]">
          {/* Custom cartoon frog emoji indicator bobbing */}
          <span className="text-7xl sm:text-8xl filter drop-shadow-[0_15px_24px_rgba(76,255,72,0.45)] mb-3 select-none animate-bounce">
            🐸
          </span>

          {/* Heading Logo text with deep shading */}
          <h1 className="text-4xl sm:text-6xl font-black tracking-tight text-emerald-400 text-center leading-none select-none select-all relative">
            FLAPPY FROG
            <span className="absolute -inset-1 rounded-lg bg-emerald-500/10 blur opacity-30 pointer-events-none" />
          </h1>
          <p className="text-xs font-mono font-bold uppercase tracking-[0.4em] text-emerald-300 mt-2 select-none mb-6">
            Ultimate Edition
          </p>

          {/* Core Interactive Panel */}
          <div className="w-full max-w-sm rounded-[2.2rem] bg-black/45 border border-white/20 p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-5 relative">
            <div className="absolute inset-0 rounded-[2.2rem] border-t border-white/20 pointer-events-none" />

            {/* CTA action trigger click/tap */}
            <div
              onClick={handleStartGame}
              className="py-4 px-6 rounded-2xl bg-white hover:bg-neutral-100 text-slate-900 font-sans font-black tracking-widest text-xs text-center shadow-lg hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 uppercase cursor-pointer flex items-center justify-center gap-2"
            >
              <Play className="w-4 h-4 fill-current text-slate-900" /> Tap to Start Game
            </div>

            {/* Quick Environment Selector row */}
            <div className="flex flex-col gap-2">
              <div className="text-[10px] text-white/60 font-mono tracking-widest text-left font-bold">
                SELECT ARENA LANDSCAPE
              </div>
              <div className="grid grid-cols-3 gap-1.5">
                {(Object.keys(THEMES_DATA) as ThemeName[]).map((name) => {
                  const item = THEMES_DATA[name];
                  const isActive = themeName === name;
                  return (
                    <button
                      key={name}
                      onClick={(e) => handleThemeChange(name, e)}
                      className={`flex flex-col items-center justify-center py-2.5 rounded-2xl border text-xs font-black transition-all cursor-pointer ${
                        isActive
                          ? 'border-white bg-white/25 text-white scale-105 shadow-md shadow-white/10'
                          : 'border-white/10 bg-black/20 text-white/50 hover:border-white/20 hover:text-white'
                      }`}
                    >
                      <span className="text-lg mb-0.5">{item.emoji}</span>
                      <span>{item.label}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* Mini Dashboard links (how to play, records, achievements) */}
            <div className="grid grid-cols-3 gap-2 pt-2 border-t border-white/10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsHelpOpen(true);
                }}
                className="flex flex-col items-center py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/25 transition-all text-white cursor-pointer"
              >
                <HelpCircle className="w-4 h-4 text-indigo-300" />
                <span className="text-[10px] font-bold mt-1 font-sans">Academy</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLeaderboardOpen(true);
                }}
                className="flex flex-col items-center py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/25 transition-all text-white cursor-pointer"
              >
                <Trophy className="w-4 h-4 text-yellow-300" />
                <span className="text-[10px] font-bold mt-1 font-sans">Rankings</span>
              </button>

              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAchievementsOpen(true);
                }}
                className="flex flex-col items-center py-2 rounded-xl bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/25 transition-all text-white cursor-pointer"
              >
                <Award className="w-4 h-4 text-emerald-350 animate-pulse" />
                <span className="text-[10px] font-bold mt-1 font-sans">Badges</span>
              </button>
            </div>

            {/* Social Share Invite block */}
            <div className="mt-2 pt-4 border-t border-white/10 flex flex-col gap-2">
              <div className="text-[10px] text-white/50 font-mono tracking-widest text-center font-bold">
                INVITE CO-PLAYERS
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={(e) => handleShareGame(e, 'I am gliding on Flappy Frog 3D Ultimate Edition! Check it out!')}
                  className="px-4 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-xl flex items-center justify-center gap-1.5 transition-all text-white cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-sky-400" />
                  Invite
                </button>
                <button
                  onClick={(e) => handleShareGame(e, 'Challenge me in the Flappy Frog arenas!')}
                  className="px-4 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-xl flex items-center justify-center gap-1.5 transition-all text-white cursor-pointer"
                >
                  <Download className="w-3.5 h-3.5 text-purple-400" />
                  Get App
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── PLAYING BOTTOM HUD TIP ── */}
      {gameState === 'playing' && (
        <div className="relative text-center pb-10 z-35 pointer-events-none flex flex-col items-center gap-6">
          <div className="flex gap-4">
            <div className="w-2.5 h-2.5 rounded-full bg-red-500 shadow-[0_0_10px_rgba(239,68,68,0.8)] animate-pulse"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-white/20"></div>
            <div className="w-2.5 h-2.5 rounded-full bg-white/20"></div>
          </div>
          <div className="bg-white/15 backdrop-blur-md border border-white/20 rounded-full px-8 py-3 text-white font-black flex items-center gap-3 shadow-2xl">
            <span className="animate-pulse text-emerald-400">●</span>
            <span className="text-xs uppercase tracking-[0.2em] font-sans">Press SPACE or TAP to Hop</span>
            <span className="animate-pulse text-emerald-400">●</span>
          </div>
        </div>
      )}

      {/* ── GAMEOVER SCREEN OVERLAY ── */}
      {gameState === 'gameover' && (
        <div className="relative inset-0 flex flex-col justify-center items-center p-4 z-40 flex-1 my-auto animate-fade-in bg-black/60 backdrop-blur-md">
          {/* Skull and trophy element indicator */}
          <span className="text-6xl sm:text-7xl filter drop-shadow-[0_12px_22px_rgba(244,63,94,0.45)] mb-3 animate-pulse">
            💀
          </span>

          <h2 className="text-3xl sm:text-5xl font-black tracking-tight text-rose-500 text-center leading-none mb-6">
            GAME OVER
          </h2>

          <div className="w-full max-w-sm rounded-[2.2rem] bg-black/45 border border-white/20 p-6 shadow-2xl backdrop-blur-xl flex flex-col gap-5 relative">
            <div className="absolute inset-0 rounded-[2.2rem] border-t border-white/20 pointer-events-none" />

            {/* Score Stats Grid */}
            <div className="grid grid-cols-2 gap-3 p-4 bg-white/10 border border-white/20 rounded-3xl">
              <div className="text-center">
                <div className="text-[10px] text-white/60 font-mono tracking-widest font-black uppercase">
                  SCORE RUN
                </div>
                <div className="text-3xl font-black text-white mt-1 font-mono">🪲 {score}</div>
              </div>

              <div className="text-center border-l border-white/25 pl-3">
                <div className="text-[10px] text-yellow-300 font-mono tracking-widest font-bold uppercase flex items-center justify-center gap-1">
                  <Trophy className="w-3 h-3 text-yellow-300" /> BEST
                </div>
                <div className="text-3xl font-black text-yellow-300 mt-1 font-mono">🪲 {bestScore}</div>
              </div>
            </div>

            {/* SUBMIT RECORD FORM - Only available if they played and didn't submit yet */}
            {score > 0 && !hasSubmittedScore ? (
              <form
                onSubmit={submitLeaderboardRun}
                className="flex flex-col gap-2 p-3 bg-white/5 border border-white/15 rounded-3xl"
              >
                <div className="text-left px-1">
                  <div className="text-[10px] text-emerald-400 font-mono font-black tracking-widest uppercase flex items-center gap-1.5">
                    <Sparkles className="w-3 h-3 text-emerald-400 animate-pulse" /> Ranked Leaderboard Spot!
                  </div>
                </div>
                <div className="flex gap-2">
                  <div className="relative flex-1">
                    <User className="absolute left-3 top-2.5 w-4 h-4 text-white/50" />
                    <input
                      type="text"
                      maxLength={14}
                      value={playerName}
                      onChange={(e) => setPlayerName(e.target.value)}
                      placeholder="Frog username"
                      className="w-full pl-9 pr-3 py-2 text-base md:text-xs bg-white/10 rounded-xl border border-white/20 text-white placeholder-white/30 focus:outline-none focus:ring-1 focus:ring-white"
                    />
                  </div>
                  <button
                    type="submit"
                    disabled={!playerName.trim()}
                    className="px-4 py-2 bg-white hover:bg-neutral-100 active:scale-95 disabled:opacity-50 text-slate-900 font-black text-xs rounded-xl flex items-center gap-1 transition-all cursor-pointer"
                  >
                    <Plus className="w-3.5 h-3.5 font-bold" /> Log
                  </button>
                </div>
              </form>
            ) : score > 0 && hasSubmittedScore ? (
              <div className="text-center text-xs font-mono text-emerald-400 py-1 bg-emerald-500/10 border border-emerald-400/20 rounded-2xl flex items-center justify-center gap-1.5 animate-pulse">
                <Sparkles className="w-3.5 h-3.5 text-emerald-400" /> Score submitted to rankings!
              </div>
            ) : null}

            {/* Replay Option */}
            <button
              onClick={handleStartGame}
              className="py-4 px-6 rounded-2xl bg-white hover:bg-neutral-100 text-slate-900 font-sans font-black tracking-widest text-xs shadow-lg hover:scale-[1.02] active:scale-[0.97] transition-all duration-200 flex items-center justify-center gap-2 cursor-pointer uppercase"
            >
              <Play className="w-4 h-4 fill-current text-slate-900" /> PLAY AGAIN
            </button>

            {/* Grid of secondary commands */}
            <div className="grid grid-cols-2 gap-2 pt-2 border-t border-white/10">
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsLeaderboardOpen(true);
                }}
                className="py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-white transition-all cursor-pointer"
              >
                <Trophy className="w-3.5 h-3.5 text-yellow-300" /> Rankings
              </button>
              <button
                onClick={(e) => {
                  e.stopPropagation();
                  setIsAchievementsOpen(true);
                }}
                className="py-2.5 px-3 bg-white/10 hover:bg-white/20 border border-white/10 rounded-2xl flex items-center justify-center gap-2 text-xs font-bold text-white transition-all cursor-pointer"
              >
                <Award className="w-3.5 h-3.5 text-emerald-350" /> Badges
              </button>
            </div>

            {/* Challenge friends block */}
            <div className="pt-3 border-t border-white/10 flex flex-col gap-2">
              <div className="text-[10px] text-white/50 font-mono tracking-widest text-center font-bold">
                CHALLENGE FRIENDS
              </div>
              <div className="flex gap-2 justify-center">
                <button
                  onClick={(e) =>
                    handleShareGame(
                      e,
                      `Can you beat my high score of 🪲 ${score} points on Flappy Frog 3D? Let's hop!`
                    )
                  }
                  className="px-4 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-xl flex items-center justify-center gap-1.5 transition-all text-white cursor-pointer"
                >
                  <Share2 className="w-3.5 h-3.5 text-rose-300" />
                  Challenge Score
                </button>
                <button
                  onClick={() => {
                    setScore(0);
                    setGameState('start');
                  }}
                  className="px-4 py-2 text-xs font-bold bg-white/10 hover:bg-white/20 border border-white/10 hover:border-white/20 rounded-xl flex items-center justify-center transition-all text-white cursor-pointer"
                >
                  ◀ Main Menu
                </button>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* ── MODALS overlay layers ── */}
      <LeaderboardModal
        isOpen={isLeaderboardOpen}
        onClose={() => setIsLeaderboardOpen(false)}
        entries={leaderboard}
        onClear={clearLeaderboard}
      />

      <AchievementsModal
        isOpen={isAchievementsOpen}
        onClose={() => setIsAchievementsOpen(false)}
        achievements={achievements}
      />

      <HowToPlayModal isOpen={isHelpOpen} onClose={() => setIsHelpOpen(false)} />
      </div>
    </div>
  );
}
