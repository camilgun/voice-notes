import { useAudioPlayer } from "../context/AudioPlayerContext";
import { formatDuration } from "../utils/formatters";
import type { MouseEvent } from "react";

export function GlobalAudioPlayer() {
  const { state, actions } = useAudioPlayer();

  // Do not show if nothing is playing or selected
  if (!state.currentEntry) return null;

  const progress =
    state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  const handleProgressClick = (e: MouseEvent<HTMLDivElement>) => {
    const bar = e.currentTarget;
    const rect = bar.getBoundingClientRect();
    const clickX = e.clientX - rect.left;
    const percentage = clickX / rect.width;
    const newTime = percentage * state.duration;
    actions.seek(newTime);
  };

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50">
      {/* Header with preview */}
      <div className="text-sm text-gray-600 mb-3 line-clamp-2">
        {state.currentEntry.text.slice(0, 100)}
        {state.currentEntry.text.length > 100 && "..."}
      </div>

      {/* Progress bar - clickable */}
      <div
        className="h-2 bg-gray-200 rounded-full mb-2 cursor-pointer group"
        onClick={handleProgressClick}
      >
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-100 relative"
          style={{ width: `${progress}%` }}
        >
          {/* Thumb indicator */}
          <div className="absolute right-0 top-1/2 -translate-y-1/2 w-3 h-3 bg-blue-600 rounded-full opacity-0 group-hover:opacity-100 transition-opacity" />
        </div>
      </div>

      {/* Time */}
      <div className="flex justify-between text-xs text-gray-500 mb-3">
        <span>{formatDuration(Math.floor(state.currentTime))}</span>
        <span>{formatDuration(Math.floor(state.duration))}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-2">
        {/* Skip backward */}
        <button
          onClick={() => actions.skipBackward(10)}
          className="w-10 h-10 rounded-full hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors"
          title="Back 10s"
        >
          <SkipBackIcon />
        </button>

        {/* Play/Pause */}
        <button
          onClick={actions.toggle}
          className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
          title={state.isPlaying ? "Pause" : "Play"}
        >
          {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
        </button>

        {/* Skip forward */}
        <button
          onClick={() => actions.skipForward(10)}
          className="w-10 h-10 rounded-full hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors"
          title="Forward 10s"
        >
          <SkipForwardIcon />
        </button>
      </div>
    </div>
  );
}

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-6 h-6"
    >
      <path
        fillRule="evenodd"
        d="M4.5 5.653c0-1.427 1.529-2.33 2.779-1.643l11.54 6.347c1.295.712 1.295 2.573 0 3.286L7.28 19.99c-1.25.687-2.779-.217-2.779-1.643V5.653Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function PauseIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-6 h-6"
    >
      <path
        fillRule="evenodd"
        d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z"
        clipRule="evenodd"
      />
    </svg>
  );
}

function SkipBackIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M9.195 18.44c1.25.714 2.805-.189 2.805-1.629v-2.34l6.945 3.968c1.25.715 2.805-.188 2.805-1.628V8.69c0-1.44-1.555-2.343-2.805-1.628L12 11.029v-2.34c0-1.44-1.555-2.343-2.805-1.628l-7.108 4.061c-1.26.72-1.26 2.536 0 3.256l7.108 4.061Z" />
    </svg>
  );
}

function SkipForwardIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
    >
      <path d="M5.055 7.06c-1.25-.714-2.805.189-2.805 1.628v8.123c0 1.44 1.555 2.343 2.805 1.628L12 14.471v2.34c0 1.44 1.555 2.343 2.805 1.628l7.108-4.061c1.26-.72 1.26-2.536 0-3.256L14.805 7.06C13.555 6.346 12 7.25 12 8.689v2.34L5.055 7.061Z" />
    </svg>
  );
}
