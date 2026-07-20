import { readFileSync } from "node:fs";
import path from "node:path";
import { describe, expect, it } from "vitest";
import { clubs, jleagueTeams, npbTeams, pokemon } from "../server/data";
import type { Team } from "../server/data";

const root = path.join(__dirname, "..");
const HEX = /^#[0-9a-f]{6}$/i;

function expectUniqueIds(items: { id: string | number }[]) {
  expect(new Set(items.map((x) => x.id)).size).toBe(items.length);
}

function expectValidTeams(teams: Team[]) {
  expectUniqueIds(teams);
  for (const team of teams) {
    expect(team.colors.primary, `${team.id} primary`).toMatch(HEX);
    expect(team.colors.secondary, `${team.id} secondary`).toMatch(HEX);
    expect(team.founded).toBeGreaterThan(1900);
    expect(team.founded).toBeLessThanOrEqual(2026);
    expect(team.name.length).toBeGreaterThan(0);
    expect(team.stadium.length).toBeGreaterThan(0);
  }
}

describe("データ整合性", () => {
  it("ポケモン: 1025匹、id 1〜1025、日本語名とプロキシのスプライトURL", () => {
    expect(pokemon).toHaveLength(1025);
    for (const p of pokemon) {
      expect(p.nameJa, p.name).not.toBe(p.name);
      expect(p.sprite).toBe(`/img/pokemon/${p.id}.png`);
    }
    expect(pokemon.map((p) => p.id)).toEqual(
      Array.from({ length: 1025 }, (_, i) => i + 1),
    );
  });

  it("部活: id 重複なし、カテゴリは既知のもの", () => {
    expectUniqueIds(clubs);
    for (const club of clubs) {
      if (club.category !== undefined) {
        expect(["運動部", "文化部"]).toContain(club.category);
      }
      expect(club.name.length).toBeGreaterThan(0);
    }
  });

  it("NPB: 6球団ずつ2リーグの計12球団", () => {
    expect(npbTeams).toHaveLength(12);
    expectValidTeams(npbTeams);
    expect(npbTeams.filter((t) => t.league === "セ・リーグ")).toHaveLength(6);
    expect(npbTeams.filter((t) => t.league === "パ・リーグ")).toHaveLength(6);
  });

  it("Jリーグ: id 重複なしの有効なデータ", () => {
    expect(jleagueTeams.length).toBeGreaterThanOrEqual(18);
    expectValidTeams(jleagueTeams);
  });

  it("生徒テンプレートはウィジェットとバックエンドを使う", () => {
    const template = readFileSync(
      path.join(root, "editor/src/template.html"),
      "utf8",
    );
    expect(template).toContain('<script src="/widgets.js">');
    for (const tag of ["poke-card", "team-card", "club-list"]) {
      expect(template).toContain(`<${tag} src="/api/`);
    }
  });

  it("widgets.js は構文が正しく3つのウィジェットを定義する", () => {
    const source = readFileSync(path.join(root, "public/widgets.js"), "utf8");
    expect(() => new Function(source)).not.toThrow();
    for (const tag of ["poke-card", "team-card", "club-list"]) {
      expect(source).toContain(`customElements.define("${tag}"`);
    }
  });
});
