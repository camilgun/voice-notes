import { useState, useEffect, useCallback } from "react";
import type { Entry } from "@voice-notes/shared";

interface UseEntriesResult {
  entries: Entry[];
  loading: boolean;
  error: string | null;
  deleteEntry: (
    id: number,
  ) => Promise<{ success: boolean; fileDeleted: boolean }>;
}

export function useEntries(): UseEntriesResult {
  const [entries, setEntries] = useState<Entry[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    async function fetchEntries() {
      try {
        const res = await fetch("/api/entries");
        if (!res.ok) throw new Error("Failed to fetch entries");
        const data = (await res.json()) as Entry[];
        setEntries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchEntries();
  }, []);

  const deleteEntry = useCallback(async (id: number) => {
    try {
      const res = await fetch(`/api/entries/${id}`, { method: "DELETE" });
      if (!res.ok) {
        throw new Error("Failed to delete entry");
      }
      const data = (await res.json()) as {
        deleted: Entry;
        fileDeleted: boolean;
      };
      // Remove from local state
      setEntries((prev) => prev.filter((e) => e.id !== id));
      return { success: true, fileDeleted: data.fileDeleted };
    } catch {
      return { success: false, fileDeleted: false };
    }
  }, []);

  return { entries, loading, error, deleteEntry };
}
