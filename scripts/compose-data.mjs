// PokéAPI から第1世代 (151匹) のデータを取得して data/pokemon.json を生成する。
// 画像は落とさない: スプライトは実行時に /img/pokemon/:id.png のプロキシが
// 必要な分だけ取得する (数を増やしてもビルドが重くならない)。
// 生成物はコミットしない: `pnpm compose-data` でいつでも再現できる。
import { writeFile } from "node:fs/promises";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(path.dirname(fileURLToPath(import.meta.url)));
const DATA_FILE = path.join(root, "data/pokemon.json");
const COUNT = 151;

const TYPE_JA = {
  normal: "ノーマル",
  fire: "ほのお",
  water: "みず",
  electric: "でんき",
  grass: "くさ",
  ice: "こおり",
  fighting: "かくとう",
  poison: "どく",
  ground: "じめん",
  flying: "ひこう",
  psychic: "エスパー",
  bug: "むし",
  rock: "いわ",
  ghost: "ゴースト",
  dragon: "ドラゴン",
  dark: "あく",
  steel: "はがね",
  fairy: "フェアリー",
};

async function getJson(url) {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`${res.status} ${url}`);
  return res.json();
}

async function fetchOne(id) {
  const [pokemon, species] = await Promise.all([
    getJson(`https://pokeapi.co/api/v2/pokemon/${id}`),
    getJson(`https://pokeapi.co/api/v2/pokemon-species/${id}`),
  ]);

  const nameJa =
    species.names.find((n) => n.language.name === "ja")?.name ?? pokemon.name;

  // 活動に必要な最小限 (id・名前・タイプ・スプライト) だけを保存する。
  // sprite はプロキシのパス。画像そのものはここでは落とさない。
  return {
    id,
    name: pokemon.name,
    nameJa,
    types: pokemon.types.map((t) => TYPE_JA[t.type.name] ?? t.type.name),
    sprite: `/img/pokemon/${id}.png`,
  };
}

const all = [];
const BATCH = 10;
for (let start = 1; start <= COUNT; start += BATCH) {
  const ids = Array.from(
    { length: Math.min(BATCH, COUNT - start + 1) },
    (_, i) => start + i,
  );
  all.push(...(await Promise.all(ids.map(fetchOne))));
  process.stdout.write(`\r${all.length}/${COUNT}`);
}

all.sort((a, b) => a.id - b.id);
await writeFile(DATA_FILE, JSON.stringify(all, null, 2) + "\n");
console.log(`\nOK → ${DATA_FILE}`);
