import { useAudioPlayer } from "../context/AudioPlayerContext";
import { useInsights } from "../hooks/useInsights";
import { formatDuration } from "../utils/formatters";
import { InsightCard } from "./InsightCard";
import type { MouseEvent } from "react";

export function GlobalAudioPlayer() {
  const { state, actions } = useAudioPlayer();
  const { insights, loading: insightsLoading } = useInsights(
    state.currentEntry?.id ?? null,
  );

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
    <>
      {/* Desktop: floating panel on the right */}
      <div className="hidden lg:block fixed right-6 top-1/2 -translate-y-1/2 w-72 bg-white rounded-xl shadow-lg border border-gray-200 p-4 z-50">
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
          <button
            onClick={() => actions.skipBackward(10)}
            className="w-10 h-10 rounded-full hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors"
            title="Back 10s"
          >
            <SkipBackIcon />
          </button>

          <button
            onClick={actions.toggle}
            className="w-12 h-12 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors"
            title={state.isPlaying ? "Pause" : "Play"}
          >
            {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
          </button>

          <button
            onClick={() => actions.skipForward(10)}
            className="w-10 h-10 rounded-full hover:bg-gray-100 text-gray-600 flex items-center justify-center transition-colors"
            title="Forward 10s"
          >
            <SkipForwardIcon />
          </button>
        </div>

        {/* Playback rate */}
        <PlaybackRateSelector
          value={state.playbackRate}
          onChange={actions.setPlaybackRate}
        />

        {/* Related Insights */}
        {insightsLoading && (
          <div className="mt-4 pt-4 border-t border-gray-100 text-xs text-gray-400">
            Loading insights...
          </div>
        )}
        {!insightsLoading && insights.length > 0 && (
          <div className="mt-4 pt-4 border-t border-gray-100">
            <h3 className="text-xs font-medium text-gray-500 mb-2">
              Related Insights ({insights.length})
            </h3>
            <div className="space-y-2 max-h-64 overflow-y-auto">
              {insights.map((insight) => (
                <InsightCard key={insight.id} insight={insight} />
              ))}
            </div>
          </div>
        )}
      </div>

      {/* Mobile: bottom bar */}
      <div className="lg:hidden fixed bottom-0 left-0 right-0 bg-white border-t border-gray-200 shadow-lg z-50 px-4 py-3 pb-[calc(0.75rem+env(safe-area-inset-bottom))]">
        {/* Progress bar */}
        <div
          className="h-1 bg-gray-200 rounded-full mb-3 cursor-pointer"
          onClick={handleProgressClick}
        >
          <div
            className="h-full bg-blue-600 rounded-full transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>

        <div className="flex items-center gap-3">
          {/* Text preview */}
          <div className="flex-1 min-w-0 text-sm text-gray-600 truncate">
            {state.currentEntry.text.slice(0, 50)}...
          </div>

          {/* Time */}
          <div className="text-xs text-gray-500 whitespace-nowrap">
            {formatDuration(Math.floor(state.currentTime))}
          </div>

          {/* Controls */}
          <div className="flex items-center gap-1">
            <button
              onClick={() => actions.skipBackward(10)}
              className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600 flex items-center justify-center"
            >
              <SkipBackIcon />
            </button>

            <button
              onClick={actions.toggle}
              className="w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center"
            >
              {state.isPlaying ? <PauseIcon /> : <PlayIcon />}
            </button>

            <button
              onClick={() => actions.skipForward(10)}
              className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600 flex items-center justify-center"
            >
              <SkipForwardIcon />
            </button>

            {/* Speed button - cycles through rates */}
            <button
              onClick={() => {
                const currentIndex = PLAYBACK_RATES.indexOf(
                  state.playbackRate as (typeof PLAYBACK_RATES)[number],
                );
                const nextIndex =
                  currentIndex === -1
                    ? 0
                    : (currentIndex + 1) % PLAYBACK_RATES.length;
                actions.setPlaybackRate(PLAYBACK_RATES[nextIndex]!);
              }}
              className="w-8 h-8 rounded-full hover:bg-gray-100 text-gray-600 flex items-center justify-center text-xs font-medium"
            >
              {state.playbackRate}x
            </button>
          </div>
        </div>
      </div>
    </>
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

const PLAYBACK_RATES = [0.5, 0.75, 1, 1.25, 1.5, 2] as const;

function PlaybackRateSelector({
  value,
  onChange,
}: {
  value: number;
  onChange: (rate: number) => void;
}) {
  return (
    <div className="flex items-center justify-center gap-1 mt-3 pt-3 border-t border-gray-100">
      {PLAYBACK_RATES.map((rate) => (
        <button
          key={rate}
          onClick={() => onChange(rate)}
          className={`px-2 py-1 text-xs rounded transition-colors ${
            value === rate
              ? "bg-blue-600 text-white"
              : "text-gray-600 hover:bg-gray-100"
          }`}
        >
          {rate}x
        </button>
      ))}
    </div>
  );
}
