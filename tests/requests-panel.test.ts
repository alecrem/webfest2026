// @vitest-environment happy-dom
import { describe, expect, it } from "vitest";
import { createRequestsPanel } from "../editor/src/requests-panel";

function setup() {
  const list = document.createElement("ul");
  document.body.appendChild(list);
  return { list, panel: createRequestsPanel(list) };
}

describe("通信パネル", () => {
  it("fetch はURLリンク付きの行になり、クリックで本文が開閉する", () => {
    const { list, panel } = setup();
    panel.add({
      kind: "fetch",
      url: "/api/pokemon/25",
      status: 200,
      ok: true,
      ms: 12,
      preview: '{"id":25}',
    });

    const link = list.querySelector("a")!;
    expect(link.getAttribute("href")).toBe("/api/pokemon/25");
    expect(link.getAttribute("target")).toBe("_blank");

    const body = list.querySelector<HTMLPreElement>(".req-body")!;
    expect(body.hidden).toBe(true);
    expect(body.textContent).toContain('"id": 25');

    list.querySelector<HTMLElement>(".req-summary")!.click();
    expect(body.hidden).toBe(false);
  });

  it("JSエラーは行番号付きで表示される", () => {
    const { list, panel } = setup();
    panel.add({ kind: "error", message: "x is not defined", line: 12 });
    const li = list.querySelector("li")!;
    expect(li.className).toBe("req-error");
    expect(li.textContent).toContain("12行目");
  });

  it("clear で空になる", () => {
    const { list, panel } = setup();
    panel.add({ kind: "error", message: "boom" });
    panel.clear();
    expect(list.children.length).toBe(0);
  });
});
