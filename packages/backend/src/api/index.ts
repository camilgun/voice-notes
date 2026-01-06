import {
  getEntries,
  getEntryById,
  deleteEntry,
  getInsightsByEntryId,
} from "../core/db.ts";
import { unlink } from "node:fs/promises";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

export function createServer(port: number = 3000) {
  return Bun.serve({
    port,
    routes: {
      "/": () => {
        return Response.redirect(FRONTEND_URL);
      },

      "/api/entries": () => {
        return Response.json(getEntries());
      },

      "/api/entries/:id": async (req) => {
        const id = Number(req.params.id);

        // Handle DELETE
        if (req.method === "DELETE") {
          if (isNaN(id)) {
            return new Response("Invalid id", {
              status: 400,
              headers: { "Access-Control-Allow-Origin": FRONTEND_URL },
            });
          }

          const deleted = deleteEntry(id);
          if (!deleted) {
            return new Response("Not found", {
              status: 404,
              headers: { "Access-Control-Allow-Origin": FRONTEND_URL },
            });
          }

          // Try to delete the audio file if it exists
          let fileDeleted = false;
          if (deleted.source_file) {
            try {
              await unlink(deleted.source_file);
              fileDeleted = true;
            } catch {
              // File might not exist, that's ok
              fileDeleted = false;
            }
          }

          return Response.json(
            { deleted, fileDeleted },
            {
              headers: { "Access-Control-Allow-Origin": FRONTEND_URL },
            },
          );
        }

        // Handle GET
        const entry = getEntryById(id);
        if (!entry) {
          return new Response("Not found", { status: 404 });
        }
        return Response.json(entry);
      },

      "/api/audio/:id": async (req) => {
        const entry = getEntryById(Number(req.params.id));
        if (!entry?.source_file) {
          return new Response("Not found", { status: 404 });
        }

        const file = Bun.file(entry.source_file);
        if (!(await file.exists())) {
          return new Response("Audio file not found", { status: 404 });
        }

        return new Response(file, {
          headers: {
            "Content-Type": file.type || "audio/mpeg",
            "Accept-Ranges": "bytes",
            "Access-Control-Allow-Origin": FRONTEND_URL,
          },
        });
      },

      "/api/entries/:id/insights": (req) => {
        const id = Number(req.params.id);
        if (isNaN(id)) {
          return new Response("Invalid id", {
            status: 400,
            headers: { "Access-Control-Allow-Origin": FRONTEND_URL },
          });
        }

        const insights = getInsightsByEntryId(id);
        return Response.json(insights, {
          headers: { "Access-Control-Allow-Origin": FRONTEND_URL },
        });
      },
    },
    fetch(req) {
      if (req.method === "OPTIONS") {
        return new Response(null, {
          headers: {
            "Access-Control-Allow-Origin": FRONTEND_URL,
            "Access-Control-Allow-Methods": "GET, POST, DELETE, OPTIONS",
            "Access-Control-Allow-Headers": "Content-Type",
          },
        });
      }

      const url = new URL(req.url);
      if (url.pathname.startsWith("/api/")) {
        return new Response("Not found", {
          status: 404,
          headers: {
            "Access-Control-Allow-Origin": FRONTEND_URL,
          },
        });
      }

      return new Response("Not found", { status: 404 });
    },
  });
}

// Start server only when run directly (not imported for tests)
if (import.meta.main) {
  const server = createServer();
  console.log(`API server running at http://localhost:${server.port}`);
}
