import type { IncomingMessage, ServerResponse } from "node:http";
import type { Plugin } from "vite";
import { handleDevApi } from "./handle-dev-api";

/**
 * Serves `/api/*` from the Vite dev server using CoinGecko + in-memory stores
 * (no separate API process on 8787, no database).
 */
export function coinastraDevApiPlugin(): Plugin {
  return {
    name: "coinastra-dev-api",
    apply: "serve",
    configureServer(server) {
      server.middlewares.use((req, res, next) => {
        const url = (req as IncomingMessage & { originalUrl?: string }).originalUrl ?? req.url ?? "";
        if (!url.startsWith("/api")) {
          next();
          return;
        }
        void handleDevApi(req as IncomingMessage, res as ServerResponse).catch((err) => {
          console.error("[coinastra-dev-api]", err);
          if (!res.writableEnded) {
            res.statusCode = 500;
            res.setHeader("Content-Type", "application/json; charset=utf-8");
            res.end(JSON.stringify({ error: "Internal Server Error" }));
          }
        });
      });
    },
  };
}
