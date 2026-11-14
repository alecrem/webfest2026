import { Hono } from "hono";
import type { Context } from "hono";
import { clubs, jleagueTeams, npbTeams, pokemon } from "./data";
import type { Pokemon, Team } from "./data";
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

type Filtered<T> = { ok: true; items: T[] } | { ok: false; hint: string };

// 一覧の id から「id は a, b, c のどれか」という hint を作る。
function idListHint<T>(items: T[], idOf: (item: T) => string): string {
  return `id は ${items.map(idOf).join(", ")} のどれか`;
}

// カンマ区切りの ids で、生徒が書いた順に取り出す。未知の id は無視する。
// 別の競技の id などヒットしないものは自然に除かれる (= 同じ endpoint 内だけ)。
// どれも見つからなければ hint を返す (= /:id と同じ案内)。
function pickByIds<T>(
  items: T[],
  idsParam: string,
  idOf: (item: T) => string | number,
  hint: string,
): Filtered<T> {
  const picked = idsParam
    .split(",")
    .map((s) => s.trim())
    .filter(Boolean)
    .map((id) => items.find((item) => String(idOf(item)) === id))
    .filter((item): item is T => item !== undefined);
  return picked.length > 0 ? { ok: true, items: picked } : { ok: false, hint };
}

// 絞り込み。何もヒットしなければ、使える値をデータから集めて hint にする
// (生徒が ?type=炎 のように書いたとき、[] だけでは間違いに気づけないため)。
function filterByParam<T>(
  items: T[],
  param: string,
  value: string | undefined,
  valuesOf: (item: T) => (string | undefined)[],
): Filtered<T> {
  if (!value) return { ok: true, items };
  const matches = items.filter((item) => valuesOf(item).includes(value));
  if (matches.length > 0) return { ok: true, items: matches };
  const valid = [...new Set(items.flatMap(valuesOf))].filter(Boolean);
  const hint =
    valid.length > 0
      ? `${param} は ${valid.join(", ")} のどれか`
      : `${param} では絞り込めません`;
  return { ok: false, hint };
}

function respondFiltered<T>(
  c: Context,
  result: Filtered<T>,
  present: (items: T[]) => unknown = (items) => items,
) {
  return result.ok ? json(c, present(result.items)) : notFound(c, result.hint);
}

function teamRoutes(app: Hono, base: string, teams: Team[]) {
  const idHint = idListHint(teams, (t) => t.id);
  app.get(`${base}/teams`, (c) => {
    const ids = c.req.query("ids");
    return respondFiltered(
      c,
      ids
        ? pickByIds(teams, ids, (t) => t.id, idHint)
        : filterByParam(teams, "league", c.req.query("league"), (t) => [
            t.league,
          ]),
    );
  });
  app.get(`${base}/teams/:id`, (c) => {
    const team = teams.find((t) => t.id === c.req.param("id"));
    return team ? json(c, team) : notFound(c, idHint);
  });
}

const clubIdHint = idListHint(clubs, (x) => x.id);
const pokemonIdHint = "番号 (1〜1025) か英語名。例: /api/pokemon/25";
// ?ids= は番号だけを受け付ける (英語名は不可)。
const pokemonIdsHint = "番号をカンマ区切りで (1〜1025)。例: ?ids=25,7";

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
        "/api/bukatsu?ids=yakyu,bijutsu",
        "/api/bukatsu/kitaku",
        "/api/pokemon",
        "/api/pokemon?type=ほのお",
        "/api/pokemon?ids=25,7",
        "/api/pokemon/25",
        "/api/pokemon/pikachu",
        "/api/npb/teams",
        "/api/npb/teams?league=セ・リーグ",
        "/api/npb/teams?ids=tigers,giants",
        "/api/npb/teams/tigers",
        "/api/jleague/teams",
        "/api/jleague/teams/kawasaki",
      ],
    });
  });

  app.get("/api/bukatsu", (c) => {
    const ids = c.req.query("ids");
    return respondFiltered(
      c,
      ids
        ? pickByIds(clubs, ids, (x) => x.id, clubIdHint)
        : filterByParam(clubs, "category", c.req.query("category"), (x) => [
            x.category,
          ]),
    );
  });

  app.get("/api/bukatsu/:id", (c) => {
    const club = clubs.find((x) => x.id === c.req.param("id"));
    return club ? json(c, club) : notFound(c, clubIdHint);
  });

  app.get("/api/pokemon", (c) => {
    const ids = c.req.query("ids");
    const result: Filtered<Pokemon> = ids
      ? pickByIds(pokemon, ids, (p) => p.id, pokemonIdsHint)
      : filterByParam(pokemon, "type", c.req.query("type"), (p) => p.types);
    return respondFiltered(c, result, (list) =>
      list.map(({ id, name, nameJa, sprite }) => ({ id, name, nameJa, sprite })),
    );
  });

  app.get("/api/pokemon/:idOrName", (c) => {
    const key = c.req.param("idOrName").toLowerCase();
    const found = pokemon.find(
      (p) => String(p.id) === key || p.name === key || p.nameJa === key,
    );
    return found ? json(c, found) : notFound(c, pokemonIdHint);
  });

  teamRoutes(app, "/api/npb", npbTeams);
  teamRoutes(app, "/api/jleague", jleagueTeams);

  app.notFound((c) =>
    notFound(c, "アドレスの一覧は /api を見てね"),
  );

  return app;
}
