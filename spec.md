# 仕様

## 目的

授業用教材 (40分、中学校、13〜15歳)。フロントエンドとバックエンドの概念を
教える。生徒はライブプレビュー付きのウェブエディタで単一のHTMLファイルを
編集し、こちらで用意した読み取り専用APIを利用する。重要な制約: ドメイン制限
のあるChromebook → **すべて (エディタ、ウィジェット、画像、API) を単一
オリジンから配信**。CDNは使わない。

## アーキテクチャ

```
server/     createApp() (読み取り専用API) + sprites.ts (プロキシのコア) + index.ts (Node アダプタ)
functions/  Cloudflare Pages Functions: api/[[route]] (createApp) と img/pokemon/[id] (edge キャッシュ)
data/       JSON: bukatsu, npb, jleague (手書き) + pokemon.json (生成物、git管理外、importで取込)
public/     widgets.js (ビルド不要のカスタム要素)
editor/     Vite+TS アプリ: CodeMirror 6、プレビューiframe、通信パネル
scripts/    compose-data.mjs (PokéAPI → data/pokemon.json。画像は落とさない)
tests/      vitest: APIコントラクト + プロキシのコア + データ整合性 + UI
```

### 設計判断

- **単一オリジン**: CORSを回避し、学校のChromebookで許可が必要なドメインを
  最小化する。
- **Vanilla JS + Web Components** (Reactは使わない): 生徒はHTML属性
  (`src`、`color`、`title`) を編集するだけ — 40分の授業に適したレベル。
  `title` はカードの中に見出しとして表示 (セクション見出しをカードに内包)。
  ウィジェットは内部で `fetch` するので、通信パネルにリクエストが見える。
- **1つの app、2つのアダプタ**: `createApp()` は Hono の純粋なアプリ
  (`/api/*` のみ)。Cloudflare では `functions/api/[[route]]` が、Node (LAN 用)
  では `server/index.ts` がラップする。データは `readFileSync` ではなく JSON の
  import (Workers にファイルシステムがないため)。
- **デプロイはローカルからの直接アップロード** (`wrangler pages deploy`、git
  連携なし): `functions/` を手元で esbuild にバンドルし、`data/pokemon.json` を
  焼き込む。Cloudflare 側はビルドしない → デプロイのたびに PokéAPI を叩かず、
  JSON をコミットも Cloudflare のビルドにも渡さない。出力 `dist/editor`、
  `nodejs_compat` 不要。`compose-data` を叩くのはローカルでデータ更新時だけ。
- **第三者の権利物はgitに入れない**: `data/pokemon.json` は `pnpm compose-data`
  で再現可能 (PokéAPI: species の日本語名、タイプは固定マップで翻訳) であり、
  gitignore 済み。保存するのは最小限 (id、名前、タイプ、スプライトのパス) のみ。
  **画像は落とさない**ので、匹数を増やしてもビルドは軽い。
- **スプライトはプロキシ (画像を溜め込まない)**: `/img/pokemon/:id.png` が
  サーバー側で PokéAPI から取得して返す → ブラウザは single-origin のまま。
  必要な分だけ遅延取得し、Cloudflare では edge の Cache API に、Node 開発
  サーバーでは都度取得。コア (`server/sprites.ts`) は runtime 非依存で両方が
  共有し、テストは fetch を差し替えて検証する。
- **保存 = localStorage** + iframe (`srcdoc`) の再描画。デプロイなし、
  アカウントなし、サーバー側の永続化なし。
- **計測付きプレビュー**: srcdoc の `<head>` にスクリプトを注入して
  `window.fetch` をラップし、`postMessage` で (URL、ステータス、ms、本文) を
  パネルに報告。JSエラーも行番号付きで捕捉。
- **整形済みJSON** と日本語 `hint` 付き404: APIはブラウザで直接開くことも
  想定した設計。
- **APIエクスプローラー**: `/api` をブラウザで開くと (content negotiation、
  `Accept: text/html`) URL入力欄 + 例のチップ + レスポンス表示の練習ページを
  返す。`fetch` には従来どおりJSON。通信パネルのURLもリンクになっており、
  「ウィジェット → 通信パネル → タブで開く → URLを編集」という段階的な
  学習ルートを作る。
- **やさしいlint** (HTMLHint: tag-pair, id-unique, attr-no-duplication,
  src-not-empty, tagname-lowercase): 初心者のページを実際に壊すものだけ。

## APIコントラクト

- `GET /api` → エンドポイント一覧。
- `GET /api/bukatsu?category=` → 部活 (カテゴリ完全一致フィルタ)。
- `GET /api/bukatsu/:id` → 部活1件。
- `GET /api/pokemon?type=` → 151匹のサマリー (id, name, nameJa, sprite)。
  `type` フィルタは日本語タイプ名。
- `GET /api/pokemon/:idOrName` → 詳細。id、英語名、日本語名を受け付ける。
- `GET /api/npb/teams?league=` / `GET /api/npb/teams/:id` → 12球団。
- `GET /api/jleague/teams` / `:id` → 20クラブ。
- `GET /img/pokemon/:id.png` → スプライトのプロキシ (1〜151のみ、それ以外404)。
  画像は upstream (PokéAPI) からサーバー側で取得。Cloudflare では edge キャッシュ。
- 404: `{ "error": "見つかりませんでした", "hint": "..." }`。

## 変更履歴

- 2026-07-11: 初期実装一式 — Honoサーバー、データ (bukatsu/NPB/Jリーグは
  手書き、ポケモンは生成)、widgets.js、CodeMirrorエディタ (プレビュー +
  通信パネル)、テスト、typecheck。ブラウザで目視確認済み。
- 2026-07-11: 生成物 (pokemon.json、スプライト) をgit管理外に。スクリプトを
  `compose-data` に改名。スプライトはディスクキャッシュ付きプロキシ配信に
  変更し、専用テストを追加。
- 2026-07-12: pokemon.json から高さ・重さを削除 (保存データを必要最小限に)。
  ドキュメントを日本語化。
- 2026-07-12: lint メッセージを日本語化。パネルをドラッグでリサイズ可能に。
  名前を「ウェブフェス」に変更。APIエクスプローラー追加 (/api の content
  negotiation) と通信パネルのURLリンク化。
- 2026-07-19: 授業時間を40分に修正。
- 2026-07-19: Cloudflare Pages 対応。データを JSON import 化 (readFileSync 廃止)。
  スプライトをディスクキャッシュ廃止 → edge プロキシ (Cache API) 化。compose-data
  は画像を落とさず JSON のみ生成 (匹数のスケールに対応)。functions/ に Pages
  Functions、wrangler.toml 追加。`workerd` の build script は無効のまま
  (ローカル emulation 用途のみで必須ではないため)。
- 2026-07-19: デプロイをローカル直接アップロード (`pnpm deploy`) に決定。
  Cloudflare 側でビルドせず、手元のバンドルに JSON を焼き込む方式。functions の
  ローカルバンドルを検証済み (JSON inline、node:fs なし)。
- 2026-07-19: ウィジェットに `title` 属性を追加。カードの見出しをカードの中に
  入れ、テンプレートの外側 `<h2>` を廃止 (#5)。
