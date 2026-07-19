// Cloudflare Pages Function: /api/* をすべて Hono アプリで処理する。
// Node 版 (server/index.ts) と同じ createApp() を、別のアダプタで動かす。
import { handle } from "hono/cloudflare-pages";
import { createApp } from "../../server/app";

export const onRequest = handle(createApp());
