import { create } from "zustand";

interface PlayerState {
  // Playback state
  currentTrackIndex: number;
  isPlaying: boolean;
  volume: number; // 0–1
  progress: number; // 0–1
  isMuted: boolean;

  // UI state
  isPlaylistOpen: boolean;
  isStoreOpen: boolean;
  isLyricsVisible: boolean;

  // Audio analysis
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;

  // Actions
  setCurrentTrackIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setIsMuted: (muted: boolean) => void;
  togglePlaylist: () => void;
  toggleStore: () => void;
  toggleLyrics: () => void;
  setAudioContext: (ctx: AudioContext | null) => void;
  setAnalyserNode: (node: AnalyserNode | null) => void;

  // Convenience actions
  play: () => void;
  pause: () => void;
  nextTrack: () => void;
  prevTrack: () => void;
  seekTo: (progress: number) => void;
  setVolumeLevel: (level: number) => void;
  toggleMute: () => void;
}

export const usePlayerStore = create<PlayerState>((set, get) => ({
  // Initial state
  currentTrackIndex: 0,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  isMuted: false,
  isPlaylistOpen: false,
  isStoreOpen: false,
  isLyricsVisible: false,
  audioContext: null,
  analyserNode: null,

  // Basic setters
  setCurrentTrackIndex: (index) => {
    console.log("🏪 STORE: setCurrentTrackIndex called with:", index);
    set({ currentTrackIndex: index });
  },
  setIsPlaying: (playing) => {
    console.log("🏪 STORE: setIsPlaying called with:", playing);
    set({ isPlaying: playing });
  },
  setVolume: (volume) => {
    console.log("🏪 STORE: setVolume called with:", volume);
    set({ volume: Math.max(0, Math.min(1, volume)) });
  },
  setProgress: (progress) => {
    console.log("🏪 STORE: setProgress called with:", progress);
    set({ progress: Math.max(0, Math.min(1, progress)) });
  },
  setIsMuted: (muted) => {
    console.log("🏪 STORE: setIsMuted called with:", muted);
    set({ isMuted: muted });
  },
  togglePlaylist: () => set((state) => ({ isPlaylistOpen: !state.isPlaylistOpen })),
  toggleStore: () => set((state) => ({ isStoreOpen: !state.isStoreOpen })),
  toggleLyrics: () => set((state) => ({ isLyricsVisible: !state.isLyricsVisible })),
  setAudioContext: (ctx) => set({ audioContext: ctx }),
  setAnalyserNode: (node) => set({ analyserNode: node }),

  // Convenience actions
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  nextTrack: () => {
    // This will be enhanced with playlist logic later
    const { currentTrackIndex } = get();
    set({ currentTrackIndex: currentTrackIndex + 1 });
  },
  prevTrack: () => {
    const { currentTrackIndex } = get();
    set({ currentTrackIndex: Math.max(0, currentTrackIndex - 1) });
  },
  seekTo: (progress) => set({ progress }),
  setVolumeLevel: (level) => set({ volume: Math.max(0, Math.min(1, level)) }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
}));