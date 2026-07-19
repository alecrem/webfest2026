// Cloudflare Pages Function: /img/pokemon/:id.png のプロキシ。
// spriteResponse で PokéAPI から取得し、成功したものを edge の Cache API に
// キャッシュする。2回目以降は upstream に触れず edge から配信される。
import { spriteResponse } from "../../../server/sprites";

interface Ctx {
  request: Request;
  params: { id: string };
  waitUntil: (promise: Promise<unknown>) => void;
}

export async function onRequestGet(ctx: Ctx): Promise<Response> {
  // caches.default は Cloudflare 固有 (標準の CacheStorage 型にはない)。
  const cache = (caches as unknown as { default: Cache }).default;

  const hit = await cache.match(ctx.request);
  if (hit) return hit;

  const res = await spriteResponse(ctx.params.id);
  if (res.ok) {
    ctx.waitUntil(cache.put(ctx.request, res.clone()));
  }
  return res;
}
