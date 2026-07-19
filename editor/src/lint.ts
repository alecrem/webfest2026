import { HTMLHint, type LintMessage } from "htmlhint";
import { linter, type Diagnostic } from "@codemirror/lint";

// やさしいルールだけ: 初心者のページを実際に壊すものに限定する。
export const RULES = {
  "tag-pair": true,
  "attr-no-duplication": true,
  "id-unique": true,
  "src-not-empty": true,
  "spec-char-escape": false,
  "attr-lowercase": false,
  "tagname-lowercase": true,
};

// HTMLHint のメッセージ (英語) を生徒向けの日本語に変換する。
// detail はメッセージ中の [ ... ] の部分 (原因になったタグや属性)。
export function jaMessage(m: LintMessage): string {
  const detail = /\[ (.+?) \]/.exec(m.message)?.[1];
  switch (m.rule.id) {
    case "tag-pair":
      if (m.message.includes("start tag")) {
        return `開始タグが見つかりません: ${detail ?? m.raw ?? ""}`;
      }
      return `閉じタグが見つかりません: ${detail ?? ""}`;
    case "id-unique":
      return `id「${detail ?? ""}」が2回以上使われています。idはページ内で1回だけ`;
    case "attr-no-duplication":
      return `属性「${detail ?? ""}」が同じタグに2回書かれています`;
    case "src-not-empty":
      return `${detail ?? "src"} が空です。アドレスを書いてください`;
    case "tagname-lowercase":
      return `タグ名「${detail ?? ""}」は小文字で書いてください`;
    default:
      return m.message;
  }
}

export const htmlLint = linter((view) => {
  const doc = view.state.doc;
  const messages = HTMLHint.verify(doc.toString(), RULES);
  return messages.map((m): Diagnostic => {
    const line = doc.line(Math.max(1, Math.min(m.line, doc.lines)));
    const from = Math.min(line.from + Math.max(0, m.col - 1), line.to);
    const to = Math.min(from + Math.max(1, (m.raw ?? "").length), line.to);
    return {
      from,
      to: Math.max(to, from + 1) > doc.length ? doc.length : Math.max(to, from),
      severity: m.type === "error" ? "error" : "warning",
      message: jaMessage(m),
    };
  });
});
