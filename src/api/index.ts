import index from "../web/index.html";
import { getEntries, getEntryById } from "../core/db";

const server = Bun.serve({
  port: 3000,
  routes: {
    "/": index,

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
          "Accept-Ranges": "bytes"
        }
      });
    }
  },
  development: {
    hmr: true,
    console: true
  }
});

console.log(`Server running at http://localhost:${server.port}`);
