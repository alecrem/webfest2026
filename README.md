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
pnpm compose-data    # data/pokemon.json を生成し、スプライトのキャッシュを準備
pnpm build           # エディタを dist/editor にビルド
pnpm start           # http://localhost:3000 で全体を配信
```

ポケモンのデータとスプライト画像は**リポジトリに含まれません**(第三者の
権利物のため)。`data/pokemon.json` と `.cache/sprites/` は `pnpm compose-data`
で PokéAPI から再現可能な形で生成します。スプライトは `/img/pokemon/:id.png`
のディスクキャッシュ付きプロキシとして配信され、キャッシュにない場合のみ
サーバーが PokéAPI から取得します。`compose-data` を実行しておけばキャッシュが
すべて温まるので、授業中はインターネット接続不要です。

### 開発

```sh
pnpm dev:server      # API + 静的ファイル :3000 (tsx watch)
pnpm dev:editor      # エディタ HMR :5173 (/api, /img, /widgets.js は :3000 にプロキシ)
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
`hint` が付きます。

## 授業の前に

- [data/bukatsu.json](data/bukatsu.json) が学校の部活と合っているか確認する。
- [data/npb.json](data/npb.json) と [data/jleague.json](data/jleague.json) の
  内容を確認 (手書きの概算データ)。
- 授業を配信するマシンで `pnpm compose-data` を実行しておく (スプライトの
  キャッシュが完成 → 授業中の外部通信ゼロ)。
- 本番ドメインにデプロイし、**事前に学校の実機Chromebookで動作確認**する。
  プランB: 教室のLANで先生のPCから配信 (`PORT=3000 pnpm start`、`0.0.0.0` で
  待ち受け)。
- 保存はブラウザごと (localStorage) なので、生徒がChromebookを変えると
  ページが消えます — そのための「HTMLをコピー」ボタンです。
