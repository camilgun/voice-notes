import { useEntries } from "./hooks/useEntries";
import { NoteCard } from "./components/NoteCard";

export function App() {
  const { entries, loading, error } = useEntries();

  return (
    <div className="max-w-2xl mx-auto px-4 py-8">
      <header className="mb-8">
        <h1 className="text-2xl font-bold text-gray-900">Voice Notes</h1>
        <p className="text-gray-600 mt-1">Your transcribed voice notes</p>
      </header>

      {loading && (
        <div className="text-center py-12 text-gray-500">Loading...</div>
      )}

      {error && (
        <div className="bg-red-50 text-red-700 p-4 rounded-lg">{error}</div>
      )}

      {!loading && !error && entries.length === 0 && (
        <div className="text-center py-12 text-gray-500">
          No voice notes found
        </div>
      )}

      <div className="space-y-4">
        {entries.map((entry) => (
          <NoteCard key={entry.id} entry={entry} />
        ))}
      </div>
    </div>
  );
}
