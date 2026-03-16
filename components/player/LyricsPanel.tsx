"use client";

import { useRef, useEffect } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { useLyrics } from "@/hooks/useLyrics";
import { usePlayerStore } from "@/store/playerStore";

const CONTEXT_LINES = 2; // lines to show above and below the active line

export function LyricsPanel() {
  const isLyricsVisible = usePlayerStore(s => s.isLyricsVisible);
  const { lines, activeIndex, hasLyrics, isLoading, isStatic } = useLyrics();
  const activeRef = useRef<HTMLDivElement>(null);

  // Scroll active line into view smoothly
  useEffect(() => {
    activeRef.current?.scrollIntoView({ behavior: "smooth", block: "center" });
  }, [activeIndex]);

  if (!isLyricsVisible || !hasLyrics) return null;

  return (
    <AnimatePresence>
      <motion.div
        key="lyrics-panel"
        initial={{ opacity: 0, y: 10 }}
        animate={{ opacity: 1, y: 0 }}
        exit={{ opacity: 0, y: 10 }}
        transition={{ duration: 0.3 }}
        className="absolute inset-x-0 bottom-32 flex flex-col items-center justify-end pointer-events-none px-8 pb-4"
        style={{ zIndex: 15 }}
      >
        {isLoading ? (
          <div className="text-white/40 text-sm">Loading lyrics...</div>
        ) : isStatic ? (
          <div className="flex flex-col items-center text-center max-w-2xl w-full max-h-96 overflow-y-auto">
            {lines.map((line, i) => (
              <div
                key={`${i}-${line.text}`}
                className="leading-snug text-white/80 text-base font-normal py-1 select-none"
              >
                {line.text || "\u00A0" /* non-breaking space for empty/instrumental lines */}
              </div>
            ))}
          </div>
        ) : (
          (() => {
            // Determine which lines to render (-2 to +3 around active)
            const startIdx = Math.max(0, activeIndex - CONTEXT_LINES);
            const endIdx = Math.min(lines.length - 1, activeIndex + CONTEXT_LINES + 1);
            const visibleLines = lines.slice(startIdx, endIdx + 1);

            return (
              <div className="flex flex-col items-center gap-2 text-center max-w-2xl w-full">
                {visibleLines.map((line, i) => {
                  const absoluteIndex = startIdx + i;
                  const isActive = absoluteIndex === activeIndex;
                  const distance = Math.abs(absoluteIndex - activeIndex);
                  const opacity = isActive ? 1 : distance === 1 ? 0.45 : 0.2;
                  const scale = isActive ? 1 : 0.88;

                  return (
                    <motion.div
                      key={`${absoluteIndex}-${line.text}`}
                      ref={isActive ? activeRef : null}
                      animate={{ opacity, scale }}
                      transition={{ duration: 0.25, ease: "easeOut" }}
                      className={`leading-snug transition-all select-none ${
                        isActive
                          ? "text-white text-xl font-semibold drop-shadow-lg"
                          : "text-white/60 text-base font-normal"
                      }`}
                    >
                      {line.text || "\u00A0" /* non-breaking space for empty/instrumental lines */}
                    </motion.div>
                  );
                })}
              </div>
            );
          })()
        )}
      </motion.div>
    </AnimatePresence>
  );
}
