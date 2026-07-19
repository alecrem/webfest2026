// iframe プレビュー + fetch スパイ: 生徒のページが行うすべてのリクエストを
// postMessage で「通信」パネルに報告する。

export interface FetchEvent {
  kind: "fetch";
  url: string;
  status: number;
  ok: boolean;
  ms: number;
  preview: string;
}

export interface ErrorEvent {
  kind: "error";
  message: string;
  line?: number;
}

export type PreviewEvent = FetchEvent | ErrorEvent;

const SPY = `<script data-webfest-spy>
(() => {
  const orig = window.fetch.bind(window);
  window.fetch = async (input, init) => {
    const url = typeof input === "string" ? input : (input && input.url) || String(input);
    const t0 = performance.now();
    const report = (status, ok, preview) => parent.postMessage(
      { webfest: true, kind: "fetch", url, status, ok,
        ms: Math.round(performance.now() - t0), preview }, "*");
    try {
      const res = await orig(input, init);
      let preview = "";
      try { preview = (await res.clone().text()).slice(0, 3000); } catch (_) {}
      report(res.status, res.ok, preview);
      return res;
    } catch (err) {
      report(0, false, String(err));
      throw err;
    }
  };
  window.addEventListener("error", (e) => parent.postMessage(
    { webfest: true, kind: "error", message: e.message, line: e.lineno }, "*"));
})();
<\/script>`;

function instrument(html: string): string {
  const headMatch = /<head[^>]*>/i.exec(html);
  if (headMatch) {
    const at = headMatch.index + headMatch[0].length;
    return html.slice(0, at) + SPY + html.slice(at);
  }
  return SPY + html;
}

export function renderPreview(iframe: HTMLIFrameElement, html: string): void {
  iframe.srcdoc = instrument(html);
}

export function listenToPreview(handler: (event: PreviewEvent) => void): void {
  window.addEventListener("message", (e: MessageEvent) => {
    if (e.data && e.data.webfest) handler(e.data as PreviewEvent);
  });
}
