import { describe, expect, it } from "vitest";
import { clampFraction, fractionAt } from "../editor/src/split";

describe("スプリッターの割合計算", () => {
  it("ポインター位置をコンテナ内の割合に変換する", () => {
    expect(fractionAt(500, 0, 1000)).toBe(0.5);
    expect(fractionAt(350, 100, 1000)).toBe(0.25);
  });

  it("デフォルトで 0.2〜0.8 にクランプする", () => {
    expect(fractionAt(0, 0, 1000)).toBe(0.2);
    expect(fractionAt(1000, 0, 1000)).toBe(0.8);
  });

  it("min/max を指定できる", () => {
    expect(clampFraction(0.05, 0.15, 0.92)).toBe(0.15);
    expect(clampFraction(0.99, 0.15, 0.92)).toBe(0.92);
    expect(clampFraction(0.5, 0.15, 0.92)).toBe(0.5);
  });
});
