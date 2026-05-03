import { create } from "zustand";

interface PlayerState {
  // Playback state
  currentTrackIndex: number;
  isPlaying: boolean;
  volume: number; // 0–1
  progress: number; // 0–1
  isMuted: boolean;
  seekTarget: number | null; // set only on user-initiated seek, cleared after seek
  isTransitioning: boolean; // true while a new track is loading after a skip

  // UI state
  isPlaylistOpen: boolean;
  isStoreOpen: boolean;
  isLyricsVisible: boolean;

  // Audio analysis
  audioContext: AudioContext | null;
  analyserNode: AnalyserNode | null;
  // Per-track durations (seconds), populated by Howler on load and Audio metadata probing
  trackDurations: Record<string, number>;

  // Imperative play bridge — useAudio registers the active Howl's play fn here
  // so Controls can call it synchronously within the user gesture (iOS fix).
  imperativePlay: (() => void) | null;
  registerImperativePlay: (fn: (() => void) | null) => void;

  // Actions
  setCurrentTrackIndex: (index: number) => void;
  setIsPlaying: (playing: boolean) => void;
  setVolume: (volume: number) => void;
  setProgress: (progress: number) => void;
  setIsMuted: (muted: boolean) => void;
  setSeekTarget: (target: number | null) => void;
  setIsTransitioning: (transitioning: boolean) => void;
  togglePlaylist: () => void;
  toggleStore: () => void;
  toggleLyrics: () => void;
  setAudioContext: (ctx: AudioContext | null) => void;
  setAnalyserNode: (node: AnalyserNode | null) => void;
  setTrackDuration: (trackId: string, duration: number) => void;

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
  imperativePlay: null,
  currentTrackIndex: 0,
  isPlaying: false,
  volume: 0.8,
  progress: 0,
  isMuted: false,
  seekTarget: null,
  isTransitioning: false,
  isPlaylistOpen: false,
  isStoreOpen: false,
  isLyricsVisible: false,
  audioContext: null,
  analyserNode: null,
  trackDurations: {},

  registerImperativePlay: (fn) => set({ imperativePlay: fn }),

  // Basic setters
  setCurrentTrackIndex: (index) =>
    set({ currentTrackIndex: index, progress: 0, seekTarget: null, isTransitioning: true }),
  setIsPlaying: (playing) => set({ isPlaying: playing }),
  setVolume: (volume) => set({ volume: Math.max(0, Math.min(1, volume)) }),
  setProgress: (progress) => set({ progress: Math.max(0, Math.min(1, progress)) }),
  setIsMuted: (muted) => set({ isMuted: muted }),
  setSeekTarget: (target) => set({ seekTarget: target }),
  setIsTransitioning: (transitioning) => set({ isTransitioning: transitioning }),
  togglePlaylist: () => set((state) => ({ isPlaylistOpen: !state.isPlaylistOpen })),
  toggleStore: () => set((state) => ({ isStoreOpen: !state.isStoreOpen })),
  toggleLyrics: () => set((state) => ({ isLyricsVisible: !state.isLyricsVisible })),
  setAudioContext: (ctx) => set({ audioContext: ctx }),
  setAnalyserNode: (node) => set({ analyserNode: node }),
  setTrackDuration: (trackId, duration) =>
    set((state) => ({
      trackDurations: { ...state.trackDurations, [trackId]: duration },
    })),

  // Convenience actions
  play: () => set({ isPlaying: true }),
  pause: () => set({ isPlaying: false }),
  nextTrack: () => {
    const { currentTrackIndex } = get();
    set({ currentTrackIndex: currentTrackIndex + 1, progress: 0, seekTarget: null, isTransitioning: true });
  },
  prevTrack: () => {
    const { currentTrackIndex } = get();
    set({ currentTrackIndex: Math.max(0, currentTrackIndex - 1), progress: 0, seekTarget: null, isTransitioning: true });
  },
  seekTo: (progress) => set({ seekTarget: progress, progress }),
  setVolumeLevel: (level) => set({ volume: Math.max(0, Math.min(1, level)) }),
  toggleMute: () => set((state) => ({ isMuted: !state.isMuted })),
}));
