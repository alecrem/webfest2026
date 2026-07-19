import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app";

const app = createApp();

// ビルド不要の静的ファイル (widgets.js など)
app.use("/*", serveStatic({ root: "./public" }));
// ビルド済みエディタ (pnpm build)
app.use("/*", serveStatic({ root: "./dist/editor" }));

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`http://localhost:${info.port}`);
});
