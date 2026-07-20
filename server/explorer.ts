// ブラウザで /api を開いたときに返すAPIエクスプローラー。
// URLを編集 → 送信 → レスポンスを見る、を安全に練習する場所。
// fetch (Accept: application/json) には従来どおりJSONを返すので、
// このページはAPI本体には影響しない。
export const explorerHtml = `<!DOCTYPE html>
<html lang="ja">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>バックエンドをのぞく</title>
<style>
  * { box-sizing: border-box; }
  body {
    font-family: "Hiragino Sans", "Noto Sans JP", sans-serif;
    background: #0f172a; color: #e2e8f0;
    max-width: 760px; margin: 0 auto; padding: 24px 16px;
  }
  h1 { font-size: 1.3em; }
  p.lead { color: #94a3b8; }
  form { display: flex; gap: 8px; margin: 16px 0 8px; }
  input {
    flex: 1; font: inherit; font-family: ui-monospace, Menlo, monospace;
    padding: 10px 12px; border-radius: 8px; border: 1px solid #475569;
    background: #1e293b; color: #f1f5f9;
  }
  button {
    font: inherit; padding: 10px 18px; border-radius: 8px; border: none;
    background: #4355f9; color: #fff; font-weight: 700; cursor: pointer;
  }
  button:hover { background: #3444e0; }
  button.ghost { background: #334155; font-weight: 400; }
  .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0; }
  .chips a {
    font-family: ui-monospace, Menlo, monospace; font-size: 12px;
    padding: 4px 10px; border-radius: 999px; background: #1e293b;
    color: #7dd3fc; text-decoration: none; border: 1px solid #334155;
  }
  .chips a:hover { border-color: #7dd3fc; }
  .status { margin: 12px 0 4px; font-weight: 700; }
  .status.ok { color: #4ade80; }
  .status.bad { color: #f87171; }
  pre {
    background: #1e293b; border-radius: 10px; padding: 14px;
    overflow: auto; max-height: 55vh; font-size: 13px; white-space: pre-wrap;
  }
  .hint { color: #94a3b8; font-size: 0.85em; }
</style>
</head>
<body>
  <h1>🔎 バックエンドをのぞいてみよう</h1>
  <p class="lead">アドレスを変えて「送信」してみよう。ここで動いたアドレスは、
  きみのページの <code>src="..."</code> でもブラウザのアドレスバーでも、
  まったく同じように動くよ。</p>

  <form id="form">
    <input id="url" value="/api/pokemon/25" spellcheck="false"
      autocapitalize="off" autocomplete="off">
    <button type="submit">送信</button>
    <button type="button" class="ghost" id="copy">アドレスをコピー</button>
  </form>

  <div class="chips" id="chips"></div>
  <div class="status" id="status"></div>
  <pre id="out">↑ 送信を押してみよう</pre>
  <p class="hint">💡 こういうデータの入り口のことを「API」ともよぶよ。
  だからアドレスが /api で始まっているんだ。</p>

<script>
  var EXAMPLES = [
    "/api/pokemon/25",
    "/api/pokemon/pikachu",
    "/api/pokemon",
    "/api/pokemon?type=ほのお",
    "/api/pokemon?ids=25,7",
    "/api/bukatsu",
    "/api/bukatsu?category=文化部",
    "/api/bukatsu?ids=yakyu,bijutsu",
    "/api/bukatsu/kitaku",
    "/api/npb/teams",
    "/api/npb/teams/tigers",
    "/api/npb/teams?league=パ・リーグ",
    "/api/npb/teams?ids=tigers,giants",
    "/api/jleague/teams",
    "/api/jleague/teams/kawasaki"
  ];

  var input = document.getElementById("url");
  var out = document.getElementById("out");
  var statusEl = document.getElementById("status");
  var chips = document.getElementById("chips");

  EXAMPLES.forEach(function (url) {
    var a = document.createElement("a");
    a.href = url;
    a.textContent = url;
    a.addEventListener("click", function (e) {
      e.preventDefault();
      go(url);
    });
    chips.appendChild(a);
  });

  function go(url) {
    input.value = url;
    if (url.charAt(0) !== "/") {
      statusEl.className = "status bad";
      statusEl.textContent = "アドレスは / で始めてね (例: /api/pokemon/25)";
      return;
    }
    statusEl.className = "status";
    statusEl.textContent = "読み込み中…";
    fetch(url, { headers: { accept: "application/json" } })
      .then(function (res) {
        statusEl.className = "status " + (res.ok ? "ok" : "bad");
        statusEl.textContent = "GET " + url + " → " + res.status +
          (res.ok ? " OK" : " エラー");
        return res.text();
      })
      .then(function (text) {
        try { out.textContent = JSON.stringify(JSON.parse(text), null, 2); }
        catch (e) { out.textContent = text; }
      })
      .catch(function () {
        statusEl.className = "status bad";
        statusEl.textContent = "つながりませんでした: " + url;
        out.textContent = "";
      });
  }

  document.getElementById("form").addEventListener("submit", function (e) {
    e.preventDefault();
    go(input.value.trim());
  });

  document.getElementById("copy").addEventListener("click", function () {
    navigator.clipboard.writeText(input.value.trim());
    this.textContent = "コピーした！";
    var btn = this;
    setTimeout(function () { btn.textContent = "アドレスをコピー"; }, 1500);
  });
</script>
</body>
</html>
`;
