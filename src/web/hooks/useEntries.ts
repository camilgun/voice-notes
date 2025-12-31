import { useState, useEffect } from "react";
import type { Entry } from "../../shared/types";

interface UseEntriesResult {
  entries: Entry[];
  loading: boolean;
  error: string | null;
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
        const data = await res.json() as Entry[];
        setEntries(data);
      } catch (err) {
        setError(err instanceof Error ? err.message : "Unknown error");
      } finally {
        setLoading(false);
      }
    }
    fetchEntries();
  }, []);

  return { entries, loading, error };
}
