// 生徒のページでそのまま使えるウィジェット。ふつうのHTMLタグとして書ける:
//   <poke-card src="/api/pokemon/25"></poke-card>
//   <team-card src="/api/npb/teams/tigers"></team-card>
//   <club-list src="/api/bukatsu?category=運動部"></club-list>
(() => {
  "use strict";

  const STYLE = `
    poke-card, team-card, club-list { display: block; }
    .w-box {
      border: 2px solid var(--w-accent, #94a3b8);
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
    .w-title { font-size: 1.15em; font-weight: 700; margin: 0 0 4px; }
    .w-sub { color: #64748b; font-size: 0.85em; }
    .w-chip {
      display: inline-block; padding: 1px 10px; border-radius: 999px;
      background: var(--w-accent, #e2e8f0); color: #1e293b;
      font-size: 0.8em; margin-right: 4px;
    }
    .w-row { margin: 4px 0; font-size: 0.95em; }
    .w-sprite {
      width: 96px; height: 96px; image-rendering: pixelated;
      float: right; margin-left: 8px;
    }
    .w-band { height: 14px; border-radius: 8px 8px 0 0; margin: -12px -16px 10px; }
    .w-item { border-top: 1px solid #e2e8f0; padding: 8px 0; }
    .w-item:first-of-type { border-top: none; padding-top: 0; }
    .w-clear { clear: both; }
  `;

  function ensureStyle() {
    if (document.querySelector("style[data-webfest-widgets]")) return;
    const style = document.createElement("style");
    style.setAttribute("data-webfest-widgets", "");
    style.textContent = STYLE;
    document.head.appendChild(style);
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
      return ["src", "color"];
    }

    connectedCallback() {
      ensureStyle();
      this.refresh();
    }

    attributeChangedCallback() {
      if (this.isConnected) this.refresh();
    }

    accent() {
      const color = this.getAttribute("color");
      if (color) this.style.setProperty("--w-accent", color);
    }

    async refresh() {
      const src = this.getAttribute("src");
      if (!src) {
        this.innerHTML = errorBox("src 属性にバックエンドのアドレスを書いてね");
        return;
      }
      this.accent();
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
    render(p) {
      // 一覧のアドレスを入れてしまったら、選び方をおしえる
      if (Array.isArray(p)) {
        return errorBox(
          `これは一覧のアドレスだよ (${p.length}匹見つかった)。1匹だけ選んでね`,
          "例: /api/pokemon/25",
        );
      }
      if (!p || !p.nameJa) {
        return errorBox("ポケモンのアドレスじゃないみたい", "例: /api/pokemon/25");
      }
      const types = (p.types || [])
        .map((t) => `<span class="w-chip">${esc(t)}</span>`)
        .join("");
      return `<div class="w-box">
        <img class="w-sprite" src="${esc(p.sprite)}" alt="${esc(p.nameJa)}">
        <p class="w-title">${esc(p.nameJa)}</p>
        <div class="w-sub">No.${esc(p.id)} / ${esc(p.name)}</div>
        <div class="w-row">${types}</div>
        <div class="w-clear"></div>
      </div>`;
    }
  }

  class TeamCard extends ApiWidget {
    render(t) {
      if (Array.isArray(t)) {
        return errorBox(
          `これは一覧のアドレスだよ (${t.length}チーム見つかった)。1チームだけ選んでね`,
          "例: /api/npb/teams/tigers",
        );
      }
      if (!t || !t.name) {
        return errorBox("チームのアドレスじゃないみたい", "例: /api/npb/teams/tigers");
      }
      const colors = t.colors || {};
      const band = `background: linear-gradient(90deg, ${esc(
        colors.primary || "#94a3b8",
      )} 60%, ${esc(colors.secondary || "#e2e8f0")});`;
      return `<div class="w-box">
        <div class="w-band" style="${band}"></div>
        <p class="w-title">${esc(t.name)}</p>
        ${t.league ? `<div class="w-row"><span class="w-chip">${esc(t.league)}</span></div>` : ""}
        <div class="w-row">🏟️ ${esc(t.stadium)}</div>
        <div class="w-row">📍 ${esc(t.hometown)} ・ ${esc(t.founded)}年から</div>
      </div>`;
    }
  }

  class ClubList extends ApiWidget {
    renderItem(club) {
      return `<div class="w-item">
        <strong>${esc(club.name)}</strong>
        <span class="w-chip">${esc(club.category)}</span>
      </div>`;
    }

    render(data) {
      // リスト (/api/bukatsu) でも1件 (/api/bukatsu/kitaku) でも使える
      if (data && !Array.isArray(data) && data.name) {
        return `<div class="w-box">${this.renderItem(data)}</div>`;
      }
      if (!Array.isArray(data)) {
        return errorBox("部活のアドレスを指定してね (例: /api/bukatsu)");
      }
      if (data.length === 0) {
        return `<div class="w-box">0件でした。アドレスの条件を変えてみよう。</div>`;
      }
      return `<div class="w-box">${data.map((c) => this.renderItem(c)).join("")}</div>`;
    }
  }

  customElements.define("poke-card", PokeCard);
  customElements.define("team-card", TeamCard);
  customElements.define("club-list", ClubList);
})();
