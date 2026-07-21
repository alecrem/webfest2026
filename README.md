# ウェブフェス (webfest2026)

中学生 (13〜15歳) 向けの40分授業用教材。生徒一人ひとりがライブプレビュー付き
エディタで自分のウェブページをカスタマイズし、読み取り専用APIからデータを
取得します。学習の狙い: フロントエンドとバックエンドの概念、そしてウェブの
自由さを体感すること。

エディタ・ウィジェット・画像・APIはすべて**単一オリジン**(このサーバー)から
配信します。学校のChromebookで許可してもらうドメインは1つだけで済み、CORSも
発生しません。

## セットアップ

```sh
pnpm install
pnpm compose-data    # data/pokemon.json を生成 (PokéAPI から、テキストのみ)
pnpm build           # エディタを dist/editor にビルド
pnpm start           # http://localhost:3000 で全体を配信
```

ポケモンのデータは**リポジトリに含まれません**(第三者の権利物のため)。
`data/pokemon.json` は `pnpm compose-data` で PokéAPI から再現可能な形で生成
します (id・名前・タイプ・スプライトのパスだけ。**画像は落とさない**ので、
匹数を増やしてもビルドは軽いまま)。スプライト画像は `/img/pokemon/:id.png`
のプロキシが配信します: サーバー側が PokéAPI から取得するので、ブラウザは
このオリジンとしか通信しません (single-origin)。Cloudflare では edge の
Cache API が、初回以降のリクエストを upstream に触れず配信します。

### 開発

```sh
pnpm dev:server      # API + 静的ファイル :3000 (tsx watch)
pnpm dev:editor      # エディタ HMR :5173 (/api と /img は :3000 にプロキシ、widgets.js は publicDir)
```

### チェック

```sh
pnpm test            # vitest: API + スプライトプロキシ + データ整合性
pnpm typecheck       # tsc --noEmit
```

(`pnpm test` は `data/pokemon.json` が必要です。先に `pnpm compose-data` を実行。)

## 生徒が見るもの

`http://<サーバー>/` — 左に CodeMirror エディタ (ハイライト + やさしいHTML
lint)、右にプレビュー、下に「📡 このページの通信」パネル (ページが行う
`fetch` の URL → ステータス → JSON を表示)。ボタン: 保存して表示 (Ctrl+S、
localStorage に保存)、HTMLをコピー、最初にもどす。

JavaScript を書かなくても、HTML にウィジェットを置くだけで使えます:

```html
<poke-card src="/api/pokemon/25" color="#ffde00"></poke-card>
<team-card src="/api/npb/teams/tigers"></team-card>
<club-list src="/api/bukatsu?category=運動部"></club-list>
```

## API (読み取り専用)

`GET /api` がエンドポイント一覧を返します。ブラウザで `/api` を開くと
**APIエクスプローラー** (URLを編集して試せる練習ページ) が表示されます。
概要:

| エンドポイント | データ |
|---|---|
| `/api/bukatsu` (`?category=運動部\|文化部`)、`/api/bukatsu/:id` | 学校の部活 |
| `/api/pokemon` (`?type=ほのお`)、`/api/pokemon/:idOrName` | 第1世代151匹、日本語名 |
| `/api/npb/teams` (`?league=セ・リーグ`)、`/api/npb/teams/:id` | プロ野球12球団 |
| `/api/jleague/teams`、`/api/jleague/teams/:id` | Jリーグ20クラブ |

レスポンスはブラウザで直接開いても読みやすいように整形済み。404 には日本語の
`hint` が付きます。スプライト画像は `GET /img/pokemon/:id.png` のプロキシで、
`/api` とは別のルート。

## デプロイ (Cloudflare Pages)

同じ `createApp()` を2つのアダプタで動かす: Cloudflare では Pages Function、
LAN 用に Node サーバー ([server/index.ts](server/index.ts))。静的ファイル
(エディタ・`widgets.js`) は CDN、`/api/*` と `/img/pokemon/*` は
[functions/](functions/) が処理する。

**ローカルから直接アップロード** (git 連携はしない):

```sh
pnpm compose-data    # 初回、またはデータを更新したいときだけ (PokéAPI)
pnpm deploy          # = pnpm build && wrangler pages deploy
```

`wrangler pages deploy` は `dist/editor` (静的) をアップロードし、`functions/`
を**手元で** esbuild にバンドルする。このとき `data/pokemon.json` は関数の
バンドルに埋め込まれる。つまり:

- **Cloudflare 側でビルドしない** → デプロイのたびに PokéAPI を叩かない。
  `compose-data` を叩くのはローカルでデータを更新すると決めたときだけ。
- **JSON はコミットもしないし、Cloudflare のビルドにも渡さない** (手元の
  バンドルに焼き込むだけ)。
- 初回は `wrangler login` (または `CLOUDFLARE_API_TOKEN`) が要る。
- `nodejs_compat` は不要 (実行時に `node:*` を使わない)。設定は
  [wrangler.toml](wrangler.toml)。

## 授業資料

- [docs/recipes.md](docs/recipes.md) — レシピ集 (生徒に配る。難易度順に
  「1行変えると結果が変わる」例をまとめたもの)。
- [docs/lesson-plan.md](docs/lesson-plan.md) — 40分の進行台本 (時間配分と
  デモの手順)。

## 授業の前に

- [data/bukatsu.json](data/bukatsu.json) が学校の部活と合っているか確認する。
- [data/npb.json](data/npb.json) と [data/jleague.json](data/jleague.json) の
  内容を確認 (手書きの概算データ)。
- 本番ドメインにデプロイし、**事前に学校の実機Chromebookで動作確認**する。
  `*.pages.dev` が校内フィルタで弾かれることがある → 独自ドメインが安全。
- 保存はブラウザごと (localStorage) なので、生徒がChromebookを変えると
  ページが消えます — そのための「HTMLをコピー」ボタンです。
