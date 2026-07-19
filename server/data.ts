import { readFileSync } from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

export interface Club {
  id: string;
  name: string;
  category: string;
}

export interface Pokemon {
  id: number;
  name: string;
  nameJa: string;
  types: string[];
  sprite: string;
}

export interface Team {
  id: string;
  name: string;
  hometown: string;
  stadium: string;
  founded: number;
  colors: { primary: string; secondary: string };
  league?: string;
  shortName?: string;
}

const dataDir = path.join(
  path.dirname(path.dirname(fileURLToPath(import.meta.url))),
  "data",
);

function load<T>(file: string): T {
  try {
    return JSON.parse(readFileSync(path.join(dataDir, file), "utf8")) as T;
  } catch (err) {
    if ((err as NodeJS.ErrnoException).code === "ENOENT") {
      throw new Error(
        `data/${file} がありません — \`pnpm compose-data\` で生成してください`,
      );
    }
    throw err;
  }
}

export const clubs = load<Club[]>("bukatsu.json");
export const pokemon = load<Pokemon[]>("pokemon.json");
export const npbTeams = load<Team[]>("npb.json");
export const jleagueTeams = load<Team[]>("jleague.json");
