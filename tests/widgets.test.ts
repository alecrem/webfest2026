// @vitest-environment happy-dom
import { readFileSync } from "node:fs";
import path from "node:path";
import { beforeAll, beforeEach, describe, expect, it, vi } from "vitest";

// 本物の widgets.js を happy-dom 上で実行してテストする
beforeAll(() => {
  const source = readFileSync(
    path.join(__dirname, "../public/widgets.js"),
    "utf8",
  );
  new Function(source)();
});

function stubFetch(payload: unknown, status = 200) {
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(JSON.stringify(payload), { status })),
  );
}

async function mount(tag: string, src: string): Promise<HTMLElement> {
  const el = document.createElement(tag);
  el.setAttribute("src", src);
  document.body.appendChild(el);
  // refresh() の fetch → render を待つ
  await new Promise((r) => setTimeout(r, 0));
  await new Promise((r) => setTimeout(r, 0));
  return el;
}

beforeEach(() => {
  document.body.innerHTML = "";
});

describe("widgets", () => {
  it("poke-card は1匹のデータを描画する", async () => {
    stubFetch({
      id: 25,
      name: "pikachu",
      nameJa: "ピカチュウ",
      types: ["でんき"],
      sprite: "/img/pokemon/25.png",
    });
    const el = await mount("poke-card", "/api/pokemon/25");
    expect(el.innerHTML).toContain("ピカチュウ");
    expect(el.innerHTML).toContain("でんき");
    expect(el.querySelector("img")?.getAttribute("src")).toBe(
      "/img/pokemon/25.png",
    );
  });

  it("poke-card に一覧のアドレスを入れると選び方をおしえる", async () => {
    stubFetch([{ id: 7 }, { id: 8 }, { id: 9 }]);
    const el = await mount("poke-card", "/api/pokemon?type=みず");
    expect(el.innerHTML).toContain("3匹見つかった");
    expect(el.innerHTML).toContain("/api/pokemon/25");
  });

  it("team-card はチームを、一覧なら選び方を描画する", async () => {
    stubFetch({
      id: "tigers",
      name: "阪神タイガース",
      hometown: "兵庫県西宮市",
      stadium: "阪神甲子園球場",
      founded: 1935,
      colors: { primary: "#ffe201", secondary: "#000000" },
    });
    const card = await mount("team-card", "/api/npb/teams/tigers");
    expect(card.innerHTML).toContain("阪神タイガース");

    stubFetch([{ id: "a" }, { id: "b" }]);
    const list = await mount("team-card", "/api/npb/teams");
    expect(list.innerHTML).toContain("2チーム見つかった");
  });

  it("club-list は一覧でも1件でも描画できる", async () => {
    stubFetch([
      { id: "yakyu", name: "野球部", category: "運動部" },
      { id: "kitaku", name: "帰宅部", category: "その他" },
    ]);
    const list = await mount("club-list", "/api/bukatsu");
    expect(list.innerHTML).toContain("野球部");
    expect(list.innerHTML).toContain("帰宅部");

    stubFetch({ id: "kitaku", name: "帰宅部", category: "その他" });
    const single = await mount("club-list", "/api/bukatsu/kitaku");
    expect(single.innerHTML).toContain("帰宅部");
  });

  it("404 のときはサーバーの hint を見せる", async () => {
    stubFetch({ error: "見つかりませんでした", hint: "1〜151だよ" }, 404);
    const el = await mount("poke-card", "/api/pokemon/999");
    expect(el.innerHTML).toContain("404");
    expect(el.innerHTML).toContain("1〜151だよ");
  });
});
