import type { CorsOptions } from "cors";

const allowedOrigins = [
  "https://coinastra.io",
  "https://www.coinastra.io",
  ...(process.env["NODE_ENV"] !== "production"
    ? [
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
        "http://localhost:19243",
        "http://127.0.0.1:19243",
      ]
    : []),
];

const replitDomains = process.env["REPLIT_DOMAINS"];
if (replitDomains) {
  for (const domain of replitDomains.split(",")) {
    allowedOrigins.push(`https://${domain.trim()}`);
  }
}

export const corsOptions: CorsOptions = {
  origin(origin, callback) {
    if (!origin) {
      callback(null, true);
      return;
    }
    if (allowedOrigins.some((allowed) => origin.startsWith(allowed))) {
      callback(null, true);
    } else {
      callback(new Error(`CORS: origin "${origin}" not allowed`));
    }
  },
  credentials: true,
  methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
  allowedHeaders: ["Content-Type", "Authorization"],
  exposedHeaders: ["X-Request-Id"],
  maxAge: 86400,
};
