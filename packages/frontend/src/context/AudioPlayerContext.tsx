import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  useSyncExternalStore,
  type ReactNode,
} from "react";
import type { Entry } from "@voice-notes/shared";

// Stable state - changes infrequently, safe to use in React state
interface AudioPlayerState {
  currentEntry: Entry | null;
  isPlaying: boolean;
  duration: number;
  playbackRate: number;
}

interface AudioPlayerActions {
  play: (entry: Entry) => void;
  pause: () => void;
  toggle: () => void;
  seek: (time: number) => void;
  setPlaybackRate: (rate: number) => void;
  skipForward: (seconds?: number) => void;
  skipBackward: (seconds?: number) => void;
  getAudioElement: () => HTMLAudioElement | null;
}

interface AudioPlayerContextValue {
  state: AudioPlayerState;
  actions: AudioPlayerActions;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

const initialState: AudioPlayerState = {
  currentEntry: null,
  isPlaying: false,
  duration: 0,
  playbackRate: 1,
};

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<AudioPlayerState>(initialState);

  const play = useCallback(
    (entry: Entry) => {
      if (audioRef.current) {
        if (state.currentEntry?.id !== entry.id) {
          audioRef.current.src = `/api/audio/${entry.id}`;
          audioRef.current.load();
        }
        audioRef.current.play();
        setState((s) => ({ ...s, currentEntry: entry, isPlaying: true }));
      }
    },
    [state.currentEntry?.id],
  );

  const pause = useCallback(() => {
    if (audioRef.current) {
      audioRef.current.pause();
    }
    setState((s) => ({ ...s, isPlaying: false }));
  }, []);

  const toggle = useCallback(() => {
    if (state.isPlaying) {
      pause();
    } else if (state.currentEntry) {
      play(state.currentEntry);
    }
  }, [state.isPlaying, state.currentEntry, pause, play]);

  const seek = useCallback((time: number) => {
    if (audioRef.current) {
      audioRef.current.currentTime = time;
    }
  }, []);

  const setPlaybackRate = useCallback((rate: number) => {
    if (audioRef.current) {
      audioRef.current.playbackRate = rate;
    }
    setState((s) => ({ ...s, playbackRate: rate }));
  }, []);

  const skipForward = useCallback((seconds = 10) => {
    if (audioRef.current) {
      const newTime = Math.min(
        audioRef.current.currentTime + seconds,
        audioRef.current.duration || 0,
      );
      audioRef.current.currentTime = newTime;
    }
  }, []);

  const skipBackward = useCallback((seconds = 10) => {
    if (audioRef.current) {
      const newTime = Math.max(audioRef.current.currentTime - seconds, 0);
      audioRef.current.currentTime = newTime;
    }
  }, []);

  const getAudioElement = useCallback(() => audioRef.current, []);

  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = state.playbackRate;
    }
  }, [state.playbackRate]);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setState((s) => ({ ...s, duration: audioRef.current!.duration }));
    }
  }, []);

  const handleEnded = useCallback(() => {
    setState((s) => ({ ...s, isPlaying: false }));
  }, []);

  const handlePause = useCallback(() => {
    setState((s) => ({ ...s, isPlaying: false }));
  }, []);

  const handlePlay = useCallback(() => {
    setState((s) => ({ ...s, isPlaying: true }));
  }, []);

  const actions: AudioPlayerActions = {
    play,
    pause,
    toggle,
    seek,
    setPlaybackRate,
    skipForward,
    skipBackward,
    getAudioElement,
  };

  return (
    <AudioPlayerContext.Provider value={{ state, actions }}>
      {children}
      <audio
        ref={audioRef}
        onLoadedMetadata={handleLoadedMetadata}
        onEnded={handleEnded}
        onPause={handlePause}
        onPlay={handlePlay}
      />
    </AudioPlayerContext.Provider>
  );
}

export function useAudioPlayer(): AudioPlayerContextValue {
  const context = useContext(AudioPlayerContext);
  if (!context) {
    throw new Error("useAudioPlayer must be used within AudioPlayerProvider");
  }
  return context;
}

// Hook for components that need real-time currentTime updates
// Uses useSyncExternalStore to subscribe directly to the audio element
export function useCurrentTime(): number {
  const { actions } = useAudioPlayer();

  const subscribe = useCallback(
    (callback: () => void) => {
      const audio = actions.getAudioElement();
      if (!audio) return () => {};

      audio.addEventListener("timeupdate", callback);
      audio.addEventListener("seeking", callback);
      audio.addEventListener("seeked", callback);

      return () => {
        audio.removeEventListener("timeupdate", callback);
        audio.removeEventListener("seeking", callback);
        audio.removeEventListener("seeked", callback);
      };
    },
    [actions],
  );

  const getSnapshot = useCallback(() => {
    const audio = actions.getAudioElement();
    return audio?.currentTime ?? 0;
  }, [actions]);

  return useSyncExternalStore(subscribe, getSnapshot, getSnapshot);
}
