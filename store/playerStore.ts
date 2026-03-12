import { create } from "zustand";

interface PlayerState {
  // Playback state
  currentTrackIndex: number;
  isPlaying: boolean;
  volume: number; // 0–1
  progress: number; // 0–1
  isMuted: boolean;
  seekTarget: number | null; // set only on user-initiated seek, cleared after seek

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
  setSeekTarget: (target: number | null) => void;
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
  seekTo: (progress: number) => void; // user-initiated seek
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
  seekTarget: null,
  isPlaylistOpen: false,
  isStoreOpen: false,
  isLyricsVisible: false,
  audioContext: null,
  analyserNode: null,

  // Basic setters
  setCurrentTrackIndex: (index) => set({ currentTrackIndex: index }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setProgress: (progress) => set({ progress: Math.max(0, Math.min(1, progress)) }),
  setIsMuted: (muted) => set({ isMuted: muted }),
  setSeekTarget: (target) => set({ seekTarget: target }),
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
  seekTo: (progress) => set({ seekTarget: progress, progress }),
  setVolumeLevel: (level) => set({ volume: Math.max(0, Math.min(1, level)) }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
}));