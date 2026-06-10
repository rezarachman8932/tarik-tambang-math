import { motion } from "motion/react";
import { Delete, Play } from "lucide-react";

interface NumpadViewProps {
  onDigit: (digit: string) => void;
  onBackspace: () => void;
  onConfirm: () => void;
  className?: string;
  disabled?: boolean;
  enableDecimal?: boolean;
  theme?: "blue" | "red" | "neutral";
}

export default function NumpadView({
  onDigit,
  onBackspace,
  onConfirm,
  className = "",
  disabled = false,
  enableDecimal = true,
  theme = "neutral"
}: NumpadViewProps) {
  const getThemeClasses = (key: string) => {
    if (disabled) return "bg-gray-100 text-gray-400 border-gray-200 cursor-not-allowed";

    if (key === "GO") {
      if (theme === "blue") return "bg-blue-600 text-white hover:bg-blue-700 active:bg-blue-800 shadow-md border-blue-700 font-bold";
      if (theme === "red") return "bg-red-600 text-white hover:bg-red-700 active:bg-red-800 shadow-md border-red-700 font-bold";
      return "bg-amber-600 text-white hover:bg-amber-700 active:bg-amber-800 shadow-md border-amber-700 font-bold";
    }

    if (key === "C") {
      return "bg-amber-50 text-amber-900 border-amber-200 hover:bg-amber-100 active:bg-amber-200";
    }

    return "bg-white text-gray-800 border-gray-200 shadow-sm hover:bg-gray-50 active:bg-gray-100";
  };

  const keys = [
    ["1", "2", "3"],
    ["4", "5", "6"],
    ["7", "8", "9"],
    [enableDecimal ? "." : "", "0", "C"]
  ];

  return (
    <div className={`w-full max-w-sm flex flex-col gap-2 select-none ${className}`}>
      {keys.map((row, rowIndex) => (
        <div key={rowIndex} className="flex gap-2 w-full">
          {row.map((key, keyIndex) => {
            if (key === "") {
              return <div key={`empty-${keyIndex}`} className="flex-1 min-h-[52px]" />;
            }

            return (
              <motion.button
                key={key}
                whileTap={disabled ? {} : { scale: 0.95 }}
                type="button"
                onClick={() => {
                  if (disabled) return;
                  if (key === "C") onBackspace();
                  else onDigit(key);
                }}
                disabled={disabled}
                className={`flex-1 min-h-[52px] min-w-[52px] h-14 rounded-2xl border flex items-center justify-center font-sans text-xl font-semibold transition-colors focus:outline-none ${getThemeClasses(key)}`}
              >
                {key === "C" ? <Delete className="w-5 h-5 text-amber-800" /> : key}
              </motion.button>
            );
          })}
        </div>
      ))}

      {/* Robust Go Button on its own bottom row to match layouts */}
      <motion.button
        whileTap={disabled ? {} : { scale: 0.97 }}
        type="button"
        onClick={() => {
          if (!disabled) onConfirm();
        }}
        disabled={disabled}
        className={`w-full min-h-[54px] h-14 rounded-2xl border text-xl flex items-center justify-center gap-2 focus:outline-none ${getThemeClasses("GO")}`}
      >
        <Play className="w-5 h-5 animate-pulse text-amber-100" />
        <span className="font-extrabold tracking-wider animate-bounce">TARIK! 🪢</span>
      </motion.button>
    </div>
  );
}
