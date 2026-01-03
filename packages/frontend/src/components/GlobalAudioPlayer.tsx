import { useAudioPlayer } from "../context/AudioPlayerContext";
import { formatDuration } from "../utils/formatters";

export function GlobalAudioPlayer() {
  const { state, actions } = useAudioPlayer();

  // Do not show if nothing is playing or selected
  if (!state.currentEntry) return null;

  const progress =
    state.duration > 0 ? (state.currentTime / state.duration) * 100 : 0;

  return (
    <div className="fixed right-6 top-1/2 -translate-y-1/2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50">
      {/* Header with preview */}
      <div className="text-sm text-gray-600 mb-3 line-clamp-2">
        {state.currentEntry.text.slice(0, 100)}
        {state.currentEntry.text.length > 100 && "..."}
      </div>

      {/* Progress bar */}
      <div className="h-1.5 bg-gray-200 rounded-full mb-2">
        <div
          className="h-full bg-blue-600 rounded-full transition-all duration-200"
          style={{ width: `${progress}%` }}
        />
      </div>

      {/* Time */}
      <div className="flex justify-between text-xs text-gray-500 mb-3">
        <span>{formatDuration(Math.floor(state.currentTime))}</span>
        <span>{formatDuration(Math.floor(state.duration))}</span>
      </div>

      {/* Controls */}
      <div className="flex items-center justify-center gap-4">
        <button
          onClick={actions.toggle}
          className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
          title={state.isPlaying ? "Pause" : "Play"}
        >
          {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
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
