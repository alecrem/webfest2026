import { defineConfig } from "vite";

export default defineConfig({
  // リポジトリ直下の public/ (widgets.js と compose-data が置くスプライト) を
  // ビルド出力にそのままコピーする。dist/editor が Cloudflare Pages の出力になる。
  publicDir: "../public",
  build: { outDir: "../dist/editor", emptyOutDir: true },
  server: {
    // /api と /img は Node 開発サーバーへ。/widgets.js は publicDir が配信する。
    proxy: {
      "/api": "http://localhost:3000",
      "/img": "http://localhost:3000",
    },
  },
});
