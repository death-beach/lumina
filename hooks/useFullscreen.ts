"use client";

import { useState, useCallback, useEffect } from "react";

interface UseFullscreenReturn {
  isFullscreen: boolean;
  isSupported: boolean;
  toggle: () => void;
  enter: () => void;
  exit: () => void;
}

/**
 * Detect Fullscreen API support once, outside React rendering.
 * This runs at module evaluation time on the client only (the "use client"
 * directive ensures it is never executed on the server).
 */
function detectFullscreenSupport(): boolean {
  if (typeof document === "undefined") return false;
  const el = document.documentElement;
  return !!(
    el.requestFullscreen ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (el as any).webkitRequestFullscreen ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (el as any).mozRequestFullScreen ||
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    (el as any).msRequestFullscreen
  );
}

/**
 * Cross-browser fullscreen hook.
 *
 * Supports:
 *  - Standard Fullscreen API (Chrome, Firefox, most Android browsers)
 *  - WebKit prefixed API (older Safari, some WebViews)
 *
 * On iOS Safari, the Fullscreen API is not available for arbitrary web pages.
 * `isSupported` will be false in that environment; the fullscreen button should
 * be hidden or replaced with a "Add to Home Screen" prompt.
 */
export function useFullscreen(elementRef?: React.RefObject<HTMLElement | null>): UseFullscreenReturn {
  const [isFullscreen, setIsFullscreen] = useState(false);
  // Use a lazy initializer so support is detected synchronously at component
  // mount — no effect or setState-in-effect needed.
  const [isSupported] = useState<boolean>(detectFullscreenSupport);

  useEffect(() => {
    const handleChange = () => {
      const fsEl =
        document.fullscreenElement ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document as any).webkitFullscreenElement ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document as any).mozFullScreenElement ||
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document as any).msFullscreenElement;
      setIsFullscreen(!!fsEl);
    };

    document.addEventListener("fullscreenchange", handleChange);
    document.addEventListener("webkitfullscreenchange", handleChange);
    document.addEventListener("mozfullscreenchange", handleChange);
    document.addEventListener("MSFullscreenChange", handleChange);

    return () => {
      document.removeEventListener("fullscreenchange", handleChange);
      document.removeEventListener("webkitfullscreenchange", handleChange);
      document.removeEventListener("mozfullscreenchange", handleChange);
      document.removeEventListener("MSFullscreenChange", handleChange);
    };
  }, []);

  const enter = useCallback(() => {
    const el = elementRef?.current ?? document.documentElement;
    try {
      if (el.requestFullscreen) {
        el.requestFullscreen();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((el as any).webkitRequestFullscreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (el as any).webkitRequestFullscreen();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((el as any).mozRequestFullScreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (el as any).mozRequestFullScreen();
      }
    } catch (err) {
      console.warn("requestFullscreen failed:", err);
    }
  }, [elementRef]);

  const exit = useCallback(() => {
    try {
      if (document.exitFullscreen) {
        document.exitFullscreen();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((document as any).webkitExitFullscreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document as any).webkitExitFullscreen();
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      } else if ((document as any).mozCancelFullScreen) {
        // eslint-disable-next-line @typescript-eslint/no-explicit-any
        (document as any).mozCancelFullScreen();
      }
    } catch (err) {
      console.warn("exitFullscreen failed:", err);
    }
  }, []);

  const toggle = useCallback(() => {
    if (isFullscreen) {
      exit();
    } else {
      enter();
    }
  }, [isFullscreen, enter, exit]);

  return { isFullscreen, isSupported, toggle, enter, exit };
}
