import { serve } from "@hono/node-server";
import { serveStatic } from "@hono/node-server/serve-static";
import { createApp } from "./app";
import { spriteResponse } from "./sprites";

const app = createApp();

// スプライトのプロキシ。Cloudflare では functions/img が担当する。
// ここは Node 開発サーバー / LAN 用 (都度 upstream から取得)。
app.get("/img/pokemon/:file", (c) => spriteResponse(c.req.param("file")));

// ビルド不要の静的ファイル (widgets.js など)
app.use("/*", serveStatic({ root: "./public" }));
// ビルド済みエディタ (pnpm build)
app.use("/*", serveStatic({ root: "./dist/editor" }));

const port = Number(process.env.PORT ?? 3000);
serve({ fetch: app.fetch, port, hostname: "0.0.0.0" }, (info) => {
  console.log(`http://localhost:${info.port}`);
});
