import { describe, expect, it, vi } from "vitest";
import { spriteResponse } from "../server/sprites";

const PNG = new Uint8Array([0x89, 0x50, 0x4e, 0x47]);

function stubFetch(status = 200) {
  return vi.fn(
    async () => new Response(status === 200 ? PNG : "nope", { status }),
  ) as unknown as typeof fetch;
}

describe("スプライトプロキシのコア (spriteResponse)", () => {
  it("有効なidは upstream から取得して image/png を返す", async () => {
    const fetchImpl = stubFetch();
    const res = await spriteResponse("25.png", fetchImpl);
    expect(res.status).toBe(200);
    expect(res.headers.get("content-type")).toBe("image/png");
    expect(new Uint8Array(await res.arrayBuffer())).toEqual(PNG);
    expect(fetchImpl).toHaveBeenCalledOnce();
    expect(fetchImpl).toHaveBeenCalledWith(expect.stringContaining("/25.png"));
  });

  it("範囲外や不正な名前は upstream に触れず 404", async () => {
    const fetchImpl = stubFetch();
    for (const file of ["1026.png", "0.png", "evil.png", "25.gif", undefined]) {
      const res = await spriteResponse(file, fetchImpl);
      expect(res.status, String(file)).toBe(404);
      const body = (await res.json()) as { hint: string };
      expect(body.hint).toContain("1025");
    }
    expect(fetchImpl).not.toHaveBeenCalled();
  });

  it("upstream が失敗したら 502", async () => {
    const fetchImpl = stubFetch(500);
    const res = await spriteResponse("25.png", fetchImpl);
    expect(res.status).toBe(502);
  });
});
