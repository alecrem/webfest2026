import { Hono } from "hono";
import type { Context } from "hono";
import { clubs, jleagueTeams, npbTeams, pokemon } from "./data";
import type { Team } from "./data";
import { explorerHtml } from "./explorer";

// 生徒がURLをブラウザで直接開くことも想定して、JSONは整形して返す。
function json(c: Context, data: unknown, status: 200 | 404 = 200) {
  return c.body(JSON.stringify(data, null, 2), status, {
    "content-type": "application/json; charset=utf-8",
  });
}

function notFound(c: Context, hint: string) {
  return json(c, { error: "見つかりませんでした", hint }, 404);
}

function teamRoutes(app: Hono, base: string, teams: Team[]) {
  app.get(`${base}/teams`, (c) => {
    const league = c.req.query("league");
    return json(c, league ? teams.filter((t) => t.league === league) : teams);
  });
  app.get(`${base}/teams/:id`, (c) => {
    const team = teams.find((t) => t.id === c.req.param("id"));
    if (!team) {
      return notFound(c, `id は ${teams.map((t) => t.id).join(", ")} のどれか`);
    }
    return json(c, team);
  });
}

export function createApp() {
  const app = new Hono();

  app.get("/api", (c) => {
    // ブラウザで開いたらエクスプローラー、fetch にはJSONの一覧。
    if (c.req.header("accept")?.includes("text/html")) {
      return c.html(explorerHtml);
    }
    return json(c, {
      message: "このバックエンドは読み取り専用です。いろいろなアドレスを試してみよう！",
      endpoints: [
        "/api/bukatsu",
        "/api/bukatsu?category=運動部",
        "/api/bukatsu/kitaku",
        "/api/pokemon",
        "/api/pokemon?type=ほのお",
        "/api/pokemon/25",
        "/api/pokemon/pikachu",
        "/api/npb/teams",
        "/api/npb/teams?league=セ・リーグ",
        "/api/npb/teams/tigers",
        "/api/jleague/teams",
        "/api/jleague/teams/kawasaki",
      ],
    });
  });

  app.get("/api/bukatsu", (c) => {
    const category = c.req.query("category");
    return json(
      c,
      category ? clubs.filter((x) => x.category === category) : clubs,
    );
  });

  app.get("/api/bukatsu/:id", (c) => {
    const club = clubs.find((x) => x.id === c.req.param("id"));
    if (!club) {
      return notFound(c, `id は ${clubs.map((x) => x.id).join(", ")} のどれか`);
    }
    return json(c, club);
  });

  app.get("/api/pokemon", (c) => {
    const type = c.req.query("type");
    const list = type ? pokemon.filter((p) => p.types.includes(type)) : pokemon;
    return json(
      c,
      list.map(({ id, name, nameJa, sprite }) => ({ id, name, nameJa, sprite })),
    );
  });

  app.get("/api/pokemon/:idOrName", (c) => {
    const key = c.req.param("idOrName").toLowerCase();
    const found = pokemon.find(
      (p) => String(p.id) === key || p.name === key || p.nameJa === key,
    );
    if (!found) {
      return notFound(c, "番号 (1〜151) か英語名。例: /api/pokemon/25");
    }
    return json(c, found);
  });

  teamRoutes(app, "/api/npb", npbTeams);
  teamRoutes(app, "/api/jleague", jleagueTeams);

  app.notFound((c) =>
    notFound(c, "アドレスの一覧は /api を見てね"),
  );

  return app;
}
