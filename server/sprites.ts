// スプライトのプロキシ (ランタイム非依存のコア)。
// 生徒からはこのオリジンしか見えない: サーバー側が PokéAPI から取得して
// 返すので single-origin を保てる。キャッシュは呼び出し側で行う:
// Cloudflare は edge の Cache API、Node 開発サーバーは都度取得。
const UPSTREAM =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const MAX_ID = 1025;

function errorJson(body: unknown, status: number): Response {
  return new Response(JSON.stringify(body), {
    status,
    headers: { "content-type": "application/json; charset=utf-8" },
  });
}

export async function spriteResponse(
  file: string | undefined,
  fetchImpl: typeof fetch = fetch,
): Promise<Response> {
  const match = /^(\d+)\.png$/.exec(file ?? "");
  const id = match ? Number(match[1]) : NaN;
  if (!match || id < 1 || id > MAX_ID) {
    return errorJson(
      { error: "見つかりませんでした", hint: `1.png 〜 ${MAX_ID}.png` },
      404,
    );
  }

  const upstream = await fetchImpl(`${UPSTREAM}/${id}.png`);
  if (!upstream.ok) {
    return errorJson({ error: "画像を取得できませんでした" }, 502);
  }

  return new Response(upstream.body, {
    status: 200,
    headers: {
      "content-type": "image/png",
      "cache-control": "public, max-age=31536000, immutable",
    },
  });
}
