// JSONはビルド時にバンドルへ取り込む (import)。Cloudflare Workers には
// ファイルシステムがないため readFileSync は使えない。pokemon.json は
// `pnpm compose-data` で事前生成される (git管理外)。
import bukatsu from "../data/bukatsu.json";
import jleague from "../data/jleague.json";
import npb from "../data/npb.json";
import pokemonData from "../data/pokemon.json";

export interface Club {
  id: string;
  name: string;
  category?: string;
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

export const clubs = bukatsu as Club[];
export const pokemon = pokemonData as Pokemon[];
export const npbTeams = npb as Team[];
export const jleagueTeams = jleague as Team[];
