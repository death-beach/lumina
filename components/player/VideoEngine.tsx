"use client";

import { useEffect, useRef } from "react";
import { usePlayerStore } from "@/store/playerStore";
import { usePlaylist } from "@/hooks/usePlaylist";
import { useVideo } from "@/hooks/useVideo";

// Declare YouTube API types
declare global {
  interface Window {
    YT: {
      Player: new (element: HTMLElement | null, config: unknown) => unknown;
    };
    onYouTubeIframeAPIReady: () => void;
  }
}

// Extract YouTube video ID from various URL formats
function getYouTubeVideoId(url: string): string | null {
  if (!url) return null;
  
  // youtube.com/watch?v=VIDEO_ID
  const watchMatch = url.match(/[?&]v=([^&#]+)/);
  if (watchMatch) return watchMatch[1];
  
  // youtu.be/VIDEO_ID
  const shortMatch = url.match(/youtu\.be\/([^?&#]+)/);
  if (shortMatch) return shortMatch[1];
  
  // youtube.com/embed/VIDEO_ID
  const embedMatch = url.match(/youtube\.com\/embed\/([^?&#]+)/);
  if (embedMatch) return embedMatch[1];
  
  return null;
}

// Extract Vimeo video ID from various URL formats
function getVimeoVideoId(url: string): string | null {
  if (!url) return null;
  
  // vimeo.com/VIDEO_ID or vimeo.com/channels/.../VIDEO_ID or vimeo.com/groups/.../VIDEO_ID
  const match = url.match(/vimeo\.com\/(?:.*\/)?(\d+)/);
  return match ? match[1] : null;
}

export function VideoEngine() {
  const isPlaying = usePlayerStore(s => s.isPlaying);
  const setIsPlaying = usePlayerStore(s => s.setIsPlaying);
  const setTrackDuration = usePlayerStore(s => s.setTrackDuration);
  const setProgress = usePlayerStore(s => s.setProgress);
  const volume = usePlayerStore(s => s.volume);
  const isMuted = usePlayerStore(s => s.isMuted);
  const { currentTrack, nextTrack, hasNext } = usePlaylist();

  const iframeRef = useRef<HTMLIFrameElement>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const playerRef = useRef<any>(null);
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  const vimeoPlayerRef = useRef<any>(null);

  // Only render if current track is video type
  const isVideoTrack = currentTrack?.visual.type === "video";
  const videoSrc = isVideoTrack ? (currentTrack.visual as { type: "video"; src: string; loop?: boolean }).src : "";
  
  const youtubeId = getYouTubeVideoId(videoSrc);
  const vimeoId = getVimeoVideoId(videoSrc);
  const isYouTube = !!youtubeId;
  const isVimeo = !!vimeoId;
  const isIframe = isYouTube || isVimeo;

  // For direct MP4 videos, use the existing video hook
  const seekTarget = usePlayerStore(s => s.seekTarget);
  const setSeekTarget = usePlayerStore(s => s.setSeekTarget);
  const { videoRef, play, pause, seek, duration, isLoaded, error } = useVideo(isIframe ? "" : videoSrc);

  // Report video duration to the store (for direct MP4 only)
  useEffect(() => {
    if (isIframe || !isLoaded || !duration || duration <= 0 || !currentTrack?.id) return;
    setTrackDuration(currentTrack.id, duration);
  }, [duration, isLoaded, currentTrack?.id, setTrackDuration, isIframe]);

  // Sync playback state for direct MP4
  useEffect(() => {
    if (isIframe || !isVideoTrack || !isLoaded) return;
    if (isPlaying) {
      play();
    } else {
      pause();
    }
  }, [isPlaying, isVideoTrack, isLoaded, play, pause, isIframe]);

  // Sync volume for direct MP4
  useEffect(() => {
    if (isIframe || !isVideoTrack || !videoRef.current) return;
    const video = videoRef.current;
    video.volume = isMuted ? 0 : volume;
    video.muted = isMuted;
  }, [volume, isMuted, isVideoTrack, isIframe]);

  // Handle seeking for direct MP4 with sequential coordination
  useEffect(() => {
    if (isIframe || !isVideoTrack || !isLoaded || !duration || seekTarget === null) return;
    
    const handleSeek = async () => {
      const seekTime = seekTarget * duration;
      
      // First, seek the audio (if available) and wait for confirmation
      // Note: Audio seeking is handled by useAudio hook, we just need to coordinate video seeking
      
      // Wait a brief moment to ensure audio has started seeking
      await new Promise(resolve => setTimeout(resolve, 10));
      
      // Then seek the video
      seek(seekTime);
      setSeekTarget(null);
    };
    
    handleSeek();
  }, [seekTarget, duration, isVideoTrack, isLoaded, seek, setSeekTarget, isIframe]);

  // Auto-advance for direct MP4
  useEffect(() => {
    if (isIframe || !isVideoTrack || !videoRef.current) return;
    const video = videoRef.current;
    const handleEnded = () => {
      if (hasNext) {
        nextTrack();
      } else {
        setIsPlaying(false);
      }
    };
    video.addEventListener("ended", handleEnded);
    return () => video.removeEventListener("ended", handleEnded);
  }, [isVideoTrack, hasNext, nextTrack, setIsPlaying, videoRef, isIframe]);

  // Load YouTube IFrame API
  useEffect(() => {
    if (!isYouTube) return;
    
    // Check if API is already loaded
    if (window.YT && window.YT.Player) {
      return;
    }

    // Load the API script
    const tag = document.createElement('script');
    tag.src = 'https://www.youtube.com/iframe_api';
    const firstScriptTag = document.getElementsByTagName('script')[0];
    firstScriptTag.parentNode?.insertBefore(tag, firstScriptTag);
  }, [isYouTube]);

  // Initialize YouTube player
  useEffect(() => {
    if (!isYouTube || !iframeRef.current) return;

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let player: any = null;
    let isPlayerReady = false;

    const initPlayer = () => {
      if (!window.YT || !window.YT.Player) {
        // API not ready yet, try again
        setTimeout(initPlayer, 100);
        return;
      }

      try {
        player = new window.YT.Player(iframeRef.current, {
          events: {
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onReady: (event: any) => {
              playerRef.current = event.target;
              isPlayerReady = true;
              const dur = event.target.getDuration();
              if (dur && currentTrack?.id) {
                setTrackDuration(currentTrack.id, dur);
              }
              // Start playback if supposed to be playing
              if (isPlaying) {
                event.target.playVideo();
              }
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onStateChange: (event: any) => {
              // -1 unstarted, 0 ended, 1 playing, 2 paused, 3 buffering, 5 cued
              if (event.data === 0) {
                // Video ended
                if (hasNext) {
                  nextTrack();
                } else {
                  setIsPlaying(false);
                }
              } else if (event.data === 1) {
                // Playing
                setIsPlaying(true);
              } else if (event.data === 2) {
                // Paused
                setIsPlaying(false);
              }
            },
            // eslint-disable-next-line @typescript-eslint/no-explicit-any
            onError: (event: any) => {
              console.error('YouTube player error:', event.data);
            }
          },
        });
      } catch (error) {
        console.error('Failed to create YouTube player:', error);
      }
    };

    initPlayer();

    return () => {
      isPlayerReady = false;
      if (playerRef.current) {
        try {
          playerRef.current.stopVideo();
          playerRef.current.destroy();
        } catch (e) {
          // Ignore errors during cleanup
        }
        playerRef.current = null;
      }
    };
  }, [isYouTube, youtubeId, currentTrack?.id, setTrackDuration, hasNext, nextTrack, setIsPlaying]);

  // YouTube play/pause control
  useEffect(() => {
    if (!isYouTube || !playerRef.current) return;
    
    const attemptControl = () => {
      try {
        if (isPlaying) {
          playerRef.current.playVideo();
        } else {
          playerRef.current.pauseVideo();
        }
      } catch (e) {
        // Player not ready yet, try again after a short delay
        setTimeout(attemptControl, 100);
      }
    };
    
    attemptControl();
  }, [isPlaying, isYouTube]);

  // YouTube volume control
  useEffect(() => {
    if (!isYouTube || !playerRef.current) return;
    
    const attemptVolume = () => {
      try {
        // YouTube player volume is 0-100, convert from 0-1
        const volumeLevel = isMuted ? 0 : Math.round(volume * 100);
        playerRef.current.setVolume(volumeLevel);
      } catch (e) {
        // Player not ready yet, try again after a short delay
        setTimeout(attemptVolume, 100);
      }
    };
    
    attemptVolume();
  }, [volume, isMuted, isYouTube]);

  // YouTube seeking
  useEffect(() => {
    if (!isYouTube || !playerRef.current || seekTarget === null) return;
    
    const attemptSeek = () => {
      try {
        const dur = playerRef.current.getDuration();
        if (dur && dur > 0) {
          const seekSeconds = seekTarget * dur;
          playerRef.current.seekTo(seekSeconds, true);
          // Immediately update progress to match seek position
          setProgress(seekTarget);
        }
      } catch (e) {
        // Player not ready yet, try again after a short delay
        setTimeout(attemptSeek, 100);
      }
    };
    
    attemptSeek();
    setSeekTarget(null);
  }, [seekTarget, isYouTube, setSeekTarget, setProgress]);

  // YouTube progress tracking - poll getCurrentTime() every 250ms
  useEffect(() => {
    if (!isYouTube || !isPlaying || !playerRef.current) return;

    const interval = setInterval(() => {
      try {
        const currentTime = playerRef.current?.getCurrentTime();
        const dur = playerRef.current?.getDuration();
        
        if (currentTime !== undefined && dur && dur > 0) {
          setProgress(currentTime / dur);
        }
      } catch (e) {
        // Player not ready or error
      }
    }, 250);

    return () => clearInterval(interval);
  }, [isYouTube, isPlaying, setProgress]);

  // Initialize Vimeo player
  useEffect(() => {
    if (!isVimeo || !iframeRef.current) return;

    let mounted = true;

    const initPlayer = async () => {
      try {
        const { default: Player } = await import('@vimeo/player');
        
        if (!mounted || !iframeRef.current) return;

        const player = new Player(iframeRef.current);
        vimeoPlayerRef.current = player;

        // Get duration
        const dur = await player.getDuration();
        if (dur && currentTrack?.id) {
          setTrackDuration(currentTrack.id, dur);
        }

        // Listen for time updates (fires ~250ms automatically)
        player.on('timeupdate', (data: { seconds: number; duration: number }) => {
          if (data.duration > 0) {
            setProgress(data.seconds / data.duration);
          }
        });

        // Listen for ended event
        player.on('ended', () => {
          if (hasNext) {
            nextTrack();
          } else {
            setIsPlaying(false);
          }
        });

        // Listen for play/pause state changes
        player.on('play', () => setIsPlaying(true));
        player.on('pause', () => setIsPlaying(false));

      } catch (e) {
        console.error('Vimeo player error:', e);
      }
    };

    initPlayer();

    return () => {
      mounted = false;
      if (vimeoPlayerRef.current) {
        try {
          vimeoPlayerRef.current.off('timeupdate');
          vimeoPlayerRef.current.off('ended');
          vimeoPlayerRef.current.off('play');
          vimeoPlayerRef.current.off('pause');
        } catch (e) {
          // Ignore cleanup errors
        }
        vimeoPlayerRef.current = null;
      }
    };
  }, [isVimeo, currentTrack?.id, setTrackDuration, setProgress, hasNext, nextTrack, setIsPlaying]);

  // Vimeo play/pause control
  useEffect(() => {
    if (!isVimeo || !vimeoPlayerRef.current) return;
    
    const player = vimeoPlayerRef.current;
    
    if (isPlaying) {
      player.play().catch(() => {
        // Ignore play errors
      });
    } else {
      player.pause().catch(() => {
        // Ignore pause errors
      });
    }
  }, [isPlaying, isVimeo]);

  // Vimeo volume control
  useEffect(() => {
    if (!isVimeo || !vimeoPlayerRef.current) return;
    
    const player = vimeoPlayerRef.current;
    
    // Vimeo player volume is 0-1, same as our store
    const volumeLevel = isMuted ? 0 : volume;
    player.setVolume(volumeLevel).catch(() => {
      // Ignore volume errors
    });
  }, [volume, isMuted, isVimeo]);

  // Vimeo seeking
  useEffect(() => {
    if (!isVimeo || !vimeoPlayerRef.current || seekTarget === null) return;
    
    const player = vimeoPlayerRef.current;
    
    player.getDuration().then((dur: number) => {
      if (dur && dur > 0) {
        const seekSeconds = seekTarget * dur;
        player.setCurrentTime(seekSeconds).catch(() => {
          // Ignore seek errors
        });
        // Immediately update progress to match seek position
        setProgress(seekTarget);
      }
    }).catch(() => {
      // Ignore duration errors
    });
    
    setSeekTarget(null);
  }, [seekTarget, isVimeo, setSeekTarget, setProgress]);

  // Log errors for direct MP4
  useEffect(() => {
    if (error) {
      console.error("Video error:", error);
    }
  }, [error]);

  // Don't render if not a video track
  if (!isVideoTrack) {
    return null;
  }

  // Render YouTube iframe (YT.Player will enhance it)
  if (isYouTube) {
    return (
      <div className="absolute inset-0 w-full h-full">
        <iframe
          ref={iframeRef}
          src={`https://www.youtube.com/embed/${youtubeId}?controls=0&modestbranding=1&rel=0&enablejsapi=1&autoplay=1`}
          className="absolute inset-0 w-full h-full"
          allow="autoplay; encrypted-media"
          allowFullScreen
        />
      </div>
    );
  }

  // Render Vimeo iframe (Vimeo Player SDK will enhance it)
  if (isVimeo) {
    return (
      <iframe
        ref={iframeRef}
        src={`https://player.vimeo.com/video/${vimeoId}?controls=0&background=0`}
        className="absolute inset-0 w-full h-full"
        allow="autoplay; encrypted-media"
        allowFullScreen
      />
    );
  }

  // Render direct MP4 video
  return (
    <video
      ref={videoRef}
      src={videoSrc}
      className="absolute inset-0 w-full h-full object-cover"
      playsInline
      muted={false}
      loop={(currentTrack.visual as { type: "video"; src: string; loop?: boolean }).loop || false}
      preload="metadata"
    />
  );
}
