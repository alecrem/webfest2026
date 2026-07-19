import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { createApp } from "../server/app";

const PNG_BYTES = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

function appWithUpstream(status = 200) {
  let calls = 0;
  const fetchImpl = (async () => {
    calls += 1;
    return new Response(status === 200 ? PNG_BYTES : "nope", { status });
  }) as typeof fetch;
  const app = createApp({
    spriteCacheDir: mkdtempSync(path.join(tmpdir(), "sprites-")),
    fetchImpl,
  });
  return { app, calls: () => calls };
}

describe("スプライトプロキシ /img/pokemon/:id.png", () => {
  it("上流から取得してディスクにキャッシュする", async () => {
    const { app, calls } = appWithUpstream();

    const first = await app.request("/img/pokemon/25.png");
    expect(first.status).toBe(200);
    expect(first.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await first.arrayBuffer())).toEqual(PNG_BYTES);

    const second = await app.request("/img/pokemon/25.png");
    expect(second.status).toBe(200);
    expect(calls()).toBe(1);
  });

  it("範囲外の id や不正な名前は上流に触れず 404", async () => {
    const { app, calls } = appWithUpstream();
    for (const file of ["999.png", "0.png", "evil.png", "25.gif"]) {
      const res = await app.request(`/img/pokemon/${file}`);
      expect(res.status, file).toBe(404);
    }
    expect(calls()).toBe(0);
  });

  it("上流が失敗したら 502、キャッシュを汚さない", async () => {
    const { app, calls } = appWithUpstream(500);
    const first = await app.request("/img/pokemon/25.png");
    expect(first.status).toBe(502);
    const second = await app.request("/img/pokemon/25.png");
    expect(second.status).toBe(502);
    expect(calls()).toBe(2);
  });
});
