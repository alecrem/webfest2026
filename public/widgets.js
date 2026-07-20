// 生徒のページでそのまま使えるウィジェット。ふつうのHTMLタグとして書ける:
//   <poke-card src="/api/pokemon/25"></poke-card>
//   <team-card src="/api/npb/teams/tigers"></team-card>
//   <club-list src="/api/bukatsu?category=運動部"></club-list>
(() => {
  "use strict";

  // 一覧で表示する最大件数。これを超えたぶんは「ほか N件」とまとめる。
  const MAX_ITEMS = 5;

  const STYLE = `
    poke-card, team-card, club-list { display: block; }
    .w-box {
      border: 2px solid var(--w-accent, #cbd5e1);
      border-radius: 12px;
      padding: 12px 16px;
      margin: 8px 0;
      max-width: 420px;
      background: #fff;
      color: #1e293b;
      font-family: inherit;
    }
    .w-loading { color: #64748b; padding: 8px 0; }
    .w-error {
      border: 2px dashed #ef4444; border-radius: 12px;
      padding: 10px 14px; margin: 8px 0; max-width: 420px;
      background: #fef2f2; color: #b91c1c;
    }
    .w-error code { word-break: break-all; }
    .w-hint { color: #7f1d1d; font-size: 0.85em; margin-top: 4px; }
    .w-card-band {
      margin: -12px -16px 12px; padding: 8px 16px;
      border-radius: 10px 10px 0 0; font-weight: 700;
    }
    .w-title { font-size: 1.15em; font-weight: 700; margin: 0 0 4px; }
    .w-sub { color: #64748b; font-size: 0.85em; }
    .w-chip {
      display: inline-block; padding: 1px 10px; border-radius: 999px;
      background: #e2e8f0; color: #1e293b;
      font-size: 0.8em; margin-right: 4px;
    }
    .w-row { margin: 4px 0; font-size: 0.95em; }
    .w-sprite {
      width: 96px; height: 96px; image-rendering: pixelated;
      float: right; margin-left: 8px;
    }
    .w-item { border-top: 1px solid #e2e8f0; padding: 8px 0; }
    .w-item:first-of-type { border-top: none; padding-top: 0; }
    .w-thumb {
      width: 32px; height: 32px; image-rendering: pixelated;
      vertical-align: middle; margin-right: 6px;
    }
    .w-item .w-sub { margin-left: 6px; }
    .w-more { color: #64748b; font-size: 0.85em; padding: 8px 0 0; }
    .w-clear { clear: both; }
  `;

  function ensureStyle() {
    if (document.querySelector("style[data-webfest-widgets]")) return;
    const style = document.createElement("style");
    style.setAttribute("data-webfest-widgets", "");
    style.textContent = STYLE;
    document.head.appendChild(style);
  }

  // 背景色に対して読みやすい文字色 (白か黒) を選ぶ。
  function textOn(bg) {
    const m = /^#?([0-9a-f]{6})$/i.exec(bg || "");
    if (!m) return "#1e293b";
    const n = parseInt(m[1], 16);
    const r = (n >> 16) & 255,
      g = (n >> 8) & 255,
      b = n & 255;
    const lum = (0.299 * r + 0.587 * g + 0.114 * b) / 255;
    return lum > 0.6 ? "#1e293b" : "#ffffff";
  }

  function esc(value) {
    return String(value).replace(
      /[&<>"']/g,
      (ch) =>
        ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" })[ch],
    );
  }

  function errorBox(message, hint) {
    return `<div class="w-error">⚠️ ${esc(message)}${
      hint ? `<div class="w-hint">ヒント: ${esc(hint)}</div>` : ""
    }</div>`;
  }

  class ApiWidget extends HTMLElement {
    static get observedAttributes() {
      return ["src", "color", "title"];
    }

    connectedCallback() {
      ensureStyle();
      this.refresh();
    }

    attributeChangedCallback() {
      if (this.isConnected) this.refresh();
    }

    // border と帯に使う実効カラー: color 属性 → preferredBg (データ) → 既定。
    // 同じ色を border にも帯にも使うので、カードの色が揃う。
    applyColor(preferredBg) {
      const c = this.getAttribute("color") || preferredBg || "#4355f9";
      this.style.setProperty("--w-accent", c);
      return c;
    }

    // 生徒が付けるセクション見出し。カード上部の色帯に入れる。
    // 文字色は背景に応じて自動で読みやすく。
    titleBand(bg) {
      const title = this.getAttribute("title");
      if (!title) return "";
      return `<div class="w-card-band" style="background:${esc(bg)};color:${textOn(bg)}">${esc(title)}</div>`;
    }

    // 一覧 (配列) でも単一でも描画する。/api の例をどれでも貼れる。
    // 各ウィジェットは preferredColor / isOne / renderOne / renderItem /
    // badHint を用意するだけでよい。
    render(data) {
      if (Array.isArray(data)) {
        const band = this.titleBand(this.applyColor());
        if (data.length === 0) {
          return `<div class="w-box">${band}0件でした。アドレスの条件を変えてみよう。</div>`;
        }
        // カードが長くなりすぎないよう、最大5件だけ出して残りは件数で示す。
        const shown = data.slice(0, MAX_ITEMS);
        const rest = data.length - shown.length;
        const items = shown.map((x) => this.renderItem(x)).join("");
        const more = rest > 0 ? `<div class="w-more">ほか ${rest}件</div>` : "";
        return `<div class="w-box">${band}${items}${more}</div>`;
      }
      if (!this.isOne(data)) {
        return errorBox(this.badHint(), this.example());
      }
      const band = this.titleBand(this.applyColor(this.preferredColor(data)));
      return `<div class="w-box">${band}${this.renderOne(data)}</div>`;
    }

    // 既定のフック (各ウィジェットで必要に応じて上書き)
    preferredColor() {
      return undefined;
    }
    isOne(data) {
      return Boolean(data && data.name);
    }
    example() {
      return "";
    }

    async refresh() {
      const src = this.getAttribute("src");
      if (!src) {
        this.innerHTML = errorBox("src 属性にバックエンドのアドレスを書いてね");
        return;
      }
      this.innerHTML = `<div class="w-loading">読み込み中…</div>`;
      const mySrc = src;
      try {
        const res = await fetch(src);
        // 待っている間に src が変わっていたら、新しいリクエスト側が描画する
        if (this.getAttribute("src") !== mySrc) return;
        if (!res.ok) {
          const body = await res.json().catch(() => null);
          this.innerHTML = errorBox(
            `${res.status} — ${src}`,
            body && body.hint ? body.hint : "アドレスをもう一度確認してみよう",
          );
          return;
        }
        this.innerHTML = this.render(await res.json());
      } catch {
        this.innerHTML = errorBox(`サーバーにつながりませんでした — ${src}`);
      }
    }
  }

  class PokeCard extends ApiWidget {
    isOne(p) {
      return Boolean(p && p.nameJa);
    }
    badHint() {
      return "ポケモンのアドレスじゃないみたい";
    }
    example() {
      return "例: /api/pokemon/25";
    }
    // 単一: 大きなスプライトとタイプを見せる
    renderOne(p) {
      const types = (p.types || [])
        .map((t) => `<span class="w-chip">${esc(t)}</span>`)
        .join("");
      return `<img class="w-sprite" src="${esc(p.sprite)}" alt="${esc(p.nameJa)}">
        <p class="w-title">${esc(p.nameJa)}</p>
        <div class="w-sub">No.${esc(p.id)} / ${esc(p.name)}</div>
        <div class="w-row">${types}</div>
        <div class="w-clear"></div>`;
    }
    // 一覧: 小さなサムネイルと名前だけのコンパクト表示
    renderItem(p) {
      return `<div class="w-item">
        <img class="w-thumb" src="${esc(p.sprite)}" alt="${esc(p.nameJa)}">
        <strong>${esc(p.nameJa)}</strong>
        <span class="w-sub">No.${esc(p.id)}</span>
      </div>`;
    }
  }

  class TeamCard extends ApiWidget {
    badHint() {
      return "チームのアドレスじゃないみたい";
    }
    example() {
      return "例: /api/npb/teams/tigers";
    }
    preferredColor(t) {
      return (t.colors || {}).primary;
    }
    renderOne(t) {
      return `<p class="w-title">${esc(t.name)}</p>
        ${t.league ? `<div class="w-row"><span class="w-chip">${esc(t.league)}</span></div>` : ""}
        <div class="w-row">🏟️ ${esc(t.stadium)}</div>
        <div class="w-row">📍 ${esc(t.hometown)} ・ ${esc(t.founded)}年から</div>`;
    }
    renderItem(t) {
      return `<div class="w-item">
        <strong>${esc(t.name)}</strong>
        ${t.league ? `<span class="w-chip">${esc(t.league)}</span>` : ""}
      </div>`;
    }
  }

  class ClubList extends ApiWidget {
    badHint() {
      return "部活のアドレスを指定してね (例: /api/bukatsu)";
    }
    // 単一 (/api/bukatsu/kitaku) は一覧の1行と同じ見た目でよい
    renderOne(club) {
      return this.renderItem(club);
    }
    renderItem(club) {
      const chip = club.category
        ? `<span class="w-chip">${esc(club.category)}</span>`
        : "";
      return `<div class="w-item">
        <strong>${esc(club.name)}</strong>
        ${chip}
      </div>`;
    }
  }

  customElements.define("poke-card", PokeCard);
  customElements.define("team-card", TeamCard);
  customElements.define("club-list", ClubList);
})();
