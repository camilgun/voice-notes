import { getEntries, getEntryById } from "../core/db";

const server = Bun.serve({
  port: 3000,
  routes: {
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
  },
  development: {
    hmr: true,
    console: true
  }
});

console.log(`Server running at http://localhost:${server.port}`);
