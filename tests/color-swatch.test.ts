import { describe, expect, it } from "vitest";
import {
  findHexColors,
  hexAt,
  normalizeHex,
} from "../editor/src/color-swatch";

describe("findHexColors", () => {
  it("6桁と3桁の16進カラーを位置つきで拾う", () => {
    const text = `background: #f0f4ff; color: #fff; edge: #16a34a;`;
    const found = findHexColors(text);
    expect(found.map((f) => f.value)).toEqual(["#f0f4ff", "#fff", "#16a34a"]);
    // 位置はその16進の # を指す
    expect(text.slice(found[0].from, found[0].from + 7)).toBe("#f0f4ff");
    expect(text.slice(found[1].from, found[1].from + 4)).toBe("#fff");
  });

  it("6桁を3桁に切り取らない", () => {
    expect(findHexColors("#ffde00").map((f) => f.value)).toEqual(["#ffde00"]);
  });

  it("16進カラーでない # は拾わない", () => {
    expect(findHexColors("#section と #12 と color")).toEqual([]);
  });
});

describe("hexAt", () => {
  it("先頭の16進 (6桁/3桁) だけを返す", () => {
    expect(hexAt('#ffde00" title="...')).toBe("#ffde00");
    expect(hexAt("#fff; color")).toBe("#fff");
  });

  it("16進で始まらなければ null", () => {
    expect(hexAt(' #ffffff')).toBeNull();
    expect(hexAt("hello")).toBeNull();
  });
});

describe("normalizeHex", () => {
  it("#rgb を #rrggbb に伸ばす", () => {
    expect(normalizeHex("#fff")).toBe("#ffffff");
    expect(normalizeHex("#0af")).toBe("#00aaff");
  });

  it("6桁は小文字にしてそのまま", () => {
    expect(normalizeHex("#FFDE00")).toBe("#ffde00");
  });
});

describe("色の置き換えはその1件だけに効く", () => {
  it("選んだ位置の16進だけが変わる", () => {
    const doc = `a: #f0f4ff; b: #ffde00; c: #16a34a;`;
    const targets = findHexColors(doc);
    const b = targets[1]; // #ffde00
    const hex = hexAt(doc.slice(b.from));
    expect(hex).toBe("#ffde00");
    const next = doc.slice(0, b.from) + "#123456" + doc.slice(b.from + hex!.length);
    expect(next).toBe(`a: #f0f4ff; b: #123456; c: #16a34a;`);
    // 他の色はそのまま
    expect(findHexColors(next).map((f) => f.value)).toEqual([
      "#f0f4ff",
      "#123456",
      "#16a34a",
    ]);
  });
});
