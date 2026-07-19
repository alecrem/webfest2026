import { basicSetup, EditorView } from "codemirror";
import { keymap } from "@codemirror/view";
import { html } from "@codemirror/lang-html";
import { lintGutter } from "@codemirror/lint";
import template from "./template.html?raw";
import { htmlLint } from "./lint";
import { listenToPreview, renderPreview } from "./preview";
import { createRequestsPanel } from "./requests-panel";
import { setupSplit } from "./split";

const STORAGE_KEY = "webfest:page";

const iframe = document.querySelector<HTMLIFrameElement>("#preview")!;
const panel = createRequestsPanel(
  document.querySelector<HTMLUListElement>("#requests-list")!,
);

function save() {
  const code = view.state.doc.toString();
  localStorage.setItem(STORAGE_KEY, code);
  panel.clear();
  renderPreview(iframe, code);
}

const view = new EditorView({
  parent: document.querySelector("#editor")!,
  doc: localStorage.getItem(STORAGE_KEY) ?? template,
  extensions: [
    keymap.of([
      {
        key: "Mod-s",
        preventDefault: true,
        run: () => {
          save();
          return true;
        },
      },
    ]),
    basicSetup,
    html(),
    htmlLint,
    lintGutter(),
    EditorView.theme({
      "&": { height: "100%", fontSize: "14px" },
      ".cm-scroller": { overflow: "auto" },
    }),
  ],
});

function setDoc(code: string) {
  view.dispatch({
    changes: { from: 0, to: view.state.doc.length, insert: code },
  });
}

document.querySelector("#save")!.addEventListener("click", save);

document.querySelector("#reset")!.addEventListener("click", () => {
  if (confirm("書いたものを消して、最初のテンプレートにもどす？")) {
    setDoc(template);
    save();
  }
});

const copyButton = document.querySelector<HTMLButtonElement>("#copy")!;
copyButton.addEventListener("click", async () => {
  await navigator.clipboard.writeText(view.state.doc.toString());
  const original = copyButton.textContent;
  copyButton.textContent = "✅ コピーした！";
  setTimeout(() => {
    copyButton.textContent = original;
  }, 1500);
});

listenToPreview((event) => panel.add(event));

setupSplit("webfest:split-x", "--editor-w", {
  gutter: document.querySelector<HTMLElement>("#gutter-main")!,
  container: document.querySelector<HTMLElement>(".split")!,
  axis: "x",
});

setupSplit("webfest:split-y", "--preview-h", {
  gutter: document.querySelector<HTMLElement>("#gutter-right")!,
  container: document.querySelector<HTMLElement>(".right")!,
  axis: "y",
  min: 0.15,
  max: 0.92,
});

save();
view.focus();
