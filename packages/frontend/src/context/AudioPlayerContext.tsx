import {
  createContext,
  useContext,
  useRef,
  useState,
  useCallback,
  useEffect,
  type ReactNode,
} from "react";
import type { Entry } from "@voice-notes/shared";

interface AudioPlayerState {
  currentEntry: Entry | null;
  isPlaying: boolean;
  currentTime: number;
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
}

interface AudioPlayerContextValue {
  state: AudioPlayerState;
  actions: AudioPlayerActions;
}

const AudioPlayerContext = createContext<AudioPlayerContextValue | null>(null);

const initialState: AudioPlayerState = {
  currentEntry: null,
  isPlaying: false,
  currentTime: 0,
  duration: 0,
  playbackRate: 1,
};

export function AudioPlayerProvider({ children }: { children: ReactNode }) {
  const audioRef = useRef<HTMLAudioElement>(null);
  const [state, setState] = useState<AudioPlayerState>(initialState);

  const play = useCallback(
    (entry: Entry) => {
      if (audioRef.current) {
        // If a different entry, load it
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
      setState((s) => ({ ...s, currentTime: time }));
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

  // Sync playbackRate when it changes
  useEffect(() => {
    if (audioRef.current) {
      audioRef.current.playbackRate = state.playbackRate;
    }
  }, [state.playbackRate]);

  const handleTimeUpdate = useCallback(() => {
    if (audioRef.current) {
      setState((s) => ({ ...s, currentTime: audioRef.current!.currentTime }));
    }
  }, []);

  const handleLoadedMetadata = useCallback(() => {
    if (audioRef.current) {
      setState((s) => ({ ...s, duration: audioRef.current!.duration }));
    }
  }, []);

  const handleEnded = useCallback(() => {
    setState((s) => ({ ...s, isPlaying: false, currentTime: 0 }));
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
  };

  return (
    <AudioPlayerContext.Provider value={{ state, actions }}>
      {children}
      <audio
        ref={audioRef}
        onTimeUpdate={handleTimeUpdate}
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
