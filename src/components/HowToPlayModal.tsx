import { BookOpen, X, Mouse, Zap, Flag } from 'lucide-react';

interface HowToPlayModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function HowToPlayModal({ isOpen, onClose }: HowToPlayModalProps) {
  if (!isOpen) return null;

  return (
    <div
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-md animate-fade-in"
    >
      <div className="relative w-full max-w-sm bg-black/45 border border-white/20 rounded-3xl p-6 shadow-2xl backdrop-blur-xl max-h-[85vh] flex flex-col">
        {/* Header */}
        <div className="flex items-center justify-between mb-4 flex-shrink-0">
          <div className="flex items-center gap-2">
            <BookOpen className="w-5 h-5 text-indigo-405" />
            <h2 className="text-lg font-black text-white font-sans tracking-tight">
              Frog Training Academy
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
        <div className="flex-1 overflow-y-auto pr-1 space-y-4 text-left">
          {/* Card 1 */}
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
            <div className="p-2 bg-indigo-500/10 text-indigo-300 rounded-xl mt-0.5">
              <Mouse className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-0.5">Simple Jump Tap</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Tap or click <b>anywhere</b> on the screen, or press the <b>Spacebar</b> on keyboard, to make the frog glide upwards.
              </p>
            </div>
          </div>

          {/* Card 2 */}
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
            <div className="p-2 bg-yellow-500/10 text-yellow-300 rounded-xl mt-0.5 text-lg font-mono flex items-center justify-center h-10 w-10">
              🦟
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-1">Insect Powers Feast</h3>
              <p className="text-[11px] text-slate-300 leading-normal mb-2">
                Eating insects grants active, visual super-powers directly to your froggy:
              </p>
              <div className="grid grid-cols-2 gap-2 text-[10px]">
                <div className="bg-white/5 p-1.5 rounded-lg border border-white/10">
                  <span className="font-extrabold text-[#4caf50]">🪲 Beetle</span>
                  <p className="text-white/60 text-[9px] mt-0.5">Shield: Saves you from 1 floor or obstacle hit!</p>
                </div>
                <div className="bg-white/5 p-1.5 rounded-lg border border-white/10">
                  <span className="font-extrabold text-[#df40af]">🦟 Mosquito</span>
                  <p className="text-white/60 text-[9px] mt-0.5">Anti-Gravity: Float & glide through the air!</p>
                </div>
                <div className="bg-white/5 p-1.5 rounded-lg border border-white/10">
                  <span className="font-extrabold text-[#ff9100]">🔥 Firefly</span>
                  <p className="text-white/60 text-[9px] mt-0.5">Magnet: Automatically pulls nearby flies to you!</p>
                </div>
                <div className="bg-white/5 p-1.5 rounded-lg border border-white/10">
                  <span className="font-extrabold text-[#ffd700]">⚡ Dragonfly</span>
                  <p className="text-white/60 text-[9px] mt-0.5">Gold Rush: Earn x2 double points for eating!</p>
                </div>
              </div>
            </div>
          </div>

          {/* Card 3 */}
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
            <div className="p-2 bg-emerald-500/10 text-emerald-300 rounded-xl mt-0.5">
              <Zap className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-0.5">Adaptive Landscapes</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Unlock achievements as you fly—including the daytime <b>🌿 Pond</b>, twilight <b>🌙 Night</b>, or sizzling <b>🏜️ Desert</b>!
              </p>
            </div>
          </div>

          {/* Card 4 (Obstacles) */}
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
            <div className="p-2 bg-rose-500/10 text-rose-300 rounded-xl mt-0.5 text-lg font-mono flex items-center justify-center h-10 w-10">
              🦅
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-0.5">Swooping Birds & Jumping Fish</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Watch out for flying <b>birds</b> and jumping <b>fish</b>! Colliding with them terminates the run immediately unless you have a <b>Beetle Shield</b>!
              </p>
            </div>
          </div>

          {/* Card 5 */}
          <div className="flex items-start gap-3 p-3 bg-white/5 rounded-2xl border border-white/10">
            <div className="p-2 bg-indigo-500/10 text-indigo-300 rounded-xl mt-0.5">
              <Flag className="w-5 h-5" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white mb-0.5">Gravity Sucks</h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                The water or ground will pull you down quickly. Keep tapping to keep Flappy Frog afloat!
              </p>
            </div>
          </div>
        </div>

        {/* Footer */}
        <button
          onClick={onClose}
          className="mt-4 w-full py-3 bg-white hover:bg-neutral-100 text-slate-900 text-xs font-black tracking-widest rounded-xl transition-all cursor-pointer shadow-lg active:scale-[98%] flex-shrink-0"
        >
          Got It, Let&apos;s Hop!
        </button>
      </div>
    </div>
  );
}
