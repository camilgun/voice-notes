import type { InsightParsed } from "@voice-notes/shared";

interface InsightCardProps {
  insight: InsightParsed;
}

const MODULE_TYPE_COLORS: Record<string, string> = {
  IDEA: "bg-yellow-100 text-yellow-800",
  STRATEGY: "bg-blue-100 text-blue-800",
  EXPERIMENT: "bg-green-100 text-green-800",
  PATTERN: "bg-purple-100 text-purple-800",
  PSYCHOLOGY: "bg-pink-100 text-pink-800",
  PHILOSOPHY: "bg-indigo-100 text-indigo-800",
  PROJECT_LOG: "bg-gray-100 text-gray-800",
  MEDIA_LOG: "bg-orange-100 text-orange-800",
  DIARY: "bg-teal-100 text-teal-800",
};

export function InsightCard({ insight }: InsightCardProps) {
  const typeColor =
    MODULE_TYPE_COLORS[insight.module_type] || "bg-gray-100 text-gray-800";

  return (
    <div className="bg-gray-50 rounded-lg p-3 border border-gray-100">
      <div className="flex items-start gap-2 mb-2">
        <span
          className={`text-xs px-2 py-0.5 rounded-full font-medium ${typeColor}`}
        >
          {insight.module_type}
        </span>
        {insight.project_name && (
          <span className="text-xs text-gray-500">{insight.project_name}</span>
        )}
      </div>

      <h4 className="font-medium text-sm text-gray-900 mb-1">
        {insight.title}
      </h4>

      {insight.summary && (
        <p className="text-xs text-gray-600 line-clamp-3">{insight.summary}</p>
      )}

      {insight.content_data && (
        <ContentDataPreview data={insight.content_data} />
      )}
    </div>
  );
}

function ContentDataPreview({ data }: { data: Record<string, unknown> }) {
  // Show a few key fields from content_data

  const entries = Object.entries(data).slice(0, 3);
  if (entries.length === 0) return null;

  return (
    <div className="mt-2 pt-2 border-t border-gray-100">
      {entries.map(([key, value]) => (
        <div key={key} className="text-xs text-gray-500">
          <span className="font-medium">{formatKey(key)}:</span>{" "}
          {formatValue(value)}
        </div>
      ))}
    </div>
  );
}

function formatKey(key: string): string {
  return key.replace(/_/g, " ").replace(/\b\w/g, (c) => c.toUpperCase());
}

function formatValue(value: unknown): string {
  if (Array.isArray(value)) {
    return value.length > 2
      ? `${value.slice(0, 2).join(", ")}...`
      : value.join(", ");
  }
  if (typeof value === "object" && value !== null) {
    return "[...]";
  }
  return String(value);
}
