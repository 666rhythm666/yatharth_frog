import { LeaderboardEntry } from '../types';
import { Trophy, Calendar, Sparkles, Trash2, X } from 'lucide-react';

interface LeaderboardModalProps {
  isOpen: boolean;
  onClose: () => void;
  entries: LeaderboardEntry[];
  onClear: () => void;
}

export default function LeaderboardModal({
  isOpen,
  onClose,
  entries,
  onClear
}: LeaderboardModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-md bg-black/45 border border-white/20 rounded-3xl p-6 shadow-2xl backdrop-blur-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <Trophy className="w-6 h-6 text-yellow-400" />
            <h2 className="text-xl font-black tracking-tight text-white font-sans">
              Top Frog Hoppers
            </h2>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Content */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-2">
          {entries.length === 0 ? (
            <div className="text-center py-12 text-slate-400">
              <Sparkles className="w-12 h-12 text-slate-600 mx-auto mb-3 animate-pulse" />
              <p className="text-sm font-medium">No records yet. Be the first to hopper!</p>
            </div>
          ) : (
            entries.map((entry, index) => {
              const rank = index + 1;
              const isGold = rank === 1;
              const isSilver = rank === 2;
              const isBronze = rank === 3;

              return (
                <div
                  key={index}
                  className={`flex items-center justify-between p-3.5 rounded-2xl border transition-all ${
                    isGold
                      ? 'bg-yellow-500/10 border-yellow-500/30 text-yellow-150'
                      : isSilver
                      ? 'bg-slate-350/10 border-white/20 text-slate-300'
                      : isBronze
                      ? 'bg-amber-700/10 border-amber-600/30 text-amber-300'
                      : 'bg-white/5 border-white/10 text-slate-300'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    {/* Rank Badge */}
                    <div
                      className={`w-8 h-8 rounded-xl flex items-center justify-center font-mono text-sm font-black ${
                        isGold
                          ? 'bg-yellow-500 text-slate-950 font-mono shadow-[0_0_12px_rgba(234,179,8,0.4)]'
                          : isSilver
                          ? 'bg-slate-300 text-slate-900 font-mono'
                          : isBronze
                          ? 'bg-amber-600 text-white font-mono'
                          : 'bg-white/10 text-white/60 font-mono border border-white/20'
                      }`}
                    >
                      {rank}
                    </div>

                    <div>
                      <div className="font-bold text-white flex items-center gap-1.5 leading-tight">
                        {entry.name}
                        {isGold && <Sparkles className="w-3.5 h-3.5 text-yellow-400 animate-pulse" />}
                      </div>
                      <div className="text-[10px] text-white/50 font-mono flex items-center gap-1 mt-0.5">
                        <Calendar className="w-2.5 h-2.5" />
                        {new Date(entry.date).toLocaleDateString()}
                        <span className="opacity-40">|</span>
                        <span>{entry.theme === 'NightForest' ? '🌙 Night' : entry.theme === 'Desert' ? '🏜️ Desert' : '🌿 Pond'}</span>
                      </div>
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="text-lg font-black tracking-tight text-white font-sans font-mono">
                      🪲 {entry.score}
                    </div>
                  </div>
                </div>
              );
            })
          )}
        </div>

        {/* Footer Actions */}
        {entries.length > 0 && (
          <div className="mt-4 pt-4 border-t border-white/10 flex justify-between items-center flex-shrink-0">
            <button
              onClick={onClear}
              className="flex items-center gap-2 text-xs font-bold text-rose-400 hover:text-rose-300 bg-white/5 hover:bg-white/10 border border-white/10 px-3 py-2 rounded-xl cursor-pointer transition-all"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear Records
            </button>
            <p className="text-[10px] text-slate-500 font-mono">
              Saved locally
            </p>
          </div>
        )}
      </div>
    </div>
  );
}
