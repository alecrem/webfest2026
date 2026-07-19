import { existsSync, mkdirSync } from "node:fs";
import { readFile, writeFile } from "node:fs/promises";
import path from "node:path";
import type { Context } from "hono";

// スプライトプロキシ: 生徒からはこのサーバーしか見えない。初回アクセス時に
// PokéAPI から取得してディスクにキャッシュする (`pnpm compose-data` でも
// 温められるので、授業はオフラインで動く)。
const UPSTREAM =
  "https://raw.githubusercontent.com/PokeAPI/sprites/master/sprites/pokemon";
const MAX_ID = 151;

export interface SpriteProxyOptions {
  cacheDir: string;
  fetchImpl?: typeof fetch;
}

export function spriteProxy({ cacheDir, fetchImpl = fetch }: SpriteProxyOptions) {
  mkdirSync(cacheDir, { recursive: true });

  return async (c: Context) => {
    const match = /^(\d+)\.png$/.exec(c.req.param("file") ?? "");
    const id = match ? Number(match[1]) : NaN;
    if (!match || id < 1 || id > MAX_ID) {
      return c.json(
        { error: "見つかりませんでした", hint: "1.png 〜 151.png" },
        404,
      );
    }

    const cached = path.join(cacheDir, `${id}.png`);
    if (!existsSync(cached)) {
      const res = await fetchImpl(`${UPSTREAM}/${id}.png`);
      if (!res.ok) {
        return c.json({ error: "画像を取得できませんでした" }, 502);
      }
      await writeFile(cached, Buffer.from(await res.arrayBuffer()));
    }

    return c.body(new Uint8Array(await readFile(cached)), 200, {
      "content-type": "image/png",
      "cache-control": "public, max-age=86400",
    });
  };
}
