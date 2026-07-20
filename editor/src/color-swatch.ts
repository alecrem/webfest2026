// コード中の16進カラーの隣に小さな色の四角 (スウォッチ) を出す拡張。
// 四角をクリックするとブラウザ標準の色ピッカーが開き、色を確定すると
// その位置の16進だけが書き換わる。生徒は16進を計算せずに色を選べる。
import {
  Decoration,
  type DecorationSet,
  EditorView,
  ViewPlugin,
  type ViewUpdate,
  WidgetType,
} from "@codemirror/view";

const HEX_G = /#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})\b/g;
const HEX_HEAD = /^#(?:[0-9a-fA-F]{6}|[0-9a-fA-F]{3})/;

// ドキュメントから16進カラーの位置と文字列をすべて拾う (純粋関数)。
export function findHexColors(
  text: string,
): Array<{ from: number; value: string }> {
  const out: Array<{ from: number; value: string }> = [];
  for (const m of text.matchAll(HEX_G)) {
    out.push({ from: m.index, value: m[0] });
  }
  return out;
}

// スウォッチの位置から始まる文字列の先頭にある16進を返す (置き換え対象)。
export function hexAt(chunk: string): string | null {
  const m = HEX_HEAD.exec(chunk);
  return m ? m[0] : null;
}

// #rgb を #rrggbb に伸ばす。ネイティブの color 入力は7文字を要求する。
export function normalizeHex(hex: string): string {
  const short = /^#([0-9a-fA-F])([0-9a-fA-F])([0-9a-fA-F])$/.exec(hex);
  if (short) {
    const [, r, g, b] = short;
    return `#${r}${r}${g}${g}${b}${b}`.toLowerCase();
  }
  return hex.toLowerCase();
}

class SwatchWidget extends WidgetType {
  constructor(readonly color: string) {
    super();
  }

  eq(other: SwatchWidget): boolean {
    return other.color === this.color;
  }

  toDOM(view: EditorView): HTMLElement {
    const input = document.createElement("input");
    input.type = "color";
    input.value = normalizeHex(this.color);
    input.className = "cm-color-swatch";
    input.setAttribute("aria-label", "色をえらぶ");
    // 色を確定 (ピッカーを閉じた) ときに、その位置の16進だけを置き換える。
    input.addEventListener("change", () => {
      const pos = view.posAtDOM(input);
      const hex = hexAt(view.state.sliceDoc(pos, pos + 7));
      if (!hex) return;
      view.dispatch({
        changes: { from: pos, to: pos + hex.length, insert: input.value },
      });
    });
    return input;
  }

  ignoreEvent(): boolean {
    return true;
  }
}

function buildDeco(view: EditorView): DecorationSet {
  const doc = view.state.doc.toString();
  const decos = findHexColors(doc).map(({ from, value }) =>
    Decoration.widget({ widget: new SwatchWidget(value), side: -1 }).range(from),
  );
  return Decoration.set(decos, true);
}

export const colorSwatch = ViewPlugin.fromClass(
  class {
    decorations: DecorationSet;
    constructor(view: EditorView) {
      this.decorations = buildDeco(view);
    }
    update(update: ViewUpdate) {
      if (update.docChanged) this.decorations = buildDeco(update.view);
    }
  },
  { decorations: (v) => v.decorations },
);
