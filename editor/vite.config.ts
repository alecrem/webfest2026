import { defineConfig } from "vite";

export default defineConfig({
  build: { outDir: "../dist/editor", emptyOutDir: true },
  server: {
    proxy: {
      "/api": "http://localhost:3000",
      "/img": "http://localhost:3000",
      "/widgets.js": "http://localhost:3000",
    },
  },
});
