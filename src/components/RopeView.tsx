import { motion } from "motion/react";

interface RopeViewProps {
  ropePosition: number; // -7 to +7
  shake: boolean;
}

export default function RopeView({ ropePosition, shake }: RopeViewProps) {
  // Convert -7 to +7 positions to percentage offsets (0% to 100%, 50% is center)
  // Each step is 100% / 15 steps space (from -7 to +7 = 15 points including 0)
  // Position -7 -> 10%, 0 -> 50%, +7 -> 90%
  const percentageOffset = 50 + (ropePosition / 7) * 40;

  const isSnapped = Math.abs(ropePosition) >= 7;

  return (
    <div className="relative w-full h-40 bg-gradient-to-b from-amber-50 to-orange-50 rounded-3xl border-4 border-amber-300 shadow-2xl flex flex-col justify-center items-center overflow-hidden p-4">
      
      {/* Playful background highlights */}
      <div className="absolute left-4 top-2 text-2xl animate-pulse opacity-60">☁️</div>
      <div className="absolute right-6 top-3 text-xl animate-bounce opacity-50">✨</div>
      <div className="absolute left-1/3 top-1 text-lg opacity-40">🎈</div>

      {/* Absolute Markers representing progress checkpoints */}
      <div className="absolute inset-x-8 top-3 flex justify-between text-[11px] font-black tracking-wide text-amber-950/60 select-none">
        <span className="flex items-center gap-1 text-blue-800 bg-blue-50 border border-blue-200 px-2 py-0.5 rounded-full text-[9px]">◀ KAMU (P1)</span>
        <span className="opacity-40">-6</span>
        <span className="opacity-40">-4</span>
        <span className="opacity-40">-2</span>
        <span className="text-amber-950 font-black bg-amber-200 px-1.5 rounded text-xs animate-bounce">Tengah 🎯</span>
        <span className="opacity-40">+2</span>
        <span className="opacity-40">+4</span>
        <span className="opacity-40">+6</span>
        <span className="flex items-center gap-1 text-red-800 bg-red-50 border border-red-200 px-2 py-0.5 rounded-full text-[9px]">LAWAN (P2) ▶</span>
      </div>

      <motion.div
        animate={shake ? { x: [-10, 8, -6, 4, -2, 0] } : { x: 0 }}
        transition={{ duration: 0.35 }}
        className="relative w-full h-12 flex items-center justify-center max-w-4xl px-8"
      >
        {/* Red Zone Left end */}
        <div className="absolute left-4 w-4 h-8 rounded-full bg-blue-600 border border-blue-200 shadow-sm" />
        
        {/* Rope body: Braided custom double layer color SVG */}
        <div className="relative w-full h-4 flex items-center">
          {/* Blue portion of the rope (Left) */}
          <motion.div 
            animate={isSnapped ? { x: -60, rotate: -20, y: 15, opacity: 0.7 } : { x: 0, rotate: 0, y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 10 }}
            className="h-2.5 bg-gradient-to-r from-blue-600 to-blue-400 rounded-l-full shadow-sm origin-left relative"
            style={{ width: `${percentageOffset}%` }}
          >
            {isSnapped && (
              <span className="absolute right-0 -top-2 text-sm select-none">💥</span>
            )}
          </motion.div>

          {/* Red portion of the rope (Right) */}
          <motion.div 
            animate={isSnapped ? { x: 60, rotate: 20, y: 15, opacity: 0.7 } : { x: 0, rotate: 0, y: 0, opacity: 1 }}
            transition={{ type: "spring", stiffness: 260, damping: 10 }}
            className="h-2.5 bg-gradient-to-r from-red-400 to-red-600 rounded-r-full shadow-sm origin-right relative"
            style={{ width: `${100 - percentageOffset}%` }}
          >
            {isSnapped && (
              <span className="absolute left-0 -top-2 text-sm select-none">💥</span>
            )}
          </motion.div>

          {/* Rope textured braids using inline background patterns */}
          <div className="absolute inset-0 h-2.5 opacity-25 bg-[radial-gradient(circle,_#fff_10%,_transparent_11%)] bg-[length:12px_12px] pointer-events-none" />
        </div>

        {/* Comic burst at the snapping point */}
        {isSnapped && (
          <motion.div
            initial={{ scale: 0, opacity: 0, rotate: -15 }}
            animate={{ scale: [0, 1.4, 1], opacity: 1, rotate: 0 }}
            transition={{ duration: 0.4, ease: "easeOut" }}
            className="absolute z-30 pointer-events-none flex flex-col items-center justify-center transform -translate-x-1/2"
            style={{ left: `${percentageOffset}%` }}
          >
            <div className="bg-gradient-to-r from-red-500 to-orange-500 text-white font-black text-xs px-3 py-1.5 rounded-2xl uppercase tracking-wider border-2 border-white shadow-xl flex items-center gap-1">
              <span>💥 TALI PUTUS!</span>
            </div>
            <div className="flex gap-4 mt-1.5">
              <span className="text-xs animate-ping text-orange-400">⚡</span>
              <span className="text-xs animate-ping text-yellow-400 delay-100">✨</span>
            </div>
          </motion.div>
        )}

        {/* Red Zone Right end */}
        <div className="absolute right-4 w-4 h-8 rounded-full bg-red-600 border border-red-200 shadow-sm" />

        {/* Floating Flag with elegant red banner and smooth motion animations */}
        <motion.div
          animate={isSnapped ? { 
            x: `${(ropePosition / 7) * 160}px`,
            y: 130, 
            rotate: 150, 
            opacity: 0,
            scale: 0.8
          } : { 
            x: `${(ropePosition / 7) * 160}px`,
            y: 0, 
            rotate: 0, 
            opacity: 1,
            scale: 1
          }}
          transition={isSnapped ? { 
            duration: 0.75, 
            ease: "easeIn" 
          } : { 
            type: "spring", 
            stiffness: 120, 
            damping: 15 
          }}
          className="absolute z-10 flex flex-col items-center"
        >
          {/* Rope knot anchor */}
          <div className="w-5 h-5 bg-yellow-500 rounded-full border-2 border-white shadow-md flex items-center justify-center animate-pulse">
            <div className="w-2 h-2 bg-amber-800 rounded-full" />
          </div>

          {/* Banner flag */}
          <div className="relative -mt-10 flex flex-col items-center">
            {/* Visual Flag */}
            <div className="w-9 h-7 bg-red-500 rounded-r-md border-y border-r border-red-600 shadow-md flex items-center justify-center pl-1 font-bold text-white text-xs select-none">
              🚩
            </div>
            {/* Pole line */}
            <div className="w-1 h-3 bg-amber-800" />
          </div>
        </motion.div>
      </motion.div>

      {/* Guide lines for Center */}
      <div className="absolute bottom-2 inset-x-0 flex justify-center">
        <div className="w-0.5 h-3 bg-amber-900/20" />
      </div>
    </div>
  );
}
