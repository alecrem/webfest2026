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

async function mount(
  tag: string,
  src: string,
  attrs: Record<string, string> = {},
): Promise<HTMLElement> {
  const el = document.createElement(tag);
  el.setAttribute("src", src);
  for (const [k, v] of Object.entries(attrs)) el.setAttribute(k, v);
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

  it("poke-card は一覧のアドレスでもコンパクトに描画する", async () => {
    stubFetch([
      { id: 7, name: "squirtle", nameJa: "ゼニガメ", sprite: "/img/pokemon/7.png" },
      { id: 8, name: "wartortle", nameJa: "カメール", sprite: "/img/pokemon/8.png" },
    ]);
    const el = await mount("poke-card", "/api/pokemon?type=みず");
    expect(el.innerHTML).toContain("ゼニガメ");
    expect(el.innerHTML).toContain("カメール");
    // 一覧はコンパクトなサムネイルで並ぶ
    expect(el.querySelectorAll(".w-item").length).toBe(2);
    expect(el.querySelector(".w-thumb")).not.toBeNull();
  });

  it("team-card はチームでも一覧でも描画する", async () => {
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
    expect(card.querySelector(".w-title")?.textContent).toBe("阪神タイガース");

    stubFetch([
      { id: "tigers", name: "阪神タイガース", league: "セ・リーグ" },
      { id: "giants", name: "読売ジャイアンツ", league: "セ・リーグ" },
    ]);
    const list = await mount("team-card", "/api/npb/teams");
    expect(list.querySelectorAll(".w-item").length).toBe(2);
    expect(list.innerHTML).toContain("読売ジャイアンツ");
  });

  it("一覧は最大5件で、残りは「ほか N件」とまとめる", async () => {
    const many = Array.from({ length: 8 }, (_, i) => ({
      id: i + 1,
      name: `p${i + 1}`,
      nameJa: `ポケ${i + 1}`,
      sprite: `/img/pokemon/${i + 1}.png`,
    }));
    stubFetch(many);
    const el = await mount("poke-card", "/api/pokemon");
    expect(el.querySelectorAll(".w-item").length).toBe(5);
    expect(el.querySelector(".w-more")?.textContent).toContain("ほか 3件");
    // 6件目以降は出さない
    expect(el.innerHTML).not.toContain("ポケ6");
  });

  it("club-list は一覧でも1件でも描画できる", async () => {
    stubFetch([
      { id: "yakyu", name: "野球部", category: "運動部" },
      { id: "kitaku", name: "帰宅部" },
    ]);
    const list = await mount("club-list", "/api/bukatsu");
    expect(list.innerHTML).toContain("野球部");
    expect(list.innerHTML).toContain("帰宅部");

    stubFetch({ id: "kitaku", name: "帰宅部" });
    const single = await mount("club-list", "/api/bukatsu/kitaku");
    expect(single.innerHTML).toContain("帰宅部");
    // カテゴリがなければチップは出さない
    expect(single.querySelector(".w-chip")).toBeNull();
  });

  it("404 のときはサーバーの hint を見せる", async () => {
    stubFetch({ error: "見つかりませんでした", hint: "1〜151だよ" }, 404);
    const el = await mount("poke-card", "/api/pokemon/999");
    expect(el.innerHTML).toContain("404");
    expect(el.innerHTML).toContain("1〜151だよ");
  });

  it("title 属性はカードの中に見出しとして入る (poke-card)", async () => {
    stubFetch({
      id: 25,
      name: "pikachu",
      nameJa: "ピカチュウ",
      types: ["でんき"],
      sprite: "/img/pokemon/25.png",
    });
    const el = await mount("poke-card", "/api/pokemon/25", {
      title: "お気に入り",
    });
    const box = el.querySelector(".w-box");
    const titleEl = el.querySelector(".w-card-band");
    expect(titleEl?.textContent).toBe("お気に入り");
    // カードの外ではなく中にある
    expect(box?.contains(titleEl ?? null)).toBe(true);
  });

  it("title は一覧カードの中にも入る (club-list)", async () => {
    stubFetch([{ id: "yakyu", name: "野球部", category: "運動部" }]);
    const el = await mount("club-list", "/api/bukatsu", { title: "部活" });
    const box = el.querySelector(".w-box");
    const titleEl = el.querySelector(".w-card-band");
    expect(titleEl?.textContent).toBe("部活");
    expect(box?.contains(titleEl ?? null)).toBe(true);
  });

  it("title がなければ見出しは出ない", async () => {
    stubFetch({
      id: 25,
      name: "pikachu",
      nameJa: "ピカチュウ",
      types: ["でんき"],
      sprite: "/img/pokemon/25.png",
    });
    const el = await mount("poke-card", "/api/pokemon/25");
    expect(el.querySelector(".w-card-band")).toBeNull();
  });
});
