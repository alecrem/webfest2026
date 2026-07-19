import { describe, expect, it } from "vitest";
import { createApp } from "../server/app";
import { clubs } from "../server/data";

const app = createApp();

async function get(path: string) {
  const res = await app.request(path);
  return { res, body: await res.json() };
}

describe("GET /api", () => {
  it("利用できるエンドポイントの一覧を返す", async () => {
    const { res, body } = await get("/api");
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("application/json");
    expect(body.endpoints).toContain("/api/pokemon/25");
  });

  it("ブラウザ (Accept: text/html) にはエクスプローラーを返す", async () => {
    const res = await app.request("/api", {
      headers: { accept: "text/html,application/xhtml+xml" },
    });
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toContain("text/html");
    const html = await res.text();
    expect(html).toContain("バックエンドをのぞいてみよう");
    expect(html).toContain("/api/pokemon/25");
  });

  it("fetch (Accept: application/json) にはJSONのまま", async () => {
    const res = await app.request("/api", {
      headers: { accept: "application/json" },
    });
    expect(res.headers.get("content-type")).toContain("application/json");
  });
});

describe("GET /api/bukatsu", () => {
  it("全部活を返す", async () => {
    const { body } = await get("/api/bukatsu");
    expect(body.length).toBe(clubs.length);
    expect(body.length).toBeGreaterThan(0);
    expect(body[0]).toMatchObject({
      id: expect.any(String),
      name: expect.any(String),
      category: expect.any(String),
    });
  });

  it("id で1つの部活を取得、なければ hint 付き 404", async () => {
    const { body } = await get("/api/bukatsu/kitaku");
    expect(body).toEqual({ id: "kitaku", name: "帰宅部", category: "その他" });
    const { res, body: err } = await get("/api/bukatsu/unknown");
    expect(res.status).toBe(404);
    expect(err.hint).toContain("kitaku");
  });

  it("カテゴリで絞り込み、他カテゴリが混ざらない", async () => {
    const { body: sports } = await get("/api/bukatsu?category=運動部");
    const { body: all } = await get("/api/bukatsu");
    expect(sports.length).toBeGreaterThan(0);
    expect(sports.length).toBeLessThan(all.length);
    expect(sports.every((c: { category: string }) => c.category === "運動部")).toBe(true);
  });
});

describe("GET /api/pokemon", () => {
  it("151匹をサマリー項目で返す", async () => {
    const { body } = await get("/api/pokemon");
    expect(body).toHaveLength(151);
    expect(body[24]).toMatchObject({ id: 25, nameJa: "ピカチュウ" });
    expect(body[0]).not.toHaveProperty("types");
  });

  it("日本語のタイプ名で絞り込める", async () => {
    const { body } = await get("/api/pokemon?type=ほのお");
    expect(body.length).toBeGreaterThan(0);
    expect(body.length).toBeLessThan(151);
  });

  it("id・英語名・日本語名のどれでも見つかる", async () => {
    for (const key of ["25", "pikachu", "ピカチュウ"]) {
      const { res, body } = await get(`/api/pokemon/${encodeURIComponent(key)}`);
      expect(res.status).toBe(200);
      expect(body.id).toBe(25);
      expect(body.sprite).toBe("/img/pokemon/25.png");
    }
  });

  it("存在しなければ hint 付きで 404", async () => {
    const { res, body } = await get("/api/pokemon/999");
    expect(res.status).toBe(404);
    expect(body.hint).toBeTruthy();
  });
});

describe("NPB と Jリーグ", () => {
  it("NPB は12球団、リーグで絞り込める", async () => {
    const { body: all } = await get("/api/npb/teams");
    expect(all).toHaveLength(12);
    const { body: central } = await get(
      "/api/npb/teams?league=" + encodeURIComponent("セ・リーグ"),
    );
    expect(central).toHaveLength(6);
  });

  it("id で詳細を取得、なければ hint 付き 404", async () => {
    const { body } = await get("/api/npb/teams/tigers");
    expect(body.name).toBe("阪神タイガース");
    const { res, body: err } = await get("/api/npb/teams/unknown");
    expect(res.status).toBe(404);
    expect(err.hint).toContain("tigers");
  });

  it("Jリーグは一覧から詳細にたどれる", async () => {
    const { body: teams } = await get("/api/jleague/teams");
    expect(teams.length).toBeGreaterThanOrEqual(18);
    const { body } = await get(`/api/jleague/teams/${teams[0].id}`);
    expect(body.id).toBe(teams[0].id);
  });
});

describe("未知のルート", () => {
  it("/api への hint 付きの 404 JSON", async () => {
    const { res, body } = await get("/api/unknown");
    expect(res.status).toBe(404);
    expect(body.hint).toContain("/api");
  });
});
