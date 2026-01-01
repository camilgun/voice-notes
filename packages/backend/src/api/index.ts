import { getEntries, getEntryById } from "../core/db.ts";

const FRONTEND_URL = process.env.FRONTEND_URL || "http://localhost:5173";

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": () => {
      return Response.redirect(FRONTEND_URL);
    },

    "/api/entries": () => {
      return Response.json(getEntries());
    },

    "/api/entries/:id": (req) => {
      const entry = getEntryById(Number(req.params.id));
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
      if (!await file.exists()) {
        return new Response("Audio file not found", { status: 404 });
      }

      return new Response(file, {
        headers: {
          "Content-Type": file.type || "audio/mpeg",
          "Accept-Ranges": "bytes",
          "Access-Control-Allow-Origin": FRONTEND_URL,
        }
      });
    }
  },
  fetch(req) {
    // CORS preflight
    if (req.method === "OPTIONS") {
      return new Response(null, {
        headers: {
          "Access-Control-Allow-Origin": FRONTEND_URL,
          "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
          "Access-Control-Allow-Headers": "Content-Type",
        }
      });
    }

    // Add CORS headers to all responses
    const url = new URL(req.url);
    if (url.pathname.startsWith("/api/")) {
      return new Response("Not found", {
        status: 404,
        headers: {
          "Access-Control-Allow-Origin": FRONTEND_URL,
        }
      });
    }

    return new Response("Not found", { status: 404 });
  }
});

console.log(`API server running at http://localhost:${server.port}`);
