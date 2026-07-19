# 仕様

## 目的

授業用教材 (40分、中学校、13〜15歳)。フロントエンドとバックエンドの概念を
教える。生徒はライブプレビュー付きのウェブエディタで単一のHTMLファイルを
編集し、こちらで用意した読み取り専用APIを利用する。重要な制約: ドメイン制限
のあるChromebook → **すべて (エディタ、ウィジェット、画像、API) を単一
オリジンから配信**。CDNは使わない。

## アーキテクチャ

```
server/   Hono (Node) — 読み取り専用JSON API + スプライトプロキシ + 静的配信
data/     JSON: bukatsu, npb, jleague (手書き) + pokemon.json (生成物、git管理外)
public/   widgets.js (ビルド不要のカスタム要素)
.cache/   プロキシ / compose-data がキャッシュするスプライト (git管理外)
editor/   Vite+TS アプリ: CodeMirror 6、プレビューiframe、通信パネル
scripts/  compose-data.mjs (PokéAPI 第1世代 → data/pokemon.json + キャッシュ)
tests/    vitest: APIコントラクト + スプライトプロキシ + データ整合性
```

### 設計判断

- **単一オリジン**: CORSを回避し、学校のChromebookで許可が必要なドメインを
  最小化する。
- **Vanilla JS + Web Components** (Reactは使わない): 生徒はHTML属性
  (`src`、`color`) を編集するだけ — 40分の授業に適したレベル。ウィジェットは
  内部で `fetch` するので、通信パネルにリクエストが見える。
- **第三者の権利物はgitに入れない**: `data/pokemon.json` とスプライトは
  `pnpm compose-data` で再現可能 (PokéAPI: species の日本語名、タイプは固定
  マップで翻訳) であり、gitignore 済み。保存するデータは活動に必要な最小限
  (id、名前、タイプ、スプライトURL) のみ。スプライトは `/img/pokemon/:id.png`
  のディスクキャッシュ付きプロキシ (`.cache/sprites`) で配信: キャッシュミス時
  のみ上流へfetch。`compose-data` でキャッシュが完成し、授業はオフラインで
  動く。
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
- `GET /img/pokemon/:id.png` → スプライトプロキシ (1〜151のみ、それ以外404)。
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
