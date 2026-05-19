import { Achievement } from '../types';
import { Award, Lock, CheckCircle, X } from 'lucide-react';

interface AchievementsModalProps {
  isOpen: boolean;
  onClose: () => void;
  achievements: Achievement[];
}

export default function AchievementsModal({
  isOpen,
  onClose,
  achievements
}: AchievementsModalProps) {
  if (!isOpen) return null;

  const unlockedCount = achievements.filter((a) => a.unlocked).length;
  const percentComplete = Math.round((unlockedCount / achievements.length) * 100);

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
            <Award className="w-6 h-6 text-emerald-400 animate-bounce" />
            <div className="text-left">
              <h2 className="text-xl font-black tracking-tight text-white font-sans leading-tight">
                Frog Achievements
              </h2>
              <p className="text-xs text-white/60">
                Unlocked: {unlockedCount} / {achievements.length} ({percentComplete}%)
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            aria-label="Close"
            className="p-2 text-white/60 hover:text-white hover:bg-white/10 rounded-xl transition-all cursor-pointer"
          >
            <X className="w-5 h-5" />
          </button>
        </div>

        {/* Progress bar */}
        <div className="w-full bg-white/10 rounded-full h-2 mb-4 overflow-hidden flex-shrink-0">
          <div
            className="bg-emerald-400 h-full rounded-full transition-all duration-500"
            style={{ width: `${percentComplete}%` }}
          />
        </div>

        {/* Achievements list */}
        <div className="flex-1 overflow-y-auto pr-1 space-y-3">
          {achievements.map((achievement) => {
            const isUnlocked = achievement.unlocked;

            return (
              <div
                key={achievement.id}
                className={`flex items-center gap-3.5 p-3 rounded-2xl border transition-all ${
                  isUnlocked
                    ? 'bg-emerald-500/5 border-emerald-500/25 shadow-[0_4px_16px_rgba(16,185,129,0.05)]'
                    : 'bg-white/5 border-white/10 opacity-75'
                }`}
              >
                {/* Badge Icon */}
                <div
                  className={`w-12 h-12 rounded-2xl flex items-center justify-center text-2xl relative ${
                    isUnlocked
                      ? 'bg-emerald-500/20 border-2 border-emerald-400'
                      : 'bg-white/10 border border-white/20'
                  }`}
                >
                  <span className={isUnlocked ? '' : 'filter grayscale contrast-75'}>
                    {achievement.icon}
                  </span>
                  {!isUnlocked && (
                    <div className="absolute -bottom-1 -right-1 bg-black border border-white/20 p-0.5 rounded-full">
                      <Lock className="w-3 h-3 text-white/40" />
                    </div>
                  )}
                </div>

                {/* Details */}
                <div className="flex-1 text-left min-w-0">
                  <div className="flex items-center justify-between">
                    <h3
                      className={`text-sm font-bold truncate leading-tight ${
                        isUnlocked ? 'text-white' : 'text-slate-400'
                      }`}
                    >
                      {achievement.title}
                    </h3>
                    {isUnlocked && (
                      <CheckCircle className="w-4 h-4 text-emerald-400 flex-shrink-0 ml-1.5" />
                    )}
                  </div>
                  <p className="text-xs text-slate-400 mt-0.5 leading-relaxed">
                    {achievement.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
