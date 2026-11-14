// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";

// <header> だけを取り出して読む (ページ全体だと happy-dom が CSS を取りに行くため)
const html = readFileSync(path.join(__dirname, "../editor/index.html"), "utf8");
const header = document.createElement("div");
header.innerHTML = html.match(/<header[\s\S]*?<\/header>/)?.[0] ?? "";
const links = [...header.querySelectorAll<HTMLAnchorElement>(".nav-link")];

describe("ヘッダーのリンク", () => {
  it("レシピ → スライド → バックエンド の順に並ぶ", () => {
    expect(links.map((a) => a.getAttribute("href"))).toEqual([
      // .html 付き: Vite 開発サーバーは拡張子を補わない (Cloudflare は /recipes へリダイレクト)
      "/recipes.html",
      "/slides.html",
      "/api",
    ]);
  });

  it("どれも新しいタブで開く (保存前の編集を失わないため)", () => {
    expect(links.map((a) => a.target)).toEqual(["_blank", "_blank", "_blank"]);
  });
});
