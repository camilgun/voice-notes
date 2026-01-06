import { useState, useEffect, useMemo, useTransition } from "react";
import type { Insight, InsightParsed } from "@voice-notes/shared";

function parseInsight(insight: Insight): InsightParsed {
  let parsedContent: Record<string, unknown> | null = null;

  if (insight.content_data) {
    try {
      parsedContent = JSON.parse(insight.content_data);
    } catch {
      parsedContent = null;
    }
  }

  return {
    ...insight,
    content_data: parsedContent,
  };
}

export function useInsights(entryId: number | null) {
  const [data, setData] = useState<{
    insights: InsightParsed[];
    forEntryId: number | null;
  }>({ insights: [], forEntryId: null });
  const [isPending, startTransition] = useTransition();

  useEffect(() => {
    if (!entryId) {
      return;
    }

    const controller = new AbortController();

    fetch(`/api/entries/${entryId}/insights`, { signal: controller.signal })
      .then((res) => res.json())
      .then((json: Insight[]) => {
        startTransition(() => {
          setData({ insights: json.map(parseInsight), forEntryId: entryId });
        });
      })
      .catch((err) => {
        if (err.name !== "AbortError") {
          startTransition(() => {
            setData({ insights: [], forEntryId: entryId });
          });
        }
      });

    return () => {
      controller.abort();
    };
  }, [entryId]);

  // Show loading when entryId changes but data hasn't caught up yet
  const isStale = entryId !== data.forEntryId;
  const loading = isPending || (entryId !== null && isStale);

  const insights = useMemo(
    () => (entryId && !isStale ? data.insights : []),
    [entryId, isStale, data.insights],
  );

  return { insights, loading };
}
