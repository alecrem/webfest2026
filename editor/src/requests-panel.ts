import type { PreviewEvent } from "./preview";

function prettify(raw: string): string {
  try {
    return JSON.stringify(JSON.parse(raw), null, 2);
  } catch {
    return raw;
  }
}

export function createRequestsPanel(list: HTMLUListElement) {
  return {
    clear() {
      list.innerHTML = "";
    },
    add(event: PreviewEvent) {
      const li = document.createElement("li");
      if (event.kind === "error") {
        li.className = "req-error";
        li.textContent = `⚠️ JavaScriptエラー: ${event.message}${
          event.line ? ` (${event.line}行目)` : ""
        }`;
      } else {
        li.className = event.ok ? "req-ok" : "req-bad";
        const summary = document.createElement("div");
        summary.className = "req-summary";
        // URLはリンクに: 同じURLをブラウザのタブで開くと同じJSONが見える、
        // という気づきにつなげる。
        const link = document.createElement("a");
        link.href = event.url;
        link.target = "_blank";
        link.rel = "noreferrer";
        link.textContent = event.url;
        link.title = "新しいタブで開く";
        link.addEventListener("click", (e) => e.stopPropagation());
        summary.append("GET ", link, ` → ${event.status || "✕"} (${event.ms}ms)`);
        const body = document.createElement("pre");
        body.className = "req-body";
        body.hidden = true;
        body.textContent = prettify(event.preview);
        summary.addEventListener("click", () => {
          body.hidden = !body.hidden;
        });
        li.append(summary, body);
      }
      list.appendChild(li);
      list.scrollTop = list.scrollHeight;
    },
  };
}
