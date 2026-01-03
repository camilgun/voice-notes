import { useState } from "react";
import type { Entry } from "@voice-notes/shared";
import { formatDate, formatDuration } from "../utils/formatters";
import { DeleteButton } from "./DeleteButton";
import { useAudioPlayer } from "../context/AudioPlayerContext";

interface NoteCardProps {
  entry: Entry;
  onDelete: (id: number) => Promise<{ success: boolean; fileDeleted: boolean }>;
}

export function NoteCard({ entry, onDelete }: NoteCardProps) {
  const [expanded, setExpanded] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const { state, actions } = useAudioPlayer();

  const isThisPlaying = state.currentEntry?.id === entry.id && state.isPlaying;

  const togglePlay = () => {
    if (isThisPlaying) {
      actions.pause();
    } else {
      actions.play(entry);
    }
  };

  const handleDelete = async () => {
    // Stop audio if this note is playing
    if (isThisPlaying) {
      actions.pause();
    }
    // Start exit animation
    setIsDeleting(true);
    // Wait for animation, then delete
    await new Promise((resolve) => setTimeout(resolve, 350));
    await onDelete(entry.id);
  };

  const previewText =
    entry.text.length > 200 && !expanded
      ? entry.text.slice(0, 200) + "..."
      : entry.text;

  return (
    <div
      className={`bg-white rounded-lg shadow-sm border border-gray-200 p-4 hover:shadow-md transition-shadow overflow-hidden ${
        isDeleting ? "animate-slide-out" : ""
      }`}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="flex-1 min-w-0">
          <div className="flex items-center gap-2 text-sm text-gray-500 mb-2">
            <time>{formatDate(entry.recorded_at ?? entry.transcribed_at)}</time>
            <span className="text-gray-400">
              · {formatDuration(entry.duration_seconds)}
            </span>
            <span className="text-gray-400 truncate" title={entry.source_file}>
              · {entry.source_file.split("/").pop()}
            </span>
          </div>
          <p className="text-gray-800 whitespace-pre-wrap">{previewText}</p>
          {entry.text.length > 200 && (
            <button
              onClick={() => setExpanded(!expanded)}
              className="text-blue-600 hover:text-blue-800 text-sm mt-2"
            >
              {expanded ? "show less" : "show more"}
            </button>
          )}
        </div>
        <div className="flex items-center gap-1">
          <DeleteButton onDelete={handleDelete} disabled={isDeleting} />
          <PlayButton
            isPlaying={isThisPlaying}
            onClick={togglePlay}
            disabled={isDeleting}
          />
        </div>
      </div>
    </div>
  );
}

function PlayButton({
  isPlaying,
  onClick,
  disabled,
}: {
  isPlaying: boolean;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      onClick={onClick}
      disabled={disabled}
      className="flex-shrink-0 w-10 h-10 rounded-full bg-blue-600 hover:bg-blue-700 text-white flex items-center justify-center transition-colors disabled:opacity-50 disabled:cursor-not-allowed"
      title={isPlaying ? "Pause" : "Play"}
    >
      {isPlaying ? <PauseIcon /> : <PlayIcon />}
    </button>
  );
}

function PlayIcon() {
  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 24 24"
      fill="currentColor"
      className="w-5 h-5"
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
      className="w-5 h-5"
    >
      <path
        fillRule="evenodd"
        d="M6.75 5.25a.75.75 0 0 1 .75-.75H9a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H7.5a.75.75 0 0 1-.75-.75V5.25Zm7.5 0A.75.75 0 0 1 15 4.5h1.5a.75.75 0 0 1 .75.75v13.5a.75.75 0 0 1-.75.75H15a.75.75 0 0 1-.75-.75V5.25Z"
        clipRule="evenodd"
      />
    </svg>
  );
}
